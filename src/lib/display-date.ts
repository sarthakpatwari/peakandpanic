const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

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
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function displayTimestamp(value?: string | number | Date | null, fallback = "Time unavailable") {
  if (value === undefined || value === null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${read("day")} ${read("month")} ${read("year")}, ${read("hour")}:${read("minute")} ${read("dayPeriod").toLowerCase()} IST`;
}
