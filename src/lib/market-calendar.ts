export interface SessionState {
  state: 'open' | 'closed' | 'unknown';
  reason?: string;
}

const HOLIDAYS_US_2026 = [
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03',
  '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07',
  '2026-11-26', '2026-12-25'
];

const HOLIDAYS_IN_2026 = [
  '2026-01-15', '2026-01-26', '2026-03-03', '2026-03-26',
  '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01',
  '2026-05-28', '2026-06-26', '2026-09-14', '2026-10-02',
  '2026-10-20', '2026-11-10', '2026-11-24', '2026-12-25'
];

export function getSessionState(exchange: 'US' | 'IN', date = new Date()): SessionState {
  const tz = exchange === 'US' ? 'America/New_York' : 'Asia/Kolkata';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short'
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const yyyy = get('year');
  const mm = get('month');
  const dd = get('day');
  const isoDate = `${yyyy}-${mm}-${dd}`;
  const weekday = get('weekday');
  const time = `${get('hour')}:${get('minute')}`;

  // Weekend check
  if (weekday === 'Sat' || weekday === 'Sun') {
    return { state: 'closed', reason: 'Weekend' };
  }

  // Holiday check
  const holidays = exchange === 'US' ? HOLIDAYS_US_2026 : HOLIDAYS_IN_2026;
  if (holidays.includes(isoDate)) {
    return { state: 'closed', reason: 'Public Holiday' };
  }

  const openTime = exchange === 'US' ? '09:30' : '09:15';
  const closeTime = exchange === 'US' ? '16:00' : '15:30';

  if (time >= openTime && time < closeTime) {
    return { state: 'open', reason: 'Regular trading hours' };
  }

  return { state: 'closed', reason: 'Outside trading hours' };
}