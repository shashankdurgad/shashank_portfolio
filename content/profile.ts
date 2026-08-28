/**
 * Identity and contact details.
 *
 * Carried over from v1, where this lived inlined in the hero and again in the
 * root layout's metadata. One module now, because those two copies had already
 * started to drift.
 */

export const PROFILE = {
  name: "Shashank Durgad",
  tagline: "agentic AI systems and the infra that make them measurably better",
  blurb:
    "CS at UCL, SWE intern at Overmind. I build agentic systems and the measurement layer around them — traces, evals, and the pipelines that turn both into better models.",
  location: "London, UK",
  email: "shashankdurgad@gmail.com",
  github: "https://github.com/shashankdurgad",
  linkedin: "https://linkedin.com/in/shashank-durgad",
  interests: [
    "agentic systems",
    "reinforcement learning",
    "model training",
    "data pipelining",
  ],
} as const;
