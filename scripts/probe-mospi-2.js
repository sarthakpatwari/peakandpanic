#!/usr/bin/env node
/*
 * Probe #2 (read-only). Finds out three things so the GDP/CPI auto-update can be written exactly:
 *   1. Which CPI sector / group codes mean "All India, combined, General index"
 *   2. What a CPI data row looks like (which fields hold the index and the inflation %)
 *   3. Which NAS indicator is GDP (and which price fields to use)
 * Run:   node scripts/probe-mospi-2.js      Output: scripts/probe-output-2.txt  (paste its contents into the chat)
 */
const https = require('https');
const { constants } = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = 'api.mospi.gov.in';
const OUT = path.join(__dirname, 'probe-output-2.txt');
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function get(pathname, params) {
  const qs = new URLSearchParams(params || {}).toString();
  const options = { host: HOST, method: 'GET', path: pathname + (qs ? '?' + qs : ''), headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT, timeout: 30000 };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve({ status: res.statusCode, body: b, url: 'https://' + HOST + options.path })); });
    req.on('timeout', () => req.destroy(new Error('timeout after 30s')));
    req.on('error', reject); req.end();
  });
}
async function json(pathname, params) {
  try { const r = await get(pathname, params); let j = null; try { j = JSON.parse(r.body); } catch (e) {} return { r, j }; }
  catch (e) { return { err: String(e.code || e.message) }; }
}
const short = (o, n) => { const t = JSON.stringify(o); return t.length > n ? t.slice(0, n) + '...[+' + (t.length - n) + ' chars]' : t; };

(async () => {
  say('MoSPI probe 2, ' + new Date().toISOString() + ', node ' + process.version);

  // ---- 1. CPI filters, everything except the long state list ----
  say('\n##### CPI filter lists (base year 2024) #####');
  let f = await json('/api/cpi/getCpiFilterByLevelAndBaseYear', { base_year: '2024', level: 'Group', series_code: 'Current' });
  if (f.err) say('ERROR ' + f.err);
  else {
    const d = f.j && f.j.data && f.j.data[0];
    if (!d) say('unexpected shape: ' + short(f.j, 800));
    else Object.keys(d).forEach((k) => { if (k === 'state' || k === 'series') return; say('-- ' + k + ' (' + (Array.isArray(d[k]) ? d[k].length : '?') + ' items): ' + short(Array.isArray(d[k]) ? d[k].slice(0, 45) : d[k], 2500)); });
  }

  // ---- 2. CPI data rows ----
  say('\n##### CPI sample rows #####');
  for (const q of [{ year: '2026' }, { year: '2025' }]) {
    await wait(500);
    const c = await json('/api/cpi/getCPIData', Object.assign({ base_year: '2024', series: 'Current', state_code: '1', limit: '10' }, q));
    say('\nGET getCPIData ' + JSON.stringify(q) + ' -> ' + (c.err ? 'ERROR ' + c.err : 'HTTP ' + c.r.status));
    if (c.j) { say('meta_data: ' + short(c.j.meta_data, 300)); (c.j.data || []).slice(0, 4).forEach((row, i) => say('row ' + i + ': ' + short(row, 700))); if (!c.j.data) say(short(c.j, 600)); }
  }

  // ---- 3. NAS: which indicator is GDP? (only the indicators that have quarterly data) ----
  say('\n##### NAS quarterly indicators #####');
  for (const code of [1, 2, 5, 9, 10, 11, 12, 13, 14, 15, 21, 22]) {
    await wait(500);
    const n = await json('/api/nas/getNASData', { base_year: '2022-23', series: 'Current', frequency_code: '2', indicator_code: String(code), limit: '10' });
    if (n.err) { say('code ' + code + ': ERROR ' + n.err); continue; }
    const rows = (n.j && n.j.data) || [];
    const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter((v) => v != null))];
    say('code ' + code + ': HTTP ' + n.r.status + ' | indicator=' + short(uniq('indicator'), 120) + ' | industries(first rows)=' + short(uniq('industry').slice(0, 4), 260) + ' | subindustry=' + short(uniq('subindustry').slice(0, 3), 120) + ' | unit=' + short(uniq('unit'), 40) + ' | fields=' + (rows[0] ? Object.keys(rows[0]).join(',') : '-') + ' | total=' + short(n.j && n.j.meta_data && n.j.meta_data.totalRecords, 20));
  }

  fs.writeFileSync(OUT, log.join('\n') + '\n');
  console.log('\nSaved to ' + OUT + '\nOpen that file, copy everything in it, and paste it into the chat.');
})();