/**
 * Morph shaders: eyes → explosion → tree.
 *
 * Stage positions live as vertex attributes and are blended on the GPU via
 * uProgress. Nothing rewrites the position buffer per frame, so cost stays
 * flat regardless of particle count.
 *
 * The eyes are live before the morph starts: gaze rotates the iris and pupil
 * about each eye's own centre, and the blink sweeps the lids. Both run ahead
 * of the blast so every downstream stage sees the posed eye, not the rest one.
 */

export const morphVertex = /* glsl */ `
  uniform float uProgress;      // 0..2 — 0 eyes, 1 exploded, 2 tree
  uniform float uSize;
  uniform vec3  uCursor;        // cursor, in the field's local space
  uniform float uCursorRadius;
  uniform float uPush;
  uniform float uHoverSide;     // -1 left, +1 right, 0 none
  uniform float uTreeMix;       // 1 once the tree has formed
  uniform float uTime;
  uniform float uForm;       // 1 while the eyes are intact, 0 once dispersed
  uniform vec2  uGazeL;      // left eye yaw/pitch, radians
  uniform vec2  uGazeR;      // right eye yaw/pitch, radians
  uniform float uBlink;      // 0 open, 1 shut

  attribute vec3  aNormal;      // surface normal
  attribute vec3  aScatter;     // per-particle random unit direction
  attribute vec3  aTree;
  attribute float aSide;
  attribute float aSeed;
  attribute float aEye;         // -1 left eye, +1 right
  attribute float aPart;        // 0 sclera, 1 iris, 2 pupil, 3 lid
  attribute float aLid;         // signed closed-polar target; 0 if not a lid
  attribute vec3  aSocket;      // this particle's eye centre, in local space

  varying float vHighlight;
  varying float vDepth;
  varying float vFacing;
  varying float vPart;
  varying float vHidden;

  /** Rotate about X then Y — pitch then yaw, applied around the eye centre. */
  vec3 aim(vec3 v, float yaw, float pitch) {
    float cp = cos(pitch), sp = sin(pitch);
    v = vec3(v.x, v.y * cp - v.z * sp, v.y * sp + v.z * cp);
    float cy = cos(yaw), sy = sin(yaw);
    return vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
  }

  void main() {
    float p = clamp(uProgress, 0.0, 2.0);

    vec3 posed = position;
    vec3 nrm = aNormal;
    vec3 local = position - aSocket;
    vec2 gaze = aEye < 0.0 ? uGazeL : uGazeR;

    /*
     * Gaze. Only the iris and pupil turn — rotating the sclera too would spin
     * the whole eyeball and lose the fixed-socket read that sells the look.
     */
    if (aPart > 0.5 && aPart < 2.5) {
      posed = aSocket + aim(local, gaze.x, gaze.y);
      nrm = aim(aNormal, gaze.x, gaze.y);
    }

    /*
     * Blink. The lid is re-placed along its own meridian rather than rotated.
     *
     * Rotating the cap about X looks right only for points in the YZ plane;
     * everything off it travels on a smaller circle and falls short, leaving
     * the eye open at the sides no matter how far the rotation is pushed.
     * Interpolating each point's polar angle instead moves every point the
     * same angular distance, so the lid closes evenly across its whole width.
     */
    if (aPart > 2.5) {
      float sgn = sign(aLid);
      vec3 dir = normalize(local);
      // This point's angle from its own lid's pole, and where it closes to.
      float polar = acos(clamp(dir.y * sgn, -1.0, 1.0));
      float shut = mix(polar, abs(aLid), uBlink);
      // Rebuild on the same meridian: keep the azimuth, change the polar.
      vec2 azim = normalize(vec2(dir.x, dir.z) + 1e-6);
      float s = sin(shut);
      vec3 unit = vec3(azim.x * s, cos(shut) * sgn, azim.y * s);
      posed = aSocket + unit * length(local);
      nrm = unit;
    }

    /*
     * The explosion is procedural, not a third target buffer. Driving it off
     * each particle's own surface normal makes the eyes burst apart from their
     * own geometry; a static "exploded" buffer would just read as morphing
     * into a third shape.
     *
     * It holds off until the lids have shut (see CLOSE_TO in MorphField).
     * Starting at p=0 would dissolve the eyes mid-close, so the shut pose —
     * the whole point of the lids — would never be seen.
     */
    float blast = smoothstep(0.0, 1.0, smoothstep(0.4, 1.0, p));
    vec3 blown = posed
      + nrm      * blast * 0.85
      + aScatter * blast * 0.55;

    // Second half: the dispersed cloud contracts into the tree.
    float t2 = smoothstep(0.0, 1.0, clamp(p - 1.0, 0.0, 1.0));
    vec3 pos = mix(blown, aTree, t2);

    // Turbulence, strongest mid-explosion where the cloud is loosest.
    float loose = blast * (1.0 - t2);
    pos += vec3(
      sin(uTime * 0.9 + aSeed * 6.283),
      cos(uTime * 0.7 + aSeed * 4.712),
      sin(uTime * 0.5 + aSeed * 2.094)
    ) * loose * 0.12;

    // Cursor repulsion, applied after the morph so it works at every stage.
    vec3 toCursor = pos - uCursor;
    float d = length(toCursor);
    float influence = 1.0 - smoothstep(0.0, uCursorRadius, d);
    pos += normalize(toCursor + 1e-5) * influence * uPush;

    // Highlight the hovered half once the tree exists.
    vHighlight = uTreeMix * step(0.5, aSide * uHoverSide) + influence * 0.6;

    /*
     * A shut lid has to actually hide the eye. Additive blending cannot
     * occlude — the iris and pupil are the brightest parts of the cloud, so
     * they sum straight through the dimmer lid particles in front of them and
     * the closed eye still glows. Fading them out as the lids come down is
     * what sells the blink; nothing else in this pipeline can.
     *
     * Only while the eyes are intact: once dispersed there are no lids left
     * to hide behind, and the particles must all survive into the tree.
     */
    float hidden = step(0.5, aPart) * step(aPart, 2.5) * uBlink * uForm;
    vPart = aPart;
    vHidden = 1.0 - hidden;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mv.z;

    /*
     * Facing term. With additive blending and no depth test, points on the far
     * side of a surface draw straight through the near side and wash it out.
     * Fading back-facing points restores the silhouette.
     * Only meaningful while the eyes are intact, so it fades out with uForm.
     */
    vec3 wn = normalize(mat3(modelMatrix) * nrm);
    vec3 toCam = normalize(cameraPosition - (modelMatrix * vec4(pos, 1.0)).xyz);
    float facing = smoothstep(-0.25, 0.35, dot(wn, toCam));

    /*
     * Pupils are the brightest thing in the scene, so the far pupil printing
     * through the near sclera is far more visible than any back-face artefact
     * the bust had. Bias the term hard for iris and pupil specifically — they
     * are flat discs whose normals are reliable, so a tight cutoff is safe.
     */
    float lens = step(0.5, aPart) * step(aPart, 2.5);
    float tight = smoothstep(0.05, 0.45, dot(wn, toCam));
    facing = mix(facing, tight, lens);

    vFacing = mix(1.0, facing, uForm);

    gl_Position = projectionMatrix * mv;

    /*
     * Pupils carry a little extra size to anchor the gaze; the part they
     * occupy is small and has to hold its own against the surrounding iris.
     * Scaled down as uSize rises — the low-detail tier draws fewer, larger
     * points, so the same boost there overlaps into a blown-out white disc.
     */
    float grow = 1.0 + step(1.5, aPart) * step(aPart, 2.5) * (0.9 / uSize);

    /*
     * Point size follows the field's own scale as well as depth. The
     * responsive fit shrinks the group on narrow viewports without moving it
     * further from the camera, so without this the points keep their full
     * pixel size while the eye shrinks around them — the same particle count
     * packed into a third of the area, which additive blending turns into a
     * white blob. Reading the scale off the model matrix keeps the density
     * of the render constant at every breakpoint.
     */
    float fieldScale = length(modelMatrix[0].xyz);
    gl_PointSize = uSize * grow * fieldScale * (1.0 + influence * 1.4)
      * (14.0 / max(vDepth, 0.5));
  }
`;

