/**
 * Identity and contact details.
 *
 * One module, because the hero, the footer and the root layout's metadata all
 * read from it and three copies had already started to drift in v1.
 *
 * The phone number is on the CV but deliberately not here — a public page gets
 * scraped, and email is the contact route this site offers.
 */

export const PROFILE = {
  name: "Shashank Durgad",
  short: "Shashank",
  /** One line. The whole pitch; everything else on the page is evidence. */
  pitch: "I build AI agents — and the traces, evals and data that make them better.",
  /** Used for metadata and the OG card, where a sentence reads better than a line. */
  description:
    "Computer Science at UCL. I build agentic systems and the measurement layer around them — observability, evaluation and synthetic data. Four hackathon wins, one arXiv paper.",
  location: "London, UK",
  origin: "Singapore",
  email: "shashankdurgad@gmail.com",
  github: "https://github.com/shashankdurgad",
  linkedin: "https://linkedin.com/in/shashank-durgad",
  site: "https://shashank-portfolio-eight.vercel.app",
  /** What's true right now. Shown as a status line under the pitch. */
  now: [
    "BSc Computer Science, UCL — Year 2",
    "Vice President, UCL Data Science Society",
  ],
  interests: [
    "agentic systems",
    "evaluation",
    "observability",
    "synthetic data",
    "robot learning",
  ],
} as const;

/**
 * The proof strip under the hero. Ordered by weight, not by date.
 * `href` points at the project card on this page where there is one.
 */
export const WINS = [
  { place: "1st", event: "NVIDIA GTC Hack for Impact", note: "Environment Track · San Jose", href: "#p-sentinel" },
  { place: "1st", event: "UCL BUILD AI Festival", note: "Trip to NVIDIA GTC 2026", href: "#p-sentrix" },
  { place: "1st", event: "Bloomsbury Startup Academy", note: "Demo Day", href: "#p-onflow" },
  { place: "2nd", event: "Gemini 3 London Hackathon", note: "USD 30k GCP credits", href: "#p-onflow" },
] as const;

export const PAPER = {
  title: "Pixel-grounded automated usability evaluation",
  venue: "arXiv 2604.09581",
  href: "https://arxiv.org/abs/2604.09581",
} as const;
