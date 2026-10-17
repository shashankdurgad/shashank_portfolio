/**
 * Work and education, newest first.
 *
 * Carried over from v1/lib/timelineData.ts. That file ordered oldest-to-newest
 * because a 3D timeline was traversed chronologically; a page reads the other
 * way round, so the order is reversed here and nothing sorts at runtime.
 *
 * v3 is the full résumé pass: seven entries instead of four. Netatech (a 2020
 * pre-university internship) was weighed and deliberately dropped — the page's
 * story runs from national service onward, and the plan's decision log records
 * the call. The Overmind entry is closed (Jul – Sep 2026): nothing on this
 * page claims a present tense it cannot hold.
 *
 * Two optional fields were added so the rail can carry more without the
 * component inventing chrome: `highlight` for the one line worth seeing first,
 * `award` for honours that belong to the role rather than to a project card.
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
  /** The single line the entry should lead with, if one deserves it. */
  highlight?: string;
  /** Honours attached to the role itself, rendered apart from the bullets. */
  award?: string;
};

export const TIMELINE: TimelineEntry[] = [
  {
    id: "overmind",
    period: "Jul 2026 — Sep 2026",
    org: "Overmind",
    role: "Software Engineering Intern",
    location: "London, UK",
    kind: "work",
    detail: [
      "Ran the BioRED fine-tuning study end to end: Qwen 3.5 9B outperformed GPT-5.6 Terra on the model the platform was serving.",
      "Built a framework-agnostic observability pipeline across OTel tracing platforms (Langfuse, Braintrust, LangSmith, Galileo), with trace embeddings and K-means clustering to detect agentic behaviours.",
      "Shipped generative evaluation pipelines, guardrails for the OTel PR agent, and ChemCrow optimiser experiments.",
      "Full-stack on the AI engineering copilot: multi-tier limits, account sharing and Baseten billing, plus Cursor SDK usage tracking and resumable agents.",
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
    role: "Founding Engineer & Growth Lead",
    location: "London, UK",
    kind: "work",
    detail: [
      "Persona-driven multimodal browser-use agents that automate UI/UX testing against live products.",
      "Synthetic automated user testing produced actionable feedback that drove 30% conversion in the preliminary beta.",
      "LangChain platform architecture; Playwright for browser automation; GitHub API and Gemini CLI closing the loop with codegen fixes.",
    ],
    // The white-paper bullet v2 carried here was dropped at the owner's
    // request: an uncited claim with no artifact behind it.
    award:
      "1st Place, Bloomsbury Startup Academy Demo Day · 2nd Place + US$30k GCP credits, Gemini 3 London Hackathon · Shortlisted for the Google AI Futures Fund",
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
      "UCL Data Science Society — Vice-President & First-Year Representative",
      "UCL AI Society — First-Year Representative",
      "Foundry Labs (Cohort 4) · Bloomsbury Startup Academy (Demo Day Winner) · UCL Entrepreneurs",
    ],
  },
  {
    id: "dss",
    period: "Nov 2025 — Present",
    org: "UCL Data Science Society",
    role: "Vice-President & First-Year Representative",
    location: "London, UK",
    kind: "work",
    detail: [
      "Workshops, speaker events, hiring and outreach for the academic year.",
    ],
    // The rail carries one line; the Leadership section carries the reel.
    highlight: "Moderated a fireside chat with the ex-COO of Citadel Securities",
  },
  {
    id: "108-growth",
    period: "Mar 2025 — Apr 2025",
    org: "108 Growth Partners",
    role: "Consulting Intern",
    location: "Singapore",
    kind: "work",
    detail: [
      "Primary market research for the NYP-NACE study: cold calling and email outreach through Apollo.io.",
      "Built the data visualisations that carried the findings to stakeholders.",
    ],
    highlight: "2,000+ SME owners surveyed",
  },
  {
    id: "spf",
    period: "Jan 2023 — Nov 2024",
    org: "Singapore Police Force",
    role: "Ground Response Force Officer, SC/Sergeant(2)",
    location: "Singapore",
    kind: "work",
    detail: [
      "Negotiation and communication on urgent criminal incidents; mentored junior officers.",
      "Volunteered the department's data automation in Excel, and prototyped a reminder device with a Micro:bit and self-produced sensors.",
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
      "Vice-Chairman of the Robotics Technology Society; Head of Operations for the Young Entrepreneurs' Society.",
    ],
  },
];
