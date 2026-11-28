import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import rbiJson from "../../../rbi-data.json";
import LineChart from "@/components/common/LineChart";
import ExternalLinkIcon from "@/components/common/ExternalLinkIcon";
import { displayDate, displayTimestamp } from "@/lib/display-date";
import MacroPulse from "@/components/common/MacroPulse";

const STANCE_NAMES: Record<string, string> = {
  hawkish: "Hawkish",
  accommodative: "Accommodative",
  neutral: "Neutral",
  calibrated_tightening: "Calibrated tightening",
  withdrawal_of_accommodation: "Withdrawal of accommodation",
};

export default function RbiPolicyTrackerPage() {
  const rbi = rbiJson;
  const repoHistory = ((rbi.repo?.history || []) as any[]).sort((a, b) => a.date.localeCompare(b.date));
  const latest = repoHistory[repoHistory.length - 1];
  const stance = rbi.stance || {};
  const stanceLabel = STANCE_NAMES[stance.current] || "Neutral";
  const commentary = (rbi.commentary?.paragraphs || []) as string[];
  const mpcMeetings = (rbi.mpc?.meetings || []) as any[];
  const nextMeeting = mpcMeetings.find((meeting) => meeting.announce > (latest?.decisionDate || latest?.date));
  const gdp = rbi.gdp || {};
  const gdpAnnual = ((gdp.annualHistory || []) as any[]).at(-1);
  const gdpQuarter = ((gdp.quarterlyHistory || []) as any[]).at(-1);
  const gdpOutlook = [...((gdp.projection?.actuals || []) as any[]), ...((gdp.projection?.estimates || []) as any[])];
  const cpi = rbi.cpi || {};
  const cpiMonthly = ((cpi.monthly || []) as any[]).at(-1);
  const cpiOutlook = [...((cpi.projection?.actuals || []) as any[]), ...((cpi.projection?.estimates || []) as any[])];

  if (!latest || !Number.isFinite(latest.rate)) return <div className="page"><Header /><main><section className="intro"><div className="wrap"><div className="intro__copy"><span className="eyebrow">RBI Policy Tracker</span><h1>Policy data unavailable.</h1><p>The official dataset could not be validated. No fallback value is shown.</p></div></div></section></main><Footer /></div>;

  return (
    <div className="page">
      <Header />
      <main className="rbi-page">
        {/* Intro */}
        <section className="intro tracker-hero motion-host" aria-labelledby="page-title">
          <MacroPulse variant="policy" />
          <div className="wrap">
            <div className="intro__copy">
              <span className="eyebrow">RBI Policy Tracker</span>
              <h1 id="page-title">India’s monetary-policy dashboard.</h1>
              <p>
                Track policy rates, the RBI’s stance, growth and inflation outlook through the latest validated official releases.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Policy Overview */}
        <section className="section" aria-labelledby="policy-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="policy-title">Policy overview</h2>
              <p>The current policy rate, the latest decision and the next scheduled MPC decision.</p>
            </div>

            <div className="policy-grid">
              <article className="panel policy-summary">
                <div>
                  <p className="metric-label">Current repo rate</p>
                  <p className="repo-value">{latest.rate.toFixed(2)}%</p>
                </div>
                <div className="decision-grid">
                  <div className="date-card">
                    <span className="metric-label">Last decision</span>
                    <strong>{displayDate(latest.decisionDate || latest.date)}</strong>
                    <a className="source-link" href={latest.resolutionUrl || rbi.repo?.provenance?.sourceUrl} target="_blank" rel="noopener noreferrer">RBI MPC resolution <ExternalLinkIcon /></a>
                    <div className="meta">Published {displayDate(latest.publicationDate || latest.provenance?.publishedAt)}</div>
                    <div className="meta">Verified {displayTimestamp(latest.provenance?.verifiedAt, "time unavailable")}</div>
                  </div>
                  <div className="date-card">
                    <span className="metric-label">Next scheduled decision</span>
                    <strong>{nextMeeting?.announce ? displayDate(nextMeeting.announce) : "Schedule unavailable"}</strong>
                    <a className="source-link" href={rbi.mpc?.provenance?.sourceUrl || "https://rbi.org.in/scripts/Annualpolicy.aspx"} target="_blank" rel="noopener noreferrer">RBI annual MPC schedule <ExternalLinkIcon /></a>
                    <div className="meta">Schedule published {displayDate(rbi.mpc?.provenance?.publishedAt)}</div>
                    <div className="meta">Verified {displayTimestamp(rbi.mpc?.provenance?.verifiedAt, "time unavailable")}</div>
                  </div>
                </div>
              </article>

              {/* Decisions Table */}
              <article className="panel chart-panel">
                <div className="chart-top">
                  <div>
                    <p className="chart-kicker">Official RBI decisions</p>
                    <h3>Repo-rate path · rolling 12 months</h3>
                  </div>
                </div>
                <LineChart label="Official RBI repo-rate decisions over the rolling twelve-month period" points={repoHistory.slice(-12).map((item) => ({ label: item.decisionDate || item.date, value: item.rate }))} />
                <div className="table-wrap" style={{ marginTop: "12px" }}>
                  <table className="chart-table">
                    <thead>
                      <tr>
                        <th>Decision</th>
                        <th>Rate</th>
                        <th>Official source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repoHistory.slice(-5).reverse().map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.decisionDate || item.date}</td>
                          <td style={{ color: "var(--highlight)", fontWeight: 700 }}>{item.rate.toFixed(2)}%</td>
                          <td>
                            <a
                              href={item.resolutionUrl || "https://www.rbi.org.in"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                            >
                              RBI resolution <ExternalLinkIcon />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Section 2: Policy Stance */}
        <section className="section" aria-labelledby="stance-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="stance-title">Policy stance</h2>
              <p>The stance explicitly stated by the Reserve Bank of India. No market interpretation is inferred.</p>
            </div>
            <article className="panel stance-card">
              <div>
                <span className="type-badge" style={{ marginBottom: "12px" }}>Official RBI stance</span>
                <h3 className="stance-name">{stanceLabel}</h3>
                <p className="stance-since">Since {stance.since || "date unavailable"}</p>
              </div>
              <div>
                <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                  This is the policy stance explicitly stated by RBI in the validated resolution.
                </p>
                <ul className="stance-rail" aria-label="Supported RBI policy stance categories">
                  {Object.keys(STANCE_NAMES).map((key) => (
                    <li key={key} className="stance-stop" aria-current={key === stance.current ? "true" : undefined}>
                      {STANCE_NAMES[key]}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        <section className="section" aria-labelledby="growth-title">
          <div className="wrap">
            <div className="section-head"><h2 id="growth-title">Growth outlook</h2><p>Official MoSPI real-GDP actuals alongside projections published by RBI.</p></div>
            <div className="actual-grid">
              <article className="panel actual-card"><span className="type-badge">Actual</span><h3>Latest annual real GDP</h3><p className="value">{Number.isFinite(gdpAnnual?.realLevel) ? `₹${gdpAnnual.realLevel.toFixed(2)} lakh crore` : "Unavailable"}</p><p className="growth">{Number.isFinite(gdpAnnual?.realGrowth?.value) ? `${gdpAnnual.realGrowth.value.toFixed(2)}% growth` : "Growth unavailable"}</p><p className="period">{gdpAnnual?.referencePeriod || "Reporting period unavailable"}</p><div className="meta"><a className="source-link" href={gdpAnnual?.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer">MoSPI source <ExternalLinkIcon /></a><span>Published {displayDate(gdpAnnual?.provenance?.publishedAt, "date unavailable")}</span><span>Verified {displayTimestamp(gdpAnnual?.provenance?.verifiedAt, "time unavailable")}</span></div></article>
              <article className="panel actual-card"><span className="type-badge">Actual</span><h3>Latest quarterly real GDP</h3><p className="value">{Number.isFinite(gdpQuarter?.realLevel) ? `₹${gdpQuarter.realLevel.toFixed(2)} lakh crore` : "Unavailable"}</p><p className="growth">{Number.isFinite(gdpQuarter?.realGrowth?.value) ? `${gdpQuarter.realGrowth.value.toFixed(2)}% growth` : "Growth unavailable"}</p><p className="period">{gdpQuarter?.referencePeriod || "Reporting period unavailable"}</p><div className="meta"><a className="source-link" href={gdpQuarter?.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer">MoSPI source <ExternalLinkIcon /></a><span>Published {displayDate(gdpQuarter?.provenance?.publishedAt, "date unavailable")}</span><span>Verified {displayTimestamp(gdpQuarter?.provenance?.verifiedAt, "time unavailable")}</span></div></article>
            </div>
            <div className="outlook-layout">
              <article className="panel chart-panel"><div className="chart-top"><h3>RBI growth outlook</h3></div><LineChart label="Official MoSPI GDP actuals followed by RBI growth projections" points={gdpOutlook.map((item) => ({ label: item.label, value: item.value }))} /><div className="table-wrap"><table><caption className="sr-only">Growth actuals and RBI projections</caption><thead><tr><th>Period</th><th>Growth</th><th>Classification</th><th>Published</th><th>Verified</th><th>Source</th></tr></thead><tbody>{gdpOutlook.map((item, idx) => <tr key={idx}><td>{item.label}</td><td className="number">{Number.isFinite(item.value) ? `${item.value.toFixed(2)}%` : "Unavailable"}</td><td>{item.kind === "projection" ? "RBI projection" : "MoSPI actual"}</td><td>{displayDate(item.provenance?.publishedAt || item.publicationDate, "Unavailable")}</td><td>{displayTimestamp(item.provenance?.verifiedAt, "Unavailable")}</td><td><a className="source-link" href={item.provenance?.sourceUrl || "https://www.rbi.org.in"} target="_blank" rel="noopener noreferrer">Official source <ExternalLinkIcon /></a></td></tr>)}</tbody></table></div></article>
              <aside className="panel outlook-note"><h3>How to read this</h3><p>Actuals are validated against official MoSPI records. Projections are published by RBI and are not Peak and Panic forecasts.</p><div className="legend"><span className="type-badge">Actual</span><span className="type-badge type-badge--projection">RBI projection</span></div></aside>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="inflation-title">
          <div className="wrap">
            <div className="section-head"><h2 id="inflation-title">Inflation outlook</h2><p>Latest All-India Combined CPI actuals, derived quarterly averages and projections published by RBI.</p></div>
            <div className="actual-grid">
              <article className="panel actual-card"><span className="type-badge">Actual</span><h3>Latest CPI index</h3><p className="value">{Number.isFinite(cpiMonthly?.index) ? cpiMonthly.index.toFixed(2) : "Unavailable"}</p><p className="period">{cpiMonthly?.period || "Reporting period unavailable"} · {cpiMonthly?.baseYear || "Base unavailable"}</p><div className="meta"><a className="source-link" href={cpiMonthly?.provenance?.sourceUrl || "https://mospi.gov.in"} target="_blank" rel="noopener noreferrer">MoSPI source <ExternalLinkIcon /></a><span>Published {displayDate(cpiMonthly?.provenance?.publishedAt, "date unavailable")}</span><span>Verified {displayTimestamp(cpiMonthly?.provenance?.verifiedAt, "time unavailable")}</span></div></article>
              <article className="panel actual-card"><span className="type-badge">Actual</span><h3>YoY inflation</h3><p className="value">{Number.isFinite(cpiMonthly?.yoy) ? `${cpiMonthly.yoy.toFixed(2)}%` : "Unavailable"}</p><p className="period">Official monthly MoSPI observation</p></article>
            </div>
            <div className="outlook-layout">
              <article className="panel chart-panel"><div className="chart-top"><h3>CPI outlook</h3></div><LineChart label="Derived quarterly CPI averages followed by RBI projections" points={cpiOutlook.map((item) => ({ label: item.label, value: item.value }))} /><div className="table-wrap"><table><caption className="sr-only">Derived CPI averages and RBI projections</caption><thead><tr><th>Period</th><th>Inflation</th><th>Classification</th><th>Observations</th><th>Source</th></tr></thead><tbody>{cpiOutlook.map((item, idx) => <tr key={idx}><td>{item.label}</td><td className="number">{Number.isFinite(item.value) ? `${item.value.toFixed(2)}%` : "Unavailable"}</td><td>{item.kind === "projection" ? "RBI projection" : item.partial ? "Partial derived average" : "Derived average"}</td><td>{item.derivation?.observationCount ? `${item.derivation.observationCount} of ${item.derivation.expectedObservationCount || 3} months` : "Not applicable"}</td><td><a className="source-link" href={item.provenance?.sourceUrl || item.derivation?.sourceUrl || "https://www.rbi.org.in"} target="_blank" rel="noopener noreferrer">Official source <ExternalLinkIcon /></a></td></tr>)}</tbody></table></div></article>
              <aside className="panel outlook-note"><h3>Method</h3><p>Quarterly actuals are arithmetic averages derived from official monthly All-India Combined CPI YoY observations. RBI projections remain separately classified.</p><dl className="method-details"><div className="method-detail"><dt>Calculation</dt><dd>{cpi.methodology?.quarterlyAverage || "Arithmetic mean of compatible monthly observations"}</dd></div><div className="method-detail"><dt>Base year</dt><dd>{cpi.baseYear || "Unavailable"}</dd></div></dl><div className="legend"><span className="type-badge type-badge--derived">Derived average</span><span className="type-badge type-badge--projection">RBI projection</span></div></aside>
            </div>
          </div>
        </section>

        {/* Section 3: Official RBI Commentary */}
        {commentary.length > 0 && (
          <section className="section" aria-labelledby="commentary-title">
            <div className="wrap">
              <div className="section-head">
                <h2 id="commentary-title">Latest RBI commentary</h2>
                <p>Official extracted text from the latest validated RBI resolution, presented without interpretation.</p>
              </div>
              <article className="panel" style={{ padding: "clamp(22px, calc(30 * var(--u)), 36px)" }}>
                <div className="commentary-copy" style={{ display: "flex", flexDirection: "column", gap: "14px", color: "var(--white)", lineHeight: 1.7 }}>
                  {commentary.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