export const morphFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uPupilGain;
  uniform float uOpacity;

  varying float vHighlight;
  varying float vDepth;
  varying float vFacing;
  varying float vPart;
  varying float vHidden;

  void main() {
    // Round, soft-edged points; discard the corners of the quad.
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, r);

    vec3 col = mix(uColor, uAccent, clamp(vHighlight, 0.0, 1.0));
    // Fade with distance so the cloud has depth rather than reading flat.
    float fog = 1.0 - smoothstep(6.0, 22.0, vDepth);

    /*
     * Brightness ramp across the eye: sclera dim, iris mid, pupil brightest.
     *
     * Under additive blending a dark pupil is only an absence of particles —
     * the sclera behind it prints straight through and the eye reads muddy.
     * Making the pupil the brightest element instead means the most luminous
     * thing on screen is also the thing that tracks the cursor.
     */
    float sclera = step(vPart, 0.5);
    float iris   = step(0.5, vPart) * step(vPart, 1.5);
    float pupil  = step(1.5, vPart) * step(vPart, 2.5);
    float lid    = step(2.5, vPart);

    /*
     * The pupil is the brightest element, but only just. Additive blending
     * stacks every overlapping point, and the pupil is the densest part of
     * the cloud — a large gain there saturates to a flat white disc and eats
     * the iris detail around it. The ramp has to stay narrow.
     */
    float gain = sclera * 0.5 + iris * 0.85 + pupil * uPupilGain + lid * 0.7;
    col = mix(col, uAccent, pupil * 0.55 + iris * 0.25);

    // Additive blending stacks alpha; keep it low so density reads as
    // structure instead of saturating to white.
    gl_FragColor = vec4(col, alpha * uOpacity * fog * vFacing * gain * vHidden * 0.46);
  }
`;
