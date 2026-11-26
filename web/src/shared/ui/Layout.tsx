import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { Bi } from './Bi';
import { current, hrefFor, type RouteId } from '../../app/router';
import { user } from '../auth/google';
import { pair, t, type MessageKey } from '../i18n/i18n';
import { BrandMark, Icon, type IconName } from './Icon';
import { LanguageButton } from './LanguageSheet';
import { accent, setAccent, setTheme, theme } from './theme';
import { ACCENTS, THEMES, type Accent, type Theme } from '../prefs/preferences';

/**
 * Header (owner request 2026-11-23): row one is the logo, the app name in large type and the
 * account letter; row two is the colour choice (left), the light/dark switch (middle) and the
 * language button (right).
 */
export function AppHeader() {
  const person = user.value;
  const signedIn = person !== null && person.name !== '';
  return (
    <header class="app-header">
      <div class="app-header__top">
        <a class="app-header__brand" href={hrefFor('home')}>
          <BrandMark size={32} />
          <span class="app-header__name">
            <b>{t('app.name')}</b>
            <small>{t('app.tagline')}</small>
          </span>
        </a>
        <a
          class="account-link"
          href={hrefFor('pass')}
          aria-label={signedIn ? `${t('account.signedIn')}: ${person.name}` : t('account.header')}
        >
          {signedIn ? (
            <span class="account-link__avatar" aria-hidden="true">
              {person.name.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <span class="account-link__avatar account-link__avatar--empty" aria-hidden="true">
              <Icon name="person" size={18} />
            </span>
          )}
        </a>
      </div>
      <ThemeStrip />
    </header>
  );
}

const ACCENT_LABEL = {
  green: 'theme.accent.green',
  saffron: 'theme.accent.saffron',
  blue: 'theme.accent.blue',
  gold: 'theme.accent.gold',
} as const satisfies Record<Accent, MessageKey>;

const THEME_LABEL = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  outdoor: 'settings.theme.outdoor',
} as const satisfies Record<Theme, MessageKey>;

const appearanceOpen = signal(false);

/**
 * Appearance and language in one strip under the app name (owner request 2026-11-25, replacing the
 * always-visible colour dots and L/D switch): one button opens a panel with the theme (light, dark,
 * outdoor) and the colour; the language button beside it opens the language sheet.
 */
export function ThemeStrip() {
  const chosen = accent.value;
  const mode = theme.value;
  const open = appearanceOpen.value;
  const move = (step: number) => {
    const index = ACCENTS.indexOf(chosen);
    const next = ACCENTS[(index + step + ACCENTS.length) % ACCENTS.length] ?? 'green';
    setAccent(next);
    document.getElementById(`accent-${next}`)?.focus();
  };
  return (
    <>
      <div class="theme-strip">
        <button
          type="button"
          class="appearance-button"
          id="appearance-button"
          aria-expanded={open}
          aria-controls="appearance-panel"
          onClick={() => {
            appearanceOpen.value = !open;
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1-1.6-1-3a2 2 0 0 1 2-2h2.5A3.5 3.5 0 0 0 21 10.5C21 6.4 17 3 12 3z" />
            <path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" />
          </svg>
          <span>{t('settings.theme.title')}</span>
          <span
            class={`appearance-button__dot appearance-button__dot--${chosen}`}
            aria-hidden="true"
          />
          {/* Down arrow, as on the language button, so it reads as a menu (owner 2026-11-26). */}
          <span class="appearance-button__chev">
            <Icon name="chevron" size={14} />
          </span>
        </button>
        <LanguageButton />
      </div>
      {open ? (
        <div
          class="appearance-panel"
          id="appearance-panel"
          role="group"
          aria-label={t('settings.theme.title')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              appearanceOpen.value = false;
              document.getElementById('appearance-button')?.focus();
            }
          }}
        >
          <p class="appearance-panel__label">{t('settings.theme.title')}</p>
          <div class="segmented" role="radiogroup" aria-label={t('settings.theme.title')}>
            {THEMES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                class="segmented__option"
                aria-checked={mode === option}
                onClick={() => {
                  setTheme(option);
                }}
              >
                {t(THEME_LABEL[option])}
              </button>
            ))}
          </div>
          <p class="appearance-panel__label">{t('theme.colour')}</p>
          <div
            class={`accent-picker accent-picker--${chosen}`}
            role="radiogroup"
            aria-label={t('theme.colour')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(-1);
              }
            }}
          >
            {ACCENTS.map((option) => (
              <button
                key={option}
                id={`accent-${option}`}
                type="button"
                role="radio"
                class={`accent-swatch accent-swatch--${option}`}
                aria-checked={chosen === option}
                aria-label={t(ACCENT_LABEL[option])}
                tabIndex={chosen === option ? 0 : -1}
                onClick={() => {
                  setAccent(option);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

interface NavItem {
  readonly id: RouteId;
  readonly icon: IconName;
  readonly label: MessageKey;
  readonly danger?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', icon: 'home', label: 'nav.home' },
  { id: 'map', icon: 'map', label: 'nav.map' },
  { id: 'group', icon: 'group', label: 'nav.group' },
  { id: 'help', icon: 'help', label: 'nav.sos', danger: true },
  { id: 'pass', icon: 'pass', label: 'nav.me' },
];

export function BottomBar() {
  const active = current.value;
  return (
    <nav class="bottom-bar" aria-label={t('nav.main')}>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          href={hrefFor(item.id)}
          class={item.danger === true ? 'is-danger' : undefined}
          aria-current={active === item.id ? 'page' : undefined}
        >
          <Icon name={item.icon} />
          <span>{t(item.label)}</span>
        </a>
      ))}
    </nav>
  );
}

export function ScreenHeader({
  titleKey,
  subtitleKey,
}: {
  readonly titleKey: MessageKey;
  readonly subtitleKey?: MessageKey;
}) {
  return (
    <div class="screen-header">
      <a class="back-link" href={hrefFor('home')}>
        <Icon name="back" size={20} />
        <span>{t('nav.back')}</span>
      </a>
      <h1 id="screen-title" tabIndex={-1}>
        {t(titleKey)}
      </h1>
      {subtitleKey === undefined ? null : (
        <p class="screen-header__sub">{pair(titleKey).secondary ?? t(subtitleKey)}</p>
      )}
    </div>
  );
}

/** Shown on every screen whose feature is an inert prototype (flags off, nothing is sent). */
export function PrototypeBanner() {
  return (
    <p class="proto-banner" role="note">
      <Icon name="info" size={20} />
      <span>{t('app.prototypeBanner')}</span>
    </p>
  );
}

export function Section({
  titleKey,
  children,
}: {
  readonly titleKey: MessageKey;
  readonly children: ComponentChildren;
}) {
  return (
    <section class="section">
      <h2 class="section__title">
        <Bi k={titleKey} />
      </h2>
      {children}
    </section>
  );
}
