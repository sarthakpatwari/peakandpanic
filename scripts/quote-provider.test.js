'use strict';

const assert = require('assert/strict');
const { parseQuote, collectQuotes } = require('../quote-provider.cjs');

function payload({ price = 110, change = 10, pct = 10, time = 1700000000,
  chartPreviousClose = 80, chartTimes = [1699999700, 1700000000], closes = [108, 110] } = {}) {
  return { spark: { result: [{ symbol: 'TEST', response: [{
    meta: {
      regularMarketPrice: price,
      fulldayChange: change,
      fulldayChangePercent: pct,
      regularMarketTime: time,
      chartPreviousClose,
      previousClose: chartPreviousClose,
      exchangeTimezoneName: 'UTC'
    },
    timestamp: chartTimes,
    indicators: { quote: [{ close: closes }] }
  }] }] } };
}

function rejects(testPayload) {
  assert.throws(() => parseQuote(testPayload, 'TEST'));
}

async function run() {
  let quote = parseQuote(payload(), 'TEST');
  assert.equal(quote.previousClose, 100);
  assert.equal(quote.change, 10);
  assert.equal(quote.pct, 10);

  quote = parseQuote(payload({ price: 90, change: -10, pct: -10 }), 'TEST');
  assert.equal(quote.previousClose, 100);
  assert.equal(quote.pct, -10);

  quote = parseQuote(payload({ price: 100, change: 0, pct: 0 }), 'TEST');
  assert.equal(quote.previousClose, 100);
  assert.equal(quote.pct, 0);

  // Closed markets and weekends retain the last completed regular session;
  // parsing is deliberately independent of the browser/server clock.
  quote = parseQuote(payload({ time: 1700172800, chartTimes: [1700172500, 1700172800] }), 'TEST');
  assert.equal(quote.time, 1700172800);
  assert.equal(quote.previousClose, 100);

  // A stale chart baseline must never supersede the dedicated full-day fields.
  quote = parseQuote(payload({ chartPreviousClose: 70 }), 'TEST');
  assert.equal(quote.previousClose, 100);

  // A chart from a different session is withheld rather than mixed with the headline.
  quote = parseQuote(payload({ chartTimes: [1700086400, 1700086700] }), 'TEST');
  assert.deepEqual(quote.series, []);

  const missingChange = payload();
  delete missingChange.spark.result[0].response[0].meta.fulldayChange;
  rejects(missingChange);
  rejects(payload({ price: Number.NaN }));
  rejects(payload({ change: Number.POSITIVE_INFINITY }));
  rejects(payload({ price: 110, change: 10, pct: 9 }));

  const symbols = { one: 'ONE', two: 'TWO' };
  let collected = await collectQuotes(symbols, async symbol => {
    if (symbol === 'TWO') throw new Error('forced failure');
    return { price: 1 };
  });
  assert.deepEqual(collected.data, { one: { price: 1 }, two: null });
  assert.deepEqual(collected.providerErrors, { two: 'Provider quote unavailable' });

  collected = await collectQuotes(symbols, async () => { throw new Error('forced failure'); });
  assert.deepEqual(collected.data, { one: null, two: null });
  assert.deepEqual(Object.keys(collected.providerErrors), ['one', 'two']);

  console.log('quote-provider deterministic tests: PASS');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
