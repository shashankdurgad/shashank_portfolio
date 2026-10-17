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
      "An agentic platform that simulates real user behaviour against a live product and turns the traces into actionable UX feedback and codegen fixes.",
      "LangChain drives the agents, Playwright drives the browser, and the GitHub API and Gemini CLI close the loop with automated fixes.",
      "Synthetic automated user testing drove a 30% conversion rate in preliminary beta.",
      "2nd Place at the Gemini 3 London Hackathon (with US$30k in GCP credits), judged by Google; shortlisted for the Google AI Futures Fund interview.",
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
      "Webcam teleoperation environment: a Franka FR3 with a five-finger hand in SuperDex, with a replay gate that keeps only demos that lift and hold.",
      "A Daytona simulation engine runs 289 parallel replays per task to measure its robust region, widening it from 5 mm to 25 mm.",
      "A synthetic-data pipeline samples inside the measured robust region: roughly 800 verified episodes an hour from two human demos.",
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
      "A decentralised system where Nemotron-powered autonomous agents negotiate satellite collision avoidance manoeuvres in seconds, reducing debris cascades.",
      "Dual-path collision risk classifier pairing rule-based thresholds with an XGBoost model (8 features, 4 risk classes) to capture compound interactions beyond hard rules.",
      "Real-time feature extraction from live CelesTrak conjunction data and NOAA space weather feeds.",
      "A RAG workflow over past conjunction incidents grounds the agents' negotiation arguments.",
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
      "Computer-use agents that interact with real web pages from pixels rather than DOM parses, keeping a coherent trace of each simulated user journey.",
      "Evaluation protocol integrates the System Usability Scale with step-wise Single Ease Questions; research run through UCL Nexus Labs.",
      "Co-authored, published research on pixel-grounded automated usability evaluation (arXiv 2604.09581).",
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
      "LangGraph and NVIDIA Nemotron drive a patrol swarm using pheromone-based sampling and quorum voting, escalating findings through a 4-stage investigation pipeline into SQLite and NetworkX.",
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
      "Built the CV sorting pipeline with Team Singapore (fielded alongside Team Iran) in the Environment category.",
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
      "A React SPA that tracks progressive-overload programmes entirely offline — Dexie over IndexedDB is the store of record — with a local recommendation engine adjusting each session from logged performance.",
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
      "An iOS app that sorts tasks into urgent/important quadrants; built through the Swift Accelerator Programme and shipped to the App Store. No live link to point at — it predates every habit in the entries above.",
    ],
    stack: ["Swift", "iOS"],
    // Deliberately no link: the App Store listing is not verifiable from the
    // content files, and a dead link is worse than no link.
    links: [],
  },
];
