const http = require('http');
const fs = require('fs');
const path = require('path');

const SYMBOLS = { 
  nifty50: '^NSEI', 
  banknifty: '^NSEBANK', 
  sensex: '^BSESN', 
  indiavix: '^INDIAVIX',
  nasdaq: '^IXIC',
  dow: '^DJI',
  brent: 'BZ=F',
  gold: 'GC=F'
};
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png',
                '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml','.json': 'application/json' };

let cache = { at: 0, data: null };

async function getQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const r = (await res.json()).chart.result[0];
  const meta = r.meta;
  const series = (r.indicators.quote[0].close || []).filter(v => v != null);
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  return { price, change: price - prev, pct: ((price - prev) / prev) * 100, time: meta.regularMarketTime, series };
}

async function getQuotes() {
  if (cache.data && Date.now() - cache.at < 30000) return cache.data;   // cache for 30 seconds
  const out = {};
  for (const [key, sym] of Object.entries(SYMBOLS)) out[key] = await getQuote(sym);
  cache = { at: Date.now(), data: out };
  return out;
}

http.createServer(async (req, res) => {

  if (req.url.startsWith('/api/last-updated')) {
    // The three pages whose changes set the "Last Updated" time
    const TRACKED = ['indian-macros.html', 'sector-pulse.html', 'market-flows.html'];
    let latest = 0;
    for (const f of TRACKED) {
      try { latest = Math.max(latest, fs.statSync(path.join(__dirname, f)).mtimeMs); } catch (e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ updatedAt: latest ? new Date(latest).toISOString() : null }));
    return;
  }
  if (req.url.startsWith('/api/quotes')) {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(await getQuotes()));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'quotes unavailable' }));
    }
    return;
  }
  const file = path.join(__dirname, req.url === '/' ? 'india-markets.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(3000, () => console.log('Open http://localhost:3000'));
// ───────── Auto-Sync MoSPI CPI Data ─────────
const { exec } = require('child_process');

function syncMospiData() {
  exec(`node "${path.join(__dirname, 'scripts', 'update-mospi.js')}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('[MoSPI Auto-Sync Error]:', stderr || err.message);
    } else if (stdout) {
      console.log('[MoSPI Auto-Sync]:', stdout.trim());
    }
  });
}

// Initial sync immediately on server launch, then repeat every 6 hours
syncMospiData();
setInterval(syncMospiData, 6 * 60 * 60 * 1000);