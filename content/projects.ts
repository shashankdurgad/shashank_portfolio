import type { Project } from "./types";

/**
 * Adding a project = appending one object here.
 * The card, its 3D wall readout and its camera stop are all derived.
 */
export const projects: Project[] = [
  {
    id: "sentinel",
    title: "Sentinel",
    subtitle: "autonomous collision avoidance",
    period: "Mar 2026",
    award: "Environment Track — NVIDIA GTC Hack for Impact",
    blurb:
      "A decentralised system where autonomous agents negotiate satellite collision avoidance manoeuvres in seconds, reducing debris cascades.",
    bullets: [
      "Agents powered by NVIDIA Nemotron 30B negotiate avoidance manoeuvres in seconds.",
      "Dual-path collision risk classifier pairing rule-based thresholds with an XGBoost model (8 features, 4 risk classes) to capture compound interactions beyond hard rules.",
      "Real-time feature extraction from live CelesTrak conjunction data and NOAA space weather feeds, serving inference via the XGBoost native API with a conservative max of ML and rule-based scores.",
    ],
    tags: ["Python", "XGBoost", "NumPy", "FastAPI", "Pydantic"],
    readout: { kind: "orbit", accent: "amber", density: 0.85, seed: 11 },
  },
  {
    id: "sentrix",
    title: "Sentrix",
    subtitle: "multi-agent compliance monitoring",
    period: "Feb – Mar 2026",
    award: "1st Place — UCL BUILD AI Festival",
    blurb:
      "A multi-agent AI compliance monitoring system, built around a patrol swarm that escalates findings through a staged investigation pipeline.",
    bullets: [
      "LangGraph and NVIDIA Nemotron drive a patrol swarm using pheromone-based sampling and quorum voting.",
      "A 4-stage investigation pipeline fed by an ETL layer ingesting raw agent outputs — A2A messages, emails, PRs, documents — into a central SQLite store backed by NetworkX for inter-agent graph analysis.",
      "Exposed via FastAPI + SSE with a React/TypeScript frontend for real-time threat monitoring.",
    ],
    tags: ["Python", "LangGraph", "SQLite", "NetworkX", "FastAPI"],
    readout: { kind: "lattice", accent: "cyan", density: 1, seed: 23 },
  },
  {
    id: "onflow",
    title: "Onflow",
    subtitle: "simulated agentic web use",
    period: "Oct 2025 – Jul 2026",
    award: "1st Place — Bloomsbury Startup Academy Demo Day",
    blurb:
      "An agentic platform that simulates real user behaviour against a live product and turns the traces into actionable UX feedback and codegen fixes.",
    bullets: [
      "Architected a LangChain agent platform that simulates user behaviour and generates actionable feedback, with Playwright driving the browser and visualising agentic navigation.",
      "GitHub API and Gemini CLI close the loop with automated codegen fixes.",
      "Synthetic automated user testing drove a 30% conversion rate in preliminary beta.",
      "2nd Place at the Gemini 3 London Hackathon (judged by Google and industry leaders); shortlisted for the Google AI Futures Fund interview.",
    ],
    tags: ["Next.js", "GitHub API", "Playwright", "LangChain", "Gemini CLI"],
    links: { paper: "https://arxiv.org/abs/2604.09581" },
    readout: { kind: "flow", accent: "arc", density: 0.9, seed: 37 },
  },
];
