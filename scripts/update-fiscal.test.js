#!/usr/bin/env node
'use strict';
const assert=require('assert'),f=require('./fiscal-automation');
const NOW='2026-11-20T05:00:00.000Z',URL='https://cga.nic.in/writereaddata/MonthAccount/92026/DATA2627.htm';
const values={1:[3533150,1756820],2:[2866922,1276088],4:[118397,78602],7:[3651547,1835422],8:[4125494,1895288],10:[1221821,654547],12:[5347315,2549835],13:[1695768,714413],14:[592344,138468]};
const names={1:'Revenue Receipts',2:'Tax Revenue (Net)',4:'Non-Debt Capital Receipts',7:'Total Receipts (1+4)',8:'Revenue Expenditure',10:'Capital Expenditure',12:'Total Expenditure (8+10)',13:'Fiscal Deficit (12-7)',14:'Revenue Deficit (8-1)'};
function html(change){const rows=Object.keys(values).map(n=>`<tr><td>${n}</td><td>${names[n]}</td><td>${values[n][0]}</td><td>${values[n][1]}</td></tr>`).join('');return (`<h1>GOVERNMENT OF INDIA UNION GOVERNMENT ACCOUNTS AT A GLANCE AS AT THE END OF SEPTEMBER 2026</h1><p>(Rs. in Crore)</p><p>Budget Estimates 2026-2027 Actuals@ up to September 2026</p><table>${rows}</table><p>Financial Year runs from "April to March" Actuals are unaudited provisional figures.</p>`).replace(change&&change[0]||'__none__',change&&change[1]||'');}
const meta={sourceUrl:URL,month:9,year:2026,publicationDate:'2026-10-30',verifiedAt:NOW};
function parsed(h=html()){return f.parseCgaAccount(h,meta)}
function outcome(data){return{monthly:{ok:true,value:data},schedule:{ok:true,value:null}}}
const tests=[];function test(name,fn){tests.push({name,fn})}
test('1 valid latest CGA monthly account',()=>assert.strictEqual(parsed().monthly.actuals.fiscalDeficit.value,714413));
test('2 valid current BE',()=>assert.strictEqual(parsed().annual.budgetEstimates.fiscalDeficit.value,1695768));
const budget='Budget at a Glance 2024-25 Actuals 2025-26 Budget Estimates 2025-26 Revised Estimates 2026-27 Budget Estimates Fiscal Deficit 1,574,431 (4.8) 1,568,936 (4.4) 1,558,492 (4.4) 1,695,768 (4.3)';
test('3 valid RE',()=>assert.strictEqual(f.parseBudgetText(budget,{sourceUrl:'https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag1.pdf'}).rows['Fiscal Deficit'].re,1558492));
test('4 missing RE fails closed',()=>assert.throws(()=>f.parseBudgetText(budget.replace('2025-26 Revised Estimates',''),{sourceUrl:'https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag1.pdf'})));
test('5 reordered Budget columns fail closed',()=>assert.throws(()=>f.parseBudgetText(budget.replace('2025-26 Budget Estimates 2025-26 Revised Estimates','2025-26 Revised Estimates 2025-26 Budget Estimates'),{sourceUrl:'https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag1.pdf'})));
test('6 invalid Budget identity',()=>assert.throws(()=>f.parseBudgetText('unofficial table',{sourceUrl:'https://www.indiabudget.gov.in/doc/x.pdf'})));
test('7 blank null malformed monetary values',()=>{assert.strictEqual(f.strictMoney(''),null);assert.strictEqual(f.strictMoney(null),null);assert.strictEqual(f.strictMoney('n/a'),null)});
test('8 explicit official zero',()=>assert.strictEqual(f.strictMoney('0.00'),0));
test('9 incorrect unit',()=>assert.throws(()=>parsed(html(['Rs. in Crore','Rs. in million']))));
test('10 duplicate row',()=>assert.throws(()=>parsed(html().replace('</table>',`<tr><td>13</td><td>${names[13]}</td><td>1</td><td>1</td></tr></table>`))));
test('11 ambiguous period',()=>assert.throws(()=>f.parseCgaAccount(html().replace('SEPTEMBER 2026','AUGUST 2026'),meta)));
test('12 missing provisional classification',()=>assert.throws(()=>parsed(html(['Actuals are unaudited provisional figures.','']))));
test('13 invalid fiscal year',()=>assert.throws(()=>parsed(html(['2026-2027','2025-2026']))));
test('14 non-cumulative observation',()=>assert.throws(()=>parsed(html(['Actuals@ up to','Actuals for']))));
test('15 older response rejected',()=>{const stored=parsed(),older=JSON.parse(JSON.stringify(stored));older.monthly.actuals.fiscalDeficit.endDate='2026-08-31';assert.throws(()=>f.mergeStored(stored,outcome(older),NOW),/Older/)});
test('16 receipts reconciliation failure',()=>assert.throws(()=>parsed(html(['1835422','1835421'])),/Receipts/));
test('17 expenditure reconciliation failure',()=>assert.throws(()=>parsed(html(['2549835','2549834'])),/Expenditure/));
test('18 fiscal-deficit reconciliation failure',()=>assert.throws(()=>parsed(html(['714413','714412'])),/Fiscal-deficit/));
test('19 revenue-deficit reconciliation failure',()=>assert.throws(()=>parsed(html(['138468','138467'])),/Revenue-deficit/));
test('20 net tax cannot become gross tax',()=>assert.throws(()=>parsed(html(['Tax Revenue (Net)','Gross Tax Revenue'])),/Ambiguous/));
test('21 Union Government cannot become general government',()=>assert.throws(()=>parsed(html(['UNION GOVERNMENT','GENERAL GOVERNMENT']))));
test('22 BE cannot become monthly actual',()=>{const d=parsed();d.monthly.actuals.fiscalDeficit.estimateClass='budget-estimate';assert.throws(()=>f.validateDataset(d,NOW))});
test('23 RE cannot become BE',()=>{const d=parsed();d.annual.budgetEstimates.fiscalDeficit.estimateClass='revised-estimate';assert.throws(()=>f.validateDataset(d,NOW))});
test('24 percentage-of-BE formula and provenance',()=>{const d=parsed(),c=d.calculations.fiscalDeficitPercentOfBudgetEstimate;assert.strictEqual(c.displayedResult,42.1);assert.strictEqual(c.numerator.source.sourceUrl,URL);assert.strictEqual(c.denominator.source.sourceUrl,URL)});
test('25 monthly deficit-to-GDP rejected',()=>{const d=parsed();d.annual.deficitToGdp={frequency:'monthly'};assert.throws(()=>f.validateDataset(d,NOW),/Monthly deficit/)});
const calendar='Advance Release Calendar Central Government Operations | October 2026 | 30 November 2026 All dates are expected dates of release and are subject to change';
test('26 valid expected release',()=>assert.strictEqual(f.parseCgaSchedule(calendar,'2026-11-20T05:00:00Z').expectedDate,'2026-11-30'));
test('27 expired expected release removed',()=>assert.strictEqual(f.parseCgaSchedule(calendar,'2026-11-30T12:00:00Z'),null));
test('28 missing schedule',()=>assert.throws(()=>f.parseCgaSchedule('missing',NOW)));
test('29 invalid CGA URL',()=>assert.throws(()=>f.parseCgaAccount(html(),Object.assign({},meta,{sourceUrl:'https://example.com/x'}))));
test('30 CGA failure Budget success retains monthly',()=>{const d=parsed(),r=f.mergeStored(d,{monthly:{ok:false,error:'cga'},budget:{ok:true,value:{}},schedule:{ok:true,value:null}},NOW);assert.strictEqual(r.data.monthly.actuals.fiscalDeficit.value,714413)});
test('31 Budget failure CGA success',()=>assert.strictEqual(f.mergeStored(null,Object.assign(outcome(parsed()),{budget:{ok:false,error:'budget'}}),NOW).data.fiscalYear,'2026-27'));
test('32 schedule failure other sections succeed',()=>assert.strictEqual(f.mergeStored(null,{monthly:{ok:true,value:parsed()},schedule:{ok:false,error:'calendar'}},NOW).data.schedule,null));
test('33 last-known-good retention',()=>assert.strictEqual(f.mergeStored(parsed(),{monthly:{ok:false,error:'timeout'},schedule:{ok:false,error:'timeout'}},NOW).data.monthly.actuals.fiscalDeficit.value,714413));
test('34 global validation prevents invalid merge',()=>{const d=parsed();d.monthly.actuals.fiscalDeficit.unit='bad';assert.throws(()=>f.mergeStored(null,outcome(d),NOW))});
test('35 unchanged official run no JSON change',()=>{const d=parsed();assert.strictEqual(f.mergeStored(d,outcome(parsed()),NOW).changed,false)});
test('36 fiscal card valid state',()=>assert.strictEqual(f.macroItem(parsed()).status,'available'));
test('37 fiscal independent unavailable represented by caller',()=>assert.strictEqual(f.macroItem(parsed()).source,'Controller General of Accounts'));
test('38 complete fiscal failure without stored data',()=>assert.throws(()=>f.mergeStored(null,{monthly:{ok:false,error:'down'},schedule:{ok:false,error:'down'}},NOW)));
test('39 other macro cards unaffected',()=>{const macro={repo:{value:'5.50%'},fiscal:{value:null}},before=JSON.stringify(macro.repo);macro.fiscal=f.macroItem(parsed());assert.strictEqual(JSON.stringify(macro.repo),before)});
(async()=>{let failed=0;for(const t of tests){try{await t.fn();console.log('PASS',t.name)}catch(e){failed++;console.error('FAIL',t.name,'-',e.message)}}console.log((tests.length-failed)+'/'+tests.length+' fiscal tests passed');if(failed)process.exitCode=1})();
