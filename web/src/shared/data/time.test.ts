import { describe, expect, it } from 'vitest';
import { countdown, EVENT, minutesSince } from './time';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('countdown', () => {
  it('counts down to the provisional start in whole days, hours and minutes', () => {
    const now = EVENT.start - (3 * DAY + 5 * HOUR + 7 * MINUTE + 59_000);
    expect(countdown(now)).toEqual({ phase: 'before', days: 3, hours: 5, minutes: 7 });
  });

  it('shows zero units one second before the start', () => {
    expect(countdown(EVENT.start - 1000)).toEqual({
      phase: 'before',
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });

  it('switches to "during" at the start and at the end instant', () => {
    expect(countdown(EVENT.start)).toEqual({ phase: 'during' });
    expect(countdown(EVENT.end)).toEqual({ phase: 'during' });
  });

  it('switches to "after" once the window has passed', () => {
    expect(countdown(EVENT.end + 1)).toEqual({ phase: 'after' });
  });

  it('keeps the dates marked as not officially confirmed (OQ-004)', () => {
    expect(EVENT.datesConfirmed).toBe(false);
    expect(new Date(EVENT.start).toISOString()).toBe('2027-06-25T18:30:00.000Z');
  });
});

describe('minutesSince', () => {
  it('floors to whole minutes and never goes negative', () => {
    const t0 = Date.parse('2026-11-10T10:00:00+05:30');
    expect(minutesSince('2026-11-10T10:00:00+05:30', t0 + 5 * MINUTE + 30_000)).toBe(5);
    expect(minutesSince('2026-11-10T10:00:00+05:30', t0 - HOUR)).toBe(0);
  });

  it('returns null for an invalid timestamp', () => {
    expect(minutesSince('not a date', Date.now())).toBeNull();
  });
});
