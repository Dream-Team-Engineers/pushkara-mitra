import { describe, expect, it } from 'vitest';
import { initialTheme } from './theme';

describe('initialTheme', () => {
  it('uses a stored choice', () => {
    expect(initialTheme('outdoor')).toBe('outdoor');
    expect(initialTheme('dark')).toBe('dark');
  });

  it('starts light when nothing is chosen: dark only when the person picks it', () => {
    expect(initialTheme(null)).toBe('light');
  });
});
