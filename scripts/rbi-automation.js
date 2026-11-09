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
  mospiReleases: 'https://www.mospi.gov.in/api/latest-release/get-web-latest-release-list',
  cpi: 'https://api.mospi.gov.in/api/cpi/getCPIData?base_year=2024&series=Current&state_code=1&sector_code=3&division_code=0&limit=100',
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

function parsePolicyIndex(html, baseUrl) {
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
    candidates.push({ url: new URL(m[1].replace(/&amp;/g, '&'), baseUrl).toString(), publishedAt, context });
  }
  if (!candidates.length) throw new Error('No official MPC resolution link found');
  const dated = candidates.filter(x => x.publishedAt).sort((a,b) => a.publishedAt.localeCompare(b.publishedAt));
  const latest = dated[dated.length - 1] || candidates[candidates.length - 1];
  if (!latest.publishedAt) throw new Error('Latest MPC resolution is missing a publication date');
  return latest;
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

function parseCpi(payload, releases, fetchedAt) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('MoSPI CPI response is malformed');
  const rows = payload.data.filter(r => r.state === 'All India' && r.sector === 'Combined' && r.division === 'CPI (General)').map(r => {
    const month = MONTH[String(r.month).toLowerCase()], year = +r.year;
    return { year, month, period: isoDate(year, month, 1).slice(0,7), index:+r.index, yoy:+r.inflation };
  }).filter(r => r.month && finite(r.index) && finite(r.yoy)).sort((a,b) => a.period.localeCompare(b.period));
  const latest = rows[rows.length - 1];
  if (!latest || latest.index < 50 || latest.index > 300 || latest.yoy < -10 || latest.yoy > 30) throw new Error('MoSPI CPI values are missing or implausible');
  const monthName = new Intl.DateTimeFormat('en', { month:'long', timeZone:'UTC' }).format(new Date(latest.period + '-01T00:00:00Z'));
  const release = findRelease(releases, 'cpi', monthName + ' ' + latest.year);
  const quarter = new Map();
  rows.forEach(r => { const q = r.month <= 3 ? 4 : Math.ceil((r.month - 3) / 3), fy = r.month <= 3 ? r.year : r.year + 1, label='Q'+q+' FY'+String(fy).slice(-2); if(!quarter.has(label))quarter.set(label,[]); quarter.get(label).push(r.yoy); });
  const actuals = [...quarter].map(([label,v]) => ({
    label,
    value:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2),
    kind:'derived-quarterly-average',
    provenanceStatus:'derived',
    derivation:{method:'arithmetic mean of monthly All India Combined CPI YoY observations',observationCount:v.length,sourceUrl:URLS.cpi,baseYear:'2024=100'}
  })).slice(-4);
  return { index:latest.index, yoy:latest.yoy, period:latest.period, baseYear:'2024=100', projection:{actuals}, provenance:provenance(URLS.cpi, release.publishedAt, fetchedAt, { publicationUrl:release.sourceUrl }) };
}

