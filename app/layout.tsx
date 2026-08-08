import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { profile } from "@/content/resume";

const inter = Inter({
  variable: "--font-inter",
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
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="bg-void text-ink">{children}</body>
    </html>
  );
}
