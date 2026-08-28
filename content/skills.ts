/**
 * Skills, grouped.
 *
 * Transcribed from v1/CONTENT.md, which held these as prose after the resume
 * sections were removed.
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
