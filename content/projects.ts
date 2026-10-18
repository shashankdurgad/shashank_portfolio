/**
 * Projects, in two tiers.
 *
 * Featured projects get a card with a headline metric; the rest are one row in
 * an index. Within each tier, newest first.
 *
 * Naming: the CV calls the compliance project "AIEngine", but the repository
 * is `w3joe/sentrix` and the site has always used Sentrix — that stays. Onflow
 * links to its GitHub org and nothing else.
 */

export type Project = {
  id: string;
  name: string;
  period: string;
  /** One line. What it is, not how it was built. */
  line: string;
  /** The single number worth remembering, and what it measures. */
  metric?: { value: string; label: string };
  award?: string;
  /** At most two, each under ~20 words. */
  points: string[];
  stack: string[];
  links: { label: string; href: string }[];
};

export const FEATURED: Project[] = [
  {
    id: "buildapolicy",
    name: "BuildAPolicy",
    period: "Sep 2026",
    line: "Turns two human demonstrations into a vision-language robot policy",
    metric: { value: "~800", label: "verified episodes / hour from 2 demos" },
    points: [
      "Webcam teleoperation of a Franka FR3 with a five-finger hand; a replay gate keeps only lift-and-hold successes.",
      "Daytona runs 289 parallel replays to map where demos succeed, widening the robust region from 5 mm to 25 mm.",
    ],
    stack: ["Python", "Computer Vision", "Robotics Sim", "Synthetic Data"],
    links: [{ label: "GitHub", href: "https://github.com/shashankdurgad/buildapolicy" }],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    period: "Mar 2026",
    line: "Nemotron agents that negotiate satellite collision avoidance",
    metric: { value: "2", label: "live feeds — CelesTrak conjunctions + NOAA space weather" },
    award: "1st · NVIDIA GTC Hack for Impact",
    points: [
      "Rules + XGBoost risk classifier (8 features, 4 classes) on live CelesTrak and NOAA space-weather feeds.",
      "RAG over past incidents so agents negotiate with precedent.",
    ],
    stack: ["Python", "XGBoost", "FastAPI", "Nemotron"],
    links: [{ label: "GitHub", href: "https://github.com/desmondzee/sentinel" }],
  },
  {
    id: "sentrix",
    name: "Sentrix",
    period: "Feb – Mar 2026",
    line: "A patrol swarm of agents that polices other agents for compliance",
    metric: { value: "4-stage", label: "investigation behind a quorum-voting swarm" },
    award: "1st · UCL BUILD AI Festival",
    points: [
      "LangGraph + Nemotron swarm with pheromone sampling and quorum voting feeds a 4-stage investigation.",
      "ETL into SQLite, NetworkX for inter-agent graphs, streamed live over SSE.",
    ],
    stack: ["LangGraph", "NetworkX", "FastAPI", "React"],
    links: [{ label: "GitHub", href: "https://github.com/w3joe/sentrix" }],
  },
  {
    id: "onflow",
    name: "Onflow",
    period: "Oct 2025 – Jul 2026",
    line: "Browser agents with personas that UX-test your product and open the fix",
    metric: { value: "30%", label: "beta conversion" },
    award: "1st · Bloomsbury Demo Day",
    points: [
      "2nd at Gemini 3 London (USD 30k GCP credits); shortlisted for Google AI Futures Fund.",
      "LangChain + Playwright agents; GitHub API and Gemini CLI generate the patches.",
    ],
    stack: ["Next.js", "LangChain", "Playwright", "Gemini"],
    links: [{ label: "GitHub", href: "https://github.com/Onflow-AI" }],
  },
];

export const INDEX: Project[] = [
  {
    id: "avenir",
    name: "Avenir-UX",
    period: "Dec 2025 – Jun 2026",
    line: "Research: pixel-grounded usability scoring (SUS, SEQ) with computer-use agents",
    award: "Published · arXiv",
    points: [],
    stack: ["Computer-use agents", "HCI"],
    links: [{ label: "Paper", href: "https://arxiv.org/abs/2604.09581" }],
  },
  {
    id: "smartbell",
    name: "SmartBell",
    period: "Mar 2026",
    line: "Offline-first workout tracker with on-device progressive overload",
    points: [],
    stack: ["React", "TypeScript", "IndexedDB"],
    links: [{ label: "GitHub", href: "https://github.com/shashankdurgad/SmartBell" }],
  },
  {
    id: "first-global",
    name: "FIRST Global Challenge",
    period: "2021",
    line: "Computer-vision smart bin, built with Team Iran for Team Singapore",
    award: "2nd globally · Environment",
    points: [],
    stack: ["Computer Vision", "Robotics"],
    links: [],
  },
  {
    id: "tasko",
    name: "Tasko",
    period: "2019 – 2021",
    line: "Eisenhower-matrix task app for students, shipped to the App Store",
    points: [],
    stack: ["Swift"],
    links: [],
  },
];
