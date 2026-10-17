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
  detail: string[];
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
      "Moderated a fireside chat with the ex-COO of Citadel Securities on data and AI infrastructure.",
      "Helped organise Project Labs: a 6-week data science project build for 100+ students.",
      "Runs hiring, outreach and the workshop and speaker programme for the academic year.",
    ],
  },
  {
    id: "ai-society",
    name: "UCL AI Society",
    role: "First-Year Representative (Events)",
    period: "Dec 2025 — Jun 2026",
    kind: "leadership",
    detail: [
      "Spearheaded the society's HCI research track through UCL Nexus Labs — the published work itself sits on the Avenir-UX card above.",
    ],
  },
  {
    id: "foundry",
    name: "Foundry Labs",
    role: "Cohort 4",
    kind: "cohort",
    detail: ["Selected into UCL's startup incubator cohort, building Onflow through the founder programme."],
  },
  {
    id: "bsa",
    name: "Bloomsbury Startup Academy",
    role: "Cohort member",
    kind: "cohort",
    award: "Demo Day Winner",
    detail: ["Pitched Onflow through the programme and won 1st Place at Demo Day."],
  },
  {
    id: "ucl-entrepreneurs",
    name: "UCL Entrepreneurs",
    role: "Member",
    kind: "cohort",
    detail: ["Student-run founder society; the peer group behind the UCL startup ecosystem."],
  },
  {
    id: "pg-insight",
    name: "P&G Virtual Insight Week",
    role: "Selected cohort",
    period: "8 – 11 Jun 2026",
    kind: "exposure",
    detail: [
      "Sessions with P&G leaders including the UK Managing Director: commercial thinking, decision-making under uncertainty, personal branding.",
    ],
  },
];
