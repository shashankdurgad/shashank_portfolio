"use client";

import { useProjectStore } from "@/lib/projectStore";
import { ProjectCard } from "./ProjectCard";

/** Subscribes to the hover store and renders the card outside the Canvas. */
export function ProjectCardHost() {
  const hovered = useProjectStore((s) => s.hovered);
  return <ProjectCard id={hovered} />;
}