function parseGdp(quarterPayload, annualPayload, releases, fetchedAt) {
  const qRows = quarterPayload && Array.isArray(quarterPayload.data) ? quarterPayload.data : null;
  const aRows = annualPayload && Array.isArray(annualPayload.data) ? annualPayload.data : null;
  if (!qRows || !aRows) throw new Error('MoSPI GDP response is malformed');
  const q = qRows.filter(r => r.indicator === 'Gross Domestic Product' && r.quarter && finite(+r.constant_price)).map(r => ({ year:r.year, quarter:r.quarter, value:+r.constant_price })).sort(comparePeriod);
  const a = aRows.filter(r => r.indicator === 'Gross Domestic Product' && finite(+r.constant_price)).map(r => ({ year:r.year, value:+r.constant_price })).sort((x,y)=>x.year.localeCompare(y.year));
  if (q.length < 2 || a.length < 2) throw new Error('MoSPI GDP observations are incomplete');
  const latestQ=q[q.length-1], previousQ=[...q].reverse().find(x=>x.quarter===latestQ.quarter&&x.year<latestQ.year);
  if(!previousQ) throw new Error('GDP prior-year quarter is missing');
  const growth=+((latestQ.value/previousQ.value-1)*100).toFixed(2);
  if(growth < -20 || growth > 30) throw new Error('GDP quarterly growth is implausible');
  const latestA=a[a.length-1], previousA=a[a.length-2], annualGrowth=+((latestA.value/previousA.value-1)*100).toFixed(2), period=latestQ.quarter+' FY'+latestQ.year.slice(-2);
  if(annualGrowth < -20 || annualGrowth > 30) throw new Error('GDP annual growth is implausible');
  const release=findRelease(releases,'gdp',latestQ.quarter+' '+latestQ.year);
  const quarterProvenance=provenance(URLS.gdpQuarterly,release.publishedAt,fetchedAt,{publicationUrl:release.sourceUrl});
  const annualProvenance=provenance(URLS.gdpAnnual,release.publishedAt,fetchedAt,{publicationUrl:release.sourceUrl});
  return {
    fy:{label:'FY'+latestA.year,value:+(latestA.value/100000).toFixed(2),decimals:2,growth:annualGrowth,provenance:annualProvenance},
    quarter:{label:latestQ.quarter+' FY'+latestQ.year,value:+(latestQ.value/100000).toFixed(2),decimals:2,growth,provenance:quarterProvenance},
    unit:'₹ lakh crore',projection:{actuals:[{label:period,value:growth,kind:'actual',provenanceStatus:'verified',provenance:quarterProvenance}]},
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
  const actualMap=new Map((oldProjection && oldProjection.actuals || []).map(x=>[x.label,x]));
  actuals.forEach(x=>{validatePoint(x,kind);actualMap.set(x.label,x);});
  const estimateMap=new Map();
  estimates.forEach(x=>{validatePoint(x,kind);if(!actualMap.has(x.label))estimateMap.set(x.label,x);});
  return {actuals:[...actualMap.values()].sort((a,b)=>quarterKey(a.label)-quarterKey(b.label)).slice(-8),estimates:[...estimateMap.values()].sort((a,b)=>quarterKey(a.label)-quarterKey(b.label))};
}
function quarterKey(label){const m=String(label).match(/^Q([1-4]) FY(\d{2})$/);return m?+m[2]*10+(+m[1]):Number.MAX_SAFE_INTEGER;}
function sameObservation(a,b){const strip=x=>JSON.parse(JSON.stringify(x,(key,value)=>(key==='fetchedAt'||key==='verifiedAt')?undefined:value));return JSON.stringify(strip(a))===JSON.stringify(strip(b));}
function retainTimestamp(oldSection,newSection){return sameObservation(oldSection,newSection)&&oldSection&&oldSection.provenance?clone(oldSection):newSection;}

function buildCandidate(stored, sources, fetchedAt) {
  if(!sources||!sources.resolution||!sources.schedule||!sources.gdp||!sources.cpi)throw new Error('Complete source set required');
  return buildMergedCandidate(stored,{
    policy:{ok:true,value:{currentRate:sources.currentRate,resolution:sources.resolution}},
    schedule:{ok:true,value:sources.schedule},
    gdp:{ok:true,value:sources.gdp},
    cpi:{ok:true,value:sources.cpi}
  },fetchedAt);
}

function buildMergedCandidate(stored, outcomes, fetchedAt) {
  const next=clone(stored);
  const legacyRbi=outcomes&&outcomes.rbi;
  const policy=outcomes&&(outcomes.policy||(legacyRbi&&(legacyRbi.ok?{ok:true,value:{currentRate:legacyRbi.value.currentRate,resolution:legacyRbi.value.resolution}}:legacyRbi)));
  const schedule=outcomes&&(outcomes.schedule||(legacyRbi&&(legacyRbi.ok?{ok:true,value:legacyRbi.value.schedule}:legacyRbi)));
  const gdp=outcomes&&outcomes.gdp, cpi=outcomes&&outcomes.cpi;
  if(!policy||!schedule||!gdp||!cpi)throw new Error('Source outcomes are incomplete');

  if(policy.ok){
    const resolution=policy.value.resolution;
    if(resolution.rate !== policy.value.currentRate) throw new Error('RBI current rate disagrees with the latest MPC resolution');
    rejectRegression(next.repo,resolution,'repo');rejectRegression(next.stance,resolution,'stance');rejectRegression(next.commentary,resolution,'commentary');
    const latest=(next.repo&&next.repo.history||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).pop();
    let history=(next.repo&&next.repo.history||[]).map(item=>{
      if(item.date===resolution.decisionDate&&item.rate===resolution.rate)return Object.assign({},item,{decisionDate:resolution.decisionDate,provenanceStatus:'verified',provenance:resolution.provenance});
      return item.provenance?item:Object.assign({},item,{provenanceStatus:'legacy'});
    });
    if(!latest||latest.rate!==resolution.rate){
      if(latest&&resolution.decisionDate<=latest.date) throw new Error('Older repo-rate observation cannot replace newer history');
      const observation={date:resolution.decisionDate,decisionDate:resolution.decisionDate,rate:resolution.rate,provenanceStatus:'verified',provenance:resolution.provenance};
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
    gdpRaw.projection.actuals=gdpRaw.projection.actuals.map(point=>point.provenance?Object.assign({},point,{kind:point.kind||'actual',provenanceStatus:'verified'}):Object.assign({},point,{kind:'legacy',provenanceStatus:'legacy'}));
    next.gdp=retainTimestamp(next.gdp,gdpRaw);
  }
  if(cpi.ok){
    rejectRegression(next.cpi,cpi.value,'CPI');
    const cpiRaw=clone(cpi.value);cpiRaw.source='MoSPI CPI API (All India Combined)';
    const estimates=policy.ok?policy.value.resolution.cpiProjections.map(x=>Object.assign({},x,{kind:'projection',provenance:policy.value.resolution.provenance})):(next.cpi&&next.cpi.projection&&next.cpi.projection.estimates||[]);
    cpiRaw.projection=mergeProjection(next.cpi&&next.cpi.projection,cpiRaw.projection.actuals,estimates,'CPI');
    next.cpi=retainTimestamp(next.cpi,cpiRaw);
  }
  next.schemaVersion=2;
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
  if(data.repo.history.some(item=>!['legacy','verified'].includes(item.provenanceStatus)))throw new Error('Repo history provenance status is incomplete');
  if(!STANCES.includes(data.stance.current)||!validIsoDate(data.stance.since))throw new Error('Invalid stance');
  if(!(data.mpc.meetings||[]).length||data.mpc.meetings.some(x=>!validIsoDate(x.announce)))throw new Error('Invalid MPC schedule');
  if(!finite(data.cpi.index)||data.cpi.index<50||data.cpi.index>300||!finite(data.cpi.yoy)||data.cpi.yoy< -10||data.cpi.yoy>30||!/^\d{4}-\d{2}$/.test(data.cpi.period)||data.cpi.baseYear!=='2024=100')throw new Error('Invalid CPI actual');
  if(data.gdp.unit!=='₹ lakh crore'||!data.gdp.fy||!finite(data.gdp.fy.value)||data.gdp.fy.value<=0||!finite(data.gdp.fy.growth)||data.gdp.fy.growth< -20||data.gdp.fy.growth>30||!data.gdp.quarter||!finite(data.gdp.quarter.value)||data.gdp.quarter.value<=0||!finite(data.gdp.quarter.growth)||data.gdp.quarter.growth< -20||data.gdp.quarter.growth>30)throw new Error('Invalid GDP actual');
  if(Date.parse(data.cpi.period+'-01T00:00:00Z')>Date.parse(nowIso)||Date.parse(data.repo.history[data.repo.history.length-1].date+'T00:00:00Z')>Date.parse(nowIso))throw new Error('Future-dated actual');
  ['repo','stance','mpc','gdp','cpi','commentary'].forEach(k=>{const p=data[k].provenance;if(!p||!/^https:\/\//.test(p.sourceUrl)||!validIsoDate(p.publishedAt)||!validIsoTime(p.fetchedAt))throw new Error(k+' provenance is incomplete');if(Date.parse(p.publishedAt+'T00:00:00Z')>Date.parse(nowIso))throw new Error(k+' publication is future-dated');});
  [data.gdp.fy,data.gdp.quarter].forEach((point,index)=>{const p=point.provenance;if(!p||!/^https:\/\//.test(p.sourceUrl)||!validIsoDate(p.publishedAt))throw new Error('GDP '+(index?'quarterly':'annual')+' provenance is incomplete');});
  [...(data.gdp.projection.estimates||[]),...(data.cpi.projection.estimates||[])].forEach(point=>{if(point.kind!=='projection'||!point.provenance||!/^https:\/\//.test(point.provenance.sourceUrl)||!validIsoDate(point.provenance.publishedAt))throw new Error('Projection provenance is incomplete');});
  (data.gdp.projection.actuals||[]).forEach(point=>{if(point.provenanceStatus==='verified'){if(point.kind!=='actual'||!point.provenance||!validIsoDate(point.provenance.publishedAt))throw new Error('Verified GDP actual provenance is incomplete');}else if(point.provenanceStatus!=='legacy'||point.kind!=='legacy')throw new Error('GDP actual provenance status is incomplete');});
  (data.cpi.projection.actuals||[]).forEach(point=>{if(point.kind!=='derived-quarterly-average'||point.provenanceStatus!=='derived'||!point.derivation||point.derivation.method!=='arithmetic mean of monthly All India Combined CPI YoY observations'||point.derivation.sourceUrl!==URLS.cpi)throw new Error('CPI actual derivation metadata is incomplete');});
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
    const req=https.request({protocol:parsed.protocol,hostname:parsed.hostname,port:parsed.port||443,path:parsed.pathname+parsed.search,method:body?'POST':'GET',headers:Object.assign({'User-Agent':UA,'Accept':options&&options.accept||'*/*'},body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),secureOptions:parsed.hostname==='api.mospi.gov.in'?constants.SSL_OP_LEGACY_SERVER_CONNECT:undefined,timeout:30000},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();return resolve(request(new URL(res.headers.location,url).toString(),options));}
      let size=0,chunks=[];res.on('data',d=>{size+=d.length;if(size>max){req.destroy(new Error('response exceeds 5 MB'));return;}chunks.push(d);});
      res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');if(res.statusCode<200||res.statusCode>=300)return reject(new Error('HTTP '+res.statusCode+' from '+url));resolve(text);});
    });req.on('timeout',()=>req.destroy(new Error('timeout from '+url)));req.on('error',reject);if(body)req.write(body);req.end();
  });
}
async function fetchSources(nowIso) {
  const fetchedAt=nowIso;
  const [home,policy,releasesText,cpiText,gdpQText,gdpAText]=await Promise.all([
    request(URLS.rbiHome,{accept:'text/html'}),request(URLS.rbiPolicy,{accept:'text/html'}),
    request(URLS.mospiReleases,{accept:'application/json',body:JSON.stringify({page_no:1,page_size:100,search_term:'',sort_field:'published_year',sort_order:'DESC',from_date:'',to_date:'',lang:'en'})}),
    request(URLS.cpi,{accept:'application/json'}),request(URLS.gdpQuarterly,{accept:'application/json'}),request(URLS.gdpAnnual,{accept:'application/json'})
  ]);
  const resolutionMeta=parsePolicyIndex(policy,URLS.rbiPolicy);
  const resolutionHtml=await request(resolutionMeta.url,{accept:'text/html'});
  const releases=parseReleaseList(JSON.parse(releasesText));
  return {fetchedAt,currentRate:parseCurrentRates(home),resolution:parseResolution(resolutionHtml,resolutionMeta.url,fetchedAt),schedule:parseSchedule(policy,URLS.rbiPolicy,fetchedAt),cpi:parseCpi(JSON.parse(cpiText),releases,fetchedAt),gdp:parseGdp(JSON.parse(gdpQText),JSON.parse(gdpAText),releases,fetchedAt)};
}

async function fetchSourceOutcomes(nowIso) {
  const fetchedAt=nowIso;
  const homePromise=request(URLS.rbiHome,{accept:'text/html'}),policyPagePromise=request(URLS.rbiPolicy,{accept:'text/html'});
  const releasesPromise=request(URLS.mospiReleases,{accept:'application/json',body:JSON.stringify({page_no:1,page_size:100,search_term:'',sort_field:'published_year',sort_order:'DESC',from_date:'',to_date:'',lang:'en'})}).then(text=>parseReleaseList(JSON.parse(text)));
  const tasks={
    policy:(async()=>{const [home,policyPage]=await Promise.all([homePromise,policyPagePromise]);const meta=parsePolicyIndex(policyPage,URLS.rbiPolicy);const resolutionHtml=await request(meta.url,{accept:'text/html'});return {currentRate:parseCurrentRates(home),resolution:parseResolution(resolutionHtml,meta.url,fetchedAt)};})(),
    schedule:(async()=>parseSchedule(await policyPagePromise,URLS.rbiPolicy,fetchedAt))(),
    cpi:(async()=>{const [text,releases]=await Promise.all([request(URLS.cpi,{accept:'application/json'}),releasesPromise]);return parseCpi(JSON.parse(text),releases,fetchedAt);})(),
    gdp:(async()=>{const [q,a,releases]=await Promise.all([request(URLS.gdpQuarterly,{accept:'application/json'}),request(URLS.gdpAnnual,{accept:'application/json'}),releasesPromise]);return parseGdp(JSON.parse(q),JSON.parse(a),releases,fetchedAt);})()
  };
  const names=Object.keys(tasks),settled=await Promise.allSettled(names.map(name=>tasks[name])),out={};
  names.forEach((name,index)=>{const item=settled[index];out[name]=item.status==='fulfilled'?{ok:true,value:item.value}:{ok:false,error:conciseError(item.reason)};});
  return out;
}
function conciseError(error){return tidy(error&&error.message||error||'unknown error').slice(0,300);}

module.exports={URLS,textOf,parseCurrentRates,parsePolicyIndex,parseResolution,parseSchedule,parseReleaseList,findRelease,parseCpi,parseGdp,mergeProjection,buildCandidate,buildMergedCandidate,validateDataset,macroFromCandidate,atomicWriteMany,fetchSources,fetchSourceOutcomes,request};
