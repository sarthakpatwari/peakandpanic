#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const automation = require('./rbi-automation');

const RBI_FILE = process.env.RBI_DATA_FILE || path.join(__dirname, '..', 'rbi-data.json');
const MACRO_FILE = process.env.MACRO_DATA_FILE || path.join(__dirname, '..', 'macro-data.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error('stored-data/read: ' + path.basename(file) + ': ' + error.message); }
}

async function main(options) {
  const now = options && options.now || new Date().toISOString();
  const stored = readJson(RBI_FILE);
  const macro = readJson(MACRO_FILE);
  let outcomes;
  try {
    if(options&&options.outcomes)outcomes=options.outcomes;
    else if(options&&options.sources)outcomes={policy:{ok:true,value:{currentRate:options.sources.currentRate,resolution:options.sources.resolution}},schedule:{ok:true,value:options.sources.schedule},gdp:{ok:true,value:options.sources.gdp},cpi:{ok:true,value:options.sources.cpi}};
    else outcomes=await automation.fetchSourceOutcomes(now);
  } catch (error) {
    throw new Error('official-sources/request-or-parse: ' + error.message + '; last-known-good retained');
  }

  let result, nextMacro;
  try {
    result = automation.buildMergedCandidate(stored, outcomes, now);
    nextMacro = automation.macroFromCandidate(macro, result.data);
    automation.validateDataset(result.data, now);
  } catch (error) {
    throw new Error('candidate/validation: ' + error.message + '; last-known-good retained');
  }

  const rbiText = JSON.stringify(result.data, null, 2) + '\n';
  const macroText = JSON.stringify(nextMacro, null, 2) + '\n';
  const rbiChanged = rbiText !== fs.readFileSync(RBI_FILE, 'utf8');
  const macroChanged = macroText !== fs.readFileSync(MACRO_FILE, 'utf8');
  if (options && options.dryRun) {
    console.log('DRY RUN: rbi-data.json ' + (rbiChanged ? 'would change' : 'unchanged') + '; macro-data.json ' + (macroChanged ? 'would change' : 'unchanged'));
    return { rbiChanged, macroChanged, data: result.data, macro: nextMacro, failures:sourceFailures(outcomes) };
  }
  const written = automation.atomicWriteMany([
    { file:RBI_FILE, content:rbiText, changed:rbiChanged },
    { file:MACRO_FILE, content:macroText, changed:macroChanged }
  ]);
  console.log(written ? 'Updated validated RBI/MoSPI data atomically per file.' : 'No source changes; generated files unchanged.');
  return { rbiChanged, macroChanged, data: result.data, macro: nextMacro, failures:sourceFailures(outcomes) };
}

function sourceFailures(outcomes){return Object.entries(outcomes).filter(([,result])=>!result.ok).map(([source,result])=>({source,stage:'request-or-parse',error:String(result.error||'unknown error').replace(/[\r\n]+/g,' ').slice(0,300),lastKnownGoodRetained:true}));}
function emitWorkflowOutputs(failures){
  if(!process.env.GITHUB_OUTPUT)return;
  const summary=failures.length?failures.map(f=>f.source+'/'+f.stage+': '+f.error+'; last-known-good retained').join(' | '):'none';
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'automation_failed='+(failures.length?'true':'false')+'\n'+'failure_summary='+summary.replace(/[%\r\n]/g,' ')+'\n');
}

if (require.main === module) {
  main({ dryRun: process.argv.includes('--dry-run') }).then(result=>{
    emitWorkflowOutputs(result.failures);
    if(result.failures.length){console.error('UPDATE FAILURE SUMMARY');result.failures.forEach(f=>console.error('- '+f.source+'/'+f.stage+': '+f.error+'; last-known-good retained: yes'));process.exitCode=1;}
  }).catch(error => {
    emitWorkflowOutputs([{source:'global',stage:'validation-or-write',error:error.message,lastKnownGoodRetained:true}]);
    console.error('UPDATE FAILURE SUMMARY');
    console.error('- failing source/stage: ' + error.message.split(':').slice(0, 2).join(':'));
    console.error('- error: ' + error.message);
    console.error('- last-known-good data retained: yes');
    process.exitCode = 1;
  });
}

module.exports = { main, sourceFailures };
