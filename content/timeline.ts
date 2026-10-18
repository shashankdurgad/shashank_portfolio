/**
 * Everything with a start and an end, for the Work section's commit graph.
 *
 * Shaped for the graph rather than for a CV: each entry belongs to a lane
 * (which branch it is drawn on), carries machine-readable months so the graph
 * can work out overlaps itself, and has a one-line summary that is the only
 * text shown until the entry is opened. `points` is the opened state, and is
 * capped at two lines by convention — the CV is where the rest lives.
 *
 * Newest first by start date. The graph does not sort.
 */

export type Lane = "work" | "study" | "society";

/** "YYYY-MM". `null` end means ongoing. */
export type Month = `${number}-${number}`;

export type TimelineEntry = {
  id: string;
  lane: Lane;
  start: Month;
  end: Month | null;
  org: string;
  role: string;
  place: string;
  /** Shown collapsed. One line, no full stop. */
  line: string;
  /** Shown expanded. At most two. */
  points?: string[];
  stack?: string[];
  /** Amber tags hung off the commit. */
  tags?: string[];
};

export const LANES: { id: Lane; label: string }[] = [
  { id: "work", label: "work" },
  { id: "study", label: "study" },
  { id: "society", label: "societies" },
];

export const TIMELINE: TimelineEntry[] = [
  {
    id: "overmind",
    lane: "work",
    start: "2026-07",
    end: "2026-09",
    org: "Overmind",
    role: "Software Engineer Intern",
    place: "London",
    line: "AI engineering copilot — observability, evals, fine-tuning",
    points: [
      "Framework-agnostic OTel pipeline across Langfuse, Braintrust, LangSmith and Galileo; trace embeddings + K-means to surface agent behaviours.",
      "BioRED fine-tune where Qwen 3.5 9B beat GPT-5.6 Terra; shipped billing, tiered limits and account sharing.",
    ],
    stack: ["Python", "TypeScript", "Django", "OpenTelemetry", "PostgreSQL"],
  },
  {
    id: "dss",
    lane: "society",
    start: "2025-11",
    end: null,
    org: "UCL Data Science Society",
    role: "Vice President",
    place: "London",
    line: "From first-year rep to VP in four months",
    points: [
      "Moderated a fireside chat with the ex-COO of Citadel Securities on data and AI infrastructure.",
      "Helped run Project Labs — 100+ students building data science projects over six weeks.",
    ],
  },
  {
    id: "onflow",
    lane: "work",
    start: "2025-10",
    end: "2026-07",
    org: "Onflow",
    role: "Founding Engineer & Growth Lead",
    place: "London",
    line: "Persona-driven browser agents that UX-test products",
    points: [
      "LangChain agents simulate users, Playwright drives the browser, GitHub API + Gemini CLI open the fix.",
      "Synthetic user testing drove a 30% conversion rate in beta.",
    ],
    stack: ["Next.js", "LangChain", "Playwright", "Gemini"],
    tags: ["1st Bloomsbury Demo Day", "2nd Gemini 3 London"],
  },
  {
    id: "ucl",
    lane: "study",
    start: "2025-09",
    end: "2028-06",
    org: "University College London",
    role: "BSc Computer Science",
    place: "London",
    line: "Predicted First Class Honours",
    points: [
      "Foundry Labs Cohort 4 · Bloomsbury Startup Academy · P&G Insight Week.",
    ],
  },
  {
    id: "108",
    lane: "work",
    start: "2025-03",
    end: "2025-04",
    org: "108 Growth Partners",
    role: "Consulting Intern",
    place: "Singapore",
    line: "Market research across 2,000+ SME owners for NYP-NACE",
  },
  {
    id: "spf",
    lane: "work",
    start: "2023-01",
    end: "2024-11",
    org: "Singapore Police Force",
    role: "Ground Response Force Officer, SC/SGT(2)",
    place: "Singapore",
    line: "Front-line response; built a Micro:bit device so officers never forget their kit",
    points: [
      "Handled urgent criminal incidents and mentored junior officers.",
      "Automated reporting in Excel; prototyped a sensor reminder device on Micro:bit.",
    ],
  },
  {
    id: "netatech",
    lane: "work",
    start: "2020-11",
    end: "2020-12",
    org: "Netatech Group",
    role: "Engineering Intern",
    place: "Singapore",
    line: "Robotic arm for a vertical-farm prototype; rebuilt the company site",
  },
  {
    id: "acs",
    lane: "study",
    start: "2017-01",
    end: "2022-12",
    org: "Anglo-Chinese School (Independent)",
    role: "International Baccalaureate",
    place: "Singapore",
    line: "42 / 45",
    points: [
      "Vice-Chairman, Robotics Technology Society · Head of Operations, Young Entrepreneurs' Society.",
    ],
    tags: ["2nd FIRST Global 2021"],
  },
];
