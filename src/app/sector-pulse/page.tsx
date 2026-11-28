import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import sectorData from "../../../sector-data.json";

export const metadata: Metadata = {
  title: "Sector Pulse | Peak and Panic",
  description: "A source-led map of the indicators shaping India’s major economic sectors.",
};

const drivers = [
  { name: "Credit", description: "Funding availability and system liquidity.", sectors: "Banking · Real estate · Consumer" },
  { name: "Demand", description: "Household and business activity across the economy.", sectors: "Auto · Travel · Consumer · Healthcare" },
  { name: "Investment", description: "Capacity creation and public capital expenditure.", sectors: "Infrastructure · Metals · Energy" },
  { name: "Input costs", description: "Energy, commodities and financing pressure.", sectors: "Energy · Metals · Auto · Consumer" },
  { name: "External cycle", description: "Exports, currency and overseas demand.", sectors: "IT · Pharma · Metals" },
];

export default function SectorPulsePage() {
  const sectors = sectorData.sectors;
  const indicatorCount = sectors.reduce((total, sector) => total + sector.indicators.length, 0);

  return (
    <div className="page sector-pulse-page">
      <Header />
      <main>
        <section className="sector-hero" aria-labelledby="sector-page-title">
          <div className="wrap sector-hero__layout">
            <div className="sector-hero__copy">
              <p className="eyebrow">Sector Pulse</p>
              <h1 id="sector-page-title">Read India’s economy sector by sector.</h1>
              <p>
                A source-led view of demand, credit, investment and operating activity—built to show what is known, what is delayed and what is still unavailable.
              </p>
            </div>
            <aside className="sector-hero__summary" aria-label="Sector Pulse coverage status">
              <p className="sector-kicker">Coverage blueprint</p>
              <dl className="sector-stat-list">
                <div><dt>Sectors</dt><dd>{sectors.length}</dd></div>
                <div><dt>Indicators mapped</dt><dd>{indicatorCount}</dd></div>
                <div><dt>Data state</dt><dd className="sector-state">Source integration pending</dd></div>
              </dl>
              <p className="sector-summary-note">Numbers appear only after their source, period and publication date pass validation.</p>
            </aside>
          </div>
        </section>

        <section className="sector-section" aria-labelledby="drivers-title">
          <div className="wrap">
            <div className="sector-section-heading">
              <p className="eyebrow">Cross-sector lens</p>
              <h2 id="drivers-title">Five forces connect the signals.</h2>
              <p>No sector moves alone. These lenses help readers connect individual releases without collapsing them into an unverified score.</p>
            </div>
            <div className="driver-grid">
              {drivers.map((driver) => (
                <article className="driver-card" key={driver.name}>
                  <h3>{driver.name}</h3>
                  <p>{driver.description}</p>
                  <span>{driver.sectors}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sector-section sector-register" aria-labelledby="register-title">
          <div className="wrap">
            <div className="sector-section-heading">
              <p className="eyebrow">Coverage register</p>
              <h2 id="register-title">The indicators behind each sector.</h2>
              <p>Open a sector to see its planned series, update frequency and primary source owner.</p>
            </div>
            <div className="sector-register-grid">
              {sectors.map((sector) => (
                <details className="sector-register-card" key={sector.id}>
                  <summary>
                    <span className="sector-card-title">
                      <strong>{sector.name}</strong>
                      <span>{sector.description}</span>
                    </span>
                    <span className="sector-card-count">{sector.indicators.length} indicators</span>
                  </summary>
                  <div className="sector-card-body">
                    <div className="sector-source-row" aria-label="Primary sources">
                      {sector.sources.map((source) => <span key={source}>{source}</span>)}
                    </div>
                    <div className="sector-indicator-list" role="list">
                      {sector.indicators.map((indicator) => (
                        <div className="sector-indicator" role="listitem" key={`${sector.id}-${indicator.name}`}>
                          <strong>{indicator.name}</strong>
                          <span>{indicator.frequency}</span>
                          <small>{indicator.source}</small>
                        </div>
                      ))}
                    </div>
                    {"relatedRoute" in sector && sector.relatedRoute ? (
                      <Link className="sector-related-link" href={sector.relatedRoute}>Open the validated Fiscal Tracker</Link>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="sector-section sector-method" aria-labelledby="method-title">
          <div className="wrap sector-method__layout">
            <div className="sector-section-heading">
              <p className="eyebrow">Data standard</p>
              <h2 id="method-title">Designed to fail honestly.</h2>
              <p>A delayed release should never become a made-up reading. Sector Pulse will retain the last validated observation and disclose its period and age.</p>
            </div>
            <div className="sector-method-list">
              <article><span>01</span><div><h3>Actual</h3><p>Published by the named official source or issuer filing.</p></div></article>
              <article><span>02</span><div><h3>Derived</h3><p>Calculated only from compatible validated observations, with the method disclosed.</p></div></article>
              <article><span>03</span><div><h3>Unavailable</h3><p>Shown when identity, period, units or reconciliation cannot be verified.</p></div></article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
