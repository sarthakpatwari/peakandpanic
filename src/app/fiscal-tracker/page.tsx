import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import GlowingWaveProgress from "@/components/common/GlowingWaveProgress";
import fiscalJson from "../../../fiscal-data.json";
function money(n: number) {
  return Number.isFinite(n) ? "₹" + new Intl.NumberFormat("en-IN").format(n) + " crore" : "Unavailable";
}

export default function FiscalTrackerPage() {
  const d = fiscalJson;
  const actuals = d.monthly?.actuals || {};
  const beObj = d.annual?.budgetEstimates?.fiscalDeficit || {};

  const value = (candidate: unknown) => typeof candidate === "number" && Number.isFinite(candidate) ? candidate : Number.NaN;
  const fd = value(actuals.fiscalDeficit?.value);
  const receipts = value(actuals.totalNonDebtReceipts?.value);
  const expenditure = value(actuals.totalExpenditure?.value);
  const be = value(beObj.value);
  const netTax = value(actuals.netTaxRevenueToCentre?.value);
  const revExp = value(actuals.revenueExpenditure?.value);
  const capExp = value(actuals.capitalExpenditure?.value);
  const revDeficit = value(actuals.revenueDeficit?.value);
  const revReceipts = value(actuals.revenueReceipts?.value);

  const budgetUse = (fd / be) * 100;
  const receiptsRatio = receipts / expenditure;
  const deficitRatio = fd / expenditure;
  const reconciles = [fd, receipts, expenditure, be].every(Number.isFinite) && Math.abs(receipts + fd - expenditure) < 0.5;
  const receiptsPct = reconciles ? Math.round(receiptsRatio * 100) : 0;
  const deficitPct = reconciles ? Math.round(deficitRatio * 100) : 0;

  return (
    <div className="page">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="section" style={{ borderBottom: "1px solid rgba(33,72,60,.38)" }}>
          <div className="wrap" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.08fr) minmax(330px, .92fr)", gap: "40px", alignItems: "center" }}>
            <div>
              <span className="eyebrow">Fiscal &amp; Government Tracker</span>
              <h1 style={{ fontSize: "clamp(40px, 5vw, 68px)", margin: "12px 0 20px" }}>
                See how the Union Government’s finances are <span style={{ color: "var(--highlight)", fontStyle: "italic", fontFamily: "Instrument Serif" }}>tracking.</span>
              </h1>
              <p className="note" style={{ fontSize: "18px", maxWidth: "700px" }}>
                Monthly cumulative receipts, expenditure and deficits for the Union Government of India based on Controller General of Accounts (CGA) data.
              </p>
            </div>

            {/* Hero Visual Card */}
<aside className="glass" style={{ padding: "24px" }}>
  <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>Receipts and expenditure</h2>
  <p className="note" style={{ fontSize: "13px", margin: 0 }}>
    Cumulative year-to-date · ₹ crore
  </p>

  {/* TOTAL EXPENDITURE */}
  <div style={{ margin: "20px 0 14px" }}>
    <span className="label" style={{ fontSize: "11px", letterSpacing: "0.06em", color: "var(--muted)" }}>
      TOTAL EXPENDITURE
    </span>
    <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--white)", fontFamily: "Space Grotesk" }}>
      {money(expenditure)}
    </div>
  </div>

  {/* Dynamic Animated Glowing Wave Loading Bar */}
  {reconciles ? <GlowingWaveProgress leftPercent={receiptsPct} rightPercent={deficitPct} /> : <div className="market-chart-empty">Fiscal data unavailable</div>}

  {/* Metrics Below Bar */}
  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
    <div>
      <span className="label" style={{ fontSize: "11px", color: "var(--muted)" }}>
        NON-DEBT RECEIPTS
      </span>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--highlight)", fontFamily: "Space Grotesk" }}>
        {money(receipts)}
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <span className="label" style={{ fontSize: "11px", color: "var(--muted)" }}>
        FISCAL DEFICIT
      </span>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#f59e0b", fontFamily: "Space Grotesk" }}>
        {money(fd)}
      </div>
    </div>
  </div>

  <p className="meta" style={{ marginTop: "12px", fontSize: "12px", color: "var(--muted)" }}>
    Receipts + fiscal deficit = total expenditure
  </p>

  {/* Fiscal Deficit against full-year BE */}
  <div
    style={{
      marginTop: "16px",
      paddingTop: "12px",
      borderTop: "1px solid rgba(110,231,183,.14)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "13px",
    }}
  >
    <span className="meta">Fiscal deficit against full-year BE</span>
    <strong style={{ fontFamily: "Space Grotesk", fontSize: "18px" }}>
      {budgetUse.toFixed(1)}%
    </strong>
  </div>
