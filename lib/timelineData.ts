/**
 * Work and education entries, in chronological order.
 *
 * Transcribed from CONTENT.md, which is the archive of what used to live in
 * content/resume.ts. The two hackathon projects recorded there are left out
 * deliberately: the right-hand door is labelled "Projects" and owns them, so
 * repeating them here would duplicate that section.
 */

export type TimelineEntry = {
  id: string;
  /** Short label rendered at the node itself. Kept terse — it sits in 3D. */
  short: string;
  /** Date range as displayed. */
  period: string;
  /** Sort key: start of the period, as YYYY-MM. */
  start: string;
  org: string;
  role: string;
  location: string;
  kind: "work" | "education";
  /** Shown on the hover card. */
  detail: string[];
  stack?: string[];
};

/**
 * Ordered oldest to newest — the timeline is traversed chronologically, so the
 * array order is the visual order and nothing sorts it at runtime.
 */
export const TIMELINE: TimelineEntry[] = [
  {
    id: "acs",
    short: "ACS (Independent)",
    period: "Jan 2017 — Dec 2022",
    start: "2017-01",
    org: "Anglo-Chinese School (Independent)",
    role: "International Baccalaureate — 42/45",
    location: "Singapore",
    kind: "education",
    detail: [
      "Vice-Chairman, Robotics Technology Society",
      "Head of Operations, Young Entrepreneurs' Society",
    ],
  },
  {
    id: "ucl",
    short: "UCL",
    period: "Sep 2025 — Jun 2028",
    start: "2025-09",
    org: "University College London",
    role: "BSc Computer Science — Predicted First Class Honours",
    location: "London, UK",
    kind: "education",
    detail: [
      "UCL Data Science Society — Vice-President",
      "UCL AI Society — First Year Representative",
      "Foundry Labs (Cohort 4) · Bloomsbury Startup Academy (Demo Day Winner)",
    ],
  },
  {
    id: "onflow-role",
    short: "Onflow",
    period: "Oct 2025 — Jul 2026",
    start: "2025-10",
    org: "Onflow",
    role: "Founding Engineer (AI and Growth)",
    location: "London, UK",
    kind: "work",
    detail: [
      "Won 1st Place at the Bloomsbury Startup Academy Demo Day; 2nd Place at the Gemini 3 London Hackathon, judged by Google and industry leaders.",
      "Architected an agentic platform using LangChain to simulate user behaviour and generate actionable feedback, with Playwright for browser automation.",
      "Authored a white paper on simulated agentic web-use interaction.",
    ],
    stack: ["Next.js", "GitHub API", "Playwright", "LangChain", "Gemini CLI"],
  },
  {
    id: "overmind",
    short: "Overmind",
    period: "Jul 2026 — Present",
    start: "2026-07",
    org: "Overmind",
    role: "Software Engineering Intern",
    location: "London, UK",
    kind: "work",
    detail: [
      "Ran end-to-end agent optimisation experiments on the Overmind platform, driving iterative prompt/tool/logic improvements through a state-machine-based optimiser with automated eval scoring.",
      "Working full-stack on the agent improvement pipeline — from trace/dataset ingestion and data engineering through agentic optimisation experiments, model fine-tuning and production rollout.",
    ],
    stack: [
      "Python",
      "TypeScript",
      "Django",
      "Docker",
      "OpenTelemetry",
      "PostgreSQL",
      "Cursor SDK",
    ],
  },
];
