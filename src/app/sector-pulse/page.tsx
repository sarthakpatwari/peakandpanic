import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ExternalLinkIcon from "@/components/common/ExternalLinkIcon";
import { displayDate, displayTimestamp } from "@/lib/display-date";
import sectorData from "../../../sector-data.json";

export const metadata: Metadata = {
  title: "Sector Pulse | Peak and Panic",
  description: "Validated official indicators shaping India’s major economic sectors.",
};

type HistoryPoint = { value: number; reportingPeriod: string; publicationDate: string; sourceUrl: string };
type Indicator = {
  name: string; unit: string; frequency: string; comparisonBasis: string; classification: string; sourceName: string;
  current: HistoryPoint & { verifiedAt: string }; history: HistoryPoint[];
};

const drivers = [
  { name: "Credit", description: "Funding availability and system liquidity.", sectors: "Banking · Real estate · Consumer" },
  { name: "Demand", description: "Household and business activity across the economy.", sectors: "Auto · Travel · Consumer · Healthcare" },
  { name: "Investment", description: "Capacity creation and public capital expenditure.", sectors: "Infrastructure · Metals · Energy" },
  { name: "Input costs", description: "Energy, commodities and financing pressure.", sectors: "Energy · Metals · Auto · Consumer" },
  { name: "External cycle", description: "Exports, currency and overseas demand.", sectors: "IT · Pharma · Metals" },
];

