#!/usr/bin/env node
/*
 * Asks MoSPI's open API what it really returns for CPI (inflation) and NAS (GDP),
 * and saves the answers to scripts/probe-output.txt. It only READS public data.
 * Run:   node scripts/probe-mospi.js
 *
 * Endpoints are taken from MoSPI's own open-source client (github.com/nso-india/esankhyiki-mcp).
 * MoSPI's server needs "legacy TLS renegotiation", which that client also enables; so does this script.
 */
const https = require('https');
const { constants } = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = 'api.mospi.gov.in';
const OUT = path.join(__dirname, 'probe-output.txt');
const log = [];
function say(s) { console.log(s); log.push(s); }

function get(pathname, params, insecure) {
  const qs = new URLSearchParams(params || {}).toString();
  const options = {
    host: HOST, method: 'GET', path: pathname + (qs ? '?' + qs : ''),
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
    rejectUnauthorized: !insecure, timeout: 30000
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body, url: 'https://' + HOST + options.path }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout after 30s')));
    req.on('error', reject);
    req.end();
  });
}

async function probe(label, pathname, params) {
  say('\n=================================================================');
  say('# ' + label);
  let r, note = '';
  try { r = await get(pathname, params, false); }
  catch (e) {
    const msg = String(e.code || e.message);
    if (/CERT|certificate|SELF_SIGNED|UNABLE_TO_VERIFY/i.test(msg)) {
      try { r = await get(pathname, params, true); note = '(certificate check skipped, like MoSPI\'s own client)'; }
      catch (e2) { say('ERROR: ' + (e2.code || e2.message)); return; }
    } else { say('ERROR: ' + msg); return; }
  }
  say('GET ' + r.url + ' ' + note);
  say('HTTP ' + r.status);
  let text = r.body;
  try {
    const j = JSON.parse(r.body);
    if (j && Array.isArray(j.data)) say('data rows: ' + j.data.length);
    text = JSON.stringify(j, null, 2);
  } catch (e) { say('(response is not JSON)'); }
  say(text.length > 3500 ? text.slice(0, 3500) + '\n... [truncated, ' + text.length + ' characters in total]' : text);
}

(async () => {
  say('MoSPI probe, ' + new Date().toISOString() + ', node ' + process.version);

  // ---- CPI (inflation) ----
  await probe('CPI: available base years', '/api/cpi/getCpiBaseYear');
  await probe('CPI: filters for base year 2024 (state / sector / group codes)', '/api/cpi/getCpiFilterByLevelAndBaseYear', { base_year: '2024', level: 'Group', series_code: 'Current' });
  await probe('CPI: sample data, 2024 base, year 2026', '/api/cpi/getCPIData', { base_year: '2024', series: 'Current', year: '2026', limit: '5' });

  // ---- NAS (GDP) ----
  await probe('NAS: indicator list', '/api/nas/getNasIndicatorList');
  await probe('NAS: filters, quarterly, indicator 1', '/api/nas/getNasFilterByIndicatorId', { base_year: '2022-23', series: 'Current', frequency_code: '2', indicator_code: '1' });
  await probe('NAS: sample data, quarterly (frequency_code=2)', '/api/nas/getNASData', { base_year: '2022-23', series: 'Current', frequency_code: '2', indicator_code: '1', limit: '5' });
  await probe('NAS: sample data, quarterly (frequency_code=Quarterly)', '/api/nas/getNASData', { base_year: '2022-23', series: 'Current', frequency_code: 'Quarterly', indicator_code: '1', limit: '5' });

  fs.writeFileSync(OUT, log.join('\n') + '\n');
  console.log('\nSaved to ' + OUT + '\nOpen that file, copy everything in it, and paste it into the chat.');
})();