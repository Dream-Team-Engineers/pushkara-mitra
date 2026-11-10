import { locale, LOCALE_NAMES, LOCALES, setLocale, t, type Locale } from '../../shared/i18n/i18n';
import {
  browserStore,
  LOCALE_KEY,
  THEMES,
  writePreference,
  type Theme,
} from '../../shared/prefs/preferences';
import { ScreenHeader } from '../../shared/ui/Layout';
import { setTheme, theme } from '../../shared/ui/theme';

const THEME_LABELS = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  outdoor: 'settings.theme.outdoor',
} as const satisfies Record<Theme, Parameters<typeof t>[0]>;

async function chooseLocale(next: Locale): Promise<void> {
  await setLocale(next);
  writePreference(browserStore(), LOCALE_KEY, next);
}

export default function SettingsScreen() {
  return (
    <>
      <ScreenHeader titleKey="settings.title" />
      <fieldset class="choice-group">
        <legend>{t('settings.language')}</legend>
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            class="choice"
            lang={option}
            aria-pressed={locale.value === option}
            onClick={() => {
              void chooseLocale(option);
            }}
          >
            {LOCALE_NAMES[option]}
          </button>
        ))}
      </fieldset>
      <fieldset class="choice-group">
        <legend>{t('settings.theme.title')}</legend>
        {THEMES.map((option) => (
          <button
            key={option}
            type="button"
            class="choice"
            aria-pressed={theme.value === option}
            onClick={() => {
              setTheme(option);
            }}
          >
            {t(THEME_LABELS[option])}
          </button>
        ))}
      </fieldset>
      <p class="disclaimer">{t('app.disclaimer')}</p>
    </>
  );
}
