// RFC 5545 (iCalendar) generator. Floating local time is used for DTSTART/DTEND
// so the reminder fires at the user's wall-clock time on whatever device the
// calendar is on — TZ-independent by design. DTSTAMP and UNTIL are UTC, per spec.

export type WeekDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export type RecurEnd =
  | { type: 'never' }
  | { type: 'count'; count: number }
  | { type: 'until'; date: Date };

export type RecurrenceRule =
  | { freq: 'DAILY'; ends: RecurEnd }
  | { freq: 'WEEKLY'; byDay: WeekDay[]; ends: RecurEnd }
  | { freq: 'MONTHLY'; ends: RecurEnd };

export type ReminderInput = {
  title: string;
  body: string;
  url: string;
  start: Date;
  durationMinutes: number;
  reminderMinutesBefore: number;
  recurrence: RecurrenceRule | null;
  /** Footer appended to DESCRIPTION. */
  footer: string;
};

/** Escape per RFC 5545 §3.3.11 (TEXT). Order matters: backslash first. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

/** Floating local-time stamp: YYYYMMDDTHHMMSS (no Z). */
function formatLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** UTC stamp with Z suffix, used for DTSTAMP and UNTIL. */
function formatUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545 line folding: every 75 octets, CRLF + space. */
function foldLine(line: string): string {
  const limit = 75;
  if (line.length <= limit) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push(line.slice(i, i + limit));
    i += limit;
  }
  return out.join('\r\n ');
}

function buildRrule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.freq}`];
  if (rule.freq === 'WEEKLY' && rule.byDay.length > 0) {
    parts.push(`BYDAY=${rule.byDay.join(',')}`);
  }
  switch (rule.ends.type) {
    case 'count':
      parts.push(`COUNT=${rule.ends.count}`);
      break;
    case 'until':
      parts.push(`UNTIL=${formatUtc(rule.ends.date)}`);
      break;
    case 'never':
      // No COUNT/UNTIL — runs forever.
      break;
  }
  return parts.join(';');
}

/** Add minutes; returns a new Date. */
function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

export function buildIcs(input: ReminderInput): string {
  const dtstart = formatLocal(input.start);
  const dtend = formatLocal(addMinutes(input.start, input.durationMinutes));
  const dtstamp = formatUtc(new Date());
  const uid = `${crypto.randomUUID()}@ttn-list.timtomnow`;

  const parts: string[] = [];
  const trimmedBody = input.body.trim();
  if (trimmedBody) parts.push(trimmedBody);
  parts.push(`Open: ${input.url}`);
  if (input.footer.trim()) parts.push(input.footer);
  const description = parts.join('\n\n');

  // Trigger: negative duration before the event start, e.g. -PT10M.
  const triggerMin = Math.max(0, input.reminderMinutesBefore | 0);
  const trigger = triggerMin === 0 ? '-PT0M' : `-PT${triggerMin}M`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//timtomnow//TTN List//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${input.url}`,
  ];
  if (input.recurrence) {
    lines.push(`RRULE:${buildRrule(input.recurrence)}`);
  }
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(input.title)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function safeIcsFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `ttn-list-${slug || 'reminder'}`;
}
