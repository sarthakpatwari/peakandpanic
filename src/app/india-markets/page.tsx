import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import Link from "next/link";
import ResearchBanner from "@/components/home/ResearchBanner";

export default function IndiaMarketsPage() {
  return (
    <div className="page">
      <Header />
      <main>
        {/* Intro */}
        <section className="intro" aria-labelledby="page-title">
          <div className="wrap">
            <div className="intro-inner">
              <div className="intro-copy">
                <p className="eyebrow">India Markets</p>
                <h1 id="page-title">India markets, beyond the headline.</h1>
                <p>Major indices, volatility and the forces shaping India’s market direction.</p>
              </div>
              <figure className="intro-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/pp-indian-markets-emerald.webp"
                  width={1536}
                  height={1024}
                  alt="Emerald illustration of India with an abstract market line and chart bars"
                />
                <figcaption className="art-label">Illustrative artwork</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Market Shell */}
        <div className="market-shell">
          <div className="wrap">
            <section className="state-strip" aria-label="Market and quote status">
              <div className="state-item" data-session="closed">
                <span className="state-label">NSE session</span>
                <span className="state-value session-value">
                  <span className="session-dot" aria-hidden="true" />
                  <span>Regular Session Closed</span>
                </span>
              </div>
              <div className="state-item">
                <span className="state-label">Price status</span>
                <span className="state-value">Official Close</span>
              </div>
              <div className="state-item">
                <span className="state-label">As of</span>
                <span className="state-value">NSE Closing Auction</span>
              </div>
            </section>

            <section className="snapshot" aria-labelledby="snapshot-title">
              <div className="section-heading">
                <h2 id="snapshot-title">Market snapshot</h2>
                <p>Major Indian indices and volatility, using the latest validated provider response.</p>
              </div>

              <div className="market-grid">
                {/* Primary: NIFTY 50 */}
                <article className="market-card market-card--primary">
                  <div className="market-head">
                    <span className="market-name">NIFTY 50</span>
                    <span className="card-session">NSE · Index</span>
                  </div>
                  <div className="market-price">22,185.35</div>
                  <div className="change-row">
                    <span className="market-change positive">+142.10</span>
                    <span className="market-change positive">(+0.65%)</span>
                  </div>
                  <div className="chart" aria-hidden="true">
                    <svg viewBox="0 0 400 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="primary-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        className="chart-area"
                        d="M 0 100 Q 100 40, 200 60 T 400 20 L 400 120 L 0 120 Z"
                        fill="url(#primary-grad)"
                      />
                      <path
                        className="chart-line"
                        d="M 0 100 Q 100 40, 200 60 T 400 20"
                      />
                    </svg>
                  </div>
                  <div className="market-meta">
                    <span className="market-time">Session closed · 15:30 IST</span>
                    <span className="quote-badge">Official Close</span>
                  </div>
                </article>

                {/* Support: Bank Nifty, Sensex, India VIX */}
                <div className="support-grid">
                  <article className="market-card">
                    <div className="market-head">
                      <span className="market-name">NIFTY BANK</span>
                      <span className="card-session">NSE · Index</span>
                    </div>
                    <div className="market-price">48,201.05</div>
                    <div className="change-row">
                      <span className="market-change positive">+310.45 (+0.65%)</span>
                    </div>
                    <div className="chart" aria-hidden="true">
                      <svg viewBox="0 0 300 60" preserveAspectRatio="none">
                        <path className="chart-line" d="M 0 45 Q 80 15, 150 30 T 300 10" />
                      </svg>
                    </div>
                  </article>

                  <article className="market-card">
                    <div className="market-head">
                      <span className="market-name">BSE SENSEX</span>
                      <span className="card-session">BSE · Index</span>
                    </div>
                    <div className="market-price">73,158.24</div>
                    <div className="change-row">
                      <span className="market-change positive">+440.12 (+0.61%)</span>
                    </div>
                    <div className="chart" aria-hidden="true">
                      <svg viewBox="0 0 300 60" preserveAspectRatio="none">
                        <path className="chart-line" d="M 0 40 Q 90 20, 180 35 T 300 15" />
                      </svg>
                    </div>
                  </article>

                  <article className="market-card">
                    <div className="market-head">
                      <span className="market-name">INDIA VIX</span>
                      <span className="card-session">NSE · Volatility</span>
                    </div>
                    <div className="market-price">13.25</div>
                    <div className="change-row">
                      <span className="market-change negative">-0.48 (-3.50%)</span>
                    </div>
                    <div className="chart" aria-hidden="true">
                      <svg viewBox="0 0 300 60" preserveAspectRatio="none">
                        <path className="chart-line" d="M 0 20 Q 100 45, 200 35 T 300 50" stroke="#fdb9b9" />
                      </svg>
                    </div>
                  </article>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Macro-Market Intelligence */}
        <section className="intelligence" aria-labelledby="intel-title">
          <div className="wrap">
            <div className="section-heading">
              <h2 id="intel-title">Macro-Market Intelligence</h2>
              <p>Move from the daily market print to the forces shaping India’s economy and capital markets.</p>
            </div>
            <div className="intel-grid">
              <Link className="intel-card intel-card--primary" href="/indian-macros" aria-label="Indian Macros detailed tracker">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/pp-india-macro-emerald.svg" width={360} height={176} alt="Indian macroeconomic analysis" />
                <div className="intel-copy">
                  <h3>Indian Macros</h3>
                  <p>Track monetary policy, inflation, growth and fiscal conditions shaping India’s economy.</p>
                  <span className="availability availability--ready">Detailed tracker</span>
                </div>
              </Link>

              <article className="intel-card" aria-label="Sector Pulse — coming soon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/pp-sector-pulse-emerald.svg" width={360} height={176} alt="Sector pulse" />
                <div className="intel-copy">
                  <h3>Sector Pulse</h3>
                  <p>Measure sector rotation, breadth and relative leadership across NSE industry groups.</p>
                  <span className="availability">Coming soon</span>
                </div>
              </article>

              <article className="intel-card" aria-label="Flow Dynamics — coming soon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/pp-flow-dynamics-emerald.svg" width={360} height={176} alt="Flow dynamics" />
                <div className="intel-copy">
                  <h3>Flow Dynamics</h3>
                  <p>Track institutional participation across FII, DII and primary issuance trends.</p>
                  <span className="availability">Coming soon</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <ResearchBanner />
      </main>
      <Footer />
    </div>
  );
}
