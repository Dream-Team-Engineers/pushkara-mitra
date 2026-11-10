import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrast guard for web/src/shared/ui/tokens.css (ADR 0011).
 * WCAG 2.2 AA: text 4.5:1, non-text controls and focus 3:1.
 * The outdoor theme aims higher: text 7:1.
 * This checks token pairs, not rendered screens; axe covers those later.
 */
const CSS = readFileSync(
  join(import.meta.dirname, '..', '..', 'web', 'src', 'shared', 'ui', 'tokens.css'),
  'utf8',
);

const THEMES = ['light', 'dark', 'outdoor'] as const;
type Theme = (typeof THEMES)[number];

const TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ['--text', '--ground'],
  ['--text', '--surface'],
  ['--text', '--primary-soft'],
  ['--text-muted', '--ground'],
  ['--text-muted', '--surface'],
  ['--primary', '--ground'],
  ['--primary', '--surface'],
  ['--primary', '--primary-soft'],
  ['--on-primary', '--primary-fill'],
  ['--accent-text', '--accent-soft'],
  ['--accent-text', '--surface'],
  ['--danger', '--ground'],
  ['--danger', '--surface'],
  ['--danger', '--danger-soft'],
  ['--on-danger', '--danger-fill'],
  ['--header-text', '--header-bg'],
  ['--header-text-muted', '--header-bg'],
];

const NON_TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ['--line-strong', '--surface'],
  ['--line-strong', '--ground'],
  ['--focus', '--surface'],
  ['--focus', '--ground'],
];

function themeTokens(theme: Theme): Map<string, string> {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(CSS);
  const tokens = new Map<string, string>();
  for (const match of (block?.[1] ?? '').matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{6});/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) tokens.set(name, value);
  }
  return tokens;
}

function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

function ratio(tokens: Map<string, string>, foreground: string, background: string): number {
  const a = tokens.get(foreground);
  const b = tokens.get(background);
  if (a === undefined || b === undefined) return 0;
  return contrast(a, b);
}

describe('contrast maths', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe.each(THEMES)('%s theme', (theme) => {
  const tokens = themeTokens(theme);
  const textMinimum = theme === 'outdoor' ? 7 : 4.5;

  it('defines the same tokens as the light theme', () => {
    expect([...tokens.keys()].sort()).toEqual([...themeTokens('light').keys()].sort());
    expect(tokens.size).toBeGreaterThan(15);
  });

  it.each(TEXT_PAIRS)(`%s on %s meets ${String(textMinimum)}:1`, (foreground, background) => {
    expect(ratio(tokens, foreground, background)).toBeGreaterThanOrEqual(textMinimum);
  });

  it.each(NON_TEXT_PAIRS)('%s against %s meets 3:1', (foreground, background) => {
    expect(ratio(tokens, foreground, background)).toBeGreaterThanOrEqual(3);
  });
});

describe('size tokens', () => {
  it('keeps the 48px touch target and 16px body text', () => {
    expect(CSS).toMatch(/--target-min:\s*48px;/);
    expect(CSS).toMatch(/--text-body:\s*1rem;/);
    expect(CSS).toMatch(/--text-caption:\s*0\.875rem;/);
  });

  it('defines no font size below 14px (0.875rem)', () => {
    const sizes = [...CSS.matchAll(/--text-[a-z-]+:\s*([0-9.]+)rem;/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.875);
  });
});
