"use client";

import { useTimelineStore } from "@/lib/timelineStore";
import { TimelineCard } from "./TimelineCard";

/** Subscribes to the hover store and renders the card outside the Canvas. */
export function TimelineCardHost() {
  const hovered = useTimelineStore((s) => s.hovered);
  return <TimelineCard id={hovered} />;
}
