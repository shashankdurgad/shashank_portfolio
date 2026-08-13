"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import { nodePosition, nodeSide, nodeT, timelineCurve } from "@/lib/timelineCurve";
import { TIMELINE, type TimelineEntry } from "@/lib/timelineData";

/**
 * The work and education timeline: a thread receding into depth with a node
 * per entry, traversed by scrolling.
 *
 * Structure follows the Doctor Strange reference — a line drawn in the air
 * that the viewer travels along rather than a diagram they read across. The
 * line reveals progressively as you advance, so the past is drawn and the
 * future is not yet there.
 */

/**
 * Where the thread sits in world space.
 *
 * Must match TIMELINE_ORIGIN in Rig: the camera reads positions straight off
 * the same curve, so if the two disagree it flies alongside the thread rather
 * than along it.
 */
export const TIMELINE_ORIGIN: [number, number, number] = [0, 1.5, -2.5];

/** The group's offset, as a vector — for projecting nodes into screen space. */
const originVec = new THREE.Vector3(...TIMELINE_ORIGIN);

/** How many samples the drawn line uses. Enough that the curve reads smooth. */
const LINE_SAMPLES = 260;

/** Node label size, and the offset from the line to its label. */
const worldPos = new THREE.Vector3();
const projected = new THREE.Vector3();

const LABEL_SIZE = 0.075;
const LABEL_OFFSET = 0.34;

/**
 * One node: a marker, an always-visible short label, and a detail card on
 * hover.
 */
function Node({
  entry,
  index,
  progress,
  active,
}: {
  entry: TimelineEntry;
  index: number;
  /** 0..1 along the whole timeline. Read per frame, never during render. */
  progress: React.RefObject<number>;
  active: boolean;
}) {
  const marker = useRef<THREE.Mesh>(null);
  const labels = useRef<THREE.Group>(null);
  const shortRef = useRef<{ fillOpacity: number } | null>(null);
  const periodRef = useRef<{ fillOpacity: number } | null>(null);
  const pos = useMemo(() => nodePosition(index), [index]);
  const side = nodeSide(index);

  /*
   * How far ahead of the current position this node still is. Nodes fade and
   * shrink in as they are reached, so the timeline builds rather than sitting
   * fully drawn from the start.
   */
  const t = nodeT(index);

  /*
   * Everything that depends on scroll is written here rather than derived
   * during render. The progress ref changes every frame and React is never
   * told, so a value read at render time would freeze at whatever it was when
   * the component last re-rendered.
   */
  useFrame((state) => {
    const p = progress.current ?? 0;
    const ahead = THREE.MathUtils.clamp((t - p) * 6, 0, 1);

    /*
     * Hold the labels at a constant size on screen.
     *
     * Left to perspective, a label's size encodes its distance from the
     * camera: the node being read renders large and the next one along
     * renders tiny, so type size reads as importance when it only means
     * proximity. Scaling by distance cancels that out, so every entry is
     * typeset the same and the thread carries the depth instead.
     */
    if (labels.current) {
      const d = state.camera.position.distanceTo(labels.current.getWorldPosition(worldPos));
      labels.current.scale.setScalar(THREE.MathUtils.clamp(d / 4, 0.55, 2.4));
      // Face the camera, so labels never skew as the path curves away.
      labels.current.quaternion.copy(state.camera.quaternion);
    }

    if (marker.current) {
      const s = (1 - ahead) * (active ? 1.5 : 1);
      marker.current.scale.setScalar(Math.max(0.001, s));
      const m = marker.current.material as THREE.MeshBasicMaterial;
      m.opacity = 1 - ahead;
    }

    const fade = 1 - ahead;
    if (shortRef.current) shortRef.current.fillOpacity = fade;
    if (periodRef.current) periodRef.current.fillOpacity = fade;
  });

  return (
    <group position={pos}>
      <mesh ref={marker}>
        {/* Small in world units but close to the camera, so it still presents
            a comfortable hit area on screen. */}
        <octahedronGeometry args={[0.055, 0]} />
        <meshBasicMaterial
          color={active ? "#7dd3fc" : "#2bb8d4"}
          wireframe
          transparent
          opacity={0}
        />
      </mesh>

      {/*
        Short label, always on. Held at a constant screen size and turned to
        face the camera — see the scaling note in the frame loop.
      */}
      <group ref={labels} position={[side * LABEL_OFFSET, 0.1, 0]}>
        <Text
          ref={shortRef as never}
          fontSize={LABEL_SIZE}
          anchorX={side < 0 ? "right" : "left"}
          anchorY="bottom"
          color="#cbd5e1"
          fillOpacity={0}
          letterSpacing={0.06}
        >
          {entry.short}
        </Text>
        <Text
          ref={periodRef as never}
          position={[0, -0.06, 0]}
          fontSize={LABEL_SIZE * 0.62}
          anchorX={side < 0 ? "right" : "left"}
          anchorY="top"
          color="#64748b"
          fillOpacity={0}
          letterSpacing={0.08}
        >
          {entry.period}
        </Text>
      </group>

    </group>
  );
}

