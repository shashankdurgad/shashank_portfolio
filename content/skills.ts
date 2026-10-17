/**
 * Skills, grouped.
 *
 * Transcribed from v1/CONTENT.md, which held these as prose after the resume
 * sections were removed.
 *
 * v3 regroups around what the work below actually evidences. Two new groups
 * carry the newest claims: Cloud / GenAI (the Vertex/Gemini/RAG line run at
 * Onflow and Avenir-UX) and Observability & LLMOps — deliberately broken out,
 * because the Overmind pipeline was exactly tracing-plus-evals work and it is
 * the most specific signal on the page. Django and PostgreSQL left the visible
 * list (they stay in the Overmind stack line where the work happened);
 * OpenTelemetry moved down into Observability rather than being dropped.
 */

export type SkillGroup = {
  id: string;
  label: string;
  items: string[];
};

export const SKILLS: SkillGroup[] = [
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
      "vLLM",
      "Scikit-learn",
      "XGBoost",
      "pandas",
      "NumPy",
      "OpenCV",
      "MediaPipe",
      "Edge AI (Jetson)",
    ],
  },
  {
    id: "cloud-genai",
    label: "Cloud / GenAI",
    items: ["Vertex AI", "Gemini models", "RAG Pipelines"],
  },
  {
    id: "tools",
    label: "Frameworks & Tools",
    items: [
      "Linux",
      "Next.js",
      "React",
      "FastAPI",
      "SQLite",
      "NetworkX",
      "SSE",
      "Figma",
      "Git",
      "Docker",
      "Playwright",
      "Tableau",
      "Cursor",
    ],
  },
  {
    id: "observability",
    label: "Observability & LLMOps",
    items: ["OpenTelemetry", "Langfuse", "LangSmith", "Braintrust", "Galileo"],
  },
];
