#!/usr/bin/env node
/*
 * Update one card in macro-data.json by hand, safely.
 *
 *   node scripts/set-manual.js <card> "<value>" "<line1|line2|line3>" ["source"]
 *
 *   card   : repo | inflation | growth | fiscal
 *   value  : e.g. "5.25%"
 *   lines  : the small text under the number; "|" starts a new line
 *
 * Example after an RBI policy announcement:
 *   node scripts/set-manual.js repo "5.25%" "Repo-rate last|changed in|Dec-2026" "RBI MPC statement"
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'macro-data.json');

const [key, value, linesArg, source] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

if (!key || !value || !linesArg) { console.error('Usage: node scripts/set-manual.js <card> "<value>" "<line1|line2|line3>" ["source"]'); process.exit(1); }
if (!data.items[key]) { console.error('Unknown card "' + key + '". Use one of: ' + Object.keys(data.items).join(', ')); process.exit(1); }
if (!/^-?\d+(\.\d+)?%$/.test(value)) { console.error('Value must look like 5.25% (number followed by %). Got: ' + value); process.exit(1); }

const now = new Date().toISOString();
data.items[key] = {
  value,
  lines: linesArg.split('|').map(s => s.trim()).filter(Boolean),
  source: source || 'Manual entry',
  updatedAt: now
};
data.updatedAt = now;

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log('Updated "' + key + '" ->', data.items[key]);