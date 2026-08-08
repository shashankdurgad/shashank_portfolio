import type { ComponentType } from "react";

/** Accent colours available to a 3D readout. */
export type Accent = "cyan" | "arc" | "amber";

/**
 * Props every readout primitive receives. Custom scenes get the same shape,
 * so presets and bespoke components are interchangeable.
 */
export type ReadoutProps = {
  /** 0..1 — how "live" this readout is; 1 when its section is centred. */
  focus: number;
  accent: Accent;
  /** 0..1 scales instance counts, already multiplied by the quality tier. */
  density: number;
  seed: number;
};

export type ReadoutKind =
  | "waveform"
  | "lattice"
  | "orbit"
  | "flow"
  | "bars"
  | "scatter";

/**
 * A readout is either a named preset or a custom component.
 * The custom branch is the escape hatch for a flagship project that
 * outgrows the presets — it renders through the same code path.
 */
export type ReadoutSpec =
  | { kind: ReadoutKind; density?: number; accent?: Accent; seed?: number }
  | {
      kind: "custom";
      component: ComponentType<ReadoutProps>;
      density?: number;
      accent?: Accent;
      seed?: number;
    };

export type Project = {
  id: string;
  title: string;
  /** Short label under the FIG number, e.g. "collision avoidance". */
  subtitle: string;
  blurb: string;
  bullets: string[];
  tags: string[];
  award?: string;
  period: string;
  links?: { repo?: string; live?: string; paper?: string };
  readout: ReadoutSpec;
};

export type Role = {
  id: string;
  company: string;
  title: string;
  period: string;
  location: string;
  stack: string[];
  bullets: string[];
  readout: ReadoutSpec;
};

export type SkillGroup = {
  id: string;
  label: string;
  items: string[];
};

export type Education = {
  id: string;
  institution: string;
  qualification: string;
  period: string;
  location: string;
  detail: string[];
};
