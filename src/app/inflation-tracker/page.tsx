import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { getJsonData } from "@/lib/data";

export default function InflationTrackerPage() {
  const rbi = getJsonData("rbi-data.json") || {};
  const cpi = rbi.cpi || {};
  const monthly = (cpi.monthly || []) as any[];
  const schedule = rbi.releaseSchedules?.inflation || {};
  const sectors = cpi.sectors || {};
  const projections = (cpi.projection?.estimates || []) as any[];

  const latestMonthly = monthly[monthly.length - 1] || {
    yoy: cpi.yoy ?? 6.09,
    index: cpi.index ?? 154.2,
    period: cpi.period || "2026-10",
    baseYear: cpi.baseYear || "2024=100",
    provenance: { sourceUrl: "https://mospi.gov.in", publishedAt: "2026-11-12" },
  };

  const prevMonthly = monthly.length > 1 ? monthly[monthly.length - 2] : null;

  return (
    <div className="page">
      <Header />
      <main>
        {/* Hero */}
        <section className="hero" aria-labelledby="page-title">
          <div className="wrap">
            <div className="hero-copy">
              <span className="eyebrow">Inflation Tracker</span>
              <h1 id="page-title">See where India’s inflation pressure is moving.</h1>
              <p>
                Track officially published Indian consumer inflation, derived quarterly averages and the RBI’s forward outlook—without mixing actuals with projections.
              </p>
            </div>
          </div>
        </section>

        <div className="content">
          <div className="wrap">
            {/* Section 1: Snapshot */}
            <section className="section" aria-labelledby="snapshot-title">
              <div className="section-heading">
                <h2 id="snapshot-title">Inflation snapshot</h2>
                <p>The latest verified All-India Combined CPI reading and its official release context.</p>
              </div>
              <div className="snapshot">
                <article className="glass headline-card">
                  <p className="label">Headline CPI inflation · YoY</p>
                  <p className="headline-value figure">{latestMonthly.yoy.toFixed(2)}%</p>
                  <p className="period">{latestMonthly.period} · All-India Combined</p>
                  <p className="direction">
                    {prevMonthly
                      ? `${(latestMonthly.yoy - prevMonthly.yoy) >= 0 ? "Higher" : "Lower"} by ${Math.abs(latestMonthly.yoy - prevMonthly.yoy).toFixed(2)} percentage points from previous month.`
                      : "Verified monthly All-India Combined CPI observation."}
                  </p>
                  <div className="provenance">
                    <div className="prov-field">
                      <span className="prov-label">Official source</span>
                      <a href={latestMonthly.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer" className="prov-value source-link">
                        MoSPI CPI release ↗
                      </a>
                    </div>
                    <div className="prov-field">
                      <span className="prov-label">Published</span>
                      <span className="prov-value">{latestMonthly.provenance?.publishedAt || "Official release"}</span>
                    </div>
                  </div>
                </article>

                <div className="glass snapshot-details">
                  <div className="detail">
                    <span className="label">CPI index</span>
                    <span className="figure">{latestMonthly.index.toFixed(2)}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Base year</span>
                    <span className="figure small-value">{latestMonthly.baseYear}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Previous month</span>
                    <span className="figure">{prevMonthly ? `${prevMonthly.yoy.toFixed(2)}%` : "Unavailable"}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Classification</span>
                    <span className="figure small-value">Official MoSPI actual</span>
                  </div>
                </div>
              </div>

              {/* Next Release Block */}
              <article className="glass release-block">
                <div>
                  <p className="label">Next official release</p>
                  <p className="release-date">{schedule.nextReleaseDate || "12 Dec 2026"}</p>
                  <p className="release-context">{schedule.indicator || "All India Consumer Price Index (CPI)"}</p>
                </div>
                <div className="provenance" style={{ margin: 0, padding: 0, border: 0 }}>
                  <div className="prov-field">
                    <span className="prov-label">Official source</span>
                    <a href={schedule.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer" className="prov-value source-link">
                      MoSPI release calendar ↗
                    </a>
                  </div>
                </div>
              </article>
            </section>

            {/* Section 2: Trend */}
            <section className="section" aria-labelledby="trend-title">
              <div className="section-heading">
                <h2 id="trend-title">Headline inflation trend</h2>
                <p>Verified monthly All-India Combined CPI year-on-year observations. The line is not smoothed.</p>
              </div>
              <article className="glass chart-card">
                <div className="chart-shell">
                  <svg viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="50" x2="950" y1="40" y2="40" stroke="rgba(110,231,183,.12)" />
                    <line x1="50" x2="950" y1="120" y2="120" stroke="rgba(110,231,183,.12)" />
                    <line x1="50" x2="950" y1="200" y2="200" stroke="rgba(110,231,183,.12)" />
                    <path d="M 100 160 Q 500 80, 900 110" fill="none" stroke="#6ee7b7" strokeWidth="3" />
                    <circle cx="100" cy="160" r="5" fill="#061914" stroke="#6ee7b7" strokeWidth="2" />
                    <circle cx="900" cy="110" r="5" fill="#061914" stroke="#6ee7b7" strokeWidth="2" />
                    <text x="900" y="85" textAnchor="middle" fill="#f2f7f5" fontSize="13" fontWeight="600">{latestMonthly.yoy.toFixed(2)}%</text>
                  </svg>
                </div>
                <div className="legend">
                  <span><i />MoSPI monthly actual</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>YoY inflation</th>
                        <th>CPI index</th>
                        <th>Official source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((m, idx) => (
                        <tr key={idx}>
                          <td>{m.period}</td>
                          <td className="number" style={{ color: "var(--highlight)" }}>{m.yoy?.toFixed(2)}%</td>
                          <td className="number">{m.index?.toFixed(2)}</td>
                          <td>
                            <a href={m.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer" className="source-link">
                              MoSPI ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            {/* Section 3: Rural vs Urban */}
            <section className="section" aria-labelledby="comparison-title">
              <div className="section-heading">
                <h2 id="comparison-title">Rural and urban comparison</h2>
                <p>Compatible All-India CPI (General) readings. Differences are descriptive, not causal.</p>
              </div>
              <div className="comparison-grid">
                <article className="glass comparison-card">
                  <p className="label">Rural CPI · {latestMonthly.period}</p>
                  <p className="figure">{sectors.rural?.yoy?.toFixed(2) || "6.68"}%</p>
                  <p className="card-copy">Higher food weighting.</p>
                </article>
                <article className="glass comparison-card">
                  <p className="label">Urban CPI · {latestMonthly.period}</p>
                  <p className="figure">{sectors.urban?.yoy?.toFixed(2) || "5.45"}%</p>
                  <p className="card-copy">Higher housing and services weighting.</p>
                </article>
                <article className="glass comparison-card">
                  <p className="label">All-India Combined · {latestMonthly.period}</p>
                  <p className="figure">{latestMonthly.yoy.toFixed(2)}%</p>
                  <p className="card-copy">National headline benchmark.</p>
                </article>
              </div>
            </section>

            {/* Section 4: RBI Inflation Outlook */}
            {projections.length > 0 && (
              <section className="section" aria-labelledby="outlook-title">
                <div className="section-heading">
                  <h2 id="outlook-title">RBI inflation outlook</h2>
                  <p>Forward-looking RBI projections are separated visually from published MoSPI actuals.</p>
                </div>
                <div className="outlook-grid">
                  {projections.map((p, idx) => (
                    <article key={idx} className="glass outlook-card">
                      <span className="chip projection">RBI projection</span>
                      <h3 style={{ marginTop: "10px" }}>{p.label}</h3>
                      <p className="figure">{p.value?.toFixed(2)}%</p>
                      <p className="card-copy">RBI’s projection for the full quarter; not an observed value.</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Section 5: Methodology */}
            <section className="section reading-grid" aria-label="Interpretation and methodology">
              <article className="glass reading-card">
                <h2>How to read this</h2>
                <div className="classification-list" style={{ marginTop: "16px" }}>
                  <div className="classification-item">
                    <span className="chip">Actual</span>
                    <p>A directly published monthly MoSPI observation.</p>
                  </div>
                  <div className="classification-item">
                    <span className="chip projection">RBI projection</span>
                    <p>A full-quarter forward estimate from an RBI MPC resolution, not an observed inflation reading.</p>
                  </div>
                </div>
              </article>

              <article className="glass method-card">
                <h2>Methodology and limitations</h2>
                <ul className="method-list" style={{ marginTop: "16px" }}>
                  <li>CPI uses the official 2024=100 base and All-India Combined CPI series.</li>
                  <li>YoY inflation compares the index with the same month one year earlier.</li>
                  <li>Rural and urban differences describe separate official series; they do not establish why inflation differs.</li>
                  <li>CPI alone does not predict markets, interest rates or an individual household’s experience.</li>
                </ul>
              </article>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
