/**
 * Work and education, oldest first.
 *
 * The experience section is a trace waterfall now (components/sections/
 * Timeline.tsx): it renders the array in order, chronologically top-to-bottom,
 * so the file is ordered the way the career happened, not the way a résumé
 * lists it. Nothing sorts at runtime.
 *
 * Dates became data because spans need geometry: the waterfall computes each
 * bar's position and width from `start`/`end`, so the human-readable period
 * ("Jul 2026 — Sep 2026") is *derived* in the component and no longer stored.
 * `end: null` means present — the live span. The ACS years (2017-01 → 2022-12)
 * also feed the piecewise axis: that era is compressed to its first 12% so the
 * six student years don't dwarf every professional span.
 *
 * The strict word budget — one ≤12-word `summary` line, ≤2 bullets of ≤12
 * words — is the owner's 2026-10 decision: a waterfall row is a glance
 * surface, and the expanded body is the deepest layer the page carries. The
 * long v3 bullets were rewritten down to it, each entry keeping the metric
 * that matters most (Qwen 3.5 9B over GPT-5.6 Terra, 2,000+ surveyed, the
 * Citadel Securities fireside, the 30% beta, $30k GCP credits). `highlight`
 * and `stack` are gone: the strongest highlight became the summary line, and
 * tech chips have no place on a span.
 *
 * Netatech (a 2020 pre-university internship) stays deliberately dropped — the
 * page's story runs from national service onward, and the plan's decision log
 * records the call. The Overmind entry stays closed (Jul – Sep 2026): nothing
 * on this page claims a present tense it cannot hold.
 */

export type TimelineEntry = {
  id: string;
  org: string;
  role: string;
  location: string;
  kind: "work" | "education";
  /** "YYYY-MM". Spans, ticks and period labels are all derived from these. */
  start: string;
  /** "YYYY-MM", or null for present — rendered as the live span. */
  end: string | null;
  /** ONE line, ≤12 words. Opens the expanded body; the row's pitch. */
  summary: string;
  /** ≤2 bullets, ≤12 words each. The metrics survive the compression. */
  detail: string[];
  /** Honours attached to the role itself; marks the bar with a ◆. */
  award?: string;
  /** Optional org links, mono + arrow in the expanded body. */
  links?: { label: string; href: string }[];
};

export const TIMELINE: TimelineEntry[] = [
  {
    id: "acs",
    org: "Anglo-Chinese School (Independent)",
    role: "International Baccalaureate — 42/45",
    location: "Singapore",
    kind: "education",
    start: "2017-01",
    end: "2022-12",
    summary: "Robotics and entrepreneurship leadership alongside the IB Diploma.",
    detail: [
      "Vice-Chairman, Robotics Technology Society",
      "Head of Operations, Young Entrepreneurs' Society",
    ],
  },
  {
    id: "spf",
    org: "Singapore Police Force",
    role: "Ground Response Force Officer, SC/Sergeant(2)",
    location: "Singapore",
    kind: "work",
    start: "2023-01",
    end: "2024-11",
    summary: "Response officer by duty; the department's data person by choice.",
    detail: [
      "Negotiation on urgent incidents; mentored junior officers",
      "Volunteered Excel data automation; built a Micro:bit reminder device",
    ],
  },
  {
    id: "108-growth",
    org: "108 Growth Partners",
    role: "Consulting Intern",
    location: "Singapore",
    kind: "work",
    start: "2025-03",
    end: "2025-04",
    summary: "2,000+ SME owners surveyed for the NYP–NACE study.",
    detail: [
      "Cold outreach through Apollo.io calls and email",
      "Built the visualisations that carried the findings to stakeholders",
    ],
  },
  {
    id: "ucl",
    org: "University College London",
    role: "BSc Computer Science — Predicted First Class Honours",
    location: "London, UK",
    kind: "education",
    // A future end date, not null: the bar clamps at the now-line but stays
    // an outlined, dotless span — a degree predicted to end, not a live role.
    start: "2025-09",
    end: "2028-06",
    summary: "Foundry Labs Cohort 4, UCL Entrepreneurs, and society leadership.",
    detail: [
      "Vice-President and First-Year Representative, Data Science Society",
      "First-Year Representative, UCL AI Society",
    ],
    // The old bullet's "(Demo Day Winner)" aside is dropped here: that win
    // is Onflow's award line below, stated once on the page.
  },
  {
    id: "onflow-role",
    org: "Onflow",
    role: "Founding Engineer & Growth Lead",
    location: "London, UK",
    kind: "work",
    start: "2025-10",
    end: "2026-07",
    summary: "Persona-driven browser-use agents; synthetic testing drove 30% beta conversion.",
    detail: [
      "Browser agents automate UI/UX testing against live products",
      "LangChain platform; Playwright automation; GitHub API and Gemini CLI fixes",
    ],
    // Kept verbatim from v3: the awards belong to the role. The uncited
    // white-paper claim stays dropped at the owner's request.
    award:
      "1st Place, Bloomsbury Startup Academy Demo Day · 2nd Place + US$30k GCP credits, Gemini 3 London Hackathon · Shortlisted for the Google AI Futures Fund",
    links: [{ label: "GitHub", href: "https://github.com/Onflow-AI" }],
  },
  {
    id: "dss",
    org: "UCL Data Science Society",
    role: "Vice-President & First-Year Representative",
    location: "London, UK",
    kind: "work",
    start: "2025-11",
    end: null,
    summary: "Moderated a fireside chat with the ex-COO of Citadel Securities.",
    detail: [
      "Workshops, speaker events, hiring and outreach for the academic year",
    ],
    // The trace marks it live with a dot; the Leadership section carries the reel.
  },
  {
    id: "overmind",
    org: "Overmind",
    role: "Software Engineering Intern",
    location: "London, UK",
    kind: "work",
    start: "2026-07",
    end: "2026-09",
    summary: "Qwen 3.5 9B outperformed GPT-5.6 Terra on BioRED fine-tuning.",
    detail: [
      "OTel observability pipeline across Langfuse, Braintrust, LangSmith, Galileo",
      "Trace embeddings and K-means clustering detected agentic behaviours",
    ],
    links: [{ label: "Website", href: "https://www.overmindlab.ai" }],
  },
];
