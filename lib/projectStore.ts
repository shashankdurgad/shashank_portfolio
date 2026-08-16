"use client";

import { create } from "zustand";

/**
 * Which chip is hovered.
 *
 * The hover is detected inside the Canvas but the detail card renders outside
 * it, as ordinary DOM — a store bridges that boundary. Unlike the per-frame
 * scroll values this changes only when the pointer moves between chips, so
 * driving React from it costs nothing.
 */
type ProjectStore = {
  hovered: string | null;
  setHovered: (id: string | null) => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  hovered: null,
  setHovered: (hovered) => set((s) => (s.hovered === hovered ? s : { hovered })),
}));
