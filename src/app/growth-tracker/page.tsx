import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import rbiJson from "../../../rbi-data.json";
import LineChart from "@/components/common/LineChart";
import ExternalLinkIcon from "@/components/common/ExternalLinkIcon";
import { displayDate, displayTimestamp } from "@/lib/display-date";

export default function GrowthTrackerPage() {
  const rbi = rbiJson;
  const gdp = rbi.gdp || {};
  const quarterly = ((gdp.quarterlyHistory || []) as any[]).slice(-8);
  const annual = (gdp.annualHistory || []) as any[];
  const projections = ((gdp.projection?.estimates || []) as any[]).filter(Boolean);
  const schedule = rbi.releaseSchedules?.growth || {};

  const latestQuarter = quarterly[quarterly.length - 1];
  const latestAnnual = annual[annual.length - 1];

  if (!latestQuarter || !latestAnnual || !Number.isFinite(latestQuarter.realGrowth?.value) || !Number.isFinite(latestAnnual.realGrowth?.value)) return <div className="page"><Header /><main><section className="hero"><div className="wrap"><div className="hero-copy"><span className="eyebrow">Growth Tracker</span><h1>Growth data unavailable.</h1><p>The official dataset could not be validated. No fallback value is shown.</p></div></div></section></main><Footer /></div>;

  return (
    <div className="page">
      <Header />
      <main>
        {/* Hero */}
        <section className="hero tracker-hero" aria-labelledby="page-title">
          <div className="wrap">
            <div className="hero-copy">
              <span className="eyebrow">Growth Tracker</span>
              <h1 id="page-title">See how India’s economy is expanding.</h1>
              <p>
                Follow verified MoSPI real and nominal GDP releases alongside the RBI’s forward growth outlook—without mixing published actuals with projections.
              </p>
            </div>
          </div>
        </section>

        <div className="content">
          <div className="wrap">
            {/* Section 1: Growth Snapshot */}
            <section className="section" aria-labelledby="snapshot-title">
              <div className="section-heading">
                <h2 id="snapshot-title">Growth snapshot</h2>
                <p>India’s latest verified quarterly real GDP position and the official release context behind it.</p>
              </div>
              <div className="snapshot">
                <article className="glass headline-card">
                  <p className="label">Real GDP growth · YoY</p>
                  <p className="headline-value figure">{latestQuarter.realGrowth.value.toFixed(2)}%</p>
                  <p className="period">{latestQuarter.referencePeriod} · Real GDP</p>
                  <p className="direction">Year-on-year change calculated from the same fiscal quarter one year earlier.</p>
                  <div className="provenance">
                    <div className="prov-field">
                      <span className="prov-label">Official source</span>
                      <a href={latestQuarter.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer" className="prov-value source-link">
                        MoSPI GDP release <ExternalLinkIcon />
                      </a>
                    </div>
                    <div className="prov-field">
                      <span className="prov-label">Published</span>
                      <span className="prov-value">{displayDate(latestQuarter.provenance?.publishedAt)}</span>
                    </div>
                  </div>
                </article>

                <aside className="glass snapshot-details" aria-label="Growth snapshot details">
                  <div className="detail">
                    <p className="label">Real GDP level</p>
                    <span className="figure">₹{latestQuarter.realLevel.toFixed(2)} tn</span>
                  </div>
                  <div className="detail">
                    <p className="label">Prior-year quarter</p>
                    <span className="figure">₹{latestQuarter.previousYearRealLevel.toFixed(2)} tn</span>
                  </div>
                  <div className="detail">
                    <p className="label">Annual real growth</p>
                    <span className="figure">{latestAnnual.realGrowth.value.toFixed(2)}%</span>
                  </div>
                  <div className="detail">
                    <p className="label">Classification</p>
                    <span className="figure small-value">{latestQuarter.revisionStatus}</span>
                  </div>
                  <div className="detail">
                    <p className="label">Base year</p>
                    <span className="figure small-value">{latestQuarter.baseYear}</span>
                  </div>
                  <div className="detail">
                    <p className="label">Measure</p>
                    <span className="figure small-value">Constant-price real GDP</span>
                  </div>
                </aside>
              </div>

              {/* Next Release Block */}
              <article className="glass release-block">
                <div>
                  <p className="label">Next official release</p>
                  <p className="release-date">{schedule.nextReleaseDate ? displayDate(schedule.nextReleaseDate) : "Schedule unavailable"}</p>
                  <p className="release-context">{schedule.indicator || "Quarterly GDP release"} · {schedule.reportingPeriod || "Upcoming quarter"}</p>
                </div>
                <div className="provenance" style={{ margin: 0, padding: 0, border: 0 }}>
                  <div className="prov-field">
                    <span className="prov-label">Official source</span>
                    <a href={schedule.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer" className="prov-value source-link">
                      MoSPI release calendar <ExternalLinkIcon />
                    </a>
                  </div>
                </div>
              </article>
            </section>

            {/* Section 2: Quarterly real-GDP trend */}
            <section className="section" aria-labelledby="quarterly-title">
              <div className="section-heading">
                <h2 id="quarterly-title">Quarterly real-GDP trend</h2>
                <p>Verified year-on-year growth calculated from comparable constant-price quarters. The line is not smoothed or interpolated.</p>
              </div>
              <article className="glass chart-card">
                <div className="growth-chart-scroll"><LineChart label="Quarterly real GDP year-on-year growth trend" points={quarterly.map((item) => ({ label: item.referencePeriod, value: item.realGrowth?.value, detail: item.revisionStatus }))} /></div>
                <div className="legend">
                  <span><i />MoSPI actual · constant prices</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Quarter</th>
                        <th>Real growth</th>
                        <th>Real level</th>
                        <th>Comparable level</th>
                        <th>Revision</th>
                        <th>Published</th>
                        <th>Verified</th>
                        <th>Official source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarterly.map((q, idx) => (
                        <tr key={idx}>
                          <td>{q.referencePeriod}</td>
                          <td className="number" style={{ color: "var(--highlight)" }}>{q.realGrowth?.value?.toFixed(2)}%</td>
                          <td className="number">₹{q.realLevel?.toFixed(2)} tn</td>
                          <td className="number">₹{q.previousYearRealLevel?.toFixed(2)} tn</td>
                          <td>{q.revisionStatus}</td>
                          <td>{displayDate(q.provenance?.publishedAt, "Publication date unavailable")}</td>
                          <td>{displayTimestamp(q.provenance?.verifiedAt, "Verification time unavailable")}</td>
                          <td>
                            <a href={q.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer" className="source-link">
                              MoSPI <ExternalLinkIcon />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="section" aria-labelledby="annual-title">
              <div className="section-heading">
                <h2 id="annual-title">Annual growth view</h2>
                <p>Annual real-GDP observations remain separate from quarterly releases and calculations.</p>
                <p className="revision-note">One MoSPI release can publish multiple fiscal years at different revision stages. Provisional Estimates, First Revised Estimates and Final Estimates are official revision stages—not forecasts of future GDP.</p>
              </div>
              <div className="annual-grid">
                {annual.map((item, idx) => <article className="glass annual-card" key={idx}>
                  <span className="chip">{item.revisionStatus || "Revision not stated"}</span>
                  <h3>{item.referencePeriod}</h3>
                  <p className="figure">{Number.isFinite(item.realGrowth?.value) ? `${item.realGrowth.value.toFixed(2)}%` : "Unavailable"}</p>
                  <p className="card-copy">Real GDP · {Number.isFinite(item.realLevel) ? `₹${item.realLevel.toFixed(2)} lakh crore` : "level unavailable"}</p>
                  <div className="provenance"><span>Published {displayDate(item.provenance?.publishedAt, "date unavailable")}</span><span>Verified {displayTimestamp(item.provenance?.verifiedAt, "time unavailable")}</span><a className="source-link" href={item.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer">MoSPI source <ExternalLinkIcon /></a></div>
                </article>)}
              </div>
              <div className="table-wrap annual-table-wrap">
                <table><caption className="table-caption">Supplementary annual data table</caption><thead><tr><th>Fiscal year</th><th>Real growth</th><th>Real GDP</th><th>Revision</th><th>Published</th><th>Verified</th><th>Source</th></tr></thead>
                  <tbody>{annual.map((item, idx) => <tr key={idx}><td>{item.referencePeriod}</td><td className="number">{Number.isFinite(item.realGrowth?.value) ? `${item.realGrowth.value.toFixed(2)}%` : "Unavailable"}</td><td className="number">{Number.isFinite(item.realLevel) ? `₹${item.realLevel.toFixed(2)} lakh crore` : "Unavailable"}</td><td>{item.revisionStatus || "Not stated by API"}</td><td>{displayDate(item.provenance?.publishedAt, "Unavailable")}</td><td>{displayTimestamp(item.provenance?.verifiedAt, "Unavailable")}</td><td><a className="source-link" href={item.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer">MoSPI <ExternalLinkIcon /></a></td></tr>)}</tbody>
                </table>
              </div>
            </section>

            {/* Section 4: Real versus nominal economy */}
            <section className="section" aria-labelledby="comparison-title">
              <div className="section-heading">
                <h2 id="comparison-title">Real versus nominal economy</h2>
                <p>Constant-price real GDP removes price effects; current-price nominal GDP reflects the value measured at prevailing prices.</p>
              </div>
              <div className="comparison-grid">
                <article className="glass comparison-card">
                  <p className="label">Constant prices · {latestQuarter.referencePeriod}</p>
                  <p className="figure">₹{latestQuarter.realLevel.toFixed(2)} tn</p>
                  <p className="card-copy">Removes price effects to show changes in output volume.</p>
                </article>
                <article className="glass comparison-card">
                  <p className="label">Current prices · {latestQuarter.referencePeriod}</p>
                  <p className="figure">{Number.isFinite(latestQuarter.nominalLevel) ? `₹${latestQuarter.nominalLevel.toFixed(2)} lakh crore` : "Unavailable"}</p>
                  <p className="card-copy">Measures the economy at prevailing prices.</p>
                </article>
                <article className="glass comparison-card">
                  <p className="label">Derived YoY · Nominal growth</p>
                  <p className="figure">{Number.isFinite(latestQuarter.nominalGrowth?.value) ? `${latestQuarter.nominalGrowth.value.toFixed(2)}%` : "Unavailable"}</p>
                  <p className="card-copy">Uses comparable current-price quarters; it is not an inflation rate.</p>
                </article>
              </div>
            </section>

            {/* Section 5: RBI growth outlook */}
            {projections.length > 0 && (
              <section className="section" aria-labelledby="outlook-title">
                <div className="section-heading">
                  <h2 id="outlook-title">RBI growth outlook</h2>
                  <p>Forward-looking RBI projections are shown separately from MoSPI actuals and never presented as confirmed outcomes.</p>
                </div>
                <div className="outlook-grid">
                  {projections.map((p, idx) => (
                    <article key={idx} className="glass outlook-card">
                      <span className="chip projection">RBI projection</span>
                      <h3 style={{ marginTop: "10px" }}>{p.label}</h3>
                      <p className="figure">{p.value?.toFixed(2)}%</p>
                      <p className="card-copy">Forward-looking full-quarter real GDP growth projection.</p>
                      <div className="provenance"><span>Published {displayDate(p.provenance?.publishedAt, "date unavailable")}</span><span>Verified {displayTimestamp(p.provenance?.verifiedAt, "time unavailable")}</span><a className="source-link" href={p.provenance?.sourceUrl || "https://www.rbi.org.in"} target="_blank" rel="noopener noreferrer">RBI resolution <ExternalLinkIcon /></a></div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Section 6: Interpretation & Methodology */}
            <section className="section reading-grid" aria-label="Interpretation and methodology">
              <article className="glass reading-card">
                <h2>How to read this</h2>
                <div className="classification-list" style={{ marginTop: "16px" }}>
                  <div className="classification-item">
                    <span className="chip">Actual</span>
                    <p>A published MoSPI GDP observation with verified official provenance.</p>
                  </div>
                  <div className="classification-item">
                    <span className="chip">Derived growth rate</span>
                    <p>A calculation from comparable current and prior official GDP levels.</p>
                  </div>
                  <div className="classification-item">
                    <span className="chip projection">RBI projection</span>
                    <p>A forward estimate from an RBI MPC resolution, not a published GDP actual.</p>
                  </div>
                </div>
              </article>

              <article className="glass method-card">
                <h2>Methodology and limitations</h2>
                <ul className="method-list" style={{ marginTop: "16px" }}>
                  <li>GDP measures domestic output; GVA measures value added before product taxes less subsidies.</li>
                  <li>Real GDP uses constant 2022-23 prices; nominal GDP uses current prices.</li>
                  <li>Quarterly YoY growth compares a quarter with the same quarter one year earlier.</li>
                  <li>Annual growth compares complete fiscal-year levels; revision stages are official revisions, not forecasts.</li>
                  <li>Growth rates retain the official source levels, calculation formula and unrounded result in the data contract.</li>
                  <li>RBI projections are forward-looking and remain separate from published actuals.</li>
                  <li>Publication dates come from official releases. Operational verification time is shown separately.</li>
                  <li>One GDP release alone does not establish a market outlook or constitute investment advice.</li>
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
