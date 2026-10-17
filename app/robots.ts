import type { MetadataRoute } from "next";
import { PROFILE } from "@/content/profile";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${PROFILE.site}/sitemap.xml`,
    host: new URL(PROFILE.site).host,
  };
}
