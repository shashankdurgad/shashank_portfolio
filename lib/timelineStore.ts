"use client";

import { create } from "zustand";

/**
 * Which timeline node is hovered.
 *
 * The hover is detected inside the Canvas but the detail card renders outside
 * it, as ordinary DOM — a store is the simplest bridge across that boundary.
 * Unlike the per-frame scroll values, this changes only when the pointer moves
 * between nodes, so driving React from it costs nothing.
 */
type TimelineStore = {
  hovered: string | null;
  setHovered: (id: string | null) => void;
};

export const useTimelineStore = create<TimelineStore>((set) => ({
  hovered: null,
  setHovered: (hovered) => set((s) => (s.hovered === hovered ? s : { hovered })),
}));
