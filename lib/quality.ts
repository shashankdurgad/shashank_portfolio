"use client";

import { create } from "zustand";

/**
 * Scene complexity tiers.
 *  high — desktop, DPR up to 2, full instance counts
 *  low  — mobile / weak CPU, DPR 1, reduced instances
 *  off  — reduced-motion or no WebGL: the canvas never mounts
 */
export type Tier = "high" | "low" | "off";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function detectTier(): Tier {
  if (typeof window === "undefined") return "off";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
  if (!hasWebGL()) return "off";

  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || cores <= 4) return "low";

  return "high";
}

type QualityStore = {
  tier: Tier;
  /** false until detectTier has run on the client */
  ready: boolean;
  /** 0..100, published from inside the Canvas by drei's useProgress */
  progress: number;
  /** true once the scene has loaded and the boot overlay has been dismissed */
  booted: boolean;
  /**
   * true once the overlay has finished fading out and the hero is actually
   * visible.
   *
   * Distinct from `booted`, which only starts the exit animation — anything
   * that needs the reader to *see* it must wait for this instead. The eyes'
   * greeting keyed off `booted` at first and played out entirely behind the
   * overlay.
   */
  uncovered: boolean;
  init: () => void;
  setProgress: (progress: number) => void;
  setBooted: () => void;
  setUncovered: () => void;
};

export const useQuality = create<QualityStore>((set) => ({
  // Start at "off" so SSR and first paint agree; init() upgrades on the client.
  tier: "off",
  ready: false,
  progress: 0,
  booted: false,
  uncovered: false,
  init: () => {
    const tier = detectTier();
    // With no canvas there is nothing to wait for — never gate these users
    // behind a loader that has no progress to report.
    const off = tier === "off";
    set({ tier, ready: true, booted: off, uncovered: off });
  },
  setProgress: (progress) => set({ progress }),
  setBooted: () => set({ booted: true }),
  setUncovered: () => set({ uncovered: true }),
}));

/** Per-tier scene budgets, read by scene components. */
export const BUDGET = {
  high: { dpr: [1, 2] as [number, number], gridDivisions: 60, wallPanels: 9, stars: 1400 },
  low: { dpr: [1, 1] as [number, number], gridDivisions: 28, wallPanels: 5, stars: 500 },
  off: { dpr: [1, 1] as [number, number], gridDivisions: 0, wallPanels: 0, stars: 0 },
} as const;
