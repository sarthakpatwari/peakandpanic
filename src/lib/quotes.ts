export const SYMBOLS = {
  nifty50: "^NSEI", banknifty: "^NSEBANK", sensex: "^BSESN", indiavix: "^INDIAVIX",
  nasdaq: "^IXIC", dow: "^DJI", brent: "BZ=F", gold: "GC=F",
} as const;

export interface Quote {
  price: number;
  previousClose: number;
  change: number;
  pct: number;
  time: number;
  series: number[];
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function sessionDate(unixSeconds: number, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(unixSeconds * 1000));
  } catch { return null; }
}

export function parseQuote(payload: unknown, symbol: string): Quote {
  const root = payload as { spark?: { result?: Array<Record<string, unknown>> } };
  const results = Array.isArray(root?.spark?.result) ? root.spark.result : [];
  const item = results.find((entry) => entry.symbol === symbol) ?? results[0];
  const response = Array.isArray(item?.response) ? item.response[0] as Record<string, unknown> : null;
  const meta = response?.meta as Record<string, unknown> | undefined;
  if (!response) throw new Error("Provider quote response is incomplete");
  const indicators = response.indicators as { quote?: Array<{ close?: unknown[] }> } | undefined;
  const quote = indicators?.quote?.[0];
  if (!meta || !quote) throw new Error("Provider quote response is incomplete");

  const price = meta.regularMarketPrice;
  const change = meta.fulldayChange;
  const providerPct = meta.fulldayChangePercent;
  const time = meta.regularMarketTime;
  if (![price, change, providerPct, time].every(finite)) throw new Error("Provider quote fields are invalid");
  const previousClose = (price as number) - (change as number);
  if (!finite(previousClose) || previousClose <= 0) throw new Error("Provider previous close is invalid");
  const pct = (change as number) / previousClose * 100;
  if (!finite(pct) || Math.abs(pct - (providerPct as number)) > 0.02) throw new Error("Provider daily-change fields are inconsistent");

  const closes = Array.isArray(quote.close) ? quote.close : [];
  const timestamps = Array.isArray(response.timestamp) ? response.timestamp : [];
  const points: Array<{ close: number; time: number }> = [];
  for (let index = 0; index < Math.min(closes.length, timestamps.length); index += 1) {
    if (finite(closes[index]) && finite(timestamps[index])) points.push({ close: closes[index] as number, time: timestamps[index] as number });
  }
  const zone = typeof meta.exchangeTimezoneName === "string" ? meta.exchangeTimezoneName : "UTC";
  const quoteDate = sessionDate(time as number, zone);
  const chartDate = points.length ? sessionDate(points.at(-1)!.time, zone) : null;
  return { price: price as number, previousClose, change: change as number, pct, time: time as number,
    series: quoteDate && chartDate === quoteDate ? points.map((point) => point.close) : [] };
}

async function getQuote(symbol: string): Promise<Quote> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=1d&interval=5m`;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("Quote provider request failed");
    return parseQuote(await response.json(), symbol);
  } finally { clearTimeout(timer); }
}

export async function collectQuotes() {
  const entries = Object.entries(SYMBOLS);
  const settled = await Promise.allSettled(entries.map(([, symbol]) => getQuote(symbol)));
  const data: Record<string, Quote | null> = {};
  const providerErrors: Record<string, string> = {};
  settled.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === "fulfilled") data[key] = result.value;
    else { data[key] = null; providerErrors[key] = "Provider quote unavailable"; }
  });
  return { data, providerErrors };
}
