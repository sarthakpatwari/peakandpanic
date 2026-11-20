'use strict';

const QUOTE_RANGE = '1d';
const QUOTE_INTERVAL = '5m';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sessionDate(unixSeconds, timeZone) {
  if (!finite(unixSeconds) || !timeZone) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(unixSeconds * 1000));
  } catch (_) {
    return null;
  }
}

function sparkResponse(payload, symbol) {
  const results = payload && payload.spark && Array.isArray(payload.spark.result)
    ? payload.spark.result
    : [];
  const item = results.find(result => result && result.symbol === symbol) || results[0];
  return item && Array.isArray(item.response) ? item.response[0] : null;
}

function parseQuote(payload, symbol) {
  const result = sparkResponse(payload, symbol);
  const meta = result && result.meta;
  const quote = result && result.indicators && result.indicators.quote && result.indicators.quote[0];
  if (!meta || !quote) throw new Error('Provider quote response is incomplete');

  const price = meta.regularMarketPrice;
  const change = meta.fulldayChange;
  const providerPct = meta.fulldayChangePercent;
  const time = meta.regularMarketTime;
  if (![price, change, providerPct, time].every(finite)) {
    throw new Error('Provider quote fields are invalid');
  }

  const previousClose = price - change;
  if (!finite(previousClose) || previousClose <= 0) {
    throw new Error('Provider previous close is invalid');
  }
  const calculatedPct = change / previousClose * 100;
  if (!finite(calculatedPct) || Math.abs(calculatedPct - providerPct) > 0.02) {
    throw new Error('Provider daily-change fields are inconsistent');
  }

  const closes = Array.isArray(quote.close) ? quote.close : [];
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const points = [];
  for (let index = 0; index < Math.min(closes.length, timestamps.length); index += 1) {
    if (finite(closes[index]) && finite(timestamps[index])) {
      points.push({ close: closes[index], time: timestamps[index] });
    }
  }

  // A chart is decorative history, never the source of headline price/change.
  // Suppress it when the provider attaches it to a different session than the quote.
  const quoteDate = sessionDate(time, meta.exchangeTimezoneName);
  const chartDate = points.length
    ? sessionDate(points[points.length - 1].time, meta.exchangeTimezoneName)
    : null;
  const series = quoteDate && chartDate && quoteDate === chartDate
    ? points.map(point => point.close)
    : [];

  return {
    price,
    previousClose,
    change,
    pct: calculatedPct,
    time,
    series
  };
}

async function getQuote(symbol, fetchImpl = fetch) {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=${QUOTE_RANGE}&interval=${QUOTE_INTERVAL}`;
  const response = await fetchImpl(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response || !response.ok) throw new Error('Quote provider request failed');
  return parseQuote(await response.json(), symbol);
}

async function collectQuotes(symbols, quoteGetter = getQuote) {
  const entries = Object.entries(symbols);
  const settled = await Promise.allSettled(entries.map(([, symbol]) => quoteGetter(symbol)));
  const data = {};
  const providerErrors = {};
  settled.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === 'fulfilled') data[key] = result.value;
    else {
      data[key] = null;
      providerErrors[key] = 'Provider quote unavailable';
    }
  });
  return { data, providerErrors };
}

module.exports = {
  QUOTE_RANGE,
  QUOTE_INTERVAL,
  parseQuote,
  getQuote,
  collectQuotes,
  sessionDate
};
