import Link from "next/link";

export default function ResearchBanner() {
  return (
    <section className="research">
      <img className="research__bg" src="/images/pp-research-banner-emerald.webp" alt="" />
      <div className="research__copy">
        <h2>Numbers into<br />Conviction</h2>
        <p>
          Fundamental research built around financial models, business analysis and valuation frameworks to understand what a company could be worth over the long term.
        </p>
        <Link href="/indian-macros" className="btn-explore">
          Explore Reports
        </Link>
      </div>
    </section>
  );
}
