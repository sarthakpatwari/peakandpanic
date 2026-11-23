"use client";

import { useEffect, useRef, useState } from "react";
import { getSessionState } from "@/lib/market-calendar";

interface QuoteItem {
  price: number;
  pct: number | null;
  timeMs: number | null;
}

const NODES = [
  { id: "nasdaq", name: "NASDAQ", exchange: "US" as const, anchor: "us" },
  { id: "dow", name: "Dow Jones", exchange: "US" as const, anchor: "us" },
  { id: "brent", name: "Brent futures", benchmark: true, unit: "/bbl", currency: "$", anchor: "atlantic" },
  { id: "gold", name: "Gold futures", benchmark: true, unit: "/oz", currency: "$", anchor: "atlantic" },
  { id: "nifty50", name: "NIFTY 50", exchange: "IN" as const, anchor: "india", href: "/india-markets" },
];

export default function HeroMarkets() {
  const [quotes, setQuotes] = useState<Record<string, QuoteItem>>({});
  const [sessions, setSessions] = useState<Record<string, { state: string; reason?: string }>>({});
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    // 1. Session state
    const newSessions: Record<string, { state: string; reason?: string }> = {};
    NODES.forEach((node) => {
      newSessions[node.id] = node.exchange ? getSessionState(node.exchange) : { state: "unknown" };
    });
    setSessions(newSessions);

    // 2. Quote fetching
    async function loadQuotes() {
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json();
          const qData = payload.data || {};
          const mapped: Record<string, QuoteItem> = {};
          Object.keys(qData).forEach((key) => {
            const raw = qData[key];
            if (raw && Number.isFinite(raw.price)) {
              mapped[key] = {
                price: raw.price,
                pct: raw.pct,
                timeMs: raw.time ? raw.time * 1000 : Date.now(),
              };
            }
          });
          setQuotes(mapped);
        }
      } catch (err) {
        console.error("Quote fetch error", err);
      }
    }

    loadQuotes();
    const interval = setInterval(loadQuotes, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hero-image" id="hero-map-viewport">
      <div className="map-scroll">
        <div className="hero-map-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={mapImageRef}
            className="hero-base-bg"
            width={1672}
            height={941}
            src="/images/pp-hero-world-emerald.webp"
            alt="Illustrative world map"
          />
        </div>
      </div>

      <div className="market-nodes-container" tabIndex={0} role="region" aria-label="Market snapshots.">
        {/* US Group */}
        <div className="m-group" style={{ top: "30%", left: "8%" }}>
          {["nasdaq", "dow"].map((id) => {
            const node = NODES.find((n) => n.id === id)!;
            const q = quotes[id];
            const s = sessions[id] || { state: "unknown" };
            const isPos = q?.pct !== null && q?.pct !== undefined && q.pct >= 0;

            return (
              <div key={id} className="m-node" data-session={s.state} data-state={q ? "quote" : "unavailable"}>
                <div className="m-header">
                  <span className="m-name">{node.name}</span>
                </div>
                <div className="m-session">
                  <span className="m-dot" aria-hidden="true" />
                  <span>{s.state === "open" ? "Market open" : "Market closed"}</span>
                </div>
                <div className="m-body">
                  <span className="m-price">{q ? fmt.format(q.price) : "—"}</span>
                  <span className={`m-chg ${isPos ? "pos" : "neg"}`}>
                    {q && q.pct !== null ? `${isPos ? "+" : ""}${q.pct.toFixed(2)}%` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nifty 50 */}
        <div style={{ position: "absolute", top: "42%", left: "70%" }}>
          {(() => {
            const node = NODES.find((n) => n.id === "nifty50")!;
            const q = quotes.nifty50;
            const s = sessions.nifty50 || { state: "unknown" };
            const isPos = q?.pct !== null && q?.pct !== undefined && q.pct >= 0;

            return (
              <a href={node.href} className="m-node m-node--primary" data-session={s.state} data-state={q ? "quote" : "unavailable"}>
                <div className="m-header">
                  <span className="m-name">{node.name}</span>
                  <span className="m-link-hint" aria-hidden="true">→</span>
                </div>
                <div className="m-session">
                  <span className="m-dot" aria-hidden="true" />
                  <span>{s.state === "open" ? "Market open" : "Market closed"}</span>
                </div>
                <div className="m-body">
                  <span className="m-price">₹{q ? fmt.format(q.price) : "—"}</span>
                  <span className={`m-chg ${isPos ? "pos" : "neg"}`}>
                    {q && q.pct !== null ? `${isPos ? "+" : ""}${q.pct.toFixed(2)}%` : ""}
                  </span>
                </div>
              </a>
            );
          })()}
        </div>

        {/* Commodity Benchmarks */}
        <section className="m-benchmarks" style={{ bottom: "5%", left: "38%" }}>
          <div className="m-panel-header">
            <h2 className="m-panel-title">COMMODITY BENCHMARKS</h2>
          </div>
          {["gold", "brent"].map((id) => {
            const node = NODES.find((n) => n.id === id)!;
            const q = quotes[id];
            const isPos = q?.pct !== null && q?.pct !== undefined && q.pct >= 0;

            return (
              <div key={id} className="m-benchmark-row">
                <div className="m-header">
                  <span className="m-dot" aria-hidden="true" />
                  <span className="m-name">{node.name}</span>
                </div>
                <div className="m-body">
                  <span className="m-price">${q ? fmt.format(q.price) : "—"}</span>
                  <span className={`m-chg ${isPos ? "pos" : "neg"}`}>
                    {q && q.pct !== null ? `${isPos ? "+" : ""}${q.pct.toFixed(2)}%` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <div className="artwork-note">
        Illustrative artwork — not live market data. <span className="map-scroll-hint">Scroll cards on mobile.</span>
      </div>
      <div className="market-status-bar" data-state="quote">
        <span className="status-dot" />
        <span>Market quotes active · 30s auto-refresh</span>
      </div>
    </div>
  );
}