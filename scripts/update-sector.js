"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { collect, buildBanking, mergeDataset, atomicWrite } = require("./sector-automation");

async function main() {
  const file = path.join(__dirname, "..", "sector-data.json");
  const existing = JSON.parse(fs.readFileSync(file, "utf8"));
  const verifiedAt = new Date().toISOString();
  const sources = await collect();
  const candidate = buildBanking(sources.bank, sources.m3, sources.liquidity, verifiedAt);
  const result = mergeDataset(existing, candidate, verifiedAt);
  if (!result.changed) {
    console.log("sector-data.json unchanged");
    return;
  }
  atomicWrite(file, result.dataset);
  console.log("sector-data.json updated from official RBI sources");
}

main().catch((error) => {
  console.error(`Sector update failed: ${error.message}`);
  process.exitCode = 1;
});

