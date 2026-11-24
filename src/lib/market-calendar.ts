export interface SessionState { state: "open" | "closed" | "unknown"; reason: string }
const HOLIDAYS = {
  US: { 2026: ["2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25","2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25"] },
  IN: { 2026: ["2026-01-15","2026-01-26","2026-03-03","2026-03-26","2026-03-31","2026-04-03","2026-04-14","2026-05-01","2026-05-28","2026-06-26","2026-09-14","2026-10-02","2026-10-20","2026-11-10","2026-11-24","2026-12-25"] },
} as const;
const EARLY_CLOSES: Record<string, string> = { "2026-11-27": "13:00", "2026-12-24": "13:00" };
const SPECIAL_IN: Record<string, { open: string | null; close: string | null }> = {
  "2026-02-01": { open: "09:15", close: "15:00" }, "2026-11-08": { open: null, close: null },
};

export function getSessionState(exchange: "US" | "IN", date = new Date()): SessionState {
  const timeZone = exchange === "US" ? "America/New_York" : "Asia/Kolkata";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(date).map((part) => [part.type, part.value]));
  const ymd = `${parts.year}-${parts.month}-${parts.day}`; const year = Number(parts.year); const time = `${parts.hour}:${parts.minute}`;
  const calendar = HOLIDAYS[exchange] as Record<number, readonly string[]>;
  if (!calendar[year]) return { state: "unknown", reason: "no_calendar_for_year" };
  const special = exchange === "IN" ? SPECIAL_IN[ymd] : undefined;
  let open = exchange === "US" ? "09:30" : "09:15"; let close = exchange === "US" ? "16:00" : "15:30";
  if (special) {
    if (!special.open || !special.close) return { state: "unknown", reason: "special_session_untimed" };
    open = special.open; close = special.close;
  } else {
    if (parts.weekday === "Sat" || parts.weekday === "Sun") return { state: "closed", reason: "weekend" };
    if (calendar[year].includes(ymd)) return { state: "closed", reason: "holiday" };
    if (exchange === "US" && EARLY_CLOSES[ymd]) close = EARLY_CLOSES[ymd];
  }
  return time >= open && time < close ? { state: "open", reason: "regular_session" } : { state: "closed", reason: time < open ? "before_open" : "after_close" };
}
