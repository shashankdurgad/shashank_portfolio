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
  init: () => void;
};

export const useQuality = create<QualityStore>((set) => ({
  // Start at "off" so SSR and first paint agree; init() upgrades on the client.
  tier: "off",
  ready: false,
  init: () => set({ tier: detectTier(), ready: true }),
}));

/** Per-tier scene budgets, read by scene components. */
export const BUDGET = {
  high: { dpr: [1, 2] as [number, number], gridDivisions: 60, wallPanels: 9, points: 900 },
  low: { dpr: [1, 1] as [number, number], gridDivisions: 28, wallPanels: 5, points: 260 },
  off: { dpr: [1, 1] as [number, number], gridDivisions: 0, wallPanels: 0, points: 0 },
} as const;
