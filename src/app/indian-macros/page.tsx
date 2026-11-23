import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { getJsonData } from "@/lib/data";
import Link from "next/link";

export default function IndianMacrosPage() {
  const macroData = getJsonData("macro-data.json") || {};
  const items = macroData.items || {};

  const cards = [
    {
      key: "repo",
      name: "RBI Policy Tracker",
      href: "/rbi-policy-tracker",
      value: items.repo?.value || "6.50%",
      lines: items.repo?.lines?.join(" · ") || "Policy repo rate · Effective 2026-10-07",
      source: items.repo?.source || "RBI MPC resolution",
      updated: items.repo?.updatedAt ? `Updated ${items.repo.updatedAt}` : "Updated Oct 2026",
    },
    {
      key: "inflation",
      name: "Inflation Tracker",
      href: "/inflation-tracker",
      value: items.inflation?.value || "6.09%",
      lines: items.inflation?.lines?.join(" · ") || "CPI, YoY · All India Combined · 2026-10",
      source: items.inflation?.source || "MoSPI CPI API",
      updated: items.inflation?.updatedAt ? `Updated ${items.inflation.updatedAt}` : "Updated Nov 2026",
    },
    {
      key: "growth",
      name: "Growth Tracker",
      href: "/growth-tracker",
      value: items.growth?.value || "7.82%",
      lines: items.growth?.lines?.join(" · ") || "Real GDP growth, YoY · Q1 FY2026-27",
      source: items.growth?.source || "MoSPI National Accounts Statistics",
      updated: items.growth?.updatedAt ? `Updated ${items.growth.updatedAt}` : "Updated Sep 2026",
    },
    {
      key: "fiscal",
      name: "Fiscal & Government",
      href: "/fiscal-tracker",
      value: items.fiscal?.value || "₹7.14 lakh crore",
      lines: items.fiscal?.lines?.join(" · ") || "Fiscal deficit · 42.1% of Budget Estimate · Apr–Sep FY2026-27",
      source: items.fiscal?.source || "Controller General of Accounts",
      updated: items.fiscal?.updatedAt ? `Updated ${items.fiscal.updatedAt}` : "Updated Oct 2026",
    },
  ];

  return (
    <div className="page">
      <Header />
      <main>
        {/* Intro */}
        <section className="intro" aria-labelledby="page-title">
          <div className="wrap">
            <div className="intro-copy">
              <p className="eyebrow">Indian Macros</p>
              <h1 id="page-title">The forces shaping India’s economy.</h1>
              <p>
                Track monetary policy, inflation, growth and fiscal conditions through the latest published indicators shaping India’s economic outlook.
              </p>
            </div>
          </div>
        </section>

        {/* Trackers Grid */}
        <section className="trackers" aria-labelledby="trackers-title">
          <div className="wrap">
            <div className="section-heading">
              <h2 id="trackers-title">Macro trackers</h2>
              <p>A focused view of the indicators that matter most to Indian investors.</p>
            </div>

            <div className="tracker-grid">
              {cards.map((card) => (
                <Link key={card.key} href={card.href} className="tracker-card">
                  <div className="card-top">
                    <h3 className="tracker-name">{card.name}</h3>
                    <span className="availability availability--ready">Detailed tracker</span>
                  </div>
                  <p className="macro-value">{card.value}</p>
                  <p className="macro-description">{card.lines}</p>
                  <div className="card-meta">
                    <span>
                      <strong>Official source</strong>
                      <span>{card.source}</span>
                    </span>
                    <span>
                      <strong>Updated</strong>
                      <span>{card.updated}</span>
                    </span>
                  </div>
                  <span className="card-action">
                    View tracker <span>→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
