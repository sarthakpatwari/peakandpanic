const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateParts(value: string | number | Date) {
  if (typeof value === "string") {
    const match = value.match(DATE_ONLY);
    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function displayDate(value?: string | number | Date | null, fallback = "Date unavailable") {
  if (value === undefined || value === null || value === "") return fallback;
  const date = dateParts(value);
  if (!date) return fallback;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function displayTimestamp(value?: string | number | Date | null, fallback = "Time unavailable") {
  if (value === undefined || value === null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  const hour24 = ist.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const minute = String(ist.getUTCMinutes()).padStart(2, "0");
  const period = hour24 >= 12 ? "pm" : "am";
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}, ${hour12}:${minute} ${period} IST`;
}
