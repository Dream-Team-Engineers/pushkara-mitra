import { render } from 'preact-render-to-string';
import { beforeEach, describe, expect, it } from 'vitest';
import { LOCALE_NAMES, setLocale } from '../i18n/i18n';
import { LanguageButton, LanguageSheet, languageSheetOpen } from './LanguageSheet';

describe('language button and sheet', () => {
  beforeEach(async () => {
    languageSheetOpen.value = false;
    await setLocale('te');
  });

  it('labels the button with the current language in its own script', () => {
    const html = render(<LanguageButton />);
    expect(html).toContain(LOCALE_NAMES.te);
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-label="');
  });

  it('renders nothing while closed', () => {
    expect(render(<LanguageSheet />)).toBe('');
  });

  it('offers the three languages as a dialog and marks the current one', () => {
    languageSheetOpen.value = true;
    const html = render(<LanguageSheet />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(`${LOCALE_NAMES.te} + English`);
    expect(html).toContain(`${LOCALE_NAMES.hi} + English`);
    expect(html).toContain(LOCALE_NAMES.en);
    expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
  });
});
