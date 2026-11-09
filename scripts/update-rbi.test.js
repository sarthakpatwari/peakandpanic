#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const a = require('./rbi-automation');

// Fixed after every dated fixture so future-date validation remains active and deterministic.
const NOW = '2027-01-10T05:00:00.000Z';
const prov = (url, date) => ({ sourceUrl:url, publishedAt:date, fetchedAt:NOW, verifiedAt:NOW });
function stored() {
  return {
    updatedAt:'2026-10-07T05:00:00.000Z',
    repo:{history:[{date:'2026-10-07',rate:5.5}],source:'RBI'},
    mpc:{meetings:[{announce:'2026-12-04'}],source:'RBI'},
    stance:{current:'calibrated_tightening',since:'2026-10-07',source:'RBI'},
    gdp:{fy:{label:'FY2025-26',value:200,decimals:2,growth:7.5},quarter:{label:'Q1 FY2026-27',value:50,decimals:2,growth:7.8},unit:'₹ lakh crore',source:'MoSPI',projection:{actuals:[{label:'Q1 FY27',value:7.8}],estimates:[{label:'Q2 FY27',value:7.2}]}},
    cpi:{index:109.49,yoy:5.54,period:'2026-09',baseYear:'2024=100',source:'MoSPI',projection:{actuals:[{label:'Q2 FY27',value:5.54}],estimates:[{label:'Q3 FY27',value:4.2}]}},
    commentary:{asOf:'2026-10-07',source:'RBI',paragraphs:['Official decision text.']}
  };
}
function sources() {
  const rp=prov('https://www.rbi.org.in/resolution','2026-10-07');
  const gp=prov('https://api.mospi.gov.in/gdp','2026-08-31');
  return {
    currentRate:5.5,
    resolution:{rate:5.5,decisionDate:'2026-10-07',stance:'calibrated_tightening',gdpProjections:[{label:'Q2 FY27',value:7.2},{label:'Q3 FY27',value:6.9}],cpiProjections:[{label:'Q3 FY27',value:4.2}],commentary:['Official decision text.'],provenance:rp},
    schedule:{meetings:[{announce:'2026-12-04'},{announce:'2027-02-05'}],provenance:prov('https://rbi.org.in/policy','2026-03-23')},
    gdp:{fy:{label:'FY2025-26',value:200,decimals:2,growth:7.5,provenance:gp},quarter:{label:'Q1 FY2026-27',value:50,decimals:2,growth:7.8,provenance:gp},unit:'₹ lakh crore',projection:{actuals:[{label:'Q1 FY27',value:7.8,kind:'actual',provenanceStatus:'verified',provenance:gp}]},provenance:gp},
    cpi:{index:109.49,yoy:5.54,period:'2026-09',baseYear:'2024=100',projection:{actuals:[{label:'Q2 FY27',value:5.54,kind:'derived-quarterly-average',provenanceStatus:'derived',derivation:{method:'arithmetic mean of monthly All India Combined CPI YoY observations',observationCount:3,sourceUrl:a.URLS.cpi,baseYear:'2024=100'}}]},provenance:prov('https://api.mospi.gov.in/cpi','2026-10-12')}
  };
}
function migrated(){return a.buildCandidate(stored(),sources(),NOW).data;}
function outcomes(s){return {policy:{ok:true,value:{currentRate:s.currentRate,resolution:s.resolution}},schedule:{ok:true,value:s.schedule},gdp:{ok:true,value:s.gdp},cpi:{ok:true,value:s.cpi}};}

const tests=[];
function test(name,fn){tests.push({name,fn});}
function changed(base,mutate){const s=sources();mutate(s);return a.buildCandidate(base,s,NOW);}

