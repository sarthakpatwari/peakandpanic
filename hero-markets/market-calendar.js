/*!
 * Peak & Panic – exchange session calendar.
 * Works in Node (require) and in the browser (window.PPCalendar).
 *
 * Answers one question honestly: is this exchange in its REGULAR trading session right now?
 *   'open'    – inside regular hours on a normal trading day
 *   'closed'  – weekend, holiday, or outside regular hours
 *   'unknown' – we do not have a verified calendar for that date. We never guess.
 *
 * Times are evaluated in the exchange's own IANA timezone via Intl, so daylight-saving
 * changes (US) and the lack of them (India) are handled by the platform's tz database.
 *
 * MAINTENANCE: holidays are a hand-maintained table, verified 11 Oct 2026 against
 *   - NYSE Group's published 2024-2026 holiday & early-close calendar (NYSE and Nasdaq share it)
 *   - NSE's 2026 trading-holiday circular
 * Exchanges can add ad-hoc closures (NSE added 15 Jan 2026 for municipal elections after
 * publishing its list). Add new dates to EXTRA_CLOSURES below, and add a new year's table each
 * December. A year with no table returns 'unknown' instead of a guess.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PPCalendar = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EXCHANGES = {
    US: {
      name: 'NYSE / Nasdaq',
      tz: 'America/New_York',
      open: '09:30',
      close: '16:00',
      holidays: {
        2026: [
          '2026-01-01', // New Year's Day
          '2026-01-19', // Martin Luther King Jr. Day
          '2026-02-16', // Washington's Birthday
          '2026-04-03', // Good Friday
          '2026-05-25', // Memorial Day
          '2026-06-19', // Juneteenth
          '2026-07-03', // Independence Day (observed; 4 July is a Saturday)
          '2026-09-07', // Labor Day
          '2026-11-26', // Thanksgiving
          '2026-12-25'  // Christmas
        ]
      },
      earlyCloses: { '2026-11-27': '13:00', '2026-12-24': '13:00' },
      specialSessions: {}
    },
    IN: {
      name: 'NSE',
      tz: 'Asia/Kolkata',
      open: '09:15',
      close: '15:30',
      holidays: {
        2026: [
          '2026-01-15', // Municipal Corporation election, Maharashtra (added after the original list)
          '2026-01-26', // Republic Day
          '2026-03-03', // Holi
          '2026-03-26', // Shri Ram Navami
          '2026-03-31', // Shri Mahavir Jayanti
          '2026-04-03', // Good Friday
          '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
          '2026-05-01', // Maharashtra Day
          '2026-05-28', // Bakri Id
          '2026-06-26', // Muharram
          '2026-09-14', // Ganesh Chaturthi
          '2026-10-02', // Mahatma Gandhi Jayanti
          '2026-10-20', // Dussehra
          '2026-11-10', // Diwali – Balipratipada
          '2026-11-24', // Guru Nanak Jayanti
          '2026-12-25'  // Christmas
        ]
      },
      earlyCloses: {},
      // Days the exchange trades although it is normally closed. open/close null = timings not
      // yet published, so the state is 'unknown' (never guessed).
      specialSessions: {
        '2026-02-01': { open: '09:15', close: '15:00', note: 'Union Budget special session' },
        '2026-11-08': { open: null, close: null, note: 'Diwali Muhurat session – timings set by NSE circular' }
      }
    }
  };

  // Ad-hoc closures announced after the yearly list. Format: { US: ['YYYY-MM-DD'], IN: [...] }
  var EXTRA_CLOSURES = { US: [], IN: [] };

  var fmtCache = {};
  function formatter(tz) {
    if (!fmtCache[tz]) {
      fmtCache[tz] = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
      });
    }
    return fmtCache[tz];
  }

  /** Local calendar date/time in `tz` for an instant. */
  function localParts(date, tz) {
    var p = {};
    formatter(tz).formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    return {
      ymd: p.year + '-' + p.month + '-' + p.day,
      year: +p.year,
      minutes: (+p.hour) * 60 + (+p.minute),
      time: p.hour + ':' + p.minute,
      weekday: p.weekday // Mon, Tue, ...
    };
  }

  function toMinutes(hhmm) { var a = hhmm.split(':'); return (+a[0]) * 60 + (+a[1]); }

  function sessionState(exchangeId, when) {
    var ex = EXCHANGES[exchangeId];
    if (!ex) throw new Error('Unknown exchange ' + exchangeId);
    var date = when instanceof Date ? when : new Date(when === undefined ? Date.now() : when);
    var L = localParts(date, ex.tz);
    var base = { exchange: exchangeId, tz: ex.tz, localDate: L.ymd, localTime: L.time };

    if (!ex.holidays[L.year]) return Object.assign(base, { state: 'unknown', reason: 'no_calendar_for_year' });

    var special = ex.specialSessions[L.ymd];
    var open = ex.open, close = ex.close;
    if (special) {
      if (!special.open || !special.close) return Object.assign(base, { state: 'unknown', reason: 'special_session_untimed', note: special.note });
      open = special.open; close = special.close;
    } else {
      var weekend = L.weekday === 'Sat' || L.weekday === 'Sun';
      if (weekend) return Object.assign(base, { state: 'closed', reason: 'weekend' });
      if (ex.holidays[L.year].indexOf(L.ymd) !== -1 || EXTRA_CLOSURES[exchangeId].indexOf(L.ymd) !== -1) {
        return Object.assign(base, { state: 'closed', reason: 'holiday' });
      }
      close = ex.earlyCloses[L.ymd] || ex.close;
    }
    var o = toMinutes(open), c = toMinutes(close);
    var inSession = L.minutes >= o && L.minutes < c;
    return Object.assign(base, {
      state: inSession ? 'open' : 'closed',
      reason: inSession ? 'regular_session' : (L.minutes < o ? 'before_open' : 'after_close'),
      session: { open: open, close: close }
    });
  }

  return { EXCHANGES: EXCHANGES, EXTRA_CLOSURES: EXTRA_CLOSURES, sessionState: sessionState, localParts: localParts };
});
