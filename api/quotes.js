const SYMBOLS = { 
  // Indian Markets
  nifty50: '^NSEI', 
  banknifty: '^NSEBANK', 
  sensex: '^BSESN', 
  indiavix: '^INDIAVIX',
  // Global Markets Overlay
  nasdaq: '^IXIC',
  dow: '^DJI',
  brent: 'BZ=F',
  gold: 'GC=F'
};

async function getQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Fetch failed for ${symbol}`);
  const r = (await res.json()).chart.result[0];
  const meta = r.meta;
  const series = (r.indicators.quote[0].close || []).filter(v => v != null);
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  return { 
    price, 
    change: price - prev, 
    pct: ((price - prev) / prev) * 100, 
    time: meta.regularMarketTime, 
    series 
  };
}

export default async function handler(req, res) {
  try {
    const out = {};
    for (const [key, sym] of Object.entries(SYMBOLS)) {
      try {
        out[key] = await getQuote(sym);
      } catch (err) {
        // Individual fallback retention
        out[key] = null;
      }
    }
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({ data: out, timestamp: Date.now() });
  } catch (e) {
    res.status(502).json({ error: 'quotes unavailable' });
  }
}