import quoteProvider from '../quote-provider.cjs';

const { collectQuotes } = quoteProvider;

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

export default async function handler(req, res) {
  try {
    const { data, providerErrors } = await collectQuotes(SYMBOLS);
    const payload = { data, timestamp: Date.now() };
    if (Object.keys(providerErrors).length) payload.providerErrors = providerErrors;
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
    res.status(200).json(payload);
  } catch (e) {
    res.status(502).json({ error: 'quotes unavailable' });
  }
}
