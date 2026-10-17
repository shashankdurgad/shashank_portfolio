import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { PROFILE } from "@/content/profile";
import { THEME_INIT } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Display serif for the hero name and showcase titles, mono for eyebrows and
 * tabular data (plan §1). Their `variable` names are the raw face names —
 * globals.css aliases them to --font-display / --font-mono, because a theme
 * alias that resolved to itself would be a CSS cycle, not a fallback.
 */
const instrumentSerif = Instrument_Serif({
  // Only weight Google ships; italic joins so pull-quotes can set in it.
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  // 400 for data rows, 500 for eyebrows where the small size needs the weight.
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const title = `${PROFILE.name} — ${PROFILE.tagline}`;

export const metadata: Metadata = {
  title,
  description: PROFILE.blurb,
  authors: [{ name: PROFILE.name, url: PROFILE.github }],
  keywords: [
    PROFILE.name,
    "agentic AI",
    "reinforcement learning",
    "model training",
    "data pipelines",
    "UCL Computer Science",
    "software engineer",
  ],
  openGraph: {
    title,
    description: PROFILE.blurb,
    type: "profile",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: PROFILE.blurb,
  },
};

export const viewport: Viewport = {
  // Both, so the browser chrome follows whichever theme is showing.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before first paint — see the note on THEME_INIT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
