"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  number, parseWssBank, parseWssM3, parseLiquidity, validateObservation,
  history, buildBanking, mergeDataset, atomicWrite,
} = require("./sector-automation");

const rbi = "https://www.rbi.org.in/Scripts/WSSView.aspx?Id=1";
const bankHtml = (credit = "23111541", deposit = "28046926", creditGrowth = "19.3", depositGrowth = "16.4") => `
Date : Nov 27, 2026 Scheduled Commercial Banks - Business in India (₹ Crore)
Outstanding as on Nov. 15, 2026
2.1 Aggregate Deposits ${deposit} -1 2 3 4 5 2.1a Growth (Per cent) -0.7 6.7 6.9 10.2 ${depositGrowth} 2.1.1 Demand
7 Bank Credit ${credit} -1 2 3 4 5 7.1a Growth (Per cent) -0.3 6.2 8.2 11.6 ${creditGrowth} 7a.1 Food Credit`;
const m3Html = (growth = "16.2") => `Date : Nov 27, 2026 Money Stock: Components and Sources (₹ Crore) Outstanding as on 2026 Mar. 31 Nov. 15 Amount % M3 31453126 33644451 -123965 -0.4 1658727 6.1 2191325 7.0 2582882 9.8 4699134 ${growth} 1 Components`;
const liquidityHtml = (value = "47,641.20") => `Date: 27 Nov 2026 Money Market Operations as on November 26, 2026 Net liquidity injected (outstanding including today's operations) [injection (+)/absorption (-)]* ${value}`;

test("parses official bank growth and same-date credit–deposit ratio", () => {
  const row = parseWssBank(bankHtml(), rbi);
  assert.equal(row.bankCreditGrowth, 19.3);
  assert.equal(row.depositGrowth, 16.4);
  assert.equal(row.creditDepositRatio, 23111541 / 28046926 * 100);
});

test("does not reinterpret the sequential variation as annual growth", () => {
  const row = parseWssBank(bankHtml("23111541", "28046926", "19.3", "16.4"), rbi);
  assert.notEqual(row.bankCreditGrowth, -0.3);
  assert.notEqual(row.depositGrowth, -0.7);
});

test("parses M3 year-on-year growth and liquidity sign convention", () => {
  assert.equal(parseWssM3(m3Html(), rbi).growth, 16.2);
  assert.equal(parseLiquidity(liquidityHtml("-54,474.74"), rbi).value, -54474.74);
});

test("blank, null and malformed numbers fail while an explicit zero passes", () => {
  for (const value of ["", " ", null, undefined, "not-a-number"]) assert.throws(() => number(value, "field"));
  assert.equal(number("0.00", "field"), 0);
});

test("invalid unit and unofficial source are rejected", () => {
  const base = { value: 1, unit: "percent", frequency: "Fortnightly", classification: "actual", reportingPeriod: "2026-11-15", publicationDate: "2026-11-27", sourceUrl: rbi };
  assert.throws(() => validateObservation({ ...base, unit: "ratio" }, { unit: "percent", frequency: "Fortnightly", classification: "actual" }));
  assert.throws(() => validateObservation({ ...base, sourceUrl: "https://example.com" }, { unit: "percent", frequency: "Fortnightly", classification: "actual" }));
});

test("mismatched institutional coverage and source units fail closed", () => {
  assert.throws(() => parseWssBank(bankHtml().replace("Scheduled Commercial Banks - Business in India", "Co-operative Banks"), rbi));
  assert.throws(() => parseWssBank(bankHtml().replace("₹ Crore", "₹ lakh"), rbi));
});

test("history is chronological and identical duplicate periods are collapsed", () => {
  const one = { reportingPeriod: "2026-11-15", publicationDate: "2026-11-20", value: 2, sourceUrl: rbi };
  const newerCopy = { ...one, publicationDate: "2026-11-27", sourceUrl: `${rbi}2` };
  const earlier = { reportingPeriod: "2026-11-01", publicationDate: "2026-11-06", value: 1, sourceUrl: rbi };
  assert.deepEqual(history([one, earlier, newerCopy]).map((item) => item.reportingPeriod), ["2026-11-01", "2026-11-15"]);
  assert.throws(() => history([one, { ...one, value: 3 }]));
});

test("mismatched reporting dates cannot produce a cross-source ratio", () => {
  const bank = parseWssBank(bankHtml(), rbi);
  const mismatched = { ...bank, reportingPeriod: "2026-11-14" };
  assert.notEqual(bank.reportingPeriod, mismatched.reportingPeriod);
});

test("complete source failure retains stored live data", () => {
  const old = { status: "partially-live", liveSectors: { "banking-credit-liquidity": { id: "banking-credit-liquidity", status: "live", indicators: { bankCreditGrowth: { current: { reportingPeriod: "2026-11-15", value: 19.3 } } } } } };
  assert.equal(old.liveSectors["banking-credit-liquidity"].indicators.bankCreditGrowth.current.value, 19.3);
  assert.throws(() => buildBanking([], [], null, "2026-11-28T00:00:00.000Z"));
});

test("one source failure is isolated and another source can still update", () => {
  const m3 = parseWssM3(m3Html("17.1"), rbi);
  const candidate = buildBanking([], [m3], null, "new");
  assert.deepEqual(Object.keys(candidate.indicators), ["m3Growth"]);
  assert.equal(candidate.indicators.m3Growth.current.value, 17.1);
});

test("older observations and one-indicator omission retain last-known-good values", () => {
  const oldIndicator = { current: { reportingPeriod: "2026-11-15", value: 19.3, verifiedAt: "old" }, history: [] };
  const existing = { status: "partially-live", updatedAt: "old", liveSectors: { "banking-credit-liquidity": { id: "banking-credit-liquidity", status: "live", indicators: { bankCreditGrowth: oldIndicator, systemLiquidity: { current: { reportingPeriod: "2026-11-26", value: 1, verifiedAt: "old" }, history: [] } } } } };
  const candidate = { id: "banking-credit-liquidity", status: "partial", indicators: { bankCreditGrowth: { current: { reportingPeriod: "2026-11-01", value: 10, verifiedAt: "new" }, history: [] } } };
  const merged = mergeDataset(existing, candidate, "new").dataset.liveSectors["banking-credit-liquidity"].indicators;
  assert.equal(merged.bankCreditGrowth.current.value, 19.3);
  assert.equal(merged.systemLiquidity.current.value, 1);
});

test("an unchanged second candidate creates no timestamp churn", () => {
  const bank = parseWssBank(bankHtml(), rbi);
  const m3 = parseWssM3(m3Html(), rbi);
  const first = buildBanking([bank], [m3], parseLiquidity(liquidityHtml(), rbi), "first");
  const existing = { schemaVersion: 1, status: "partially-live", updatedAt: "first", liveSectors: { [first.id]: first } };
  const second = buildBanking([bank], [m3], parseLiquidity(liquidityHtml(), rbi), "second");
  const result = mergeDataset(existing, second, "second");
  assert.equal(result.changed, false);
  assert.equal(result.dataset.updatedAt, "first");
});

test("atomic write failure leaves the destination untouched", () => {
  const calls = [];
  const fakeFs = { writeFileSync: (file) => calls.push(file), renameSync: () => { throw new Error("rename failed"); } };
  assert.throws(() => atomicWrite("sector-data.json", { ok: true }, fakeFs));
  assert.equal(calls.length, 1);
});

