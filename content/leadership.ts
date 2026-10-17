/**
 * Leadership, cohorts and exposure, newest first.
 *
 * A new v3 module: the timeline carries roles, but a page also needs the
 * organising behind them, and folding it into the timeline entries buried the
 * best lines (the Citadel fireside chat sat in a detail array nobody scrolled
 * to). Three kinds keep the honesty gradient visible: `leadership` is a role
 * held and responsibilities carried; `cohort` is a selective programme
 * completed; `exposure` is sessions attended, not a job. Nothing here
 * upgrades a badge into a title.
 *
 * Where the society research actually went, it lives on the project card
 * (Avenir-UX), and the entry says so rather than recounting it.
 */

export type LeadershipEntry = {
  id: string;
  name: string;
  role: string;
  period?: string;
  kind: "leadership" | "cohort" | "exposure";
  /**
   * One line, ≤12 words — the 2026-10 word budget. Optional because a card
   * whose award badge already carries the claim needs no bullet.
   */
  detail?: string[];
  /** Programme honours, rendered with the award badge idiom. */
  award?: string;
};

export const LEADERSHIP: LeadershipEntry[] = [
  {
    id: "dss",
    name: "UCL Data Science Society",
    role: "Vice-President & First-Year Representative",
    period: "Nov 2025 — Present",
    kind: "leadership",
    detail: [
      "Ran the society's programme; moderated a fireside chat with Citadel Securities' ex-COO.",
    ],
  },
  {
    id: "ai-society",
    name: "UCL AI Society",
    role: "First-Year Representative (Events)",
    period: "Dec 2025 — Jun 2026",
    kind: "leadership",
    detail: [
      "Built the society's HCI research track — the paper sits on the Avenir-UX card.",
    ],
  },
  {
    id: "foundry",
    name: "Foundry Labs",
    role: "Cohort 4",
    kind: "cohort",
    detail: ["UCL's startup incubator cohort — built Onflow inside the founder programme."],
  },
  {
    id: "bsa",
    name: "Bloomsbury Startup Academy",
    role: "Cohort member",
    kind: "cohort",
    award: "Demo Day Winner",
    // No detail line: the award badge already says it won Demo Day, and a
    // bullet restating the badge is exactly the padding this section is cut
    // of. Pitched Onflow; won. The badge is the sentence.
  },
  {
    id: "ucl-entrepreneurs",
    name: "UCL Entrepreneurs",
    role: "Member",
    kind: "cohort",
    detail: ["Founder society; the peer group behind UCL's startup scene."],
  },
  {
    id: "pg-insight",
    name: "P&G Virtual Insight Week",
    role: "Selected cohort",
    period: "8 – 11 Jun 2026",
    kind: "exposure",
    detail: ["Sessions with P&G leaders including the UK Managing Director."],
  },
];
