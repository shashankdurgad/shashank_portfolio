/**
 * Skills for the About section.
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
    items: ["Python", "TypeScript", "Swift", "Java", "C/C++", "SQL"],
  },
  {
    id: "aiml",
    label: "AI / ML",
    items: ["LangGraph", "PyTorch", "vLLM", "scikit-learn", "OpenCV", "RAG", "Vertex AI", "Jetson"],
  },
  {
    id: "infra",
    label: "Build",
    items: ["Next.js", "React", "FastAPI", "Django", "PostgreSQL", "Docker", "OpenTelemetry", "Playwright"],
  },
];
