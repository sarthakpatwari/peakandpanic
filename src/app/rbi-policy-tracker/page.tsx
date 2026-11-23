import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { getJsonData } from "@/lib/data";

const STANCE_NAMES: Record<string, string> = {
  hawkish: "Hawkish",
  accommodative: "Accommodative",
  neutral: "Neutral",
  calibrated_tightening: "Calibrated tightening",
  withdrawal_of_accommodation: "Withdrawal of accommodation",
};

export default function RbiPolicyTrackerPage() {
  const rbi = getJsonData("rbi-data.json") || {};
  const repoHistory = ((rbi.repo?.history || []) as any[]).sort((a, b) => a.date.localeCompare(b.date));
  const latest = repoHistory[repoHistory.length - 1] || { rate: 6.5, decisionDate: "2026-10-07", date: "2026-10-07" };
  const stance = rbi.stance || { current: "calibrated_tightening", since: "2026-10-07" };
  const stanceLabel = STANCE_NAMES[stance.current] || "Neutral";
  const commentary = (rbi.commentary?.paragraphs || []) as string[];
  const mpcMeetings = (rbi.mpc?.meetings || []) as any[];

  return (
    <div className="page">
      <Header />
      <main>
        {/* Intro */}
        <section className="intro" aria-labelledby="page-title">
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
                    <strong>{latest.decisionDate || latest.date}</strong>
                    <div className="meta" style={{ marginTop: "6px" }}>Official Resolution</div>
                  </div>
                  <div className="date-card">
                    <span className="metric-label">Next scheduled decision</span>
                    <strong>{mpcMeetings[0]?.announce || "Dec 2026"}</strong>
                    <div className="meta" style={{ marginTop: "6px" }}>RBI Schedule</div>
                  </div>
                </div>
              </article>

              {/* Decisions Table */}
              <article className="panel chart-panel">
                <div className="chart-top">
                  <div>
                    <p className="chart-kicker">Official RBI decisions</p>
                    <h3>Repo-rate decisions · Recent path</h3>
                  </div>
                </div>
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
                              RBI resolution ↗
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
                <p className="stance-since">Since {stance.since || "recent MPC meeting"}</p>
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

        {/* Section 3: Official RBI Commentary */}
        {commentary.length > 0 && (
          <section className="section" aria-labelledby="commentary-title">
            <div className="wrap">
              <div className="section-head">
                <h2 id="commentary-title">Latest RBI commentary</h2>
                <p>Official extracted text from the latest validated RBI resolution, presented without interpretation.</p>
              </div>
              <article className="panel" style={{ padding: "clamp(22px, calc(30 * var(--u)), 36px)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", color: "var(--white)", lineHeight: 1.7 }}>
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
