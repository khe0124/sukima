import type { MetadataRoute } from "next";

import { buildCanonicalUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/archive", "/collections"],
        disallow: ["/admin", "/api"]
      }
    ],
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: buildCanonicalUrl("/")
  };
}
