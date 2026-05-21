import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
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
