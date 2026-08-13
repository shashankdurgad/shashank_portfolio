"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProceduralEyeSource } from "@/lib/eyeGeometry";
import { eyePositions } from "@/lib/eyeTargets";
import { createBlink, createGaze, stepBlink, stepGaze } from "@/lib/gaze";
import { haloPositions } from "@/lib/haloTargets";
import { timelinePositions } from "@/lib/timelineCurve";
import { TIMELINE_ORIGIN } from "./Timeline";
import { Doors } from "./Doors";
import { PARTICLES, rng, scatterDirections } from "@/lib/morphTargets";
import { scroll } from "@/lib/scrollStore";
import { morphFragment, morphVertex } from "./morph.glsl";

/**
 * Fixed world position. The field used to ride the camera, which made the
 * subject drift across the viewport as you scrolled; it is now static in 3D
 * space and does not rotate at all.
 */
const FIELD_POSITION = new THREE.Vector3(0, 1.5, 0);

/**
 * Morph range over which the lids close, ahead of the blast.
 *
 * The window has to be wide enough to actually be sampled. uProgress chases
 * scroll.morph with an exponential ease, and the hero's ScrollTrigger jumps
 * morph from 0 to ~0.45 in one step when its pinned region releases — so a
 * close packed into the first few hundredths would be skipped over entirely
 * and the shut eye would never be seen. Closing across 0..0.4 keeps the lids
 * on screen for the whole approach, and the blast waits for them (see
 * BLAST_START in morph.glsl).
 */
const CLOSE_FROM = 0.0;
const CLOSE_TO = 0.4;

/**
 * Virtual distance to the cursor plane used when solving gaze angles. See the
 * note at the solve — this trades literal accuracy for a gaze that stays
 * expressive across the whole viewport instead of clamping at the edges.
 */
const GAZE_DEPTH = 9;

const cursorPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
const localCursor = new THREE.Vector3();
const camDir = new THREE.Vector3();
const planeNormal = new THREE.Vector3();
const pointer = new THREE.Vector2();

function makeUniforms(detail: "high" | "low") {
  return {
    uProgress: { value: 0 },
    /*
     * Smaller sprites than the bust used. At dpr 1 a 2.2 sprite draws ~9px
     * across, large enough that individual particles read as discrete dots
     * rather than a volume. Measured coverage at the old settings was ~22x —
     * far more overlap than the look needs — so trading size for count keeps
     * the cloud dense while making its grain finer.
     */
    uSize: { value: detail === "high" ? 1.4 : 2.2 },
    uCursor: { value: new THREE.Vector3(999, 999, 999) },
    uCursorRadius: { value: 0.38 },
    uPush: { value: 0.3 },
    uHoverSide: { value: 0 },
    uHoverGrow: { value: 0 },
    uThreadMix: { value: 0 },
    uTreeMix: { value: 0 },
    uTime: { value: 0 },
    uForm: { value: 1 },
    uColor: { value: new THREE.Color("#57a8cf") },
    uAccent: { value: new THREE.Color("#2bb8d4") },
    /*
     * The low tier packs a third of the particles into the same volume with
     * larger points, so additive blending saturates the pupil far sooner.
     * A lower gain there keeps it bright without blowing out to flat white.
     */
    uPupilGain: { value: detail === "high" ? 1.15 : 0.8 },
    uOpacity: { value: 0 },
    uGazeL: { value: new THREE.Vector2(0, 0) },
    uGazeR: { value: new THREE.Vector2(0, 0) },
    uBlink: { value: 0 },
  };
}

/**
 * eyes → explosion → doors.
 *
 * One particle system whose targets change; particles never spawn or die, so
 * the sequence reads as the same matter rearranging. The explosion is
 * procedural (see the vertex shader) rather than a third target buffer.
 *
 * The eyes track the cursor with saccadic physics (lib/gaze.ts) and blink on
 * their own. Drag-to-spin is deliberately absent: an eye that can be spun
 * horizontally stops reading as an eye.
 */