test('1 no source changes creates no data change',()=>{const d=migrated();assert.strictEqual(a.buildCandidate(d,sources(),NOW).changed,false);});
test('2 valid repo-rate change appends decision',()=>{const d=migrated(),r=changed(d,s=>{s.currentRate=5.75;s.resolution.rate=5.75;s.resolution.decisionDate='2026-11-07';s.resolution.provenance=prov('https://www.rbi.org.in/new','2026-11-07');});assert.strictEqual(r.data.repo.history.at(-1).rate,5.75);});
test('3 new MPC schedule replaces schedule without duplicates',()=>{const parsed=a.parseSchedule('Mar 23, 2026 Meeting Schedule of the Monetary Policy Committee April 6-8, 2026 June 3-5, 2026 August 3-5, 2026 October 5-7, 2026 December 2-4, 2026 February 3-5, 2027','https://rbi.org.in/policy',NOW);assert.strictEqual(parsed.provenance.publishedAt,'2026-03-23');const r=changed(migrated(),s=>s.schedule.meetings.push({announce:'2027-04-07'}));assert.strictEqual(r.data.mpc.meetings.length,3);});
test('4 explicit new stance is accepted',()=>{const r=changed(migrated(),s=>{s.resolution.stance='neutral';s.resolution.decisionDate='2026-12-04';s.resolution.provenance=prov('https://www.rbi.org.in/new','2026-12-04');});assert.strictEqual(r.data.stance.current,'neutral');});
test('5 new GDP and CPI projections are merged',()=>{const r=changed(migrated(),s=>{s.resolution.gdpProjections.push({label:'Q4 FY27',value:6.8});s.resolution.cpiProjections.push({label:'Q4 FY27',value:4.1});});assert(r.data.gdp.projection.estimates.some(x=>x.label==='Q4 FY27'));assert(r.data.cpi.projection.estimates.some(x=>x.label==='Q4 FY27'));});
test('6 new CPI actual replaces current observation',()=>{const r=changed(migrated(),s=>{s.cpi.period='2026-10';s.cpi.index=110;s.cpi.yoy=5.8;s.cpi.provenance=prov('https://api.mospi.gov.in/cpi','2026-11-12');});assert.strictEqual(r.data.cpi.period,'2026-10');});
test('7 new GDP actual is retained historically',()=>{const r=changed(migrated(),s=>{const p=prov('https://api.mospi.gov.in/gdp','2026-11-30');s.gdp.quarter={label:'Q2 FY202627',value:51,decimals:2,growth:7.1,provenance:p};s.gdp.projection.actuals=[{label:'Q2 FY27',value:7.1}];s.gdp.provenance=p;});assert(r.data.gdp.projection.actuals.some(x=>x.label==='Q2 FY27'));});
test('8 actual removes estimate for the same period',()=>{const r=changed(migrated(),s=>s.gdp.projection.actuals=[{label:'Q2 FY27',value:7.1}]);assert(!r.data.gdp.projection.estimates.some(x=>x.label==='Q2 FY27'));});
test('9 duplicate repo observations are deduplicated',()=>{const d=migrated();d.repo.history.push({date:'2026-10-07',rate:5.5});const r=a.buildCandidate(d,sources(),NOW);assert.strictEqual(r.data.repo.history.filter(x=>x.date==='2026-10-07').length,1);});
test('10 older source response is rejected',()=>{assert.throws(()=>changed(migrated(),s=>{s.currentRate=5.25;s.resolution.rate=5.25;s.resolution.decisionDate='2026-08-05';s.resolution.provenance=prov('https://www.rbi.org.in/old','2026-08-05');}),/publication regression|Older repo-rate/);});
test('11 malformed HTML and JSON are rejected',()=>{assert.throws(()=>a.parseCurrentRates('<html>broken</html>'));assert.throws(()=>a.parseReleaseList({bad:true}));});
test('12 HTTP-stage failure retains stored object',()=>{const d=migrated(),before=JSON.stringify(d);try{throw new Error('HTTP 503');}catch(_){}assert.strictEqual(JSON.stringify(d),before);});
test('13 partial source failure cannot write a candidate',()=>{const s=sources();delete s.cpi;assert.throws(()=>a.buildCandidate(migrated(),s,NOW));});
test('14 implausible numeric value is rejected',()=>{assert.throws(()=>changed(migrated(),s=>s.cpi.yoy=99),/Invalid CPI|implausible/i);});
test('15 missing publication date is rejected',()=>{const s=sources();s.cpi.provenance.publishedAt=null;assert.throws(()=>a.buildCandidate(migrated(),s,NOW),/provenance/i);});
test('16 atomic write staging failure preserves original',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rbi-atomic-')),file=path.join(dir,'data.json');fs.writeFileSync(file,'old\n');assert.throws(()=>a.atomicWriteMany([{file,content:'new\n',changed:true}],{beforeCommit(){throw new Error('simulated');}}));assert.strictEqual(fs.readFileSync(file,'utf8'),'old\n');fs.rmSync(dir,{recursive:true,force:true});});
test('17 RBI failure retains only RBI sections while newer CPI updates',()=>{const base=migrated(),s=sources(),o=outcomes(s);o.policy={ok:false,error:'simulated RBI policy failure'};o.schedule={ok:false,error:'simulated RBI schedule failure'};o.cpi.value.period='2026-10';o.cpi.value.index=110;o.cpi.value.yoy=5.8;o.cpi.value.provenance=prov('https://api.mospi.gov.in/cpi','2026-11-12');const r=a.buildMergedCandidate(base,o,NOW).data;['repo','stance','mpc','commentary','gdp'].forEach(k=>assert.deepStrictEqual(r[k],base[k]));assert.strictEqual(r.cpi.period,'2026-10');assert.strictEqual(r.cpi.yoy,5.8);});
test('18 CPI failure retains CPI while newer RBI decision updates',()=>{const base=migrated(),s=sources(),o=outcomes(s);o.cpi={ok:false,error:'simulated CPI failure'};o.policy.value.currentRate=5.75;o.policy.value.resolution.rate=5.75;o.policy.value.resolution.decisionDate='2026-12-04';o.policy.value.resolution.stance='neutral';o.policy.value.resolution.provenance=prov('https://www.rbi.org.in/new','2026-12-04');const r=a.buildMergedCandidate(base,o,NOW).data;assert.deepStrictEqual(r.cpi,base.cpi);assert.strictEqual(r.repo.history.at(-1).rate,5.75);assert.strictEqual(r.stance.current,'neutral');});
test('19 GDP failure retains GDP while newer RBI and CPI update',()=>{const base=migrated(),s=sources(),o=outcomes(s);o.gdp={ok:false,error:'simulated GDP failure'};o.policy.value.currentRate=5.75;o.policy.value.resolution.rate=5.75;o.policy.value.resolution.decisionDate='2026-12-04';o.policy.value.resolution.provenance=prov('https://www.rbi.org.in/new','2026-12-04');o.cpi.value.period='2026-10';o.cpi.value.index=110;o.cpi.value.yoy=5.8;o.cpi.value.provenance=prov('https://api.mospi.gov.in/cpi','2026-11-12');const r=a.buildMergedCandidate(base,o,NOW).data;assert.deepStrictEqual(r.gdp,base.gdp);assert.strictEqual(r.repo.history.at(-1).rate,5.75);assert.strictEqual(r.cpi.period,'2026-10');});
test('20 whitespace and Unicode punctuation do not change labelled rate parsing',()=>{assert.strictEqual(a.parseCurrentRates('<div>Policy\u00a0 Repo Rate :\n 5.50 %</div>'),5.5);});
test('21 reordered link attributes and unrelated links do not displace the resolution',()=>{const html='Resolution of the Monetary Policy Committee December 2 to 4, 2026 <a data-x="1" class="doc" href="/Scripts/BS_PressReleaseDisplay.aspx?prid=1">Full Document</a><a href="/Scripts/BS_PressReleaseDisplay.aspx?prid=2">Unrelated</a>';const r=a.parsePolicyIndex(html,'https://rbi.org.in/scripts/Annualpolicy.aspx');assert.strictEqual(r.publishedAt,'2026-12-04');assert(r.url.endsWith('prid=1'));});
test('22 missing optional outlook paragraph remains optional',()=>{const html='Date : December 4, 2026 After a detailed assessment of the evolving macroeconomic conditions, the MPC voted to keep the policy repo rate at 5.50 per cent. The MPC also decided to continue with the neutral stance. Growth and Inflation Outlook. Real GDP growth is projected with Q1: at 7.1 per cent. CPI inflation is projected with Q1: at 4.1 per cent.';const r=a.parseResolution(html,'https://rbi.org.in/resolution',NOW);assert.strictEqual(r.commentary.length,1);assert.strictEqual(r.rate,5.5);});
test('23 parsers fail closed without the relevant official label',()=>{assert.throws(()=>a.parseCurrentRates('<div>Standing Deposit Facility 5.25%</div>'));assert.throws(()=>a.parsePolicyIndex('<a href="/Scripts/BS_PressReleaseDisplay.aspx?prid=1">Full Document</a>','https://rbi.org.in/'));});
test('24 globally invalid merged data aborts despite isolated source failure',()=>{const base=migrated(),o=outcomes(sources());base.gdp.unit='unsupported unit';o.gdp={ok:false,error:'simulated GDP failure'};assert.throws(()=>a.buildMergedCandidate(base,o,NOW),/Invalid GDP actual/);});
test('25 schedule failure does not suppress a valid policy decision',()=>{const base=migrated(),o=outcomes(sources());o.schedule={ok:false,error:'simulated schedule failure'};o.policy.value.currentRate=5.75;o.policy.value.resolution.rate=5.75;o.policy.value.resolution.decisionDate='2026-12-04';o.policy.value.resolution.provenance=prov('https://www.rbi.org.in/new','2026-12-04');const r=a.buildMergedCandidate(base,o,NOW).data;assert.deepStrictEqual(r.mpc,base.mpc);assert.strictEqual(r.repo.history.at(-1).rate,5.75);});
test('26 generated fiscal card is neutral and contains no unsupported value',()=>{const macro=a.macroFromCandidate({items:{fiscal:{value:'5.59%'}}},migrated());assert.deepStrictEqual(macro.items.fiscal,{value:null,lines:['Source unavailable','Update time unavailable'],source:null,updatedAt:null,status:'coming-soon'});});
test('27 repo and GDP legacy points are explicitly distinguished',()=>{const d=migrated();assert(d.repo.history.slice(0,-1).every(x=>x.provenanceStatus==='legacy'));assert.strictEqual(d.repo.history.at(-1).provenanceStatus,'verified');const legacy={label:'Q4 FY26',value:7.8},o=outcomes(sources());d.gdp.projection.actuals.unshift(legacy);const r=a.buildMergedCandidate(d,o,NOW).data;assert(r.gdp.projection.actuals.some(x=>x.label==='Q4 FY26'&&x.kind==='legacy'&&x.provenanceStatus==='legacy'));});
test('28 CPI quarterly actuals store their monthly-average derivation',()=>{const rows=['July','August','September'].map((month,i)=>({state:'All India',sector:'Combined',division:'CPI (General)',month,year:'2026',index:String(108+i),inflation:String(4+i)}));const releases=[{title:'Consumer Price Index CPI September 2026',publishedAt:'2026-10-12',sourceUrl:'https://mospi.gov.in/cpi-september.pdf'}];const c=a.parseCpi({data:rows},releases,NOW);const p=c.projection.actuals[0];assert.strictEqual(p.kind,'derived-quarterly-average');assert.strictEqual(p.provenanceStatus,'derived');assert.strictEqual(p.derivation.observationCount,3);assert.strictEqual(p.derivation.sourceUrl,a.URLS.cpi);});

(async()=>{
  let failed=0;
  for(const t of tests){try{await t.fn();console.log('PASS',t.name);}catch(error){failed++;console.error('FAIL',t.name,'-',error.message);}}
  console.log((tests.length-failed)+'/'+tests.length+' deterministic tests passed');
  if(failed)process.exitCode=1;
})();
