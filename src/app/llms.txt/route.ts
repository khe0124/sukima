import { getDefaultSeoDescription, getSiteName, getSiteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const siteUrl = getSiteUrl();
  const body = `# ${getSiteName()}

${getDefaultSeoDescription()}

## Public sections

- Archive: ${siteUrl}/archive
- Collections: ${siteUrl}/collections
- Sitemap: ${siteUrl}/sitemap.xml

## Content policy

This site publishes public web-ready photograph variants and metadata. Private original files are not public and are only available through short-lived signed admin URLs.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
