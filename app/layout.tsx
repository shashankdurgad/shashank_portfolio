import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Site identity, inlined. Previously imported from content/resume.ts; that
 * module was removed with the resume sections, and metadata must not depend
 * on content modules that come and go with the UX.
 */
const SITE = {
  name: "Shashank Durgad",
  tagline: "agentic AI systems and the infra that make them measurably better",
  blurb:
    "CS at UCL, SWE intern at Overmind. I build agentic systems and the measurement layer around them — traces, evals, and the pipelines that turn both into better models.",
  github: "https://github.com/shashankdurgad",
};

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.blurb,
  authors: [{ name: SITE.name, url: SITE.github }],
  keywords: [
    "Shashank Durgad",
    "agentic AI",
    "reinforcement learning",
    "model training",
    "data pipelines",
    "UCL Computer Science",
    "software engineer",
  ],
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.blurb,
    type: "profile",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.blurb,
  },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="bg-void text-ink">{children}</body>
    </html>
  );
}
