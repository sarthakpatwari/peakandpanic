#!/usr/bin/env node
'use strict';

const core=require('./rbi-automation');
const MONTH={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const MONTH_NAME=Object.keys(MONTH);
const URLS=Object.freeze({
  cgaHome:'https://cga.nic.in/',
  cgaCalendar:'https://cga.nic.in/Page/Advance-Release-Calendar.aspx',
  budgetIndex:'https://www.indiabudget.gov.in/doc/'
});
const LABELS={
  revenueReceipts:1,netTaxRevenueToCentre:2,nonDebtCapitalReceipts:4,totalNonDebtReceipts:7,
  revenueExpenditure:8,capitalExpenditure:10,totalExpenditure:12,fiscalDeficit:13,revenueDeficit:14
};
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function tidy(v){return String(v==null?'':v).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;|&#34;/gi,'"').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
function strictMoney(v){if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v!=='string'||!v.trim()||!/^[-+]?\d[\d, ]*(?:\.\d+)?$/.test(v.trim()))return null;const n=Number(v.replace(/[, ]/g,''));return Number.isFinite(n)?n:null;}
function isoDate(y,m,d){return String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;}
function validTime(v){return typeof v==='string'&&!Number.isNaN(Date.parse(v));}
function officialCga(url){return /^https:\/\/(?:www\.)?cga\.nic\.in\//i.test(url||'');}
function officialBudget(url){return /^https:\/\/(?:www\.)?indiabudget\.gov\.in\//i.test(url||'');}
function fiscalYearFor(year,month){return month>=4?year+'-'+String(year+1).slice(-2):(year-1)+'-'+String(year).slice(-2);}
function fiscalStart(year,month){return month>=4?year:year-1;}
function monthsElapsed(month){return month>=4?month-3:month+9;}
function periodLabel(year,month){return 'Apr–'+MONTH_NAME[month-1].slice(0,3).replace(/^./,c=>c.toUpperCase())+' FY'+fiscalYearFor(year,month);}
function parseLastModified(headers){const raw=headers&&headers['last-modified'];if(!raw)return null;const d=new Date(raw);return Number.isNaN(d.valueOf())?null:d.toISOString().slice(0,10);}
function discoverLatestCga(html){
  const found=[];
  for(const match of String(html).matchAll(/<a\b[^>]*(?:title=["']Release of Union Government Accounts up(?:to|to)\s+([A-Za-z]+)\s+(20\d{2})["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*title=["']Release of Union Government Accounts up(?:to|to)\s+([A-Za-z]+)\s+(20\d{2})["'])[^>]*>/gi)){
    const month=(match[1]||match[5]||'').toLowerCase(),year=+(match[2]||match[6]),notice=match[3]||match[4];if(MONTH[month])found.push({month:MONTH[month],year,noticeUrl:new URL(notice,URLS.cgaHome).href});
  }
  if(!found.length)throw new Error('No official CGA monthly release notice discovered');
  found.sort((a,b)=>(a.year*12+a.month)-(b.year*12+b.month));
  const latest=found.at(-1),fyStart=fiscalStart(latest.year,latest.month),code=String(fyStart).slice(-2)+String(fyStart+1).slice(-2);
  latest.accountUrl='https://cga.nic.in/writereaddata/MonthAccount/'+latest.month+latest.year+'/DATA'+code+'.htm';return latest;
}
function rowsFromHtml(html){
  const rows=[];
  for(const match of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>tidy(x[1]));
    if(cells.length)rows.push(cells);
  }
  return rows;
}
function makeRecord(key,value,definition,meta,estimateClass,coverage){const full=coverage==='full-year',startYear=Number(meta.fiscalYear.slice(0,4));return {indicatorId:key,indicatorLabel:definition,fiscalYear:meta.fiscalYear,referencePeriod:full?'FY'+meta.fiscalYear:meta.referencePeriod,startDate:meta.startDate,endDate:full?isoDate(startYear+1,3,31):meta.endDate,coverage,monthsElapsed:full?12:meta.monthsElapsed,cumulative:true,frequency:full?'annual':'monthly',value,unit:'INR crore',definition,estimateClass,source:{agency:'Controller General of Accounts',documentTitle:'Union Government Accounts at a Glance',sourceUrl:meta.sourceUrl,publicationDate:meta.publicationDate},verifiedAt:meta.verifiedAt};}
function parseCgaAccount(html,meta){
  if(!meta||!officialCga(meta.sourceUrl)||!validTime(meta.verifiedAt))throw new Error('Invalid CGA source provenance');
  const text=tidy(html),heading=text.match(/UNION GOVERNMENT ACCOUNTS AT A GLANCE AS AT THE END OF\s+([A-Za-z]+)\s+(20\d{2})/i);
  if(!heading)throw new Error('Invalid Union Government Accounts identity or period');
  const month=MONTH[heading[1].toLowerCase()],year=+heading[2];
  if(!month||month!==meta.month||year!==meta.year)throw new Error('Ambiguous or mismatched CGA period');
  if(!/Rs\.?\s*in\s*Crore/i.test(text))throw new Error('Incorrect CGA unit');
  if(!/Actuals\s*@?\s*up\s*to/i.test(text)&&!/Actuals\s*@?\s*upto/i.test(text))throw new Error('Monthly observation is not cumulative');
  if(!/Actuals are unaudited provisional figures/i.test(text))throw new Error('Missing provisional classification');
  if(!/Financial Year runs from ["']?April to March/i.test(text))throw new Error('Invalid fiscal-year convention');
  const fy=fiscalYearFor(year,month),start=fiscalStart(year,month),fyEnd=String(start+1),fyPattern=new RegExp(String(start)+'[-–](?:'+fyEnd.slice(-2)+'|'+fyEnd+')');
  if(!fyPattern.test(text))throw new Error('Invalid fiscal year');
  const parsed=new Map(),scopeStart=String(html).search(/UNION GOVERNMENT ACCOUNTS AT A GLANCE/i),scopeEnd=String(html).search(/Financial Year/i),accountHtml=scopeStart>=0&&scopeEnd>scopeStart?String(html).slice(scopeStart,scopeEnd):String(html);
  rowsFromHtml(accountHtml).forEach(cells=>{const number=Number(cells[0]),label=tidy(cells[1]);if(!Number.isInteger(number)||!label)return;const expected=Object.entries(LABELS).find(([,row])=>row===number);if(!expected)return;const nums=cells.slice(2).map(strictMoney).filter(v=>v!==null);if(nums.length<2)throw new Error('Blank, null or malformed monetary value for '+label);const candidate={label,be:nums[0],actual:nums[1]},prior=parsed.get(number);if(prior){if(prior.label!==candidate.label||prior.be!==candidate.be||prior.actual!==candidate.actual)throw new Error('Duplicate CGA row '+number);return;}parsed.set(number,candidate);});
  Object.values(LABELS).forEach(row=>{if(!parsed.has(row))throw new Error('Missing CGA row '+row);});
  const expectedNames={1:/^Revenue Receipts$/i,2:/^Tax Revenue \(Net\)/i,4:/^Non-Debt Capital Receipts$/i,7:/^Total Receipts/i,8:/^Revenue Expenditure/i,10:/^Capital Expenditure/i,12:/^Total Expenditure/i,13:/^Fiscal Deficit/i,14:/^Revenue Deficit/i};
  parsed.forEach((row,n)=>{if(!expectedNames[n].test(row.label))throw new Error('Ambiguous CGA row '+n);});
  const v=key=>parsed.get(LABELS[key]).actual,b=key=>parsed.get(LABELS[key]).be,tolerance=.02;
  if(Math.abs(v('revenueReceipts')+v('nonDebtCapitalReceipts')-v('totalNonDebtReceipts'))>tolerance)throw new Error('Receipts reconciliation failure');
  if(Math.abs(v('revenueExpenditure')+v('capitalExpenditure')-v('totalExpenditure'))>tolerance)throw new Error('Expenditure reconciliation failure');
  if(Math.abs(v('totalExpenditure')-v('totalNonDebtReceipts')-v('fiscalDeficit'))>tolerance)throw new Error('Fiscal-deficit reconciliation failure');
  if(Math.abs(v('revenueExpenditure')-v('revenueReceipts')-v('revenueDeficit'))>tolerance)throw new Error('Revenue-deficit reconciliation failure');
  const base={fiscalYear:fy,referencePeriod:periodLabel(year,month),startDate:isoDate(start,4,1),endDate:isoDate(year,month,new Date(Date.UTC(year,month,0)).getUTCDate()),monthsElapsed:monthsElapsed(month),sourceUrl:meta.sourceUrl,publicationDate:meta.publicationDate||null,verifiedAt:meta.verifiedAt};
  const defs={fiscalDeficit:'Fiscal deficit (total expenditure less total non-debt receipts)',revenueDeficit:'Revenue deficit (revenue expenditure less revenue receipts)',revenueReceipts:'Revenue receipts',nonDebtCapitalReceipts:'Non-debt capital receipts',totalNonDebtReceipts:'Total non-debt receipts (revenue receipts plus non-debt capital receipts)',totalExpenditure:'Total expenditure',revenueExpenditure:'Revenue expenditure',capitalExpenditure:'Capital expenditure',netTaxRevenueToCentre:'Net tax revenue to Centre'};
  const actuals={},budgetEstimates={};Object.keys(LABELS).forEach(key=>{actuals[key]=makeRecord(key,v(key),defs[key],base,'unaudited-provisional-actual','year-to-date');budgetEstimates[key]=makeRecord(key,b(key),defs[key],base,'budget-estimate','full-year');});
  const numerator=actuals.fiscalDeficit,denominator=budgetEstimates.fiscalDeficit,unrounded=numerator.value/denominator.value*100;
  return {schemaVersion:'1.0.0',government:{level:'Union Government',country:'India'},fiscalYear:fy,referencePeriod:base.referencePeriod,monthly:{classification:'unaudited provisional',coverage:'year-to-date',monthsElapsed:base.monthsElapsed,cumulative:true,actuals},annual:{budgetEstimates,revisedEstimates:null,deficitToGdp:null},calculations:{fiscalDeficitPercentOfBudgetEstimate:{numerator:clone(numerator),denominator:clone(denominator),formula:'(year-to-date fiscal deficit / full-year Budget Estimate fiscal deficit) × 100',unroundedResult:unrounded,displayedResult:+unrounded.toFixed(1),fiscalYear:fy,unit:'percent'}},schedule:null};
}
function parseBudgetText(text,meta){
  if(!meta||!officialBudget(meta.sourceUrl))throw new Error('Invalid Budget source URL');const clean=tidy(text);
  if(!/Budget at a Glance/i.test(clean)||!/Actuals/i.test(clean)||!/Budget Estimates/i.test(clean))throw new Error('Invalid Budget document identity');
  const header=clean.match(/(20\d{2})[-–](\d{2})\s+Actuals[\s\S]{0,180}?(20\d{2})[-–](\d{2})\s+Budget Estimates[\s\S]{0,180}?(20\d{2})[-–](\d{2})\s+Revised Estimates[\s\S]{0,180}?(20\d{2})[-–](\d{2})\s+Budget Estimates/i);
  if(!header)throw new Error('Budget fiscal-year columns are ambiguous');
  const rows={};for(const name of ['Fiscal Deficit','Revenue Deficit','Total Expenditure','Revenue Expenditure','Capital Expenditure','Revenue Receipts']){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),match=clean.match(new RegExp(escaped+'\\s+([\\d,]+)(?:\\s*\\(([\\d.]+)\\))?\\s+([\\d,]+)(?:\\s*\\(([\\d.]+)\\))?\\s+([\\d,]+)(?:\\s*\\(([\\d.]+)\\))?\\s+([\\d,]+)(?:\\s*\\(([\\d.]+)\\))?','i'));if(match)rows[name]={actual:+match[1].replace(/,/g,''),actualRatio:match[2]?+match[2]:null,be:+match[3].replace(/,/g,''),beRatio:match[4]?+match[4]:null,re:+match[5].replace(/,/g,''),reRatio:match[6]?+match[6]:null,nextBe:+match[7].replace(/,/g,''),nextBeRatio:match[8]?+match[8]:null};}
  if(!rows['Fiscal Deficit'])throw new Error('Budget deficit row unavailable');return {columns:{actual:header[1]+'-'+header[2],budgetEstimate:header[3]+'-'+header[4],revisedEstimate:header[5]+'-'+header[6],nextBudgetEstimate:header[7]+'-'+header[8]},rows,source:meta};
}
function parseCgaSchedule(text,nowIso){
  if(!/Advance Release Calendar/i.test(text)||!/Central Government Operations/i.test(text)||!/All dates are expected dates of release and are subject to change/i.test(text))throw new Error('Invalid CGA calendar identity');
  const now=new Date(nowIso);if(Number.isNaN(now.valueOf()))throw new Error('Invalid schedule verification time');
  const row=String(text).match(/Central Government Operations\s*[|:]\s*([A-Za-z]+\s+20\d{2})\s*[|:]\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i);
  if(!row)return null;
  const referenceDate=new Date(row[1]+' 1 UTC'),releaseDate=new Date(row[2]+' UTC');
  if(Number.isNaN(referenceDate.valueOf())||Number.isNaN(releaseDate.valueOf()))throw new Error('Invalid CGA calendar date');
  const date=releaseDate.toISOString().slice(0,10);if(date<=nowIso.slice(0,10))return null;
  return {indicator:'Union Government monthly accounts',expectedDate:date,referencePeriod:MONTH_NAME[referenceDate.getUTCMonth()].replace(/^./,c=>c.toUpperCase())+' '+referenceDate.getUTCFullYear(),label:'Expected release',warning:'Expected dates may change',sourceUrl:URLS.cgaCalendar,sourcePublishedAt:null,verifiedAt:nowIso};
}
function validateRecord(record,classification){if(!record||record.estimateClass!==classification||record.unit!=='INR crore'||!finite(record.value)||record.value<0||!/^\d{4}-\d{2}$/.test(record.fiscalYear)||record.source.agency!=='Controller General of Accounts'||!officialCga(record.source.sourceUrl)||!(record.source.publicationDate===null||validDate(record.source.publicationDate))||!validTime(record.verifiedAt))throw new Error('Invalid fiscal record');}
function validateDataset(data,nowIso){
  if(!data||data.schemaVersion!=='1.0.0'||data.government.level!=='Union Government'||!/^\d{4}-\d{2}$/.test(data.fiscalYear)||!validTime(nowIso))throw new Error('Invalid fiscal dataset identity');
  const actuals=data.monthly&&data.monthly.actuals,budget=data.annual&&data.annual.budgetEstimates;if(!actuals||!budget||data.monthly.classification!=='unaudited provisional'||data.monthly.coverage!=='year-to-date'||data.monthly.cumulative!==true)throw new Error('Invalid monthly fiscal classification');
  Object.keys(LABELS).forEach(key=>{validateRecord(actuals[key],'unaudited-provisional-actual');validateRecord(budget[key],'budget-estimate');if(actuals[key].fiscalYear!==data.fiscalYear||budget[key].fiscalYear!==data.fiscalYear)throw new Error('Fiscal-year mismatch');});
  const c=data.calculations&&data.calculations.fiscalDeficitPercentOfBudgetEstimate;if(!c||c.numerator.value!==actuals.fiscalDeficit.value||c.denominator.value!==budget.fiscalDeficit.value||c.unit!=='percent'||Math.abs(c.unroundedResult-actuals.fiscalDeficit.value/budget.fiscalDeficit.value*100)>1e-9||c.displayedResult!==+c.unroundedResult.toFixed(1))throw new Error('Invalid percentage-of-BE calculation');
  if(data.annual.deficitToGdp&&data.annual.deficitToGdp.frequency==='monthly')throw new Error('Monthly deficit-to-GDP is prohibited');
  if(data.schedule){if(!officialCga(data.schedule.sourceUrl)||!validDate(data.schedule.expectedDate)||data.schedule.expectedDate<=nowIso.slice(0,10)||data.schedule.label!=='Expected release')throw new Error('Invalid or expired fiscal schedule');}
  return true;
}
function comparable(data){const c=clone(data);if(c){delete c.generatedAt;const scrub=r=>{if(r&&typeof r==='object'){delete r.verifiedAt;Object.values(r).forEach(scrub);}};scrub(c);}return c;}
function mergeStored(stored,outcomes,nowIso){
  const monthly=outcomes.monthly&&outcomes.monthly.ok?clone(outcomes.monthly.value):clone(stored);if(!monthly)throw new Error('No last-known-good fiscal data');
  if(outcomes.monthly&&outcomes.monthly.ok&&stored&&stored.monthly&&stored.monthly.actuals){const oldEnd=stored.monthly.actuals.fiscalDeficit.endDate,newEnd=monthly.monthly.actuals.fiscalDeficit.endDate;if(newEnd<oldEnd)throw new Error('Older fiscal response rejected');}
  if(outcomes.schedule&&outcomes.schedule.ok)monthly.schedule=clone(outcomes.schedule.value);else if(monthly.schedule&&monthly.schedule.expectedDate<=nowIso.slice(0,10))monthly.schedule=null;
  monthly.generatedAt=nowIso;validateDataset(monthly,nowIso);return {data:monthly,changed:JSON.stringify(comparable(monthly))!==JSON.stringify(comparable(stored)),failures:Object.entries(outcomes).filter(([,v])=>!v.ok).map(([source,v])=>({source,error:String(v.error||'unknown').slice(0,300)}))};
}
function macroItem(data){const a=data.monthly.actuals.fiscalDeficit,c=data.calculations.fiscalDeficitPercentOfBudgetEstimate;return {value:'₹'+(a.value/100000).toFixed(2)+' lakh crore',lines:['Fiscal deficit',c.displayedResult.toFixed(1)+'% of Budget Estimate',data.referencePeriod,'Provisional actual'],source:'Controller General of Accounts',updatedAt:a.source.publicationDate,status:'available'};}
async function fetchOutcomes(nowIso){
  const monthly=(async()=>{const home=await core.request(URLS.cgaHome,{accept:'text/html',maxBytes:2*1024*1024}),discovery=discoverLatestCga(home),response=await core.request(discovery.accountUrl,{accept:'text/html',maxBytes:512*1024,returnResponse:true});return parseCgaAccount(response.text,{sourceUrl:discovery.accountUrl,month:discovery.month,year:discovery.year,publicationDate:parseLastModified(response.headers),verifiedAt:nowIso});})();
  const schedule=core.request(URLS.cgaCalendar,{accept:'text/html',maxBytes:512*1024}).then(text=>parseCgaSchedule(tidy(text),nowIso));
  const settled=await Promise.allSettled([monthly,schedule]);return {monthly:settled[0].status==='fulfilled'?{ok:true,value:settled[0].value}:{ok:false,error:settled[0].reason.message},schedule:settled[1].status==='fulfilled'?{ok:true,value:settled[1].value}:{ok:false,error:settled[1].reason.message}};
}
module.exports={URLS,LABELS,strictMoney,discoverLatestCga,parseCgaAccount,parseBudgetText,parseCgaSchedule,validateDataset,mergeStored,macroItem,fetchOutcomes,comparable};
