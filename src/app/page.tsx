import Link from "next/link";
import type { Metadata } from "next";

import {
  buildCanonicalUrl,
  buildWebsiteStructuredData,
  getDefaultSeoDescription,
  getSeoTitle,
  getSiteName,
  serializeJsonLd
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: getSiteName()
  },
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
  const structuredData = buildWebsiteStructuredData();

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
        <div className="form-actions">
          <Link className="button-link" href="/archive">
            View archive
          </Link>
          <Link className="button-link secondary" href="/collections">
            View collections
          </Link>
          <Link className="button-link secondary" href="/admin/photos">
            Admin
          </Link>
        </div>
      </section>
    </main>
  );
}
