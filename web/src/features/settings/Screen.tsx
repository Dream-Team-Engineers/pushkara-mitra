import { useSignal } from '@preact/signals';
import { locale, LOCALE_NAMES, LOCALES, t } from '../../shared/i18n/i18n';
import { selectLocale } from '../../shared/i18n/select';
import { THEMES, type Theme } from '../../shared/prefs/preferences';
import { ScreenHeader } from '../../shared/ui/Layout';
import { setTheme, theme } from '../../shared/ui/theme';

const THEME_LABELS = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  outdoor: 'settings.theme.outdoor',
} as const satisfies Record<Theme, Parameters<typeof t>[0]>;

export default function SettingsScreen() {
  const loadFailed = useSignal(false);
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
              loadFailed.value = false;
              selectLocale(option).catch(() => {
                loadFailed.value = true;
              });
            }}
          >
            {LOCALE_NAMES[option]}
          </button>
        ))}
      </fieldset>
      {loadFailed.value ? (
        <p class="notice notice--warn" role="alert">
          {t('state.error')}
        </p>
      ) : null}
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
