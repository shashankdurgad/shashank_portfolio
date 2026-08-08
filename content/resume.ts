import type { Education, Role, SkillGroup } from "./types";

export const profile = {
  name: "Shashank Durgad",
  tagline: "agentic AI systems and the infra that make them measurably better",
  blurb:
    "CS at UCL, SWE intern at Overmind. I build agentic systems and the measurement layer around them — traces, evals, and the pipelines that turn both into better models.",
  interests: [
    "agentic systems",
    "reinforcement learning",
    "model training",
    "data pipelining",
  ],
  location: "London, UK",
  email: "shashankdurgad@gmail.com",
  phone: "+44 7440351581",
  links: {
    github: "https://github.com/shashankdurgad",
    linkedin: "https://linkedin.com/in/shashank-durgad",
  },
};

export const roles: Role[] = [
  {
    id: "overmind",
    company: "Overmind",
    title: "Software Engineering Intern",
    period: "Jul 2026 — Present",
    location: "London, UK",
    stack: [
      "Python",
      "TypeScript",
      "Django",
      "Docker",
      "OpenTelemetry",
      "PostgreSQL",
      "Cursor SDK",
    ],
    bullets: [
      "Ran end-to-end agent optimisation experiments on the Overmind platform, driving iterative prompt/tool/logic improvements through a state-machine-based optimiser with automated eval scoring.",
      "Working full-stack on the agent improvement pipeline — from trace/dataset ingestion and data engineering through agentic optimisation experiments, model fine-tuning and production rollout.",
    ],
    readout: { kind: "waveform", accent: "arc", density: 1, seed: 5 },
  },
  {
    id: "onflow-role",
    company: "Onflow",
    title: "Founding Engineer (AI and Growth)",
    period: "Oct 2025 — Jul 2026",
    location: "London, UK",
    stack: ["Next.js", "GitHub API", "Playwright", "LangChain", "Gemini CLI"],
    bullets: [
      "Won 1st Place at the Bloomsbury Startup Academy Demo Day; 2nd Place at the Gemini 3 London Hackathon, judged by Google and industry leaders.",
      "Architected an agentic platform using LangChain to simulate user behaviour and generate actionable feedback, with Playwright for browser automation.",
      "Authored a white paper on simulated agentic web-use interaction.",
    ],
    readout: { kind: "bars", accent: "cyan", density: 0.8, seed: 17 },
  },
];

export const education: Education[] = [
  {
    id: "ucl",
    institution: "University College London",
    qualification: "BSc Computer Science — Predicted First Class Honours",
    period: "Sep 2025 — Jun 2028",
    location: "London, UK",
    detail: [
      "UCL Data Science Society — Vice-President",
      "UCL AI Society — First Year Representative",
      "Foundry Labs (Cohort 4) · Bloomsbury Startup Academy (Demo Day Winner)",
    ],
  },
  {
    id: "acs",
    institution: "Anglo-Chinese School (Independent)",
    qualification: "International Baccalaureate — 42/45",
    period: "Jan 2017 — Dec 2022",
    location: "Singapore",
    detail: [
      "Vice-Chairman, Robotics Technology Society",
      "Head of Operations, Young Entrepreneurs' Society",
    ],
  },
];

export const skills: SkillGroup[] = [
  {
    id: "languages",
    label: "Languages",
    items: ["Python", "TypeScript", "Swift", "Java", "C/C++", "SQL", "HTML/CSS"],
  },
  {
    id: "aiml",
    label: "AI / ML",
    items: [
      "LangGraph",
      "LangChain",
      "PyTorch",
      "Scikit-learn",
      "XGBoost",
      "pandas",
      "NumPy",
      "OpenCV",
      "MediaPipe",
    ],
  },
  {
    id: "tools",
    label: "Frameworks & Tools",
    items: [
      "Next.js",
      "React",
      "FastAPI",
      "Django",
      "SQLite",
      "PostgreSQL",
      "NetworkX",
      "Docker",
      "Playwright",
      "OpenTelemetry",
      "Git",
      "Figma",
    ],
  },
];
