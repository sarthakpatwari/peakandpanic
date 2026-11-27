"use client";

import { useEffect, useMemo, useState } from "react";
import { getSessionState } from "@/lib/market-calendar";
import type { Quote } from "@/lib/quotes";
import { displayTimestamp } from "@/lib/display-date";

const MARKETS = [
  { id: "nifty50", name: "NIFTY 50", venue: "NSE · Index" },
  { id: "banknifty", name: "NIFTY BANK", venue: "NSE · Index" },
  { id: "sensex", name: "BSE SENSEX", venue: "BSE · Index" },
  { id: "indiavix", name: "INDIA VIX", venue: "NSE · Volatility" },
] as const;

type QuoteMap = Record<string, Quote | null>;
type Direction = "positive" | "negative" | "neutral" | "unavailable";
const validQuote = (value: unknown): value is Quote => {
  const quote = value as Quote;
  return Boolean(quote) && [quote.price, quote.previousClose, quote.change, quote.pct, quote.time].every(Number.isFinite)
    && Array.isArray(quote.series) && quote.series.every(Number.isFinite);
};

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="market-chart-empty">Intraday chart unavailable</div>;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${92 - ((value - min) / span) * 78}`).join(" ");
  return <svg viewBox="0 0 100 100" role="img" aria-label="Intraday price path" preserveAspectRatio="none"><polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /></svg>;
}

export default function IndiaMarketGrid() {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [stale, setStale] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const session = useMemo(() => getSessionState("IN"), []);

  useEffect(() => {
    let active = true;
    const savedQuote = (id: string) => {
      try { const value = JSON.parse(localStorage.getItem(`pp-quote-${id}`) || "null"); return validQuote(value) ? value : null; }
      catch { return null; }
    };
    async function load() {
      const next: QuoteMap = {}; const nextStale: Record<string, boolean> = {};
      try {
        const response = await fetch("/api/quotes", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json() as { data?: QuoteMap };
        for (const market of MARKETS) {
          const candidate = payload.data?.[market.id];
          if (validQuote(candidate)) {
            next[market.id] = candidate;
            localStorage.setItem(`pp-quote-${market.id}`, JSON.stringify(candidate));
          } else { next[market.id] = savedQuote(market.id); nextStale[market.id] = Boolean(next[market.id]); }
        }
      } catch {
        for (const market of MARKETS) { next[market.id] = savedQuote(market.id); nextStale[market.id] = Boolean(next[market.id]); }
      } finally {
        if (active) { setQuotes(next); setStale(nextStale); setLoading(false); }
      }
    }
    load(); const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const available = MARKETS.filter((market) => validQuote(quotes[market.id])).length;
  return <>
    <section className="state-strip" aria-label="Market and quote status">
      <div className="state-item"><span className="state-label">NSE session</span><span className="state-value">{session.state === "open" ? "Market open" : session.state === "closed" ? "Market closed" : "Status unknown"}</span></div>
      <div className="state-item"><span className="state-label">Price status</span><span className="state-value">{loading ? "Loading verified quotes" : available ? `${available} of 4 available` : "Market data unavailable"}</span></div>
      <div className="state-item"><span className="state-label">Refresh</span><span className="state-value">Every 30 seconds</span></div>
    </section>
    <div className="market-grid market-grid--balanced">
      {MARKETS.map((market) => {
        const quote = quotes[market.id];
        const isValid = validQuote(quote);
        const direction: Direction = !isValid ? "unavailable" : quote.change > 0 ? "positive" : quote.change < 0 ? "negative" : "neutral";
        const sign = direction === "positive" ? "+" : "";
        return <article className={`market-card market-card--equal market-card--${direction}`} key={market.id} aria-label={`${market.name}: ${isValid ? `${quote.price}, ${quote.pct}%` : "market data unavailable"}`}>
          <div className="market-head"><span className="market-name">{market.name}</span><span className="card-session">{market.venue}</span></div>
          <div className="market-price">{isValid ? quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Price unavailable"}</div>
          <div className="change-row">{isValid ? <><span className={`market-change ${direction}`}>{sign}{quote.change.toFixed(2)}</span><span className={`market-change ${direction}`}>({sign}{quote.pct.toFixed(2)}%)</span></> : <span className="market-change">Market data unavailable</span>}</div>
          <div className="chart"><Sparkline values={isValid ? quote.series : []} /></div>
          <div className="market-meta"><time className="market-time" dateTime={isValid ? new Date(quote.time * 1000).toISOString() : undefined}>{isValid ? displayTimestamp(quote.time * 1000, "Timestamp unavailable") : "Timestamp unavailable"}</time><span className="quote-badge">{stale[market.id] ? "Stale · last available" : isValid ? "Latest provider quote" : "Unavailable"}</span></div>
        </article>;
      })}
    </div>
  </>;
}
