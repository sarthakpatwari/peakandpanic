"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSessionState } from "@/lib/market-calendar";

interface HeroQuote { price: number; pct: number; time: number }
const DEMO_QUOTES: Record<string, HeroQuote> = {
  nasdaq: { price: 18342.90, pct: 0.62, time: 0 }, dow: { price: 42863.86, pct: -0.21, time: 0 },
  brent: { price: 78.25, pct: 1.14, time: 0 }, gold: { price: 2654.40, pct: 0.38, time: 0 },
  nifty50: { price: 25014.60, pct: 0.44, time: 0 },
};
const DEMO_SESSIONS: Record<string, "open" | "closed" | "unknown"> = { nasdaq: "open", dow: "closed", nifty50: "unknown", brent: "unknown", gold: "unknown" };
const nodes = [
  { id: "nasdaq", name: "NASDAQ", exchange: "US" as const }, { id: "dow", name: "Dow Jones", exchange: "US" as const },
  { id: "nifty50", name: "NIFTY 50", exchange: "IN" as const },
] as const;
const valid = (value: unknown): value is HeroQuote => { const q = value as HeroQuote; return Boolean(q) && [q.price, q.pct, q.time].every(Number.isFinite); };

function EquityCard({ id, name, exchange, quote, primary = false, demo = false }: { id: string; name: string; exchange: "US" | "IN"; quote?: HeroQuote; primary?: boolean; demo?: boolean }) {
  const calculated = useMemo(() => getSessionState(exchange), [exchange]); const session = demo ? { state: DEMO_SESSIONS[id], reason: "simulated" } : calculated; const positive = quote ? quote.pct >= 0 : false;
  const body = <><div className="m-header"><span className="m-name">{name}</span>{primary && <span aria-hidden="true">→</span>}</div><div className="m-session"><span className="m-dot" aria-hidden="true" /><span>{session.state === "open" ? "Market open" : session.state === "closed" ? "Market closed" : "Status unknown"}</span></div><div className="m-body"><span className="m-price">{quote ? quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</span>{quote && <span className={`m-chg ${positive ? "pos" : "neg"}`}>{positive ? "+" : ""}{quote.pct.toFixed(2)}%</span>}</div></>;
  return primary ? <Link href="/india-markets" className="m-node m-node--primary" data-session={session.state} data-state={quote ? "quote" : "unavailable"} aria-label={`${name}, ${quote ? `${quote.price}, ${quote.pct}%` : "market data unavailable"}`}>{body}</Link> : <div className="m-node" data-session={session.state} data-state={quote ? "quote" : "unavailable"}>{body}</div>;
}

export default function HeroMarkets({ demo = false }: { demo?: boolean }) {
  const [quotes, setQuotes] = useState<Record<string, HeroQuote>>(demo ? DEMO_QUOTES : {});
  useEffect(() => { let active = true; if (demo) return () => { active = false; }; async function load() { try { const response = await fetch("/api/quotes", { cache: "no-store" }); if (!response.ok) return; const payload = await response.json(); const next: Record<string, HeroQuote> = {}; for (const [key, value] of Object.entries(payload.data || {})) if (valid(value)) next[key] = value; if (active) setQuotes((current) => ({ ...current, ...next })); } catch {} } load(); const timer = window.setInterval(load, 30_000); return () => { active = false; window.clearInterval(timer); }; }, [demo]);
  return <div className="hero-image" id="hero-map-viewport"><div className="map-scroll"><div className="hero-map-stage"><img className="hero-base-bg" width={1672} height={941} src="/images/pp-hero-world-emerald.webp" alt="Illustrative world map" /></div></div>
    <div className="market-nodes-container" role="region" aria-label="Market snapshots">
      <div className="m-group" style={{ top: "30%", left: "8%" }}>{nodes.slice(0, 2).map((node) => <EquityCard key={node.id} {...node} quote={quotes[node.id]} demo={demo} />)}</div>
      <div style={{ position: "absolute", top: "42%", left: "70%" }}><EquityCard {...nodes[2]} quote={quotes.nifty50} primary demo={demo} /></div>
      <section className="m-benchmarks" style={{ bottom: "5%", left: "38%" }}><div className="m-panel-header"><h2 className="m-panel-title">COMMODITY BENCHMARKS</h2></div>{[{ id: "gold", name: "Gold futures" }, { id: "brent", name: "Brent futures" }].map((item) => { const quote = quotes[item.id]; const positive = quote ? quote.pct >= 0 : false; return <div className="m-benchmark-row" key={item.id}><div className="m-header"><span className="m-dot" aria-hidden="true" /><span className="m-name">{item.name}</span></div><div className="m-body"><span className="m-price">{quote ? `$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</span>{quote && <span className={`m-chg ${positive ? "pos" : "neg"}`}>{positive ? "+" : ""}{quote.pct.toFixed(2)}%</span>}</div></div>; })}</section>
    </div>{demo && <p className="demo-notice">Demo — sample data. All session states are simulated.</p>}<div className="market-status-bar"><span className="status-dot" /><span>{demo ? "Demo — sample data / session states simulated" : "Market quotes · 30s auto-refresh"}</span></div>
  </div>;
}