/**
 * Which entry the card shows: whichever node the camera is at, with an
 * explicit hover taking precedence.
 *
 * Hover alone was the wrong mechanism for this section. Scrolling is how the
 * timeline is read, and scrolling moves the nodes — so a stationary cursor
 * that was over a node ends up beside it and the card vanishes mid-read. The
 * reader would have to chase markers with the pointer while scrolling with the
 * other hand.
 *
 * Driving selection from scroll position matches the gesture the section is
 * already built around, and works on touch, where there is no hover at all.
 * Pointing at a node still overrides it, so peeking ahead or back is possible.
 *
 * The hit test is done in screen space rather than through R3F's events: the
 * canvas is pointer-events:none so the page above stays clickable, which means
 * pointer events land on the HTML sections and `onPointerOver` never fires.
 */
const HIT_RADIUS_PX = 46;

function useNodeHover(
  progress: React.RefObject<number>,
  visible: React.RefObject<number>,
  onHover: (id: string | null) => void,
) {
  const [hovered, setHovered] = useState<string | null>(null);
  const pointer = useRef<{ x: number; y: number; seen: boolean }>({
    x: 0,
    y: 0,
    seen: false,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state) => {
    /*
     * Only the section's visibility gates selection now. Waiting for a pointer
     * event as well would leave the card blank for anyone who scrolls in
     * without moving the mouse — and on touch, where no such event ever
     * arrives, permanently.
     */
    if ((visible.current ?? 0) < 0.5) {
      if (hovered !== null) {
        setHovered(null);
        onHover(null);
      }
      return;
    }

    const { width, height } = state.size;
    const p = progress.current ?? 0;

    let pointed: string | null = null;
    let pointedDist = HIT_RADIUS_PX;

    /*
     * Scroll-driven default: the node nearest the camera's position along the
     * curve. Only nodes already reached are eligible — selecting one still
     * faded in ahead would name something the reader cannot yet see.
     */
    let nearest: string | null = null;
    let nearestGap = Infinity;

    for (let i = 0; i < TIMELINE.length; i++) {
      const t = nodeT(i);
      if (t > p + 0.06) continue;

      const gap = Math.abs(t - p);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = TIMELINE[i].id;
      }

      nodePosition(i, projected).add(originVec);
      projected.project(state.camera);
      // Behind the camera: project() wraps these to the far side of the frame.
      if (projected.z > 1) continue;

      const sx = (projected.x * 0.5 + 0.5) * width;
      const sy = (-projected.y * 0.5 + 0.5) * height;
      if (!pointer.current.seen) continue;
      const d = Math.hypot(sx - pointer.current.x, sy - pointer.current.y);
      if (d < pointedDist) {
        pointedDist = d;
        pointed = TIMELINE[i].id;
      }
    }

    /*
     * The scroll-driven pick is whichever reached node is closest, with no
     * proximity bound.
     *
     * Bounding it left the card blank across the gaps between nodes — measured
     * at 23% of the traverse, since entries sit 0.2 apart on the curve. A card
     * that empties itself halfway between every pair reads as broken, whereas
     * holding the last entry until the next is reached reads as "you are still
     * in this period", which is also true.
     */
    const next = pointed ?? nearest;

    if (next !== hovered) {
      setHovered(next);
      onHover(next);
    }
  });

  return hovered;
}

export function Timeline({
  progress,
  visible,
  onHover,
}: {
  /** 0..1 along the timeline, driven by scroll. */
  progress: React.RefObject<number>;
  /** 0..1 fade as the section takes over. */
  visible: React.RefObject<number>;
  /** Reports the hovered entry so the card can render outside the canvas. */
  onHover: (id: string | null) => void;
}) {
  const root = useRef<THREE.Group>(null);
  const hovered = useNodeHover(progress, visible, onHover);
  const [drawn, setDrawn] = useState(0);

  const points = useMemo(() => timelineCurve.getPoints(LINE_SAMPLES), []);

  useFrame(() => {
    const v = visible.current ?? 0;
    if (root.current) root.current.visible = v > 0.01;
    // Round to whole samples: re-slicing on every sub-pixel change would
    // rebuild the line geometry each frame for no visible gain.
    const p = progress.current ?? 0;
    const next = Math.max(2, Math.ceil(p * LINE_SAMPLES));
    if (next !== drawn) setDrawn(next);
  });

  /*
   * The line is revealed by slicing the sample array rather than by animating
   * a dash offset: the thread should not exist ahead of where you have
   * travelled, and a dashed material would still draw its full extent.
   */
  const visiblePoints = useMemo(
    () => points.slice(0, Math.max(2, drawn)),
    [points, drawn],
  );

  return (
    <group ref={root} visible={false} position={TIMELINE_ORIGIN}>
      <Line points={visiblePoints} color="#2bb8d4" lineWidth={1.6} transparent opacity={0.9} />

      {TIMELINE.map((entry, i) => (
        <Node
          key={entry.id}
          entry={entry}
          index={i}
          progress={progress}
          active={hovered === entry.id}
        />
      ))}
    </group>
  );
}