</aside>
          </div>
        </section>

        {/* Fiscal Snapshot */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">Fiscal snapshot</h2>
              <p className="meta">Latest official cumulative year-to-date accounts (unaudited provisional CGA actuals).</p>
            </div>
            <div className="grid snapshot">
              <article className="glass">
                <span className="label">Fiscal deficit · YTD</span>
                <div className="number actual">{money(fd)}</div>
                <div className="meta">{d.referencePeriod || "Reporting period unavailable"}</div>
              </article>
              <article className="glass">
                <span className="label">Full-year Budget Estimate</span>
                <div className="number estimate">{money(be)}</div>
                <div className="meta">Budget Estimate (BE)</div>
              </article>
              <article className="glass">
                <span className="label">Budget Estimate used</span>
                <div className="number">{budgetUse.toFixed(1)}%</div>
                <div className="meta">YTD actual ÷ full-year BE</div>
              </article>
              <article className="glass">
                <span className="label">Next CGA release</span>
                <div className="number" style={{ fontSize: "28px" }}>Unavailable</div>
                <div className="meta">No validated future release date</div>
              </article>
            </div>
          </div>
        </section>

        {/* Deficit Progress */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">Deficit progress</h2>
              <p className="meta">Year-to-date progress is seasonal; revenue inflows peak in later quarters.</p>
            </div>
            <article className="glass">
              <div className="pair">
                <div>
                  <span className="label">YTD provisional actual</span>
                  <div className="number actual">{money(fd)}</div>
                </div>
                <div>
                  <span className="label">Full-year BE</span>
                  <div className="number estimate">{money(be)}</div>
                </div>
              </div>
              <div className="bar">
                <span style={{ width: `${Math.min(budgetUse, 100)}%` }} />
              </div>
              <p className="note">{budgetUse.toFixed(1)}% of the full-year Budget Estimate utilized.</p>
            </article>
          </div>
        </section>

        {/* Expenditure Composition & Revenue */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">Expenditure composition</h2>
            </div>
            <div className="grid two">
              <article className="glass">
                <span className="label">Revenue expenditure · YTD</span>
                <div className="number actual">{money(revExp)}</div>
                <div className="meta">{((revExp / expenditure) * 100).toFixed(1)}% of YTD total expenditure</div>
              </article>
              <article className="glass">
                <span className="label">Capital expenditure (Capex) · YTD</span>
                <div className="number actual">{money(capExp)}</div>
                <div className="meta">{((capExp / expenditure) * 100).toFixed(1)}% of YTD total expenditure</div>
              </article>
            </div>
          </div>
        </section>

        {/* Revenue Position */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">Revenue position</h2>
            </div>
            <div className="grid three">
              <article className="glass">
                <span className="label">Revenue receipts</span>
                <div className="number actual">{money(revReceipts)}</div>
              </article>
              <article className="glass">
                <span className="label">Net tax revenue to Centre</span>
                <div className="number actual">{money(netTax)}</div>
              </article>
              <article className="glass">
                <span className="label">Revenue deficit</span>
                <div className="number actual">{money(revDeficit)}</div>
              </article>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="section">
          <div className="wrap grid two">
            <article className="glass">
              <h2>How to read this</h2>
              <div className="definition-list" style={{ marginTop: "16px" }}>
                <div className="definition">
                  <strong>Unaudited provisional actual</strong>
                  <span>Official cumulative account recorded by CGA before final audit.</span>
                </div>
                <div className="definition">
                  <strong>Budget Estimate</strong>
                  <span>The full-year target proposed in the annual Union Budget.</span>
                </div>
                <div className="definition">
                  <strong>Cumulative YTD</strong>
                  <span>Total from 1 April through the reported month.</span>
                </div>
              </div>
            </article>
            <article className="glass">
              <h2>Methodology and limitations</h2>
              <p className="note" style={{ marginTop: "16px", lineHeight: 1.7 }}>
                Union Government only. Monthly figures are cumulative and unaudited provisional accounts. Receipts and expenditure are seasonal, so percentage-of-BE is context rather than a linear target. This does not constitute investment advice.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
