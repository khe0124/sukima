import Link from "next/link";
import type { Metadata } from "next";

import { buildCanonicalUrl, getDefaultSeoDescription, getSeoTitle, serializeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: getSeoTitle(),
  description: getDefaultSeoDescription(),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: buildCanonicalUrl("/"),
    title: getSeoTitle(),
    description: getDefaultSeoDescription()
  }
};

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sukima Photo Archive",
    url: buildCanonicalUrl("/"),
    description: getDefaultSeoDescription(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildCanonicalUrl("/archive")}?tag={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="page-heading">
        <p className="eyebrow">Sukima</p>
        <h1>Photo Archive</h1>
        <p>Private originals, public-ready metadata, and a small admin upload workflow.</p>
        <p>
          <Link href="/archive">View archive</Link>
        </p>
        <p>
          <Link href="/collections">View collections</Link>
        </p>
      </section>
    </main>
  );
}
