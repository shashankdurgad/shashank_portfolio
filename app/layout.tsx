import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PROFILE } from "@/content/profile";
import { THEME_INIT } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Must run before first paint — see the note on THEME_INIT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
