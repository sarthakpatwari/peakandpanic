#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { constants } = require('crypto');

const UA = 'PeakAndPanicDataBot/2.0 (+https://github.com/sarthakpatwari/peakandpanic)';
const URLS = Object.freeze({
  rbiHome: 'https://www.rbi.org.in/',
  rbiPolicy: 'https://rbi.org.in/scripts/Annualpolicy.aspx',
  rbiNotifications: 'https://rbi.org.in/scripts/FS_Notification.aspx?fn=2752',
  mospiReleases: 'https://www.mospi.gov.in/api/latest-release/get-web-latest-release-list',
  cpi: 'https://api.mospi.gov.in/api/cpi/getCPIData?base_year=2024&series=Current&state_code=1&sector_code=3&division_code=0&limit=100',
  cpiRural: 'https://api.mospi.gov.in/api/cpi/getCPIData?base_year=2024&series=Current&state_code=1&sector_code=1&division_code=0&limit=100',
  cpiUrban: 'https://api.mospi.gov.in/api/cpi/getCPIData?base_year=2024&series=Current&state_code=1&sector_code=2&division_code=0&limit=100',
  gdpQuarterly: 'https://api.mospi.gov.in/api/nas/getNASData?base_year=2022-23&series=Current&frequency_code=2&indicator_code=5&limit=100',
  gdpAnnual: 'https://api.mospi.gov.in/api/nas/getNASData?base_year=2022-23&series=Current&frequency_code=1&indicator_code=5&limit=100'
});
const MONTH = { jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12 };
const STANCES = ['neutral', 'accommodative', 'withdrawal_of_accommodation', 'calibrated_tightening'];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function isoDate(y, m, d) { return String(y).padStart(4,'0') + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0'); }
function validIsoDate(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')); }
function validIsoTime(v) { return typeof v === 'string' && !Number.isNaN(Date.parse(v)); }
function finite(v) { return typeof v === 'number' && Number.isFinite(v); }
function tidy(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function textOf(html) {
  return tidy(String(html).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>|<\/li>|<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/&ndash;|&#8211;/gi, '–').replace(/&rsquo;|&#8217;/gi, '’'));
}
function parseNamedDate(raw) {
  const m = tidy(raw).match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  return m && MONTH[m[1].toLowerCase()] ? isoDate(+m[3], MONTH[m[1].toLowerCase()], +m[2]) : null;
}
function provenance(sourceUrl, publishedAt, fetchedAt, extra) {
  if (!/^https:\/\//.test(sourceUrl) || !validIsoDate(publishedAt) || !validIsoTime(fetchedAt)) throw new Error('Missing or invalid source provenance');
  return Object.assign({ sourceUrl, publishedAt, fetchedAt, verifiedAt: fetchedAt }, extra || {});
}

function parseCurrentRates(html) {
  const hits = [...textOf(html).matchAll(/Policy Repo Rate\s*[:|]?\s*([0-9]+(?:\.[0-9]+)?)\s*%/gi)].map(m => +m[1]);
  const unique = [...new Set(hits)];
  if (unique.length !== 1 || unique[0] < 2 || unique[0] > 10) throw new Error('RBI current-rates page did not contain one sensible policy repo rate');
  return unique[0];
}

function parsePolicyLinks(html, baseUrl) {
  const source = String(html);
  const candidates = [];
  const re = /<a\b[^>]*href=["']([^"']*(?:BS_|FS_)PressRelease(?:Display)?\.aspx[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(source))) {
    const context = textOf(source.slice(Math.max(0, m.index - 500), m.index));
    const resolutionAt = context.lastIndexOf('Resolution of the Monetary Policy Committee');
    const otherStatementAt = context.lastIndexOf('Statement on Developmental and Regulatory Policies');
    if (resolutionAt < 0 || otherStatementAt > resolutionAt || !/Full Document/i.test(textOf(m[2]))) continue;
    const resolutionContext = context.slice(resolutionAt);
    const dateMatch = resolutionContext.match(/([A-Za-z]+)\s+\d{1,2}\s+to\s+(\d{1,2}),?\s+(\d{4})/i);
    const publishedAt = dateMatch && MONTH[dateMatch[1].toLowerCase()] ? isoDate(+dateMatch[3], MONTH[dateMatch[1].toLowerCase()], +dateMatch[2]) : null;
    const sourceTitle = tidy((resolutionContext.match(/Resolution of the Monetary Policy Committee(?: \(MPC\))?[^<\n]{0,120}/i) || [])[0]);
    candidates.push({ url: new URL(m[1].replace(/&amp;/g, '&'), baseUrl).toString(), publishedAt, sourceTitle, context });
  }
  return [...new Map(candidates.map(item => [item.url, item])).values()].filter(item=>validIsoDate(item.publishedAt)).sort((a,b) => a.publishedAt.localeCompare(b.publishedAt));
}

function parsePolicyIndex(html, baseUrl) {
  const candidates = parsePolicyLinks(html, baseUrl);
  if (!candidates.length) throw new Error('No official MPC resolution link found');
  const dated = candidates.filter(x => x.publishedAt).sort((a,b) => a.publishedAt.localeCompare(b.publishedAt));
  const latest = dated[dated.length - 1] || candidates[candidates.length - 1];
  if (!latest.publishedAt) throw new Error('Latest MPC resolution is missing a publication date');
  return latest;
}

function parseRepoDecision(html, url, fetchedAt, archiveMeta) {
  const text = textOf(html);
  const dateRaw = text.match(/Date\s*:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  const publicationDate = dateRaw && parseNamedDate(dateRaw[1]) || archiveMeta && archiveMeta.publishedAt;
  if (!validIsoDate(publicationDate)) throw new Error('RBI repo decision publication date missing');
  const decisionScope = (text.match(/Monetary Policy Decisions[\s\S]{0,4500}?(?=Growth and Inflation Outlook|The minutes of the MPC|$)/i) || [text])[0];
  const rateHits = [...decisionScope.matchAll(/(?:reduce|increase|keep|maintain)[^.]{0,260}?policy repo rate[^.]{0,120}?(?:to|at)?\s*([0-9]+(?:\.[0-9]+)?)\s*per cent/gi)]
    .map(match => Number(match[1])).filter(value => value >= 2 && value <= 10);
  const rates = [...new Set(rateHits)];
  if (rates.length !== 1) throw new Error('RBI repo decision rate is missing or ambiguous');
  let effectiveDate = null, effectiveDateBasis = null;
  const explicitEffective = decisionScope.match(/(?:with effect from|effective from)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  if (explicitEffective) { effectiveDate = parseNamedDate(explicitEffective[1]); effectiveDateBasis = 'explicit-date'; }
  else if (/with immediate effect/i.test(decisionScope)) { effectiveDate = publicationDate; effectiveDateBasis = 'explicit-immediate-effect'; }
  const releaseIdentifier = tidy((text.match(/Press Release\s*:\s*[^\s]+/i) || [])[0]) || null;
  const sourceTitle = archiveMeta && cleanTitle(archiveMeta.sourceTitle) || tidy((text.match(/Monetary Policy Statement[^\n]{0,180}Resolution of the Monetary Policy Committee[^\n]{0,120}/i) || [])[0]) || 'RBI MPC resolution';
  const point = {
    date: publicationDate,
    decisionDate: publicationDate,
    rate: rates[0],
    publicationDate,
    resolutionUrl: url,
    verificationStatus: 'verified',
    sourceTitle,
    provenance: provenance(url, publicationDate, fetchedAt, { sourceTitle })
  };
  if (effectiveDate) Object.assign(point, {effectiveDate, effectiveDateBasis, effectiveDateSourceUrl:url, effectiveDateSourceType:'RBI MPC resolution'});
  if (releaseIdentifier) {
    point.releaseIdentifier = releaseIdentifier;
    point.provenance.releaseIdentifier = releaseIdentifier;
  }
  return point;
}

function parseLafNotificationLinks(html, baseUrl) {
  const source=String(html), found=[];
  const token=/<th\b[^>]*>[\s\S]*?<\/t[hd]>|<a\b[^>]*href\s*=\s*(?:["']([^"']+)["']|([^\s>]+))[^>]*>[\s\S]*?<\/a>/gi;
  let currentDate=null,match;
  while((match=token.exec(source))){
    if(/^<th\b/i.test(match[0])){const parsed=parseNamedDate(textOf(match[0]));if(parsed)currentDate=parsed;continue;}
    const title=tidy(textOf(match[0]));
    if(title.toLowerCase()!=='liquidity adjustment facility - change in rates')continue;
    const href=decodeHtmlAttribute(match[1]||match[2]||'');
    if(!currentDate||!href)continue;
    const url=new URL(href,baseUrl).toString();
    if(!/^https:\/\/(?:www\.)?rbi\.org\.in\//i.test(url))continue;
    found.push({notificationDate:currentDate,url,title:'Liquidity Adjustment Facility - Change in rates'});
  }
  return [...new Map(found.map(item=>[item.url,item])).values()].sort((a,b)=>a.notificationDate.localeCompare(b.notificationDate));
}

function parseLafNotification(html,url,fetchedAt,meta){
  const text=textOf(html),title='Liquidity Adjustment Facility - Change in rates';
  if(!new RegExp(title.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'),'i').test(text))throw new Error('RBI LAF notification title mismatch');
  const notificationDate=meta&&meta.notificationDate;
  if(!validIsoDate(notificationDate))throw new Error('RBI LAF notification date missing');
  const transition=text.match(/\b(reduce|increase)[^.]{0,500}?policy repo rate[^.]{0,220}?from\s+([0-9]+(?:\.[0-9]+)?)\s*per cent\s+to\s+([0-9]+(?:\.[0-9]+)?)\s*per cent/i);
  if(!transition)throw new Error('RBI LAF repo-rate transition missing');
  const direction=transition[1].toLowerCase(),previousRate=Number(transition[2]),newRate=Number(transition[3]);
  if(previousRate<2||previousRate>10||newRate<2||newRate>10||direction!==(newRate<previousRate?'reduce':'increase'))throw new Error('RBI LAF repo-rate transition is inconsistent');
  const scope=transition[0]+' '+text.slice(Math.max(0,transition.index-120),transition.index+transition[0].length+260);
  let effectiveDate=null,effectiveDateBasis=null;
  const explicit=scope.match(/(?:with effect from|effective from)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  if(explicit){effectiveDate=parseNamedDate(explicit[1]);effectiveDateBasis='explicit-date';}
  else if(/with immediate effect/i.test(scope)){effectiveDate=notificationDate;effectiveDateBasis='explicit-immediate-effect';}
  const rbiCircularNumber=tidy((text.match(/RBI\/\d{4}-\d{2}\/\d+/i)||[])[0])||null;
  const departmentCircularNumber=tidy((text.match(/FMOD\.[A-Z.]+No\.[^\s<]+/i)||[])[0])||null;
  const result={title,notificationDate,notificationUrl:url,previousRate,newRate,direction,rbiCircularNumber,departmentCircularNumber,department:departmentCircularNumber?'Financial Markets Operation Department':null,provenance:provenance(url,notificationDate,fetchedAt,{sourceTitle:title})};
  if(effectiveDate)Object.assign(result,{effectiveDate,effectiveDateBasis});
  return result;
}

function reconcileRepoNotifications(decisions,notifications){
  const sorted=(decisions||[]).slice().sort((a,b)=>a.decisionDate.localeCompare(b.decisionDate));
  const byDate=new Map(sorted.map((point,index)=>[point.decisionDate,{point,index}]));
  const seen=new Set();
  for(const notification of notifications||[]){
    if(seen.has(notification.notificationUrl))continue;
    seen.add(notification.notificationUrl);
    const match=byDate.get(notification.notificationDate);
    if(!match){
      if(sorted.length&&notification.notificationDate>=sorted[0].decisionDate&&notification.notificationDate<=sorted.at(-1).decisionDate)throw new Error('RBI LAF notification date does not match an MPC decision');
      continue;
    }
    const previous=sorted[match.index-1];
    if(!previous||previous.rate!==notification.previousRate||match.point.rate!==notification.newRate)throw new Error('RBI LAF notification rate transition does not match MPC decisions');
    match.point.lafNotification={sourceUrl:notification.notificationUrl,title:notification.title,notificationDate:notification.notificationDate,previousRate:notification.previousRate,newRate:notification.newRate,direction:notification.direction,rbiCircularNumber:notification.rbiCircularNumber,departmentCircularNumber:notification.departmentCircularNumber,department:notification.department,provenance:notification.provenance};
    if(notification.effectiveDate)Object.assign(match.point,{effectiveDate:notification.effectiveDate,effectiveDateBasis:notification.effectiveDateBasis,effectiveDateSourceUrl:notification.notificationUrl,effectiveDateSourceType:'RBI LAF notification'});
  }
  return sorted;
}

function cleanTitle(value) { return tidy(value).replace(/\s*Full Document\s*$/i, ''); }

function reconstructRepoHistory(decisions) {
  const sorted = (decisions || []).slice().sort((a,b) => a.decisionDate.localeCompare(b.decisionDate));
  const changed = [];
  sorted.forEach(point => {
    if (!changed.length || changed[changed.length - 1].rate !== point.rate) changed.push(point);
  });
  return dedupeHistory(changed);
}

function parseResolution(html, url, fetchedAt) {
  const text = textOf(html);
  const dateRaw = text.match(/Date\s*:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  const publishedAt = dateRaw && parseNamedDate(dateRaw[1]);
  if (!publishedAt) throw new Error('MPC resolution publication date missing');
  const rateHits = [...text.matchAll(/(?:increase|reduce|keep)[^.]{0,180}?policy repo rate[^.]{0,100}?([0-9]+(?:\.[0-9]+)?)\s*per cent/gi)].map(m => +m[1]).filter(value => value >= 2 && value <= 10);
  const rates = [...new Set(rateHits)];
  if (rates.length !== 1 || rates[0] < 2 || rates[0] > 10) throw new Error('MPC resolution repo-rate decision is ambiguous');
  const stanceSentence = (text.match(/MPC also decided[^.]{0,220}?stance[^.]*\./i) || [])[0] || '';
  const stanceHits = [
    ['calibrated_tightening', /calibrated tightening/i],
    ['withdrawal_of_accommodation', /withdrawal of accommodation/i],
    ['accommodative', /accommodative/i],
    ['neutral', /neutral/i]
  ].filter(x => x[1].test(stanceSentence));
  if (stanceHits.length !== 1) throw new Error('MPC resolution did not explicitly state one supported policy stance');
  const decisionParagraph = (text.match(/After a detailed assessment[^]*?(?=\s(?:3\.|Growth and Inflation Outlook))/i) || [])[0];
  if (!decisionParagraph || decisionParagraph.length > 1800) throw new Error('Official decision excerpt missing or unbounded');
  const outlookSentence = (text.match(/Looking ahead,[^.]{40,900}\./i) || [])[0];
  const effectiveRaw = text.match(/(?:with effect from|effective from)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  const effectiveDate = effectiveRaw ? parseNamedDate(effectiveRaw[1]) : null;
  const gdp = parseQuarterProjections(text, /real GDP growth/i);
  const cpi = parseQuarterProjections(text, /CPI inflation/i);
  return {
    rate: rates[0], decisionDate: publishedAt, effectiveDate, stance: stanceHits[0][0],
    gdpProjections: gdp, cpiProjections: cpi,
    commentary: [tidy(decisionParagraph)].concat(outlookSentence ? [tidy(outlookSentence)] : []),
    provenance: provenance(url, publishedAt, fetchedAt)
  };
}

function parseQuarterProjections(text, marker) {
  const sentences = String(text).split(/(?<=[.!?])\s+/);
  const start = sentences.findIndex(s => marker.test(s) && /project/i.test(s));
  const scope = sentences.slice(Math.max(0, start), start + 3).join(' ');
  const defaultYear = (scope.match(/\bfor\s+(\d{4}-\d{2})\b/i) || [])[1] || '';
  const out = [];
  for (const m of scope.matchAll(/Q([1-4])(?::|\s+)(?:FY\s*)?(\d{4}(?:-\d{2})?)?[^.;]{0,35}?at\s+([0-9]+(?:\.[0-9]+)?)\s*per cent/gi)) {
    const year = m[2] || defaultYear;
    const fy = year ? (year.includes('-') ? year.slice(-2) : String(+year + 1).slice(-2)) : '';
    out.push({ label: 'Q' + m[1] + (fy ? ' FY' + fy : ''), value: +m[3] });
  }
  const unique = new Map(out.map(x => [x.label, x]));
  const values = [...unique.values()];
  if (!values.length || values.some(x => x.value < -5 || x.value > 20)) throw new Error('Quarterly projection parsing failed');
  return values;
}

function parseSchedule(html, sourceUrl, fetchedAt) {
  const text = textOf(html);
  const publishedRaw = text.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+Meeting Schedule of the Monetary Policy Committee/i);
  const publishedAt = parseNamedDate((publishedRaw && publishedRaw[1]) || '');
  const meetings = [];
  for (const m of text.matchAll(/([A-Za-z]+)\s+(\d{1,2})(?:\s*(?:-|,|to|and)\s*\d{1,2}){1,3},?\s+(\d{4})/gi)) {
    const month = MONTH[m[1].toLowerCase()];
    const days = [...m[0].matchAll(/\b(\d{1,2})\b/g)].map(x => +x[1]).filter(x => x <= 31);
    if (month && days.length) meetings.push({ announce: isoDate(+m[3], month, days[days.length - 1]) });
  }
  const unique = [...new Map(meetings.map(x => [x.announce, x])).values()].sort((a,b) => a.announce.localeCompare(b.announce));
  if (!publishedAt || unique.length < 4 || unique.some(x => !validIsoDate(x.announce))) throw new Error('Official MPC schedule parsing failed');
  return { meetings: unique, provenance: provenance(sourceUrl, publishedAt, fetchedAt) };
}

function parseReleaseList(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('MoSPI release-list response is malformed');
  return payload.data.map(row => {
    const file = row.file_one && row.file_one.path;
    return { title: tidy(row.title), publishedAt: row.published_year, sourceUrl: file ? new URL(file, 'https://www.mospi.gov.in/').toString() : null };
  }).filter(x => validIsoDate(x.publishedAt) && x.sourceUrl);
}
function findRelease(releases, kind, period) {
  const pattern = kind === 'cpi' ? /\bCPI\b|Consumer Price Index/i : /\bGDP\b|Gross Domestic Product/i;
  const words = String(period).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const found = releases.filter(x => pattern.test(x.title) && words.every(w => x.title.toLowerCase().includes(w))).sort((a,b) => a.publishedAt.localeCompare(b.publishedAt)).pop();
  if (!found) throw new Error('No matching official MoSPI ' + kind.toUpperCase() + ' release metadata for ' + period);
  return found;
}
function findGdpRelease(releases, quarter, year) {
  const ordinal = {Q1:'first quarter',Q2:'second quarter',Q3:'third quarter',Q4:'fourth quarter'}[quarter];
  const quarterPattern = new RegExp('\\b'+quarter+'\\b|'+ordinal, 'i');
  const found = releases.filter(item => /\bGDP\b|Gross Domestic Product/i.test(item.title) && item.title.includes(year) && quarterPattern.test(item.title))
    .sort((a,b) => a.publishedAt.localeCompare(b.publishedAt)).pop();
  if (!found) throw new Error('No matching official MoSPI GDP release metadata for '+quarter+' '+year);
  return found;
}
function findAnnualGdpRelease(releases, year) {
  const found = releases.filter(item => /\bGDP\b|Gross Domestic Product/i.test(item.title) && item.title.includes(year) && /annual|provisional estimates/i.test(item.title))
    .sort((a,b) => a.publishedAt.localeCompare(b.publishedAt)).pop();
  if (!found) throw new Error('No matching official MoSPI annual GDP release metadata for '+year);
  return found;
}

function parseCpiRows(payload, sector) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('MoSPI CPI response is malformed');
  const rows = payload.data.filter(r => r.state === 'All India' && r.sector === sector && r.division === 'CPI (General)').map(r => {
    const month = MONTH[String(r.month).toLowerCase()], year = +r.year;
    return { year, month, period: isoDate(year, month, 1).slice(0,7), index:+r.index, yoy:+r.inflation };
  }).filter(r => r.month && finite(r.index) && finite(r.yoy) && r.index >= 50 && r.index <= 300 && r.yoy >= -10 && r.yoy <= 30)
    .sort((a,b) => a.period.localeCompare(b.period));
  const periods = new Set();
  rows.forEach(row => { if (periods.has(row.period)) throw new Error('MoSPI CPI response contains duplicate '+sector+' periods'); periods.add(row.period); });
  return rows;
}

function releaseForCpiPeriod(releases, period) {
  const parts = String(period).split('-'), year = +parts[0], month = +parts[1];
  if (!year || month < 1 || month > 12) return null;
  const monthName = new Intl.DateTimeFormat('en', { month:'long', timeZone:'UTC' }).format(new Date(period + '-01T00:00:00Z'));
  try { return findRelease(releases, 'cpi', monthName + ' ' + year); } catch (_) { return null; }
}

function parseCpi(payload, releases, fetchedAt, optionalSectors) {
  const rows = parseCpiRows(payload, 'Combined');
  const latest = rows[rows.length - 1];
  if (!latest || latest.index < 50 || latest.index > 300 || latest.yoy < -10 || latest.yoy > 30) throw new Error('MoSPI CPI values are missing or implausible');
  const release = releaseForCpiPeriod(releases, latest.period);
  if (!release) throw new Error('Latest MoSPI CPI release metadata is unavailable');
  const quarter = new Map();
  rows.forEach(r => {
    const q = r.month <= 3 ? 4 : Math.ceil((r.month - 3) / 3), fy = r.month <= 3 ? r.year : r.year + 1, label='Q'+q+' FY'+String(fy).slice(-2);
    const releaseMeta = releaseForCpiPeriod(releases, r.period);
    if(!quarter.has(label))quarter.set(label,[]);
    quarter.get(label).push(Object.assign({}, r, { releaseMeta }));
  });
  const latestQuarterLabel = rows.length ? (() => { const r=rows[rows.length-1],q=r.month<=3?4:Math.ceil((r.month-3)/3),fy=r.month<=3?r.year:r.year+1;return 'Q'+q+' FY'+String(fy).slice(-2); })() : null;
  const actuals = [...quarter].map(([label,observations]) => {
    if (!observations.every(item => item.releaseMeta)) return null;
    const complete = observations.length === 3;
    if (!complete && label !== latestQuarterLabel) return null;
    const releasesForPoint = observations.map(item => ({ period:item.period, publishedAt:item.releaseMeta.publishedAt, sourceUrl:item.releaseMeta.sourceUrl }));
    return {
      label,
      value:+(observations.reduce((sum,item)=>sum+item.yoy,0)/observations.length).toFixed(2),
      kind:'derived-quarterly-average',
      provenanceStatus:'derived',
      partial:!complete,
      derivation:{
        method:'arithmetic mean of monthly All India Combined CPI YoY observations',
        formula:'sum(monthly YoY values) / observation count',
        observationCount:observations.length,
        expectedObservationCount:3,
        observations:observations.map(item=>({period:item.period,value:item.yoy})),
        sourceUrl:URLS.cpi,
        baseYear:'2024=100',
        releases:releasesForPoint
      }
    };
  }).filter(Boolean).slice(-4);
  const monthly = rows.map(row => {
    const releaseMeta = releaseForCpiPeriod(releases, row.period);
    if (!releaseMeta) return null;
    return {
      period:row.period,index:row.index,yoy:row.yoy,geography:'All India',sector:'Combined',measure:'CPI (General)',
      baseYear:'2024=100',provenanceStatus:'verified',
      provenance:provenance(URLS.cpi,releaseMeta.publishedAt,fetchedAt,{publicationUrl:releaseMeta.sourceUrl})
    };
  }).filter(Boolean).slice(-12);
  if (!monthly.length || monthly[monthly.length-1].period !== latest.period) throw new Error('Verified monthly CPI history is unavailable');
  const sectors = {};
  [['rural','Rural',URLS.cpiRural],['urban','Urban',URLS.cpiUrban]].forEach(([key,label,url]) => {
    const sectorPayload=optionalSectors&&optionalSectors[key];
    if (!sectorPayload) return;
    const sectorRows=parseCpiRows(sectorPayload,label),point=sectorRows[sectorRows.length-1];
    if (!point) return;
    const sectorRelease=releaseForCpiPeriod(releases,point.period);
    if (!sectorRelease) return;
    sectors[key]={period:point.period,index:point.index,yoy:point.yoy,geography:'All India',sector:label,measure:'CPI (General)',baseYear:'2024=100',provenanceStatus:'verified',provenance:provenance(url,sectorRelease.publishedAt,fetchedAt,{publicationUrl:sectorRelease.sourceUrl})};
  });
  return {
    index:latest.index,yoy:latest.yoy,period:latest.period,baseYear:'2024=100',
    monthly,sectors,projection:{actuals},
    methodology:{headline:'All India Combined CPI (General)',yoy:'year-on-year percentage change reported by MoSPI',quarterlyAverage:'arithmetic mean of three monthly All India Combined CPI YoY observations'},
    provenance:provenance(URLS.cpi,release.publishedAt,fetchedAt,{publicationUrl:release.sourceUrl})
  };
}

function parseGdp(quarterPayload, annualPayload, releases, fetchedAt) {
  const qRows = quarterPayload && Array.isArray(quarterPayload.data) ? quarterPayload.data : null;
  const aRows = annualPayload && Array.isArray(annualPayload.data) ? annualPayload.data : null;
  if (!qRows || !aRows) throw new Error('MoSPI GDP response is malformed');
  const q = qRows.filter(r => r.indicator === 'Gross Domestic Product' && r.quarter && finite(+r.constant_price)).map(r => ({
    year:r.year, quarter:r.quarter, value:+r.constant_price, baseYear:r.base_year, series:r.series,
    frequency:r.frequency, revisionStatus:tidy(r.revision)||'Not stated by API', unit:r.unit
  })).sort(comparePeriod);
  const a = aRows.filter(r => r.indicator === 'Gross Domestic Product' && finite(+r.constant_price)).map(r => ({
    year:r.year, value:+r.constant_price, baseYear:r.base_year, series:r.series,
    frequency:r.frequency, revisionStatus:tidy(r.revision)||'Not stated by API', unit:r.unit
  })).sort((x,y)=>x.year.localeCompare(y.year));
  if (q.length < 2 || a.length < 2) throw new Error('MoSPI GDP observations are incomplete');
  const latestQ=q[q.length-1], previousQ=[...q].reverse().find(x=>x.quarter===latestQ.quarter&&x.year<latestQ.year);
  if(!previousQ) throw new Error('GDP prior-year quarter is missing');
  const growth=+((latestQ.value/previousQ.value-1)*100).toFixed(2);
  if(growth < -20 || growth > 30) throw new Error('GDP quarterly growth is implausible');
  const latestA=a[a.length-1], previousA=a[a.length-2], annualGrowth=+((latestA.value/previousA.value-1)*100).toFixed(2);
  if(annualGrowth < -20 || annualGrowth > 30) throw new Error('GDP annual growth is implausible');
  const release=findGdpRelease(releases,latestQ.quarter,latestQ.year);
  const annualRelease=findAnnualGdpRelease(releases,latestA.year);
  const quarterProvenance=provenance(URLS.gdpQuarterly,release.publishedAt,fetchedAt,{publicationUrl:release.sourceUrl,releaseTitle:release.title});
  const annualProvenance=provenance(URLS.gdpAnnual,annualRelease.publishedAt,fetchedAt,{publicationUrl:annualRelease.sourceUrl,releaseTitle:annualRelease.title});
  const actuals=q.map(row=>{
    const prior=[...q].reverse().find(item=>item.quarter===row.quarter&&item.year<row.year);
    if(!prior)return null;
    let pointRelease;
    try{pointRelease=findGdpRelease(releases,row.quarter,row.year);}catch(_){return null;}
    const pointGrowth=+((row.value/prior.value-1)*100).toFixed(2);
    if(pointGrowth < -20 || pointGrowth > 30)return null;
    return {
      label:row.quarter+' FY'+row.year.slice(-2),value:pointGrowth,kind:'actual',provenanceStatus:'verified',
      classification:'constant-price real GDP',baseYear:row.baseYear,series:row.series,frequency:row.frequency,
      revisionStatus:row.revisionStatus,unit:row.unit,publicationDate:pointRelease.publishedAt,
      provenance:provenance(URLS.gdpQuarterly,pointRelease.publishedAt,fetchedAt,{publicationUrl:pointRelease.sourceUrl,releaseTitle:pointRelease.title})
    };
  }).filter(Boolean).slice(-8);
  return {
    fy:{label:'FY'+latestA.year,value:+(latestA.value/100000).toFixed(2),decimals:2,growth:annualGrowth,classification:'constant-price real GDP',baseYear:latestA.baseYear,series:latestA.series,frequency:latestA.frequency,revisionStatus:latestA.revisionStatus,provenance:annualProvenance},
    quarter:{label:latestQ.quarter+' FY'+latestQ.year,value:+(latestQ.value/100000).toFixed(2),decimals:2,growth,classification:'constant-price real GDP',baseYear:latestQ.baseYear,series:latestQ.series,frequency:latestQ.frequency,revisionStatus:latestQ.revisionStatus,provenance:quarterProvenance},
    unit:'₹ lakh crore',projection:{actuals},
    provenance:quarterProvenance
  };
}
function comparePeriod(x,y){return (x.year+x.quarter).localeCompare(y.year+y.quarter);}

function validatePoint(p, kind) {
  if (!p || !/^Q[1-4] FY\d{2}$/.test(p.label) || !finite(p.value)) throw new Error(kind + ' contains an invalid quarter');
  const range = kind === 'CPI' ? [-10,30] : [-20,30];
  if (p.value < range[0] || p.value > range[1]) throw new Error(kind + ' contains an implausible value');
}
function mergeProjection(oldProjection, actuals, estimates, kind) {
  const actualMap=new Map();
  actuals.forEach(x=>{validatePoint(x,kind);actualMap.set(x.label,x);});
  const estimateMap=new Map();
  estimates.forEach(x=>{
    validatePoint(x,kind);
    const matchingActual=actualMap.get(x.label);
    const completedActual=matchingActual&&(kind!=='CPI'||matchingActual.kind!=='derived-quarterly-average'||matchingActual.partial===false);
    if(!completedActual)estimateMap.set(x.label,x);
  });
  return {actuals:[...actualMap.values()].sort((a,b)=>quarterKey(a.label)-quarterKey(b.label)).slice(-8),estimates:[...estimateMap.values()].sort((a,b)=>quarterKey(a.label)-quarterKey(b.label))};
}
function quarterKey(label){const m=String(label).match(/^Q([1-4]) FY(\d{2})$/);return m?+m[2]*10+(+m[1]):Number.MAX_SAFE_INTEGER;}
function sameObservation(a,b){const strip=x=>JSON.parse(JSON.stringify(x,(key,value)=>(key==='fetchedAt'||key==='verifiedAt')?undefined:value));return JSON.stringify(strip(a))===JSON.stringify(strip(b));}
function retainTimestamp(oldSection,newSection){return sameObservation(oldSection,newSection)&&oldSection&&oldSection.provenance?clone(oldSection):newSection;}

function sanitizeStoredData(stored) {
  const clean=clone(stored);
  if(clean.repo&&Array.isArray(clean.repo.history))clean.repo.history=clean.repo.history.filter(item=>item&&item.provenance&&item.provenance.sourceUrl&&(item.verificationStatus==='verified'||item.provenanceStatus==='verified')).map(item=>{
    const point=Object.assign({},item,{verificationStatus:'verified'});delete point.provenanceStatus;return point;
  });
  if(clean.gdp&&clean.gdp.projection&&Array.isArray(clean.gdp.projection.actuals))clean.gdp.projection.actuals=clean.gdp.projection.actuals.filter(point=>point&&point.kind==='actual'&&point.provenanceStatus==='verified'&&point.provenance&&point.provenance.sourceUrl);
  if(clean.gdp&&clean.gdp.projection&&Array.isArray(clean.gdp.projection.estimates))clean.gdp.projection.estimates=clean.gdp.projection.estimates.filter(point=>point&&point.kind==='projection'&&point.provenance&&point.provenance.sourceUrl);
  if(clean.cpi&&clean.cpi.projection&&Array.isArray(clean.cpi.projection.actuals))clean.cpi.projection.actuals=clean.cpi.projection.actuals.filter(point=>point&&point.kind==='derived-quarterly-average'&&point.provenanceStatus==='derived'&&point.derivation&&point.derivation.sourceUrl===URLS.cpi);
  return clean;
}

function buildCandidate(stored, sources, fetchedAt) {
  if(!sources||!sources.resolution||!sources.schedule||!sources.gdp||!sources.cpi)throw new Error('Complete source set required');
  return buildMergedCandidate(stored,{
    policy:{ok:true,value:{currentRate:sources.currentRate,resolution:sources.resolution,repoHistory:sources.repoHistory}},
    schedule:{ok:true,value:sources.schedule},
    gdp:{ok:true,value:sources.gdp},
    cpi:{ok:true,value:sources.cpi}
  },fetchedAt);
}

function buildMergedCandidate(stored, outcomes, fetchedAt) {
  const next=sanitizeStoredData(stored);
  const combinedRbi=outcomes&&outcomes.rbi;
  const policy=outcomes&&(outcomes.policy||(combinedRbi&&(combinedRbi.ok?{ok:true,value:{currentRate:combinedRbi.value.currentRate,resolution:combinedRbi.value.resolution,repoHistory:combinedRbi.value.repoHistory}}:combinedRbi)));
  const schedule=outcomes&&(outcomes.schedule||(combinedRbi&&(combinedRbi.ok?{ok:true,value:combinedRbi.value.schedule}:combinedRbi)));
  const gdp=outcomes&&outcomes.gdp, cpi=outcomes&&outcomes.cpi;
  if(!policy||!schedule||!gdp||!cpi)throw new Error('Source outcomes are incomplete');

  if(policy.ok){
    const resolution=policy.value.resolution;
    if(resolution.rate !== policy.value.currentRate) throw new Error('RBI current rate disagrees with the latest MPC resolution');
    rejectRegression(next.repo,resolution,'repo');rejectRegression(next.stance,resolution,'stance');rejectRegression(next.commentary,resolution,'commentary');
    const officialHistory=Array.isArray(policy.value.repoHistory)&&policy.value.repoHistory.length?reconstructRepoHistory(policy.value.repoHistory):null;
    let history=officialHistory||((next.repo&&next.repo.history)||[]).slice();
    const latest=history.slice().sort((a,b)=>a.date.localeCompare(b.date)).pop();
    if(!latest||latest.rate!==resolution.rate){
      if(latest&&resolution.decisionDate<=latest.date) throw new Error('Older repo-rate observation cannot replace newer history');
      const observation={date:resolution.decisionDate,decisionDate:resolution.decisionDate,rate:resolution.rate,publicationDate:resolution.provenance.publishedAt,resolutionUrl:resolution.provenance.sourceUrl,verificationStatus:'verified',sourceTitle:resolution.provenance.sourceTitle||'RBI MPC resolution',provenance:resolution.provenance};
      if(validIsoDate(resolution.effectiveDate))observation.effectiveDate=resolution.effectiveDate;
      history.push(observation);
    }
    next.repo=retainTimestamp(next.repo,{history:dedupeHistory(history),source:'RBI MPC resolution',provenance:resolution.provenance});
    next.stance=retainTimestamp(next.stance,{current:resolution.stance,since:resolution.decisionDate,source:'RBI MPC resolution',provenance:resolution.provenance});
    next.commentary=retainTimestamp(next.commentary,{asOf:resolution.decisionDate,source:'RBI MPC resolution',paragraphs:resolution.commentary,provenance:resolution.provenance});
  }
  if(schedule.ok){rejectRegression(next.mpc,schedule.value,'MPC schedule');next.mpc=retainTimestamp(next.mpc,{meetings:schedule.value.meetings,source:'RBI annual MPC schedule',provenance:schedule.value.provenance});}

  if(gdp.ok){
    rejectRegression(next.gdp,gdp.value,'GDP');
    const gdpRaw=clone(gdp.value);gdpRaw.source='MoSPI National Accounts Statistics';
    const estimates=policy.ok?policy.value.resolution.gdpProjections.map(x=>Object.assign({},x,{kind:'projection',provenance:policy.value.resolution.provenance})):(next.gdp&&next.gdp.projection&&next.gdp.projection.estimates||[]);
    gdpRaw.projection=mergeProjection(next.gdp&&next.gdp.projection,gdpRaw.projection.actuals,estimates,'GDP');
    next.gdp=retainTimestamp(next.gdp,gdpRaw);
  }
  if(cpi.ok){
    rejectRegression(next.cpi,cpi.value,'CPI');
    const cpiRaw=clone(cpi.value);cpiRaw.source='MoSPI CPI API (All India Combined)';
    cpiRaw.sectors=cpiRaw.sectors||{};
    ['rural','urban'].forEach(key=>{if(!cpiRaw.sectors[key]&&next.cpi&&next.cpi.sectors&&next.cpi.sectors[key])cpiRaw.sectors[key]=clone(next.cpi.sectors[key]);});
    const estimates=policy.ok?policy.value.resolution.cpiProjections.map(x=>Object.assign({},x,{kind:'projection',provenance:policy.value.resolution.provenance})):(next.cpi&&next.cpi.projection&&next.cpi.projection.estimates||[]);
    cpiRaw.projection=mergeProjection(next.cpi&&next.cpi.projection,cpiRaw.projection.actuals,estimates,'CPI');
    next.cpi=retainTimestamp(next.cpi,cpiRaw);
  }
  next.schemaVersion=3;
  validateDataset(next,fetchedAt);
  const changed=JSON.stringify(next)!==JSON.stringify(stored);
  if(changed)next.updatedAt=fetchedAt;
  return {changed,data:next};
}
function rejectRegression(oldSection,newSection,label){const oldDate=oldSection&&oldSection.provenance&&oldSection.provenance.publishedAt,newDate=newSection&&newSection.provenance&&newSection.provenance.publishedAt;if(validIsoDate(oldDate)&&validIsoDate(newDate)&&newDate<oldDate)throw new Error(label+' publication regression');}
function dedupeHistory(history){
  const map=new Map();history.forEach(x=>{if(!validIsoDate(x.date)||!finite(x.rate)||x.rate<2||x.rate>10)throw new Error('Invalid repo history');const key=x.date+'|'+x.rate;if(!map.has(key))map.set(key,x);});
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function validateDataset(data, nowIso) {
  if(!data||!data.repo||!data.stance||!data.mpc||!data.gdp||!data.cpi||!data.commentary)throw new Error('Candidate dataset is incomplete');
  dedupeHistory(data.repo.history||[]);
  if(!data.repo.history.length||data.repo.history.some(item=>item.verificationStatus!=='verified'||!item.provenance||!/^https:\/\//.test(item.provenance.sourceUrl)||!validIsoDate(item.provenance.publishedAt)))throw new Error('Repo history verification is incomplete');
  data.repo.history.forEach(item=>{
    if(item.effectiveDate&&(!validIsoDate(item.effectiveDate)||!['explicit-immediate-effect','explicit-date'].includes(item.effectiveDateBasis)||!/^https:\/\/(?:www\.)?rbi\.org\.in\//i.test(item.effectiveDateSourceUrl||'')||!['RBI LAF notification','RBI MPC resolution'].includes(item.effectiveDateSourceType)))throw new Error('Repo effective-date provenance is incomplete');
    if(item.lafNotification){const n=item.lafNotification;if(n.title!=='Liquidity Adjustment Facility - Change in rates'||n.notificationDate!==item.decisionDate||n.newRate!==item.rate||!finite(n.previousRate)||!['reduce','increase'].includes(n.direction)||!/^https:\/\/(?:www\.)?rbi\.org\.in\//i.test(n.sourceUrl||'')||!n.provenance||n.provenance.sourceUrl!==n.sourceUrl)throw new Error('RBI LAF notification provenance is incomplete');}
  });
  if(!STANCES.includes(data.stance.current)||!validIsoDate(data.stance.since))throw new Error('Invalid stance');
  if(!(data.mpc.meetings||[]).length||data.mpc.meetings.some(x=>!validIsoDate(x.announce)))throw new Error('Invalid MPC schedule');
  if(!finite(data.cpi.index)||data.cpi.index<50||data.cpi.index>300||!finite(data.cpi.yoy)||data.cpi.yoy< -10||data.cpi.yoy>30||!/^\d{4}-\d{2}$/.test(data.cpi.period)||data.cpi.baseYear!=='2024=100')throw new Error('Invalid CPI actual');
  if(!Array.isArray(data.cpi.monthly)||!data.cpi.monthly.length)throw new Error('CPI monthly history is missing');
  let priorPeriod='';
  data.cpi.monthly.forEach(point=>{if(!point||!/^\d{4}-\d{2}$/.test(point.period)||point.period<=priorPeriod||!finite(point.index)||point.index<50||point.index>300||!finite(point.yoy)||point.yoy< -10||point.yoy>30||point.baseYear!=='2024=100'||point.sector!=='Combined'||point.geography!=='All India'||point.provenanceStatus!=='verified'||!point.provenance||point.provenance.sourceUrl!==URLS.cpi||!validIsoDate(point.provenance.publishedAt))throw new Error('Invalid CPI monthly observation');priorPeriod=point.period;});
  if(data.cpi.monthly[data.cpi.monthly.length-1].period!==data.cpi.period)throw new Error('CPI monthly history does not include the current observation');
  Object.entries(data.cpi.sectors||{}).forEach(([key,point])=>{const expected=key==='rural'?['Rural',URLS.cpiRural]:key==='urban'?['Urban',URLS.cpiUrban]:null;if(!expected||!point||!/^\d{4}-\d{2}$/.test(point.period)||!finite(point.index)||point.index<50||point.index>300||!finite(point.yoy)||point.yoy< -10||point.yoy>30||point.baseYear!=='2024=100'||point.geography!=='All India'||point.sector!==expected[0]||point.measure!=='CPI (General)'||point.provenanceStatus!=='verified'||!point.provenance||point.provenance.sourceUrl!==expected[1]||!validIsoDate(point.provenance.publishedAt))throw new Error('Invalid CPI sector observation');});
  if(data.gdp.unit!=='₹ lakh crore'||!data.gdp.fy||!finite(data.gdp.fy.value)||data.gdp.fy.value<=0||!finite(data.gdp.fy.growth)||data.gdp.fy.growth< -20||data.gdp.fy.growth>30||!data.gdp.quarter||!finite(data.gdp.quarter.value)||data.gdp.quarter.value<=0||!finite(data.gdp.quarter.growth)||data.gdp.quarter.growth< -20||data.gdp.quarter.growth>30)throw new Error('Invalid GDP actual');
  if(Date.parse(data.cpi.period+'-01T00:00:00Z')>Date.parse(nowIso)||Date.parse(data.repo.history[data.repo.history.length-1].date+'T00:00:00Z')>Date.parse(nowIso))throw new Error('Future-dated actual');
  ['repo','stance','mpc','gdp','cpi','commentary'].forEach(k=>{const p=data[k].provenance;if(!p||!/^https:\/\//.test(p.sourceUrl)||!validIsoDate(p.publishedAt)||!validIsoTime(p.fetchedAt))throw new Error(k+' provenance is incomplete');if(Date.parse(p.publishedAt+'T00:00:00Z')>Date.parse(nowIso))throw new Error(k+' publication is future-dated');});
  [data.gdp.fy,data.gdp.quarter].forEach((point,index)=>{const p=point.provenance;if(!p||!/^https:\/\//.test(p.sourceUrl)||!validIsoDate(p.publishedAt))throw new Error('GDP '+(index?'quarterly':'annual')+' provenance is incomplete');});
  [...(data.gdp.projection.estimates||[]),...(data.cpi.projection.estimates||[])].forEach(point=>{if(point.kind!=='projection'||!point.provenance||!/^https:\/\/(?:www\.)?rbi\.org\.in\//i.test(point.provenance.sourceUrl)||!validIsoDate(point.provenance.publishedAt))throw new Error('Projection provenance is incomplete');});
  (data.gdp.projection.actuals||[]).forEach(point=>{if(point.provenanceStatus!=='verified'||point.kind!=='actual'||point.classification!=='constant-price real GDP'||!point.baseYear||!point.series||!point.frequency||!point.revisionStatus||!point.provenance||!validIsoDate(point.provenance.publishedAt))throw new Error('Verified GDP actual provenance is incomplete');});
  (data.cpi.projection.actuals||[]).forEach(point=>{const d=point.derivation;if(point.kind!=='derived-quarterly-average'||point.provenanceStatus!=='derived'||!d||d.method!=='arithmetic mean of monthly All India Combined CPI YoY observations'||d.formula!=='sum(monthly YoY values) / observation count'||d.sourceUrl!==URLS.cpi||d.expectedObservationCount!==3||!Array.isArray(d.observations)||d.observations.length!==d.observationCount||!Array.isArray(d.releases)||d.releases.length!==d.observationCount||(!point.partial&&d.observationCount!==3))throw new Error('CPI actual derivation metadata is incomplete');});
  return true;
}

function macroFromCandidate(existing, data) {
  const out=clone(existing), latest=data.repo.history[data.repo.history.length-1], g=data.gdp.quarter, c=data.cpi;
  delete out.updatedAt;
  out.items=out.items||{};
  const repoDateLabel=validIsoDate(latest.effectiveDate)?'Effective '+latest.effectiveDate:'Decision '+(latest.decisionDate||latest.date);
  out.items.repo={value:latest.rate.toFixed(2)+'%',lines:['Policy repo rate',repoDateLabel],source:'RBI MPC resolution',updatedAt:data.repo.provenance.publishedAt};
  out.items.inflation={value:c.yoy.toFixed(2)+'%',lines:['CPI, YoY','All India Combined',c.period],source:'MoSPI CPI API',updatedAt:c.provenance.publishedAt};
  out.items.growth={value:g.growth.toFixed(2)+'%',lines:['Real GDP growth, YoY',g.label],source:'MoSPI National Accounts Statistics',updatedAt:data.gdp.provenance.publishedAt};
  out.items.fiscal={value:null,lines:['Source unavailable','Update time unavailable'],source:null,updatedAt:null,status:'coming-soon'};
  return out;
}

function atomicWriteMany(entries, hooks) {
  const staged=entries.filter(e=>e.changed).map(e=>({file:e.file,temp:e.file+'.tmp-'+process.pid,content:e.content}));
  try {
    staged.forEach(e=>fs.writeFileSync(e.temp,e.content,{encoding:'utf8',flag:'wx'}));
    if(hooks&&hooks.beforeCommit)hooks.beforeCommit();
    staged.forEach(e=>fs.renameSync(e.temp,e.file));
  } catch(error) {
    staged.forEach(e=>{try{if(fs.existsSync(e.temp))fs.unlinkSync(e.temp);}catch(_){}});
    throw error;
  }
  return staged.length;
}

async function request(url, options) {
  const parsed=new URL(url),body=options&&options.body||null,max=5*1024*1024;
  return new Promise((resolve,reject)=>{
    const req=https.request({protocol:parsed.protocol,hostname:parsed.hostname,port:parsed.port||443,path:parsed.pathname+parsed.search,method:(options&&options.method)||(body?'POST':'GET'),headers:Object.assign({'User-Agent':UA,'Accept':options&&options.accept||'*/*'},body?{'Content-Type':options&&options.contentType||'application/json','Content-Length':Buffer.byteLength(body)}:{},options&&options.headers||{}),secureOptions:parsed.hostname==='api.mospi.gov.in'?constants.SSL_OP_LEGACY_SERVER_CONNECT:undefined,timeout:30000},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();return resolve(request(new URL(res.headers.location,url).toString(),options));}
      let size=0,chunks=[];res.on('data',d=>{size+=d.length;if(size>max){req.destroy(new Error('response exceeds 5 MB'));return;}chunks.push(d);});
      res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');if(res.statusCode<200||res.statusCode>=300)return reject(new Error('HTTP '+res.statusCode+' from '+url));resolve(options&&options.returnResponse?{text,headers:res.headers,statusCode:res.statusCode}:text);});
    });req.on('timeout',()=>req.destroy(new Error('timeout from '+url)));req.on('error',reject);if(body)req.write(body);req.end();
  });
}

function decodeHtmlAttribute(value){return String(value||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(d+);/g,(_,n)=>String.fromCharCode(Number(n)));}
function archiveForm(html,year){
  const form=new URLSearchParams();
  for(const match of String(html).matchAll(/<input\b[^>]*type=["']hidden["'][^>]*>/gi)){
    const tag=match[0],name=(tag.match(/\bname=["']([^"']+)["']/i)||[])[1],value=(tag.match(/\bvalue=["']([^"']*)["']/i)||[])[1]||'';
    if(name)form.set(decodeHtmlAttribute(name),decodeHtmlAttribute(value));
  }
  form.set('hdnYear',String(year));form.set('UsrFontCntr$btn','');return form.toString();
}
async function fetchPolicyArchivePages(nowIso){
  const first=await request(URLS.rbiPolicy,{accept:'text/html',returnResponse:true});
  const cookies=(first.headers['set-cookie']||[]).map(value=>value.split(';')[0]).join('; ');
  const date=new Date(nowIso),year=date.getUTCFullYear(),endYear=date.getUTCMonth()>=3?year+1:year;
  const years=[endYear-2,endYear-1,endYear],pages=[];
  for(const archiveYear of years){
    const response=await request(URLS.rbiPolicy,{accept:'text/html',method:'POST',body:archiveForm(first.text,archiveYear),contentType:'application/x-www-form-urlencoded',headers:cookies?{Cookie:cookies}:{}});
    pages.push({archiveYear,html:response});
  }
  return pages;
}

async function fetchRepoNotifications(fetchedAt){
  const indexHtml=await request(URLS.rbiNotifications,{accept:'text/html'});
  const links=parseLafNotificationLinks(indexHtml,URLS.rbiNotifications);
  if(!links.length)throw new Error('No official RBI LAF rate-change notifications discovered');
  return Promise.all(links.map(async meta=>parseLafNotification(await request(meta.url,{accept:'text/html'}),meta.url,fetchedAt,meta)));
}

async function fetchPolicyData(homeHtml,pages,fetchedAt,notifications){
  const links=[...new Map(pages.flatMap(page=>parsePolicyLinks(page.html,URLS.rbiPolicy)).map(item=>[item.url,item])).values()].sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt));
  if(!links.length)throw new Error('No official RBI MPC resolutions discovered across archive years');
  const documents=await Promise.all(links.map(async meta=>({meta,html:await request(meta.url,{accept:'text/html'})})));
  const decisions=reconcileRepoNotifications(documents.map(item=>parseRepoDecision(item.html,item.meta.url,fetchedAt,item.meta)),notifications||[]);
  const latest=documents[documents.length-1];
  const latestArchiveYear=Math.max(...pages.map(page=>page.archiveYear));
  const historyStart=String(latestArchiveYear-2)+'-04-01';
  return {currentRate:parseCurrentRates(homeHtml),resolution:parseResolution(latest.html,latest.meta.url,fetchedAt),repoHistory:reconstructRepoHistory(decisions).filter(point=>point.decisionDate>=historyStart)};
}
async function fetchSources(nowIso) {
  const fetchedAt=nowIso;
  const [home,policyPages,notifications,releasesText,cpiText,cpiRuralText,cpiUrbanText,gdpQText,gdpAText]=await Promise.all([
    request(URLS.rbiHome,{accept:'text/html'}),fetchPolicyArchivePages(fetchedAt),fetchRepoNotifications(fetchedAt),
    request(URLS.mospiReleases,{accept:'application/json',body:JSON.stringify({page_no:1,page_size:100,search_term:'',sort_field:'published_year',sort_order:'DESC',from_date:'',to_date:'',lang:'en'})}),
    request(URLS.cpi,{accept:'application/json'}),request(URLS.cpiRural,{accept:'application/json'}),request(URLS.cpiUrban,{accept:'application/json'}),request(URLS.gdpQuarterly,{accept:'application/json'}),request(URLS.gdpAnnual,{accept:'application/json'})
  ]);
  const policyData=await fetchPolicyData(home,policyPages,fetchedAt,notifications);
  const releases=parseReleaseList(JSON.parse(releasesText));
  return {fetchedAt,currentRate:policyData.currentRate,resolution:policyData.resolution,repoHistory:policyData.repoHistory,schedule:parseSchedule(policyPages[policyPages.length-1].html,URLS.rbiPolicy,fetchedAt),cpi:parseCpi(JSON.parse(cpiText),releases,fetchedAt,{rural:JSON.parse(cpiRuralText),urban:JSON.parse(cpiUrbanText)}),gdp:parseGdp(JSON.parse(gdpQText),JSON.parse(gdpAText),releases,fetchedAt)};
}

async function fetchSourceOutcomes(nowIso) {
  const fetchedAt=nowIso;
  const homePromise=request(URLS.rbiHome,{accept:'text/html'}),policyPagesPromise=fetchPolicyArchivePages(fetchedAt);
  const notificationsPromise=fetchRepoNotifications(fetchedAt);
  const releasesPromise=request(URLS.mospiReleases,{accept:'application/json',body:JSON.stringify({page_no:1,page_size:100,search_term:'',sort_field:'published_year',sort_order:'DESC',from_date:'',to_date:'',lang:'en'})}).then(text=>parseReleaseList(JSON.parse(text)));
  const tasks={
    policy:(async()=>{const [home,pages,notificationResult]=await Promise.all([homePromise,policyPagesPromise,notificationsPromise.then(value=>({ok:true,value}),error=>({ok:false,error}))]);return fetchPolicyData(home,pages,fetchedAt,notificationResult.ok?notificationResult.value:[]);})(),
    notifications:notificationsPromise,
    schedule:(async()=>{const pages=await policyPagesPromise;return parseSchedule(pages[pages.length-1].html,URLS.rbiPolicy,fetchedAt);})(),
    cpi:(async()=>{const [text,releases,sectorResults]=await Promise.all([request(URLS.cpi,{accept:'application/json'}),releasesPromise,Promise.allSettled([request(URLS.cpiRural,{accept:'application/json'}),request(URLS.cpiUrban,{accept:'application/json'})])]);const optional={};if(sectorResults[0].status==='fulfilled')optional.rural=JSON.parse(sectorResults[0].value);if(sectorResults[1].status==='fulfilled')optional.urban=JSON.parse(sectorResults[1].value);return parseCpi(JSON.parse(text),releases,fetchedAt,optional);})(),
    gdp:(async()=>{const [q,a,releases]=await Promise.all([request(URLS.gdpQuarterly,{accept:'application/json'}),request(URLS.gdpAnnual,{accept:'application/json'}),releasesPromise]);return parseGdp(JSON.parse(q),JSON.parse(a),releases,fetchedAt);})()
  };
  const names=Object.keys(tasks),settled=await Promise.allSettled(names.map(name=>tasks[name])),out={};
  names.forEach((name,index)=>{const item=settled[index];out[name]=item.status==='fulfilled'?{ok:true,value:item.value}:{ok:false,error:conciseError(item.reason)};});
  return out;
}
function conciseError(error){return tidy(error&&error.message||error||'unknown error').slice(0,300);}

module.exports={URLS,textOf,parseCurrentRates,parsePolicyLinks,parsePolicyIndex,parseRepoDecision,parseLafNotificationLinks,parseLafNotification,reconcileRepoNotifications,reconstructRepoHistory,parseResolution,parseSchedule,parseReleaseList,findRelease,findGdpRelease,parseCpi,parseGdp,mergeProjection,buildCandidate,buildMergedCandidate,validateDataset,macroFromCandidate,atomicWriteMany,fetchSources,fetchSourceOutcomes,request,archiveForm,fetchPolicyArchivePages,fetchRepoNotifications,fetchPolicyData};
