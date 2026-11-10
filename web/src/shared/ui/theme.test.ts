import { describe, expect, it } from 'vitest';
import { initialTheme } from './theme';

describe('initialTheme', () => {
  it('prefers a stored choice over the device setting', () => {
    expect(initialTheme('outdoor', true)).toBe('outdoor');
    expect(initialTheme('light', true)).toBe('light');
  });

  it('follows the device dark preference when nothing is stored', () => {
    expect(initialTheme(null, true)).toBe('dark');
    expect(initialTheme(null, false)).toBe('light');
  });
});
