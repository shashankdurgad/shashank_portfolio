/**
 * Projects, as shown in the hall behind the right-hand door.
 *
 * Transcribed from CONTENT.md. The FIG.0n numbering recorded there is dropped:
 * it belonged to the telemetry wall that was removed, and the chips carry the
 * project's own name instead.
 */

export type Project = {
  id: string;
  name: string;
  /** One line, shown on the collapsed chip. */
  summary: string;
  /** Shown expanded. */
  period: string;
  award: string;
  detail: string[];
  stack: string[];
  /**
   * Repository. Several are under a collaborator's account or an org rather
   * than a personal one — these were team projects, and the link points at
   * where the work actually lives.
   */
  repo: string;
  /** Optional further reading, where one exists. */
  paper?: string;
};

export const PROJECTS: Project[] = [
  {
    id: "sentinel",
    name: "Sentinel",
    summary: "Autonomous agents negotiating satellite collision avoidance",
    period: "Mar 2026",
    award: "Environment Track — NVIDIA GTC Hack for Impact",
    detail: [
      "A decentralised system where autonomous agents negotiate satellite collision avoidance manoeuvres in seconds, reducing debris cascades.",
      "Dual-path collision risk classifier pairing rule-based thresholds with an XGBoost model (8 features, 4 risk classes) to capture compound interactions beyond hard rules.",
      "Real-time feature extraction from live CelesTrak conjunction data and NOAA space weather feeds.",
    ],
    stack: ["Python", "XGBoost", "NumPy", "FastAPI", "Pydantic"],
    repo: "https://github.com/desmondzee/sentinel",
  },
  {
    id: "sentrix",
    /*
     * CONTENT.md records this as unresolved — the CV calls it AIEngine, the
     * GitHub README calls it Sentrix. The repository is `w3joe/sentrix`, which
     * settles it.
     */
    name: "Sentrix",
    summary: "Multi-agent compliance monitoring with a patrol swarm",
    period: "Feb – Mar 2026",
    award: "1st Place — UCL BUILD AI Festival",
    detail: [
      "A multi-agent AI compliance monitoring system, built around a patrol swarm that escalates findings through a staged investigation pipeline.",
      "LangGraph and NVIDIA Nemotron drive the swarm using pheromone-based sampling and quorum voting.",
      "A 4-stage investigation pipeline fed by an ETL layer ingesting A2A messages, emails, PRs and documents into SQLite, backed by NetworkX for inter-agent graph analysis.",
    ],
    stack: ["Python", "LangGraph", "SQLite", "NetworkX", "FastAPI"],
    repo: "https://github.com/w3joe/sentrix",
  },
  {
    id: "onflow",
    name: "Onflow",
    summary: "Simulated agentic web use, turned into UX feedback",
    period: "Oct 2025 – Jul 2026",
    award: "1st Place — Bloomsbury Startup Academy Demo Day",
    detail: [
      "An agentic platform that simulates real user behaviour against a live product and turns the traces into actionable UX feedback and codegen fixes.",
      "LangChain drives the agents, Playwright drives the browser, and the GitHub API and Gemini CLI close the loop with automated fixes.",
      "Synthetic automated user testing drove a 30% conversion rate in preliminary beta.",
      "2nd Place at the Gemini 3 London Hackathon, judged by Google; shortlisted for the Google AI Futures Fund interview.",
    ],
    stack: ["Next.js", "GitHub API", "Playwright", "LangChain", "Gemini CLI"],
    repo: "https://github.com/Onflow-AI",
    paper: "https://arxiv.org/abs/2604.09581",
  },
];
