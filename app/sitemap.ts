import type { MetadataRoute } from "next";
import { PROFILE } from "@/content/profile";

/**
 * The whole site is one page plus static assets; the sitemap exists so a name
 * query has exactly one canonical URL to find and nothing else to crawl.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: PROFILE.site,
      lastModified: new Date("2026-10-17"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
