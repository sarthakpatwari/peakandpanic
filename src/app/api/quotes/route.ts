import { NextResponse } from 'next/server';

const SYMBOLS: Record<string, string> = {
  nifty50: '^NSEI',
  banknifty: '^NSEBANK',
  sensex: '^BSESN',
  indiavix: '^INDIAVIX',
  nasdaq: '^IXIC',
  dow: '^DJI',
  brent: 'BZ=F',
  gold: 'GC=F',
};

async function getQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const r = payload?.chart?.result?.[0];
  if (!r?.meta || !r?.indicators?.quote?.[0]) throw new Error('Invalid quote structure');

  const meta = r.meta;
  const series = (r.indicators.quote[0].close || []).filter((v: number | null) => v != null);
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;

  return {
    price,
    change: price - prev,
    pct: ((price - prev) / prev) * 100,
    time: meta.regularMarketTime,
    series,
  };
}

export async function GET() {
  const data: Record<string, any> = {};
  const providerErrors: Record<string, string> = {};

  await Promise.all(
    Object.entries(SYMBOLS).map(async ([key, sym]) => {
      try {
        data[key] = await getQuote(sym);
      } catch (e) {
        data[key] = null;
        providerErrors[key] = 'Quote unavailable';
      }
    })
  );

  return NextResponse.json({
    data,
    providerErrors,
    timestamp: Date.now(),
  });
}