"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RBI_ORIGIN = "https://www.rbi.org.in";
const BANK_SECTION = `${RBI_ORIGIN}/Scripts/WSSViewDetail.aspx?PARAM1=3&TYPE=Section`;
const M3_SECTION = `${RBI_ORIGIN}/Scripts/WSSViewDetail.aspx?PARAM1=7&TYPE=Section`;
const LIQUIDITY_URL = `${RBI_ORIGIN}/scriptS/BS_ViewMMO.aspx`;
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 4_500_000;

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8377;|&#8377;/gi, "₹")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&minus;|&#8722;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function number(value, label) {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error(`${label} is blank`);
  }
  const parsed = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not finite`);
  return parsed;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function isoDate(value) {
  const match = String(value).trim().match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) throw new Error(`Invalid RBI date: ${value}`);
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (!month) throw new Error(`Invalid RBI month: ${value}`);
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
}

function parseWssBank(html, sourceUrl) {
  const text = cleanHtml(html);
  if (!/Scheduled Commercial Banks\s*-\s*Business in India/i.test(text)) throw new Error("RBI scheduled-bank institutional coverage mismatch");
  if (!/\(₹ Crore\)/i.test(text)) throw new Error("RBI scheduled-bank unit mismatch");
  const publication = text.match(/Date\s*:\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  const period = text.match(/Outstanding as on\s+([A-Za-z]+\.?\s+\d{1,2},\s*\d{4})/i);
  const deposits = text.match(/2\.1 Aggregate Deposits\s+([\d,]+)[\s\S]*?2\.1a Growth \(Per cent\)\s+([\d.,+\-\s]+?)\s+2\.1\.1/i);
  const credit = text.match(/7 Bank Credit\s+([\d,]+)[\s\S]*?7\.1a Growth \(Per cent\)\s+([\d.,+\-\s]+?)\s+7a\.1/i);
  if (!publication || !period || !deposits || !credit) throw new Error("RBI scheduled-bank labels are missing");
  const last = (values, label) => {
    const parts = values.trim().split(/\s+/);
    return number(parts.at(-1), label);
  };
  const reportingPeriod = isoDate(period[1]);
  const publicationDate = isoDate(publication[1]);
  const aggregateDeposits = number(deposits[1], "aggregate deposits");
  const bankCredit = number(credit[1], "bank credit");
  const depositGrowth = last(deposits[2], "deposit YoY growth");
  const bankCreditGrowth = last(credit[2], "bank-credit YoY growth");
  return {
    reportingPeriod,
    publicationDate,
    aggregateDeposits,
    bankCredit,
    depositGrowth,
    bankCreditGrowth,
    creditDepositRatio: bankCredit / aggregateDeposits * 100,
    sourceUrl,
  };
}

function parseWssM3(html, sourceUrl) {
  const text = cleanHtml(html);
  if (!/Money Stock:\s*Components and Sources/i.test(text)) throw new Error("RBI M3 series identity mismatch");
  if (!/\(₹ Crore\)/i.test(text)) throw new Error("RBI M3 unit mismatch");
  const publication = text.match(/Date\s*:\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  const period = text.match(/Outstanding as on[\s\S]*?([A-Za-z]+\.?\s+\d{1,2})\s+Amount/i);
  const year = publication?.[1]?.match(/\d{4}/)?.[0];
  const m3 = text.match(/\bM3\s+([\d,]+)\s+([\d,]+)\s+([\d.,+\-\s]+?)\s+1 Components/i);
  if (!publication || !period || !year || !m3) throw new Error("RBI M3 labels are missing");
  const parts = m3[3].trim().split(/\s+/);
  return {
    reportingPeriod: isoDate(`${period[1]}, ${year}`),
    publicationDate: isoDate(publication[1]),
    level: number(m3[2], "M3 level"),
    growth: number(parts.at(-1), "M3 YoY growth"),
    sourceUrl,
  };
}

function parseLiquidity(html, sourceUrl) {
  const text = cleanHtml(html);
  const publication = text.match(/Date\s*:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  const period = text.match(/Money Market Operations as on\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  const net = text.match(/Net liquidity injected \(outstanding including today'?s operations\) \[injection \(\+\)\/absorption \(-\)\]\*\s+([\d,.-]+)/i);
  if (!publication || !period || !net) throw new Error("RBI net-liquidity label is missing");
  return {
    reportingPeriod: isoDate(period[1]),
    publicationDate: isoDate(publication[1].replace(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/, "$2 $1, $3")),
    value: number(net[1], "net liquidity"),
    sourceUrl,
  };
}

function validateObservation(item, { unit, classification, frequency }) {
  if (!item || typeof item !== "object") throw new Error("Observation missing");
  number(item.value, "observation value");
  if (item.unit !== unit || item.classification !== classification || item.frequency !== frequency) throw new Error("Observation metadata mismatch");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.reportingPeriod) || !/^\d{4}-\d{2}-\d{2}$/.test(item.publicationDate)) throw new Error("Observation date invalid");
  const url = new URL(item.sourceUrl);
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "www.rbi.org.in") throw new Error("Source is not official RBI HTTPS");
  return item;
}

function history(items) {
  const byPeriod = new Map();
  for (const item of items) {
    const existing = byPeriod.get(item.reportingPeriod);
    if (existing && stableComparable({ ...existing, publicationDate: undefined, sourceUrl: undefined }) !== stableComparable({ ...item, publicationDate: undefined, sourceUrl: undefined })) {
      throw new Error("Conflicting duplicate reporting period");
    }
    if (!existing || item.publicationDate > existing.publicationDate) byPeriod.set(item.reportingPeriod, item);
  }
  const sorted = [...byPeriod.values()].sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));
  return sorted.slice(-12);
}

function buildBanking(bankRows, m3Rows, liquidityRow, verifiedAt) {
  if (!bankRows.length && !m3Rows.length && !liquidityRow) throw new Error("All RBI banking sources unavailable");
  const bank = bankRows.length ? history(bankRows) : [];
  const m3 = m3Rows.length ? history(m3Rows) : [];
  const mapBank = (key, name, classification = "actual") => ({
    name,
    unit: "percent",
    frequency: "Fortnightly",
    comparisonBasis: key === "creditDepositRatio" ? "Same-date bank credit ÷ aggregate deposits × 100" : "Year-on-year",
    classification,
    sourceName: "Reserve Bank of India — Weekly Statistical Supplement",
    current: validateObservation({ value: bank.at(-1)[key], unit: "percent", frequency: "Fortnightly", classification, reportingPeriod: bank.at(-1).reportingPeriod, publicationDate: bank.at(-1).publicationDate, verifiedAt, sourceUrl: bank.at(-1).sourceUrl }, { unit: "percent", classification, frequency: "Fortnightly" }),
    history: bank.map((row) => ({ value: row[key], reportingPeriod: row.reportingPeriod, publicationDate: row.publicationDate, sourceUrl: row.sourceUrl })),
  });
  const indicators = {};
  if (bank.length) {
    indicators.bankCreditGrowth = mapBank("bankCreditGrowth", "Bank credit growth");
    indicators.depositGrowth = mapBank("depositGrowth", "Deposit growth");
    indicators.creditDepositRatio = mapBank("creditDepositRatio", "Credit–deposit ratio", "derived");
  }
  if (m3.length) {
    indicators.m3Growth = {
      name: "M3 money-supply growth", unit: "percent", frequency: "Fortnightly", comparisonBasis: "Year-on-year", classification: "actual",
      sourceName: "Reserve Bank of India — Weekly Statistical Supplement",
      current: validateObservation({ value: m3.at(-1).growth, unit: "percent", frequency: "Fortnightly", classification: "actual", reportingPeriod: m3.at(-1).reportingPeriod, publicationDate: m3.at(-1).publicationDate, verifiedAt, sourceUrl: m3.at(-1).sourceUrl }, { unit: "percent", classification: "actual", frequency: "Fortnightly" }),
      history: m3.map((row) => ({ value: row.growth, reportingPeriod: row.reportingPeriod, publicationDate: row.publicationDate, sourceUrl: row.sourceUrl })),
    };
  }
  if (liquidityRow) {
    indicators.systemLiquidity = {
      name: "System liquidity", unit: "₹ crore", frequency: "Daily", comparisonBasis: "Net RBI liquidity injected; positive is injection, negative is absorption", classification: "actual",
      sourceName: "Reserve Bank of India — Money Market Operations",
      current: validateObservation({ value: liquidityRow.value, unit: "₹ crore", frequency: "Daily", classification: "actual", reportingPeriod: liquidityRow.reportingPeriod, publicationDate: liquidityRow.publicationDate, verifiedAt, sourceUrl: liquidityRow.sourceUrl }, { unit: "₹ crore", classification: "actual", frequency: "Daily" }),
      history: [{ value: liquidityRow.value, reportingPeriod: liquidityRow.reportingPeriod, publicationDate: liquidityRow.publicationDate, sourceUrl: liquidityRow.sourceUrl }],
    };
  }
  return { id: "banking-credit-liquidity", status: Object.keys(indicators).length === 5 ? "live" : "partial", indicators };
}

async function fetchText(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "PeakAndPanicData/1.0" } });
  if (!response.ok) throw new Error(`RBI request failed (${response.status})`);
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_BYTES) throw new Error("RBI response exceeded size limit");
  return text;
}

function archiveUrls(html, limit = 24) {
  return [...new Set([...html.matchAll(/WSSView\.aspx\?Id=(\d+)/gi)].map((match) => `${RBI_ORIGIN}/Scripts/WSSView.aspx?Id=${match[1]}`))].slice(0, limit);
}

async function collect(fetchImpl = fetch) {
  const [bankIndex, m3Index] = await Promise.all([fetchText(BANK_SECTION, fetchImpl), fetchText(M3_SECTION, fetchImpl)]);
  const bankUrls = archiveUrls(bankIndex);
  const m3Urls = archiveUrls(m3Index);
  if (!bankUrls.length || !m3Urls.length) throw new Error("RBI WSS archive links unavailable");
  const settledBank = await Promise.allSettled(bankUrls.map(async (url) => parseWssBank(await fetchText(url, fetchImpl), url)));
  const settledM3 = await Promise.allSettled(m3Urls.map(async (url) => parseWssM3(await fetchText(url, fetchImpl), url)));
  let liquidity = null;
  try { liquidity = parseLiquidity(await fetchText(LIQUIDITY_URL, fetchImpl), LIQUIDITY_URL); } catch { /* independently unavailable */ }
  return {
    bank: settledBank.filter((r) => r.status === "fulfilled").map((r) => r.value),
    m3: settledM3.filter((r) => r.status === "fulfilled").map((r) => r.value),
    liquidity,
  };
}

function stableComparable(value) {
  return JSON.stringify(value, (key, item) => key === "verifiedAt" || key === "updatedAt" ? undefined : item);
}

function mergeDataset(existing, candidate, verifiedAt) {
  const previous = existing.liveSectors?.[candidate.id];
  const merged = JSON.parse(JSON.stringify(candidate));
  for (const [key, oldIndicator] of Object.entries(previous?.indicators || {})) {
    const next = merged.indicators[key];
    if (!next || next.current.reportingPeriod < oldIndicator.current.reportingPeriod) merged.indicators[key] = oldIndicator;
    else if (stableComparable(next) === stableComparable(oldIndicator)) merged.indicators[key] = oldIndicator;
  }
  const nextDataset = { ...existing, status: "partially-live", liveSectors: { ...(existing.liveSectors || {}), [candidate.id]: merged } };
  const changed = stableComparable(nextDataset) !== stableComparable(existing);
  if (changed) {
    nextDataset.updatedAt = verifiedAt;
    for (const indicator of Object.values(merged.indicators)) {
      if (!indicator.current.verifiedAt) indicator.current.verifiedAt = verifiedAt;
    }
  }
  return { dataset: nextDataset, changed };
}

function atomicWrite(file, data, fsImpl = fs) {
  const temporary = `${file}.tmp-${process.pid}`;
  fsImpl.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fsImpl.renameSync(temporary, file);
}

module.exports = { cleanHtml, number, isoDate, parseWssBank, parseWssM3, parseLiquidity, validateObservation, history, buildBanking, archiveUrls, collect, mergeDataset, atomicWrite, stableComparable };