function formatIndianNumber(value: number, maximumFractionDigits = 2) {
  const fixed = value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
  const [integer, fraction] = fixed.split(".");
  const tail = integer.slice(-3);
  const head = integer.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head ? `${head},` : ""}${tail}${fraction ? `.${fraction}` : ""}`;
}

function formatValue(indicator: Indicator) {
  const value = indicator.current.value;
  if (!Number.isFinite(value)) return "Unavailable";
  if (indicator.unit === "percent") return `${value.toFixed(1)}%`;
  return `${value < 0 ? "−" : ""}₹${formatIndianNumber(Math.abs(value))} crore`;
}

function MiniTrend({ indicator }: { indicator: Indicator }) {
  const points = indicator.history.filter((item) => Number.isFinite(item.value));
  if (points.length < 2) return <p className="sector-trend-unavailable">Trend unavailable — fewer than two compatible observations.</p>;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const line = points.map((point, index) => `${index / (points.length - 1) * 100},${38 - ((point.value - min) / span) * 32}`).join(" ");
  const id = `trend-${indicator.name.replace(/\W/g, "-")}`;
  return (
    <div className="sector-mini-trend">
      <svg viewBox="0 0 100 44" role="img" aria-labelledby={id} preserveAspectRatio="none">
        <title id={id}>{indicator.name} official history</title>
        <desc>{points.length} compatible RBI observations from {displayDate(points[0].reportingPeriod)} to {displayDate(points.at(-1)?.reportingPeriod)}.</desc>
        <polyline points={line} vectorEffect="non-scaling-stroke" />
      </svg>
      <span>{displayDate(points[0].reportingPeriod)}</span>
      <span>{displayDate(points.at(-1)?.reportingPeriod)}</span>
    </div>
  );
}

export default function SectorPulsePage() {
  const sectors = sectorData.sectors;
  const indicatorCount = sectors.reduce((total, sector) => total + sector.indicators.length, 0);
  const banking = sectorData.liveSectors?.["banking-credit-liquidity"];
  const indicators = banking?.indicators as Record<string, Indicator> | undefined;
  const liveIndicators = indicators ? Object.values(indicators) : [];
  const observationCount = liveIndicators.reduce((total, indicator) => total + indicator.history.length, 0);

  return (
    <div className="page sector-pulse-page">
      <Header />
      <main>
        <section className="sector-hero" aria-labelledby="sector-page-title">
          <div className="wrap sector-hero__layout">
            <div className="sector-hero__copy">
              <p className="eyebrow">Sector Pulse</p>
              <h1 id="sector-page-title">Read India’s economy sector by sector.</h1>
              <p>A source-led view of demand, credit, investment and operating activity—built to show what is known, delayed and still unavailable.</p>
            </div>
            <aside className="sector-hero__summary" aria-label="Sector Pulse coverage status">
              <p className="sector-kicker">Coverage status</p>
              <dl className="sector-stat-list">
                <div><dt>Sectors mapped</dt><dd>{sectors.length}</dd></div>
                <div><dt>Indicators mapped</dt><dd>{indicatorCount}</dd></div>
                <div><dt>Sectors live</dt><dd className="sector-state">1</dd></div>
              </dl>
              <p className="sector-summary-note">Banking is connected to official RBI releases. Other sectors remain integration pending.</p>
            </aside>
          </div>
        </section>

        <section className="sector-section sector-banking" aria-labelledby="banking-title">
          <div className="wrap">
            <div className="sector-section-heading">
              <p className="eyebrow">Live official data</p>
              <h2 id="banking-title">Banking, credit &amp; liquidity</h2>
              <p>Fortnightly banking and money-stock signals, plus the RBI’s daily net-liquidity measure. Each reading retains its own period and provenance.</p>
            </div>
            {liveIndicators.length ? <>
              <div className="sector-metric-grid">
                {liveIndicators.map((indicator) => (
                  <article className={`sector-metric-card${indicator.name === "System liquidity" ? " sector-metric-card--liquidity" : ""}`} key={indicator.name}>
                    <div className="sector-metric-heading"><h3>{indicator.name}</h3><span>{indicator.classification === "derived" ? "Derived" : "Official"}</span></div>
                    <p className="sector-metric-value">{formatValue(indicator)}</p>
                    <p className="sector-metric-period">As at {displayDate(indicator.current.reportingPeriod)} · {indicator.frequency}</p>
                    <MiniTrend indicator={indicator} />
                    <div className="sector-metric-source">
                      <a className="source-link" href={indicator.current.sourceUrl} target="_blank" rel="noopener noreferrer">RBI source <ExternalLinkIcon /></a>
                      <span>Published {displayDate(indicator.current.publicationDate)}</span>
                      <span>Verified {displayTimestamp(indicator.current.verifiedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
              <details className="sector-history-disclosure">
                <summary><span>View full banking history</span><span>{observationCount} observations</span></summary>
                <div className="table-wrap sector-history-table">
                  <table>
                    <caption>Official and derived Banking sector history represented in the trend charts</caption>
                    <thead><tr><th>Indicator</th><th>Period</th><th>Value</th><th>Classification</th><th>Published</th></tr></thead>
                    <tbody>{liveIndicators.flatMap((indicator) => indicator.history.map((point) => (
                      <tr key={`${indicator.name}-${point.reportingPeriod}`}><td>{indicator.name}</td><td>{displayDate(point.reportingPeriod)}</td><td>{indicator.unit === "percent" ? `${point.value.toFixed(2)}%` : `₹${formatIndianNumber(point.value)} crore`}</td><td>{indicator.classification}</td><td>{displayDate(point.publicationDate)}</td></tr>
                    )))}</tbody>
                  </table>
                </div>
              </details>
              <div className="sector-banking-method">
                <p><strong>Credit–deposit ratio:</strong> bank credit outstanding ÷ aggregate deposits × 100, using the same RBI reporting date and institutional coverage.</p>
                <p><strong>System liquidity:</strong> RBI net liquidity injected, outstanding including the day’s operations. Positive means net injection; negative means net absorption.</p>
              </div>
            </> : <p className="sector-data-unavailable">Banking data is unavailable. No substitute values are shown.</p>}
          </div>
        </section>

        <section className="sector-section" aria-labelledby="drivers-title"><div className="wrap"><div className="sector-section-heading"><p className="eyebrow">Cross-sector lens</p><h2 id="drivers-title">Five forces connect the signals.</h2><p>No sector moves alone. These lenses connect releases without collapsing them into an unverified score.</p></div><div className="driver-grid">{drivers.map((driver) => <article className="driver-card" key={driver.name}><h3>{driver.name}</h3><p>{driver.description}</p><span>{driver.sectors}</span></article>)}</div></div></section>

        <section className="sector-section sector-register" aria-labelledby="register-title"><div className="wrap"><div className="sector-section-heading"><p className="eyebrow">Coverage register</p><h2 id="register-title">The indicators behind each sector.</h2><p>Open a sector to see its planned series, update frequency and primary source owner.</p></div><div className="sector-register-grid">{sectors.map((sector) => <details className="sector-register-card" key={sector.id}><summary><span className="sector-card-title"><strong>{sector.name}</strong><span>{sector.description}</span></span><span className="sector-card-count">{sector.id === banking?.id ? "Live" : `${sector.indicators.length} indicators`}</span></summary><div className="sector-card-body"><div className="sector-source-row" aria-label="Primary sources">{sector.sources.map((source) => <span key={source}>{source}</span>)}</div><div className="sector-indicator-list" role="list">{sector.indicators.map((indicator) => <div className="sector-indicator" role="listitem" key={`${sector.id}-${indicator.name}`}><strong>{indicator.name}</strong><span>{indicator.frequency}</span><small>{sector.id === banking?.id ? "Live · official RBI" : "Integration pending"}</small></div>)}</div>{"relatedRoute" in sector && sector.relatedRoute ? <Link className="sector-related-link" href={sector.relatedRoute}>Open the validated Fiscal Tracker</Link> : null}</div></details>)}</div></div></section>

        <section className="sector-section sector-method" aria-labelledby="method-title"><div className="wrap sector-method__layout"><div className="sector-section-heading"><p className="eyebrow">Data standard</p><h2 id="method-title">Designed to fail honestly.</h2><p>A delayed release never becomes a made-up reading. Last validated observations remain attached to their actual reporting periods.</p></div><div className="sector-method-list"><article><span>01</span><div><h3>Actual</h3><p>Published by the named official source.</p></div></article><article><span>02</span><div><h3>Derived</h3><p>Calculated only from compatible validated observations, with the method disclosed.</p></div></article><article><span>03</span><div><h3>Unavailable</h3><p>Shown when identity, period, units or reconciliation cannot be verified.</p></div></article></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
