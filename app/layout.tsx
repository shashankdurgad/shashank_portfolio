import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { PROFILE } from "@/content/profile";
import { THEME_INIT } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const title = `${PROFILE.name} — agents, evals and the data behind them`;

export const metadata: Metadata = {
  // Resolves the generated OG image to an absolute URL; without it social
  // crawlers get a relative path and show no card.
  metadataBase: new URL(PROFILE.site),
  title,
  description: PROFILE.description,
  authors: [{ name: PROFILE.name, url: PROFILE.github }],
  keywords: [
    PROFILE.name,
    "agentic AI",
    "AI engineer",
    "LLM evaluation",
    "observability",
    "robot learning",
    "UCL Computer Science",
    "software engineer",
  ],
  openGraph: {
    title,
    description: PROFILE.description,
    type: "profile",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: PROFILE.description,
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
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Must run before first paint — see the note on THEME_INIT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
