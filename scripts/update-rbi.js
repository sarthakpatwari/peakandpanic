#!/usr/bin/env node
/*
 * Keeps the repo-rate history (and the policy stance) in rbi-data.json up to date, without you.
 *
 *   node scripts/update-rbi.js
 *
 * What it does, in order:
 *   1. Reads the "Policy Repo Rate" from the RBI home page (https://www.rbi.org.in/home.aspx).
 *   2. If it differs from the latest entry in repo.history, it appends one new entry
 *      { date, rate, auto: true }. The date is the MPC announcement date printed on the RBI page
 *      (the link "Monetary Policy Statement ... Resolution of the MPC <dates>").
 *   3. Reads that resolution and, only if exactly one stance is stated, updates stance.current.
 *   4. Never invents anything: if the page cannot be read, looks wrong, or is ambiguous, it changes
 *      NOTHING, prints why, and exits with an error so the scheduled run is flagged.
 */
const fs = require('fs');
const path = require('path');

const FILE = process.env.RBI_DATA_FILE || path.join(__dirname, '..', 'rbi-data.json');
const HOME = process.env.RBI_HOME_URL || 'https://www.rbi.org.in/home.aspx';
const UA = 'Mozilla/5.0 (compatible; PeakAndPanicDataBot/1.0; +https://github.com)';

/* ───────── parsing (pure functions, tested offline) ───────── */
function textOf(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#8217;|&rsquo;/gi, '\u2019')
    .replace(/\s+/g, ' ');
}

// The single "Policy Repo Rate : 5.50%" in the Current Rates box. Anything ambiguous returns null.
function parseRepoRate(html) {
  const found = [...textOf(html).matchAll(/Policy Repo Rate[\s|:]*([0-9]+(?:\.[0-9]+)?)\s*%/gi)].map((m) => parseFloat(m[1]));
  const uniq = [...new Set(found)];
  return uniq.length === 1 ? uniq[0] : null;
}

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function iso(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }

// Finds the MPC resolution link and the announcement date in its title ("... October 5 to 7, 2026" -> 2026-10-07).
function parseResolution(html, base) {
  const re = /<a\b[^>]*href=["']([^"']*BS_PressReleaseDisplay\.aspx\?prid=\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = textOf(m[2]).trim();
    if (!/Monetary Policy Statement/i.test(label) || !/Resolution of the Monetary Policy Committee/i.test(label)) continue;
    const d = label.match(/Committee\s+([A-Za-z]+)\s+(\d{1,2})\s+to\s+(?:([A-Za-z]+)\s+)?(\d{1,2}),?\s+(\d{4})/i);
    if (!d) continue;
    const month = MONTHS[(d[3] || d[1]).toLowerCase()];
    if (!month) continue;
    return { url: new URL(m[1], base).toString(), announceDate: iso(+d[5], month, +d[4]), label };
  }
  return null;
}

// Stance wording -> the keys the page understands. Conservative: more than one candidate => unknown.
const STANCES = [
  ['calibrated_tightening', /calibrated\s+tightening/i],
  ['withdrawal_of_accommodation', /withdrawal\s+of\s+accommodation/i],
  ['accommodative', /accommodative/i],
  ['neutral', /neutral/i],
  ['hawkish', /hawkish/i]
];
function parseStance(text) {
  // A stance sentence either says "stance", or is RBI's "remain focused on withdrawal of accommodation" wording.
  const sentences = String(text).split(/(?<=[.!?])\s+/).filter((s) => /stance/i.test(s) || /(remain|continue)[^.]*withdrawal\s+of\s+accommodation/i.test(s));
  const found = new Set();
  for (const s of sentences) {
    let hits = STANCES.map(([k, re]) => ({ k, i: s.search(re) })).filter((h) => h.i >= 0).sort((a, b) => a.i - b.i);
    if (!hits.length) continue;
    if (hits.length > 1 && /\bfrom\b[\s\S]*\bto\b/i.test(s)) hits = [hits[hits.length - 1]];   // "from neutral to accommodative" -> the new one
    if (hits.length !== 1) return null;
    found.add(hits[0].k);
  }
  return found.size === 1 ? [...found][0] : null;
}

