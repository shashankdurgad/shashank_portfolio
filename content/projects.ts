/**
 * Projects. Array order is display order, per tier: the selected projects in
 * curated sequence, then the other work.
 *
 * Carried over from v1/lib/projectData.ts. The naming question recorded in
 * v1/CONTENT.md — whether the compliance project is AIEngine or Sentrix — was
 * settled there by the repository being `w3joe/sentrix`, and stays settled.
 *
 * v3 reshapes rather than rewrites:
 * - `tier` splits the showcase cards from the compact "other work" rows, so a
 *   project can be honest about its weight without being deleted.
 * - `award` became optional. SmartBell and Tasko won nothing; a required award
 *   field is one that eventually gets invented.
 * - `repo` and `paper?` became a `links[]` list, because the newer projects
 *   need Paper and org labels and the fixed pair of slots could not say which
 *   link was which.
 * - `metrics` carries the numbers that should be read before the prose.
 * - `role` is team honesty: several repos live under collaborators' accounts
 *   or an org because these were team efforts, and where the title itself was
 *   a role, it says so.
 *
 * Repository links under a collaborator's account (desmondzee/sentinel,
 * w3joe/sentrix) point where the work actually lives, as before.
 */

export type ProjectLink = {
  kind: "repo" | "demo" | "paper" | "whitepaper" | "video";
  label: string;
  href: string;
};

export type Project = {
  id: string;
  name: string;
  summary: string;
  period: string;
  award?: string;
  tier: "selected" | "other";
  role?: string;
  detail: string[];
  stack: string[];
  /** Metrics worth glancing at before the detail lines. */
  metrics?: { value: string; label: string }[];
  links: ProjectLink[];
};

export const PROJECTS: Project[] = [
  // ---- selected: array order IS display order ----
  {
    id: "onflow",
    name: "Onflow",
    summary: "Simulated agentic web use, turned into UX feedback",
    period: "Oct 2025 – Jul 2026",
    award: "1st Place — Bloomsbury Startup Academy Demo Day",
    tier: "selected",
    role: "Founding Engineer & Growth Lead",
    detail: [
      "Live-product user simulation; traces become UX feedback and codegen fixes.",
      "LangChain agents, Playwright automation, GitHub API and Gemini CLI close the loop.",
    ],
    stack: ["Next.js", "GitHub API", "Playwright", "LangChain", "Gemini CLI"],
    metrics: [{ value: "30%", label: "beta conversion" }],
    links: [
      {
        kind: "repo",
        label: "GitHub org",
        href: "https://github.com/Onflow-AI",
      },
      {
        kind: "paper",
        label: "Paper",
        href: "https://arxiv.org/abs/2604.09581",
      },
    ],
  },
  {
    id: "buildapolicy",
    name: "BuildAPolicy",
    summary: "Two human teleop demos, turned into verified policy training data",
    period: "Sep 2026",
    tier: "selected",
    detail: [
      "Franka FR3 webcam teleop in SuperDex; a replay gate keeps only lift-and-hold demos.",
      "Daytona engine maps the robust region; synthetic data samples inside it only.",
    ],
    stack: ["Python", "Computer Vision", "Robotics Simulation", "Synthetic Data"],
    metrics: [
      { value: "289", label: "parallel replays" },
      { value: "5 → 25 mm", label: "robust region" },
      { value: "~800", label: "verified episodes/hr from 2 demos" },
    ],
    links: [
      {
        kind: "repo",
        label: "Repository",
        href: "https://github.com/shashankdurgad/buildapolicy",
      },
    ],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    summary: "Autonomous agents negotiating satellite collision avoidance",
    period: "Mar 2026",
    award: "Environment Track Winner — NVIDIA GTC Hack for Impact",
    tier: "selected",
    detail: [
      "Nemotron agents negotiate collision manoeuvres in seconds; RAG over past incidents grounds the arguments.",
      "Dual-path risk classifier: rule thresholds plus XGBoost (4 classes) over live CelesTrak/NOAA feeds.",
    ],
    stack: ["Python", "XGBoost", "NumPy", "FastAPI", "Pydantic"],
    links: [
      {
        kind: "repo",
        label: "Repository",
        href: "https://github.com/desmondzee/sentinel",
      },
    ],
  },
  {
    id: "avenir-ux",
    name: "Avenir-UX Research",
    summary: "Pixel-grounded computer-use agents as automated usability evaluators",
    period: "Dec 2025 – Jun 2026",
    tier: "selected",
    role: "First-Year Representative, UCL AI Society",
    detail: [
      "Agents operate real pages from pixels, not DOM parses, tracing each user journey.",
      "SUS + Single Ease Question protocol, through UCL Nexus Labs; co-authored work on arXiv.",
    ],
    stack: ["Python", "Computer-Use Agents", "Multimodal Grounding"],
    links: [
      {
        kind: "paper",
        label: "Paper",
        href: "https://arxiv.org/abs/2604.09581",
      },
    ],
  },

  // ---- other work: compact rows, same order rule ----
  {
    id: "sentrix",
    name: "Sentrix",
    summary: "Multi-agent compliance monitoring with a patrol swarm",
    period: "Feb – Mar 2026",
    award: "1st Place — UCL BUILD AI Festival",
    tier: "other",
    detail: [
      "LangGraph + Nemotron patrol swarm: pheromone sampling, quorum voting, 4-stage pipeline into SQLite.",
    ],
    stack: ["Python", "LangGraph", "SQLite", "NetworkX", "FastAPI"],
    links: [
      {
        kind: "repo",
        label: "Repository",
        href: "https://github.com/w3joe/sentrix",
      },
    ],
  },
  {
    id: "first-global-2021",
    name: "FIRST Global Challenge 2021",
    summary: "Team Singapore: a computer-vision smart bin for waste sorting",
    period: "2021",
    award: "2nd Place Globally — FIRST Global Challenge",
    tier: "other",
    detail: [
      "Built the CV sorting pipeline with Team Singapore, fielded alongside Team Iran.",
    ],
    stack: ["Computer Vision", "Robotics"],
    links: [],
  },
  {
    id: "smartbell",
    name: "SmartBell",
    summary: "Offline-first progressive-overload workout tracker",
    period: "Mar 2026",
    tier: "other",
    detail: [
      "Offline-first React SPA; Dexie/IndexedDB as store of record, local recommendation engine.",
    ],
    stack: ["React", "TypeScript", "Dexie", "IndexedDB"],
    links: [],
  },
  {
    id: "tasko",
    name: "Tasko",
    summary: "Eisenhower-matrix productivity app, published on the App Store",
    period: "Jan 2019 – Apr 2021",
    tier: "other",
    detail: [
      "Eisenhower-quadrant task sorting, shipped to the App Store via the Swift Accelerator Programme.",
    ],
    stack: ["Swift", "iOS"],
    // Deliberately no link: the App Store listing is not verifiable from the
    // content files, and a dead link is worse than no link.
    links: [],
  },
];
