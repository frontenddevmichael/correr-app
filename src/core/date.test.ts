import { describe, expect, it } from 'vitest';

import {
  dayKeyForTimezone,
  isQuietHours,
  isWithinMinutesWindow,
  minutesFromTimeKey,
  timeKeyForTimezone,
  weekdayForTimezone,
} from './date';

const instant = new Date('2026-10-24T02:30:00Z');

describe('dayKeyForTimezone', () => {
  it('uses the user day instead of the UTC day', () => {
    expect(dayKeyForTimezone('America/Los_Angeles', instant)).toBe('2026-10-23');
  });

  it('matches UTC when the timezone is UTC', () => {
    expect(dayKeyForTimezone('UTC', instant)).toBe('2026-10-24');
  });

  it('falls back to UTC for an invalid timezone', () => {
    expect(dayKeyForTimezone('Not/AZone', instant)).toBe('2026-10-24');
  });
});

describe('timeKeyForTimezone', () => {
  it('returns a 24-hour local clock', () => {
    expect(timeKeyForTimezone('America/Los_Angeles', instant)).toBe('19:30');
    expect(timeKeyForTimezone('UTC', instant)).toBe('02:30');
  });
});

describe('weekdayForTimezone', () => {
  it('uses the local weekday', () => {
    expect(weekdayForTimezone('America/Los_Angeles', instant)).toBe(5);
    expect(weekdayForTimezone('UTC', instant)).toBe(6);
  });
});

describe('minutesFromTimeKey', () => {
  it('parses valid times', () => {
    expect(minutesFromTimeKey('00:00')).toBe(0);
    expect(minutesFromTimeKey('8:05')).toBe(485);
    expect(minutesFromTimeKey('23:59')).toBe(1439);
  });

  it('treats invalid times as midnight', () => {
    expect(minutesFromTimeKey('')).toBe(0);
    expect(minutesFromTimeKey('24:00')).toBe(0);
    expect(minutesFromTimeKey('noon')).toBe(0);
  });
});

describe('isWithinMinutesWindow', () => {
  it('matches the target minute and the next 14 minutes', () => {
    expect(isWithinMinutesWindow(20 * 60, 20 * 60)).toBe(true);
    expect(isWithinMinutesWindow(20 * 60 + 14, 20 * 60)).toBe(true);
    expect(isWithinMinutesWindow(20 * 60 + 15, 20 * 60)).toBe(false);
    expect(isWithinMinutesWindow(20 * 60 - 1, 20 * 60)).toBe(false);
  });

  it('wraps past midnight', () => {
    expect(isWithinMinutesWindow(5, 23 * 60 + 55)).toBe(true);
    expect(isWithinMinutesWindow(10, 23 * 60 + 55)).toBe(false);
  });
});

describe('isQuietHours', () => {
  it('handles a window that crosses midnight', () => {
    expect(isQuietHours('23:30', '22:00', '07:00')).toBe(true);
    expect(isQuietHours('06:59', '22:00', '07:00')).toBe(true);
    expect(isQuietHours('07:00', '22:00', '07:00')).toBe(false);
    expect(isQuietHours('21:59', '22:00', '07:00')).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(isQuietHours('12:00', '09:00', '17:00')).toBe(true);
    expect(isQuietHours('08:59', '09:00', '17:00')).toBe(false);
    expect(isQuietHours('17:00', '09:00', '17:00')).toBe(false);
  });

  it('treats equal start and end as disabled', () => {
    expect(isQuietHours('12:00', '09:00', '09:00')).toBe(false);
  });
});
