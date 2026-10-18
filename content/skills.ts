/**
 * Skills and grades for the About section.
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

/** UCL Year 1, highest first. Percentages. */
export const MODULES: { name: string; score: number }[] = [
  { name: "Engineering Challenges", score: 80.94 },
  { name: "Theory of Computation", score: 77.0 },
  { name: "Design & Professional Skills", score: 76.49 },
  { name: "Intro Maths for CS", score: 70.0 },
  { name: "Algorithms", score: 69.96 },
  { name: "Object-Oriented Programming", score: 64.4 },
  { name: "Principles of Programming", score: 62.0 },
  { name: "Discrete Mathematics", score: 55.0 },
];

export const YEAR1_AVERAGE = 69.47;