export function MorphField({
  detail,
  onSelect,
}: {
  detail: "high" | "low";
  onSelect: (side: "left" | "right") => void;
}) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [hoverSide, setHoverSide] = useState(0);

  /** One gaze state per eye, seeded apart so they never move in lockstep. */
  const gazeL = useRef(createGaze(0));
  const gazeR = useRef(createGaze(1));
  const blink = useRef(createBlink());

  /**
   * Pointer in normalised device coordinates, tracked from the window rather
   * than read off R3F's `state.pointer`.
   *
   * The Canvas sits at pointer-events:none with the page content above it, so
   * R3F's own pointer never updates — the events land on the HTML overlay, not
   * the canvas, and R3F discards them. The eyes must follow the cursor
   * everywhere on the page, including over the text, so a plain window
   * listener is both simpler and more correct than routing through hit-testing.
   */
  const ndc = useRef({ x: 0, y: 0, seen: false });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ndc.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndc.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      ndc.current.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const count = detail === "high" ? PARTICLES.high : PARTICLES.low;

  // Sized by width, not height — see eyePositions. 2.9 puts the pair in the
  // horizontal slot the bust occupied between the two text columns.
  const eyes = useMemo(() => eyePositions(new ProceduralEyeSource(), count, 2.9), [count]);

  /*
   * The final stage is the doors, which are real geometry rather than
   * particles. The cloud becomes the atmosphere around them: a loose halo
   * framing the doorway instead of trying to be a shape itself.
   */
  const halo = useMemo(() => haloPositions(count), [count]);

  /*
   * Where the halo goes once a door is entered. Offset to the timeline group's
   * own origin, since these are positions in the field's local space and the
   * thread is drawn as a separate group.
   */
  const thread = useMemo(() => {
    const p = timelinePositions(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] += TIMELINE_ORIGIN[0];
      p[i * 3 + 1] += TIMELINE_ORIGIN[1] - 1.5;
      p[i * 3 + 2] += TIMELINE_ORIGIN[2];
    }
    return p;
  }, [count]);

  /** 0 until the doors are on screen; gates their interactivity. */
  const doorsVisible = useRef(0);

  const scatter = useMemo(() => scatterDirections(count), [count]);
  const seeds = useMemo(() => {
    const r = rng(5);
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = r();
    return a;
  }, [count]);

  const initialUniforms = useMemo(() => makeUniforms(detail), [detail]);

  /**
   * Sized to sit between two flanking text columns. On a narrow viewport the
   * copy stacks on top instead, so it has to shrink or it swallows the
   * headline.
   *
   * The mid tier is tighter than the bust's was: two eyes span wider than one
   * head at the same height, and at 1024px the pair was reaching into the
   * columns.
   */
  const [fieldScale, setFieldScale] = useState(1.15);
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      setFieldScale(w < 640 ? 0.62 : w < 1024 ? 0.78 : 1.15);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /**
   * Cursor affordance: pointer over a door. There is no longer a grab state —
   * the eyes are not draggable, so advertising a grab would be a lie.
   *
   * Setting `body.style.cursor` would shadow the crosshair defined in
   * globals.css, so a data attribute drives it from CSS instead — the
   * crosshair stays the baseline and this is a variant of it.
   */
  useEffect(() => {
    if (!hoverSide) {
      delete document.body.dataset.cursor;
      return;
    }
    document.body.dataset.cursor = "target";
    return () => {
      delete document.body.dataset.cursor;
    };
  }, [hoverSide]);

  useFrame((state, delta) => {
    /*
     * Writing uniform values on the three.js material each frame is the
     * standard R3F pattern — it drives the GPU without re-rendering React.
     * The immutability rule cannot tell "reassigning a ref" from "mutating
     * the object a ref points at", so it is disabled for this block only.
     */
    const u = matRef.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;

    const target = THREE.MathUtils.clamp(scroll.morph, 0, 2);
    u.uProgress.value += (target - u.uProgress.value) * Math.min(1, delta * 3.4);

    const p = u.uProgress.value;

    /*
     * How far into the timeline region the page has scrolled.
     *
     * The doors and the halo both fade out on this. morph is clamped at 2 and
     * simply stays there, so keying off it alone left them mounted forever —
     * the camera then flew through the doors at point-blank range once the
     * timeline began, smearing the panels and their labels across the frame.
     */
    const leaving = THREE.MathUtils.smoothstep(scroll.timeline, 0.0, 0.05);

    // The halo gathers into the thread as the flight carries the camera
    // through, so the doorway's atmosphere becomes the line beyond it.
    u.uThreadMix.value = scroll.doorFlight;
    u.uTreeMix.value = THREE.MathUtils.smoothstep(p, 1.6, 1.95);
    // Depth-fading only applies while the eyes are a coherent surface. Held
    // until the lids have shut, so the closed pose keeps its silhouette.
    u.uForm.value = 1 - THREE.MathUtils.smoothstep(p, 0.42, 0.75);

    /*
     * Visible from the hero onward, then dimmed as the doors take over.
     *
     * The fade used to begin at 2.05, but uProgress is clamped to 2 — so it
     * never ran, and the cloud stayed at full strength behind the doors as a
     * pair of bright blobs. It now settles to a faint atmosphere instead of
     * competing with the thing it is meant to frame.
     */
    /*
     * `leaving` fades the halo out as the timeline section is scrolled into.
     * Going through a door is the exception: there the same particles become
     * the thread, so fading them would erase the very thing being formed.
     */
    const vis =
      (1 - THREE.MathUtils.smoothstep(p, 1.6, 1.95) * 0.55) *
      (1 - leaving * (1 - scroll.doorFlight));
    u.uOpacity.value += (vis - u.uOpacity.value) * Math.min(1, delta * 4);

    /*
     * Fade the doors in as the final stage arrives. They are geometry, so
     * their own materials handle the fade — this only gates interactivity and
     * tells them how far along the stage is.
     */
    doorsVisible.current =
      THREE.MathUtils.smoothstep(p, 1.6, 1.95) *
      (1 - leaving) *
      // Fade as the camera passes the door plane, so the panels do not hang
      // in frame behind the viewer once they are through.
      (1 - THREE.MathUtils.smoothstep(scroll.doorFlight, 0.45, 0.9));

    /*
     * Ease the hover grow rather than snapping it, which would pop. Faster in
     * than out so the halo answers the pointer promptly but settles back
     * unhurriedly — the reverse reads as sluggish then twitchy.
     *
     * Driven off the uniform rather than the React state: it already carries
     * the hovered side, which keeps the frame loop free of the closure.
     */
    const wantGrow = u.uHoverSide.value === 0 ? 0 : 1;
    const growRate = wantGrow > u.uHoverGrow.value ? 11 : 7;
    u.uHoverGrow.value +=
      (wantGrow - u.uHoverGrow.value) * Math.min(1, delta * growRate);

    if (group.current) {
      // Cursor plane faces the camera through the field's centre. The group
      // never rotates now, so the hit point needs no un-rotation to reach
      // local space — only the offset from the field's origin.
      state.camera.getWorldDirection(camDir);
      planeNormal.copy(camDir).negate();
      cursorPlane.setFromNormalAndCoplanarPoint(planeNormal, group.current.position);

      pointer.set(ndc.current.x, ndc.current.y);
      state.raycaster.setFromCamera(pointer, state.camera);

      /*
       * Gaze only runs once the pointer has actually moved. Before that the
       * eyes hold their rest pose rather than snapping to screen centre —
       * which is where an untouched pointer would otherwise aim them.
       */
      if (ndc.current.seen && state.raycaster.ray.intersectPlane(cursorPlane, hitPoint)) {
        localCursor.copy(hitPoint).sub(group.current.position).divideScalar(fieldScale);
        u.uCursor.value.lerp(localCursor, Math.min(1, delta * 9));

        /*
         * Aim each eye at the cursor from its own socket, so both eyes
         * converge on the same point and toe in slightly when it is close.
         * Solving per-eye rather than sharing one angle is what makes the
         * convergence read at all.
         */
        for (const [g, side] of [
          [gazeL.current, -1],
          [gazeR.current, 1],
        ] as const) {
          const dx = localCursor.x - side * eyes.separation;
          const dy = localCursor.y;
          /*
           * +Z is toward the camera, so the eye looks along +Z at rest.
           *
           * GAZE_DEPTH is deliberately larger than the camera's actual 4-unit
           * distance. Solving against the true distance demands angles far past
           * the anatomical limit for any cursor off centre, so the eyes clamp
           * and stop differentiating across most of the screen. Pushing the
           * virtual target back compresses the whole viewport into the usable
           * cone, so motion stays legible corner to corner.
           */
          const dz = Math.max(0.5, localCursor.z + GAZE_DEPTH);
          stepGaze(g, Math.atan2(dx, dz), -Math.atan2(dy, dz), delta, state.clock.elapsedTime);
        }
      }

      // Lids close as the blast begins, on top of the idle blink timer.
      const close = THREE.MathUtils.smoothstep(p, CLOSE_FROM, CLOSE_TO);
      u.uBlink.value = stepBlink(blink.current, delta, close);

      u.uGazeL.value.set(gazeL.current.yaw, gazeL.current.pitch);
      u.uGazeR.value.set(gazeR.current.yaw, gazeR.current.pitch);
    }
    if (process.env.NODE_ENV !== "production" && group.current) {
      // Test hook: lets a browser assert the field is genuinely static and
      // that the gaze is live, neither of which pixel-diffing can show while
      // particles animate every frame.
      (window as unknown as { __field?: unknown }).__field = {
        x: +group.current.position.x.toFixed(4),
        y: +group.current.position.y.toFixed(4),
        z: +group.current.position.z.toFixed(4),
        rotY: +group.current.rotation.y.toFixed(4),
        camX: +state.camera.position.x.toFixed(3),
        camZ: +state.camera.position.z.toFixed(3),
        gazeL: [+gazeL.current.yaw.toFixed(4), +gazeL.current.pitch.toFixed(4)],
        gazeR: [+gazeR.current.yaw.toFixed(4), +gazeR.current.pitch.toFixed(4)],
        blink: +blink.current.value.toFixed(4),
        cursor: [+localCursor.x.toFixed(3), +localCursor.y.toFixed(3)],
        morph: +p.toFixed(4),
        doors: +doorsVisible.current.toFixed(4),
        doorAngle: +(
          (window as unknown as { __doorAngle?: number }).__doorAngle ?? 0
        ).toFixed(4),
        hoverSide: u.uHoverSide.value,
        hoverGrow: +u.uHoverGrow.value.toFixed(4),
      };
    }
  });

  return (
    <group ref={group} position={FIELD_POSITION} scale={fieldScale}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[eyes.positions, 3]} />
          <bufferAttribute attach="attributes-aNormal" args={[eyes.normals, 3]} />
          <bufferAttribute attach="attributes-aScatter" args={[scatter, 3]} />
          <bufferAttribute attach="attributes-aTree" args={[halo.positions, 3]} />
          <bufferAttribute attach="attributes-aThread" args={[thread, 3]} />
          <bufferAttribute attach="attributes-aSide" args={[halo.sides, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
          <bufferAttribute attach="attributes-aEye" args={[eyes.eye, 1]} />
          <bufferAttribute attach="attributes-aPart" args={[eyes.part, 1]} />
          <bufferAttribute attach="attributes-aLid" args={[eyes.lid, 1]} />
          <bufferAttribute attach="attributes-aSocket" args={[eyes.socket, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={morphVertex}
          fragmentShader={morphFragment}
          uniforms={initialUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <Doors visible={doorsVisible} onSelect={onSelect} onHover={setHoverSide} />

    </group>
  );
}
