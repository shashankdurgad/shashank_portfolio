"use client";

import type { ComponentType } from "react";
import type { ReadoutKind, ReadoutProps, ReadoutSpec } from "@/content/types";
import { Bars, Flow, Lattice, Orbit, Scatter, Waveform } from "./primitives";

/**
 * The preset library. Adding a new visual vocabulary = one entry here;
 * every project/role can then reference it by name from content/*.ts.
 */
export const READOUTS: Record<ReadoutKind, ComponentType<ReadoutProps>> = {
  waveform: Waveform,
  lattice: Lattice,
  orbit: Orbit,
  flow: Flow,
  bars: Bars,
  scatter: Scatter,
};

/**
 * Resolve a spec to a component. Presets and the custom escape hatch come
 * out of the same call, so nothing downstream branches on project identity.
 */
export function resolveReadout(spec: ReadoutSpec): ComponentType<ReadoutProps> {
  if (spec.kind === "custom") return spec.component;
  return READOUTS[spec.kind] ?? Waveform;
}

export { Bars, Flow, Lattice, Orbit, Scatter, Waveform };
