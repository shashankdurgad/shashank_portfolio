import type { MetadataRoute } from "next";
import { PROFILE } from "@/content/profile";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: PROFILE.site, changeFrequency: "monthly", priority: 1 }];
}
