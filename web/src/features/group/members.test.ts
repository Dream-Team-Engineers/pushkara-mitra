import { describe, expect, it } from 'vitest';
import { MEMBER_TONES, memberTone } from './members';

describe('member colours', () => {
  it('gives each handle one stable colour out of the six', () => {
    const handles = [
      'aaaaaaaaaaaaaaaa',
      '0123456789abcdef',
      'fedcba9876543210',
      'deadbeefdeadbeef',
    ];
    for (const handle of handles) {
      const tone = memberTone(handle);
      expect(tone).toBe(memberTone(handle));
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(MEMBER_TONES);
    }
  });

  it('spreads different members over several colours', () => {
    const tones = new Set(
      Array.from({ length: 40 }, (_, i) => memberTone(i.toString(16).padStart(16, '0'))),
    );
    expect(tones.size).toBeGreaterThan(3);
  });
});
