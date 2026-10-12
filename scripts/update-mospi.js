#!/usr/bin/env node
const https = require('https');
const { constants } = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = 'api.mospi.gov.in';
const MACRO_FILE = path.join(__dirname, '..', 'macro-data.json');
const RBI_FILE = path.join(__dirname, '..', 'rbi-data.json');

function get(pathname, params) {
  const qs = new URLSearchParams(params || {}).toString();
  const options = {
    host: HOST,
    method: 'GET',
    path: pathname + (qs ? '?' + qs : ''),
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
    timeout: 30000
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function updateCPI() {
  const currentYear = new Date().getFullYear().toString();
  console.log(`Fetching latest CPI for ${currentYear} from MoSPI...`);

  const res = await get('/api/cpi/getCPIData', {
    base_year: '2024',
    series: 'Current',
    state_code: '1',
    limit: '20',
    year: currentYear
  });

  if (!res || !Array.isArray(res.data) || res.data.length === 0) {
    throw new Error('No CPI data returned from MoSPI API');
  }

  // Find the latest All-India Combined General index entry
  const generalEntry = res.data.find(
    (r) => r.state === 'All India' && r.sector === 'Combined' && r.division === 'CPI (General)'
  );

  if (!generalEntry || !generalEntry.inflation) {
    throw new Error('Could not find latest Combined CPI General entry with inflation rate');
  }

  const inflationRate = parseFloat(generalEntry.inflation).toFixed(2);
  const indexVal = parseFloat(generalEntry.index);
  const month = generalEntry.month.slice(0, 3); // e.g., "Sep"
  const now = new Date().toISOString();

  // 1. Update macro-data.json
  const macroData = JSON.parse(fs.readFileSync(MACRO_FILE, 'utf8'));
  macroData.items.inflation = {
    value: `${inflationRate}%`,
    lines: ['CPI, YoY', 'Inside 2-6% band', `${month}-${currentYear}`],
    source: 'MoSPI API (All India Combined)',
    updatedAt: now
  };
  macroData.updatedAt = now;
  fs.writeFileSync(MACRO_FILE, JSON.stringify(macroData, null, 2) + '\n');
  console.log(`Updated macro-data.json -> ${inflationRate}% (${month}-${currentYear})`);

  // 2. Update rbi-data.json
  if (fs.existsSync(RBI_FILE)) {
    const rbiData = JSON.parse(fs.readFileSync(RBI_FILE, 'utf8'));
    const monthNum = new Date(`${generalEntry.month} 1, 2000`).getMonth() + 1;
    const periodStr = `${currentYear}-${String(monthNum).padStart(2, '0')}`;

    rbiData.cpi = {
      index: indexVal,
      yoy: parseFloat(inflationRate),
      period: periodStr,
      source: 'MoSPI API',
      projection: rbiData.cpi?.projection || { actuals: [], estimates: [] }
    };
    rbiData.updatedAt = now;
    fs.writeFileSync(RBI_FILE, JSON.stringify(rbiData, null, 2) + '\n');
    console.log(`Updated rbi-data.json -> Index ${indexVal}, YoY ${inflationRate}%`);
  }
}

updateCPI().catch((err) => {
  console.error('CPI update failed:', err.message);
  process.exit(1);
});