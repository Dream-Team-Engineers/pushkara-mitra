import { useSignal } from '@preact/signals';
import { locale, LOCALE_NAMES, LOCALES, t } from '../../shared/i18n/i18n';
import { selectLocale } from '../../shared/i18n/select';
import { THEMES, type Theme } from '../../shared/prefs/preferences';
import { ScreenHeader } from '../../shared/ui/Layout';
import { setTheme, theme } from '../../shared/ui/theme';
import { PublishedInformation } from './PublishedInformation';
import { FONT_NOTICES, SOFTWARE_NOTICES, type Notice } from './notices';

const THEME_LABELS = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  outdoor: 'settings.theme.outdoor',
} as const satisfies Record<Theme, Parameters<typeof t>[0]>;

function NoticeList({ items }: { readonly items: readonly Notice[] }) {
  return (
    <ul class="notice-list">
      {items.map((item) => (
        <li key={item.name}>
          <span>
            {item.name} · {item.licence}
          </span>
          {item.licenceTextPath === undefined ? null : (
            <a href={item.licenceTextPath}>{t('settings.about.licenceText')}</a>
          )}
        </li>
      ))}
    </ul>
  );
}

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
      <section class="about" aria-labelledby="about-title">
        <h2 id="about-title">{t('settings.about.title')}</h2>
        <p>{t('settings.about.intro')}</p>
        <h3>{t('settings.about.fonts')}</h3>
        <NoticeList items={FONT_NOTICES} />
        <h3>{t('settings.about.software')}</h3>
        <NoticeList items={SOFTWARE_NOTICES} />
        <PublishedInformation />
        <p class="notice" role="note">
          {t('settings.about.reviewPending')}
        </p>
      </section>
      <p class="disclaimer">{t('app.disclaimer')}</p>
    </>
  );
}