/* ───────── decision logic (pure, tested offline) ───────── */
function istToday(now) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now); }
function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }

function computeUpdate(data, scraped, now) {
  const log = [], next = JSON.parse(JSON.stringify(data)), today = istToday(now);
  const hist = (next.repo.history || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = hist[hist.length - 1];
  let changed = false, announce = scraped.announceDate || null;

  if (!announce) {                                            // fall back to the published MPC calendar
    const past = ((next.mpc && next.mpc.meetings) || []).map((m) => m.announce).filter((d) => d <= today).sort();
    if (past.length && daysBetween(past[past.length - 1], today) <= 7) announce = past[past.length - 1];
  }

  if (scraped.rate == null) throw new Error('No usable repo rate on the RBI page. Nothing changed.');
  const r = scraped.rate;
  if (!(r >= 2 && r <= 10)) throw new Error('Repo rate ' + r + '% is outside 2-10%. Not saving it. Check the RBI page by hand.');

  if (!latest || Math.abs(r - latest.rate) > 1e-9) {
    const step = latest ? Math.abs(r - latest.rate) : 0;
    if (latest && (step > 1.5 || Math.abs(Math.round(step * 20) - step * 20) > 1e-6)) throw new Error('Change of ' + step.toFixed(2) + ' points looks wrong (RBI moves in steps of 0.05). Not saving it.');
    const date = announce || today;
    if (latest && date <= latest.date) throw new Error('Rate on the page (' + r + '%) differs from the last record (' + latest.rate + '% on ' + latest.date + ') but the announcement date (' + date + ') is not newer. Needs a human look.');
    hist.push({ date, rate: r, auto: true });
    next.repo.history = hist; next.repo.verifiedOn = today; changed = true;
    log.push('Repo rate changed: ' + (latest ? latest.rate + '% -> ' : '') + r + '% (announced ' + date + ')');
  } else if (!next.repo.verifiedOn || daysBetween(next.repo.verifiedOn, today) >= 7) {
    next.repo.verifiedOn = today; changed = true;                    // weekly "still verified" refresh; avoids a commit every run
    log.push('Rate unchanged at ' + r + '%; verification date refreshed.');
  } else log.push('Rate unchanged at ' + r + '%.');

  if (scraped.stance && announce) {
    const cur = next.stance || (next.stance = {});
    if (cur.current !== scraped.stance && (!cur.since || announce > cur.since)) {      // never overwrite a newer manual edit
      cur.current = scraped.stance; cur.since = announce; cur.source = 'RBI MPC resolution (read automatically)'; changed = true;
      log.push('Stance updated to ' + scraped.stance + ' (since ' + announce + ')');
    }
  } else if (changed && !scraped.stance) log.push('Stance not changed: the resolution did not state exactly one stance. Check stance.current by hand.');

  if (changed) next.updatedAt = now.toISOString();
  return { changed, data: next, log };
}

/* ───────── network + file ───────── */
async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from ' + url);
  return res.text();
}

async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const html = await get(HOME);
  const scraped = { rate: parseRepoRate(html), announceDate: null, stance: null };
  const res = parseResolution(html, HOME);
  if (res) {
    scraped.announceDate = res.announceDate;
    try { scraped.stance = parseStance(textOf(await get(res.url))); }
    catch (e) { console.warn('Could not read the resolution page (' + e.message + '). Stance left as it is.'); }
  } else console.warn('No MPC resolution link found on the RBI home page; using the published calendar for the date.');

  const out = computeUpdate(data, scraped, new Date());
  out.log.forEach((l) => console.log(l));
  if (out.changed) { fs.writeFileSync(FILE, JSON.stringify(out.data, null, 2) + '\n'); console.log('Saved ' + FILE); }
  else console.log('No file changes.');
}

if (require.main === module) main().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
module.exports = { textOf, parseRepoRate, parseResolution, parseStance, computeUpdate };