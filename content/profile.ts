/**
 * Identity, contact details, and the hero's pieces.
 *
 * Carried over from v1, where this lived inlined in the hero and again in the
 * root layout's metadata. One module now, because those two copies had already
 * started to drift.
 *
 * v3 splits the hero's pieces into named parts: `tagline` is the one-sentence
 * claim, `roles` the role line, `proof` the three stat tiles — and `blurb`,
 * which after the 2026-10 word-cut pass serves only metadata and JSON-LD.
 * They are deliberately separate fields — the old About section pasted the
 * hero blurb verbatim, and distinct keys make re-merging them a
 * compile-visible decision, not a copy-paste drift.
 *
 * Deliberate absences, per the v3 decision log: no phone number, no
 * scholarship line, no availability notice. The résumé PDF is the only place
 * the first two live, and the third exists nowhere.
 */

/**
 * Nav order for the single page. Lives here rather than in the header so the
 * section order on the page and the links that point at it have one owner; the
 * header gets rewired to import this at merge time.
 */
export const NAV = [
  { href: "#work", label: "Work" },
  { href: "#projects", label: "Projects" },
  { href: "#leadership", label: "Leadership" },
  { href: "#about", label: "About" },
] as const;

export const PROFILE = {
  name: "Shashank Durgad",
  tagline: "I build agentic AI systems — and prove they work.",
  /**
   * Metadata/JSON-LD only — the hero stopped rendering this in the 2026-10
   * word-cut pass: roles + tagline + proof tiles already say it, in fewer
   * words. It survives as the <meta description> because search snippets
   * want one complete sentence.
   */
  blurb:
    "CS at UCL, founding engineer at Onflow — I build agentic systems and the eval loops that prove they work.",
  location: "London, UK",
  email: "shashankdurgad@gmail.com",
  github: "https://github.com/shashankdurgad",
  linkedin: "https://linkedin.com/in/shashank-durgad",
  /** Canonical site origin — used for JSON-LD @id/url so they survive a deploy. */
  site: "https://www.shashankdurgad.com",
  /** Static file in public/. Owner replaces the placeholder with the real PDF. */
  resume: "/resume.pdf",
  roles: [
    { label: "SWE Intern", org: "Overmind" },
    {
      label: "Founding Engineer",
      org: "Onflow",
      href: "https://github.com/Onflow-AI",
    },
    { label: "BSc CS", org: "UCL" },
  ],
  /**
   * Hero stat tiles. Each number is stated once elsewhere at most; the tiles
   * are the glanceable copy of claims the page already makes honestly below.
   */
  proof: [
    { value: "3×", label: "hackathon wins incl. an NVIDIA GTC track" },
    {
      value: "arXiv",
      label: "co-author — automated usability evaluation",
      href: "https://arxiv.org/abs/2604.09581",
    },
    { value: "30%", label: "Onflow beta conversion", href: "#projects" },
  ],
  interests: [
    "agentic systems",
    "reinforcement learning",
    "model training",
    "data pipelining",
  ],
} as const;
