import { describe, expect, it } from 'vitest';
import { fromDateInputValue, startOfDay, toDateInputValue } from './date';

describe('startOfDay', () => {
  it('zeros out hours, minutes, seconds, and ms', () => {
    const d = new Date(2026, 4, 3, 14, 35, 12, 700); // local time
    const start = new Date(startOfDay(d.getTime()));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
    // Same calendar day in local time
    expect(start.getFullYear()).toBe(d.getFullYear());
    expect(start.getMonth()).toBe(d.getMonth());
    expect(start.getDate()).toBe(d.getDate());
  });

  it('is idempotent', () => {
    const ts = Date.now();
    expect(startOfDay(startOfDay(ts))).toBe(startOfDay(ts));
  });
});

describe('toDateInputValue / fromDateInputValue', () => {
  it('round-trips a local-midnight timestamp', () => {
    const original = new Date(2026, 4, 3).getTime(); // local midnight
    const str = toDateInputValue(original);
    expect(str).toBe('2026-05-03');
    expect(fromDateInputValue(str)).toBe(original);
  });

  it('zero-pads single-digit month and day', () => {
    expect(toDateInputValue(new Date(2026, 0, 9).getTime())).toBe('2026-01-09');
  });

  it('falls back to todayStart for malformed input', () => {
    const result = fromDateInputValue('not-a-date');
    const today = startOfDay(Date.now());
    expect(result).toBe(today);
  });
});
