/**
 * Morph shaders: face → explosion → tree.
 *
 * Stage positions live as vertex attributes and are blended on the GPU via
 * uProgress. Nothing rewrites the position buffer per frame, so cost stays
 * flat regardless of particle count.
 */

export const morphVertex = /* glsl */ `
  uniform float uProgress;      // 0..2 — 0 face, 1 exploded, 2 tree
  uniform float uSize;
  uniform vec3  uCursor;        // cursor, in the field's local space
  uniform float uCursorRadius;
  uniform float uPush;
  uniform float uHoverSide;     // -1 left, +1 right, 0 none
  uniform float uTreeMix;       // 1 once the tree has formed
  uniform float uTime;
  uniform float uForm;       // 1 while the face is intact, 0 once dispersed

  attribute vec3  aNormal;      // face surface normal
  attribute vec3  aScatter;     // per-particle random unit direction
  attribute vec3  aTree;
  attribute float aSide;
  attribute float aSeed;

  varying float vHighlight;
  varying float vDepth;
  varying float vFacing;

  void main() {
    float p = clamp(uProgress, 0.0, 2.0);

    /*
     * The explosion is procedural, not a third target buffer. Driving it off
     * each particle's own surface normal makes the face burst apart from its
     * own geometry; a static "exploded" buffer would just read as morphing
     * into a third shape.
     */
    float blast = smoothstep(0.0, 1.0, min(p, 1.0));
    vec3 blown = position
      + aNormal  * blast * 0.85
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

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mv.z;

    /*
     * Facing term. With additive blending and no depth test, points on the far
     * side of the head draw straight through the near side and wash the
     * features out. Fading back-facing points restores the silhouette — the
     * nose, brow and jaw only read when the far surface is suppressed.
     * Only meaningful while the face is intact, so it fades out with uForm.
     */
    vec3 wn = normalize(mat3(modelMatrix) * aNormal);
    vec3 toCam = normalize(cameraPosition - (modelMatrix * vec4(pos, 1.0)).xyz);
    float facing = smoothstep(-0.25, 0.35, dot(wn, toCam));
    vFacing = mix(1.0, facing, uForm);

    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + influence * 1.4) * (14.0 / max(vDepth, 0.5));
  }
`;

export const morphFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uOpacity;

  varying float vHighlight;
  varying float vDepth;
  varying float vFacing;

  void main() {
    // Round, soft-edged points; discard the corners of the quad.
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, r);

    vec3 col = mix(uColor, uAccent, clamp(vHighlight, 0.0, 1.0));
    // Fade with distance so the cloud has depth rather than reading flat.
    float fog = 1.0 - smoothstep(6.0, 22.0, vDepth);

    // Additive blending stacks alpha; keep it low so density reads as
    // structure instead of saturating to white.
    gl_FragColor = vec4(col, alpha * uOpacity * fog * vFacing * 0.46);
  }
`;
