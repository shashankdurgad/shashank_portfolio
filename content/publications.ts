/**
 * Publications.
 *
 * A new v3 module for a single reason: the arXiv paper is the one credit that
 * is neither a job (timeline) nor a build (projects), and giving it its own
 * file is what lets a second paper graduate this band into a real research
 * section later without moving anything.
 *
 * The credit phrasing is deliberately "co-authored" with the author list as
 * arXiv prints it — third of five, stated plainly, no phrasing that implies
 * first authorship.
 */

export type Publication = {
  id: string;
  title: string;
  /** Printed as arXiv lists it, initials-compressed. */
  authors: string;
  venue: string;
  href: string;
  /** One line of finding, for the band under the project cards. */
  summary: string;
};

export const PUBLICATIONS: Publication[] = [
  {
    id: "avenir-ux-paper",
    title:
      "Avenir-UX: Automated UX Evaluation via Simulated Human Web Interaction with GUI Grounding",
    authors: "W. J. Tan, Z. R. L. Lim, S. Durgad, K. Obegi, A. Y. Li",
    venue: "arXiv:2604.09581",
    href: "https://arxiv.org/abs/2604.09581",
    summary:
      "A GUI-grounded agent that operates real web pages from pixels rather than DOM parses and produces standardised usability scores (SUS, SEQ, Think Aloud) without waiting on human user studies.",
  },
];
