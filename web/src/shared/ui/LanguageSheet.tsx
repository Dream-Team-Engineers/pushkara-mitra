import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { locale, LOCALE_NAMES, t, type Locale, type MessageKey } from '../i18n/i18n';
import { selectLocale } from '../i18n/select';
import { Icon } from './Icon';

/**
 * Language choice (owner request 2026-11-19: the old icon-only globe was not understandable).
 * A labelled button in the header shows the current language in its own script and opens a
 * bottom sheet with three large options. Names stay untranslated so a person can always find
 * their own language. Escape, the scrim and the close button dismiss it; focus stays inside the
 * sheet while it is open and returns to the button afterwards.
 */
export const languageSheetOpen = signal(false);

/** Order in the sheet: Telugu, Hindi, then English-only. */
const SHEET_ORDER: readonly Locale[] = ['te', 'hi', 'en'];

const GLYPH: Readonly<Record<Locale, string>> = { te: 'అ', hi: 'अ', en: 'A' };

const OPTION_HINT = {
  te: 'language.opt.te',
  hi: 'language.opt.hi',
  en: 'language.opt.en',
} as const satisfies Record<Locale, MessageKey>;

export function LanguageButton() {
  const name = LOCALE_NAMES[locale.value];
  return (
    <button
      type="button"
      class="lang-button"
      id="language-button"
      aria-haspopup="dialog"
      aria-expanded={languageSheetOpen.value}
      aria-label={`${t('settings.language')}: ${name}`}
      onClick={() => {
        languageSheetOpen.value = true;
      }}
    >
      <span class="lang-button__glyph" aria-hidden="true" lang={locale.value}>
        {GLYPH[locale.value]}
      </span>
      <span class="lang-button__name" lang={locale.value}>
        {name}
      </span>
      <Icon name="chevron" size={18} />
    </button>
  );
}

function close(): void {
  languageSheetOpen.value = false;
  document.getElementById('language-button')?.focus();
}

export function LanguageSheet() {
  const sheet = useRef<HTMLDivElement>(null);
  const open = languageSheetOpen.value;

  useEffect(() => {
    if (!open) return undefined;
    const root = sheet.current;
    const focusable = (): HTMLElement[] =>
      root === null ? [] : Array.from(root.querySelectorAll<HTMLElement>('button'));
    (root?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? focusable()[0])?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div class="sheet-layer">
      <div class="sheet-layer__scrim" onClick={close} aria-hidden="true" />
      <div
        class="sheet"
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-sheet-title"
      >
        <span class="sheet__grab" aria-hidden="true" />
        <div class="sheet__head">
          <h2 id="language-sheet-title">
            <span lang="te">భాష</span> · <span lang="hi">भाषा</span> ·{' '}
            <span lang="en">Language</span>
          </h2>
          <button
            type="button"
            class="sheet__close"
            aria-label={t('language.close')}
            onClick={close}
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <ul class="language-options">
          {SHEET_ORDER.map((option) => (
            <li key={option}>
              <button
                type="button"
                class="language-option"
                lang={option}
                aria-pressed={locale.value === option}
                onClick={() => {
                  selectLocale(option)
                    .then(close)
                    .catch(() => {
                      document.getElementById('language-sheet-error')?.removeAttribute('hidden');
                    });
                }}
              >
                <span class="language-option__glyph" aria-hidden="true">
                  {GLYPH[option]}
                </span>
                <span class="language-option__text">
                  <b>{option === 'en' ? LOCALE_NAMES.en : `${LOCALE_NAMES[option]} + English`}</b>
                  <small lang={locale.value}>{t(OPTION_HINT[option])}</small>
                </span>
                <span class="language-option__tick" aria-hidden="true">
                  <Icon name="check" size={16} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p id="language-sheet-error" class="notice notice--warn" role="alert" hidden>
          {t('state.error')}
        </p>
        <p class="sheet__hint">{t('language.hint')}</p>
      </div>
    </div>
  );
}
