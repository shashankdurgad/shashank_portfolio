/**
 * Morph shaders.
 *
 * All stage positions live as vertex attributes and are lerped on the GPU via
 * uProgress. Nothing rewrites the position buffer per frame, so cost is flat
 * regardless of particle count.
 */

export const morphVertex = /* glsl */ `
  uniform float uProgress;      // 0..3 across the four stages
  uniform float uSize;
  uniform vec3  uCursor;        // world-space cursor
  uniform float uCursorRadius;
  uniform float uPush;
  uniform float uHoverSide;     // -1 left, +1 right, 0 none
  uniform float uTreeMix;       // 1 once the tree stage is reached
  uniform float uTime;

  attribute vec3  aMolecule;
  attribute vec3  aSphere;
  attribute vec3  aTree;
  attribute float aSide;
  attribute float aSeed;

  varying float vHighlight;
  varying float vDepth;

  void main() {
    // Stage blend. position holds stage 0 (attractor).
    float p = clamp(uProgress, 0.0, 3.0);
    float stage = floor(p);
    float t = smoothstep(0.0, 1.0, fract(p));

    vec3 a = position;
    vec3 b = aMolecule;
    if (stage >= 1.0) { a = aMolecule; b = aSphere; }
    if (stage >= 2.0) { a = aSphere;   b = aTree;   }
    if (stage >= 3.0) { a = aTree;     b = aTree;   }

    vec3 pos = mix(a, b, t);

    // Drift: keeps the cloud alive between stages so it never looks frozen.
    float breathe = (1.0 - uTreeMix) * 0.05;
    pos += vec3(
      sin(uTime * 0.6 + aSeed * 6.283),
      cos(uTime * 0.5 + aSeed * 4.712),
      sin(uTime * 0.4 + aSeed * 2.094)
    ) * breathe;

    // Cursor repulsion, applied after the morph so it works at any stage.
    vec3 toCursor = pos - uCursor;
    float d = length(toCursor);
    float influence = 1.0 - smoothstep(0.0, uCursorRadius, d);
    pos += normalize(toCursor + 1e-5) * influence * uPush * uTreeMix;

    // Highlight the hovered half once the tree exists.
    vHighlight = uTreeMix * step(0.5, aSide * uHoverSide) + influence * 0.6;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mv.z;
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

  void main() {
    // Round, soft-edged points; discard the corners of the quad.
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, r);

    vec3 col = mix(uColor, uAccent, clamp(vHighlight, 0.0, 1.0));
    // Fade with distance so the cloud has depth rather than reading flat.
    float fog = 1.0 - smoothstep(6.0, 22.0, vDepth);

    gl_FragColor = vec4(col, alpha * uOpacity * fog * 0.5);
  }
`;
