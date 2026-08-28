/**
 * Work and education, newest first.
 *
 * Carried over from v1/lib/timelineData.ts. That file ordered oldest-to-newest
 * because a 3D timeline was traversed chronologically; a page reads the other
 * way round, so the order is reversed here and nothing sorts at runtime.
 */

export type TimelineEntry = {
  id: string;
  period: string;
  org: string;
  role: string;
  location: string;
  kind: "work" | "education";
  detail: string[];
  stack?: string[];
};

export const TIMELINE: TimelineEntry[] = [
  {
    id: "overmind",
    period: "Jul 2026 — Present",
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
  {
    id: "onflow-role",
    period: "Oct 2025 — Jul 2026",
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
    id: "ucl",
    period: "Sep 2025 — Jun 2028",
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
    id: "acs",
    period: "Jan 2017 — Dec 2022",
    org: "Anglo-Chinese School (Independent)",
    role: "International Baccalaureate — 42/45",
    location: "Singapore",
    kind: "education",
    detail: [
      "Vice-Chairman, Robotics Technology Society",
      "Head of Operations, Young Entrepreneurs' Society",
    ],
  },
];
