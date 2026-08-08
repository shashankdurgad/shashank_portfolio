import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Michroma } from "next/font/google";
import "./globals.css";
import { profile } from "@/content/resume";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const michroma = Michroma({
  variable: "--font-michroma",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.tagline}`,
  description: profile.blurb,
  authors: [{ name: profile.name, url: profile.links.github }],
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
    title: `${profile.name} — ${profile.tagline}`,
    description: profile.blurb,
    type: "profile",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — ${profile.tagline}`,
    description: profile.blurb,
  },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${michroma.variable} antialiased`}>
      <body className="bg-void text-ink">{children}</body>
    </html>
  );
}
