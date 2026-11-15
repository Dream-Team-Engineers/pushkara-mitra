import { describe, expect, it } from 'vitest';
import { desktopModeZoom } from './viewport';

describe('desktopModeZoom', () => {
  it('leaves a normal phone alone', () => {
    expect(desktopModeZoom(390, 390, 5)).toBe(1);
    expect(desktopModeZoom(844, 844, 5)).toBe(1);
  });

  it('scales a phone in desktop-site mode (about 980 px layout) back to screen width', () => {
    expect(desktopModeZoom(980, 390, 5)).toBeCloseTo(2.51, 2);
  });

  it('leaves tablets, laptops and desktops alone', () => {
    expect(desktopModeZoom(1920, 1920, 0)).toBe(1);
    expect(desktopModeZoom(1280, 1920, 10)).toBe(1);
    expect(desktopModeZoom(1400, 1000, 10)).toBe(1);
    expect(desktopModeZoom(980, 390, 0)).toBe(1);
  });

  it('never zooms beyond 4x', () => {
    expect(desktopModeZoom(2000, 360, 5)).toBe(4);
  });
});
