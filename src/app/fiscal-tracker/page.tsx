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
        <section className="section fiscal-hero">
          <div className="wrap fiscal-hero-grid">
            <div>
              <span className="eyebrow">Fiscal &amp; Government Tracker</span>
              <h1 className="fiscal-hero-title">
                See how the Union Government’s finances are <span className="hero-accent">tracking.</span>
              </h1>
              <p className="note fiscal-hero-copy">
                Monthly cumulative receipts, expenditure and deficits for the Union Government of India. This is not a measure of all Indian governments combined.
              </p>
            </div>

            {/* Hero Visual Card */}
<aside className="glass fiscal-hero-card">
  <h2>Receipts and expenditure</h2>
  <p className="note fiscal-hero-unit">
    Cumulative year-to-date · ₹ crore
  </p>

  {/* TOTAL EXPENDITURE */}
  <div className="fiscal-hero-total">
    <span className="label fiscal-hero-label">
      TOTAL EXPENDITURE
    </span>
    <div className="fiscal-hero-total-value">
      {money(expenditure)}
    </div>
  </div>

  {/* Dynamic Animated Glowing Wave Loading Bar */}
  {reconciles ? <GlowingWaveProgress leftPercent={receiptsPct} rightPercent={deficitPct} /> : <div className="market-chart-empty">Fiscal data unavailable</div>}

  {/* Metrics Below Bar */}
  <div className="fiscal-hero-metrics">
    <div>
      <span className="label fiscal-hero-label">
        NON-DEBT RECEIPTS
      </span>
      <div className="fiscal-hero-metric fiscal-hero-metric--receipts">
        {money(receipts)}
      </div>
    </div>
    <div className="fiscal-hero-deficit">
      <span className="label fiscal-hero-label">
        FISCAL DEFICIT
      </span>
      <div className="fiscal-hero-metric fiscal-hero-metric--deficit">
        {money(fd)}
      </div>
    </div>
  </div>

  <p className="meta fiscal-hero-equation">
    Receipts + fiscal deficit = total expenditure
  </p>

  {/* Fiscal Deficit against full-year BE */}
  <div className="fiscal-hero-be">
    <span className="meta">Fiscal deficit against full-year BE</span>
    <strong>
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
                <div className="number fiscal-release-unavailable">Unavailable</div>
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
              <div className="table-wrap"><table><caption className="sr-only">Fiscal deficit actual and Budget Estimate</caption><thead><tr><th>Measure</th><th>Coverage</th><th>Value</th><th>Classification</th></tr></thead><tbody><tr><td>Fiscal deficit</td><td>{d.referencePeriod}</td><td>{money(fd)}</td><td>Unaudited provisional actual</td></tr><tr><td>Fiscal deficit</td><td>FY{d.fiscalYear}</td><td>{money(be)}</td><td>Budget Estimate</td></tr></tbody></table></div>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="section-head"><h2 className="section-title">Receipts versus expenditure</h2><p>The difference between total expenditure and total non-debt receipts is the fiscal deficit, not an accounting error.</p></div>
            <div className="grid two"><article className="glass"><span className="label">Total non-debt receipts · YTD</span><div className="number actual">{money(receipts)}</div><p className="note">Revenue receipts plus non-debt capital receipts.</p></article><article className="glass"><span className="label">Total expenditure · YTD</span><div className="number actual">{money(expenditure)}</div><p className="note">Cumulative unaudited provisional expenditure.</p></article></div>
          </div>
        </section>

        {/* Expenditure Composition & Revenue */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">Expenditure composition</h2>
              <p>Revenue and capital expenditure serve different purposes; this comparison does not imply that one is inherently better.</p>
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
              <p>All values below are cumulative year-to-date unaudited provisional Union Government accounts.</p>
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

        <section className="section">
          <div className="wrap">
            <div className="section-head"><h2 className="section-title">Annual Budget context</h2><p>Only validated official estimate classes are shown. Revised Estimates and deficit-to-GDP remain unavailable unless safely parsed from the Budget document.</p></div>
            <article className="glass"><div className="table-wrap"><table><caption className="sr-only">Annual Budget context</caption><thead><tr><th>Indicator</th><th>Budget Estimate</th><th>Revised Estimate</th><th>Deficit to GDP</th></tr></thead><tbody><tr><td>Fiscal deficit</td><td>{money(be)}</td><td>{d.annual?.revisedEstimates ? "Available in source" : "Unavailable"}</td><td>{d.annual?.deficitToGdp ? String(d.annual.deficitToGdp) : "Unavailable"}</td></tr></tbody></table></div><div className="provenance"><a className="source-link" href={actuals.fiscalDeficit?.source?.sourceUrl || "https://cga.nic.in"} target="_blank" rel="noopener noreferrer">Controller General of Accounts ↗</a><div className="meta">Published {actuals.fiscalDeficit?.source?.publicationDate || "date unavailable"} · Verified {actuals.fiscalDeficit?.verifiedAt || "time unavailable"}</div></div></article>
          </div>
        </section>

        {/* Methodology */}
        <section className="section">
          <div className="wrap grid two">
            <article className="glass">
              <h2>How to read this</h2>
              <div className="definition-list fiscal-method-list">
                <div className="definition">
                  <strong>Unaudited provisional actual</strong>
                  <span>Official cumulative account recorded by CGA before final audit.</span>
                </div>
                <div className="definition">
                  <strong>Budget Estimate</strong>
                  <span>The full-year target proposed in the annual Union Budget.</span>
                </div>
                <div className="definition"><strong>Revised Estimate</strong><span>An official in-year revision, shown only when validated.</span></div>
                <div className="definition"><strong>Percentage of BE</strong><span>YTD provisional actual divided by the compatible full-year Budget Estimate.</span></div>
                <div className="definition">
                  <strong>Cumulative YTD</strong>
                  <span>Total from 1 April through the reported month.</span>
                </div>
              </div>
            </article>
            <article className="glass">
              <h2>Methodology and limitations</h2>
              <p className="note fiscal-method-copy">
                Union Government only. Monthly figures are cumulative and unaudited provisional. Receipts and expenditure are seasonal, so percentage-of-BE is context rather than a linear target. No monthly deficit-to-GDP ratio is calculated. Borrowing and debt are omitted because they require separate definitions and sources. This is not investment advice.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
