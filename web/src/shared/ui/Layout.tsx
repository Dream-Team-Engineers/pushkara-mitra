import type { ComponentChildren } from 'preact';
import { Bi } from './Bi';
import { current, hrefFor, type RouteId } from '../../app/router';
import { user } from '../auth/google';
import { pair, t, type MessageKey } from '../i18n/i18n';
import { BrandMark, Icon, type IconName } from './Icon';
import { LanguageButton } from './LanguageSheet';
import { accent, setAccent, setTheme, theme } from './theme';
import { ACCENTS, type Accent } from '../prefs/preferences';

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
          <span>{t('app.name')}</span>
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

/** Colour choice, light/dark switch and language, in one strip under the app name. */
export function ThemeStrip() {
  const chosen = accent.value;
  const dark = theme.value === 'dark';
  const move = (step: number) => {
    const index = ACCENTS.indexOf(chosen);
    const next = ACCENTS[(index + step + ACCENTS.length) % ACCENTS.length] ?? 'green';
    setAccent(next);
    document.getElementById(`accent-${next}`)?.focus();
  };
  return (
    <div class="theme-strip">
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
      <button
        type="button"
        class={`mode-toggle${dark ? ' is-dark' : ''}`}
        role="switch"
        aria-checked={dark}
        aria-label={t('theme.darkSwitch')}
        onClick={() => {
          setTheme(dark ? 'light' : 'dark');
        }}
      >
        <span class="mode-toggle__thumb" aria-hidden="true" />
        <span class="mode-toggle__label mode-toggle__label--l" aria-hidden="true">
          L
        </span>
        <span class="mode-toggle__label mode-toggle__label--d" aria-hidden="true">
          D
        </span>
      </button>
      <LanguageButton />
    </div>
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
