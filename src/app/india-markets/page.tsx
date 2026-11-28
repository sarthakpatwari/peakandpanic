import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import IndiaMarketGrid from "@/components/markets/IndiaMarketGrid";
import Link from "next/link";

export default function IndiaMarketsPage() {
  return <div className="page"><Header /><main>
    <section className="intro" aria-labelledby="page-title"><div className="wrap"><div className="intro-inner">
      <div className="intro-copy"><p className="eyebrow">India Markets</p><h1 id="page-title">India markets, beyond the headline.</h1><p>Major indices, volatility and the forces shaping India’s market direction.</p></div>
      <figure className="intro-art"><img src="/images/pp-indian-markets-emerald.webp" width={1536} height={1024} alt="Emerald illustration of India with an abstract market line and chart bars" /><figcaption className="art-label">Illustrative artwork</figcaption></figure>
    </div></div></section>
    <section className="market-shell snapshot" aria-labelledby="snapshot-title"><div className="wrap">
      <div className="section-heading"><h2 id="snapshot-title">Market snapshot</h2><p>Major Indian indices and volatility, using the latest validated provider response.</p></div>
      <IndiaMarketGrid />
    </div></section>
    <section className="intelligence" aria-labelledby="intel-title"><div className="wrap"><div className="section-heading"><h2 id="intel-title">Macro-Market Intelligence</h2><p>Move from the daily market print to the forces shaping India’s economy and capital markets.</p></div><div className="intel-grid">
      <Link className="intel-card intel-card--primary" href="/indian-macros"><img src="/images/pp-india-macro-emerald.svg" width={360} height={176} alt="" /><div className="intel-copy"><h3>Indian Macros</h3><p>Track monetary policy, inflation, growth and fiscal conditions shaping India’s economy.</p><span className="availability availability--ready">Detailed tracker</span></div></Link>
      <Link className="intel-card" href="/sector-pulse"><img src="/images/pp-sector-pulse-emerald.svg" width={360} height={176} alt="" /><div className="intel-copy"><h3>Sector Pulse</h3><p>Map the demand, credit, investment and operating signals shaping India’s major sectors.</p><span className="availability availability--ready">Coverage registry</span></div></Link>
      <article className="intel-card"><img src="/images/pp-market-flows-emerald.svg" width={360} height={176} alt="" /><div className="intel-copy"><h3>Market Flows</h3><p>Track institutional participation across FII, DII and primary issuance trends.</p><span className="availability">Coming soon</span></div></article>
    </div></div></section>
    <section className="research" aria-labelledby="india-research-title">
      <img className="research__bg" src="/images/pp-research-banner-emerald.webp" width={1911} height={823} alt="" aria-hidden="true" />
      <div className="research__copy">
        <h2 id="india-research-title">India research, built for conviction.</h2>
        <p>Fundamental analysis connecting market signals, business performance and valuation.</p>
        <span className="btn-explore btn-explore--disabled" aria-disabled="true">Research reports coming soon</span>
      </div>
    </section>
  </main><Footer /></div>;
}
