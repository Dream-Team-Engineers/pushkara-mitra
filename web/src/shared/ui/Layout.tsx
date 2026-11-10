import type { ComponentChildren } from 'preact';
import { current, hrefFor, type RouteId } from '../../app/router';
import { t, type MessageKey } from '../i18n/i18n';
import { BrandMark, Icon, type IconName } from './Icon';

export function AppHeader() {
  return (
    <header class="app-header">
      <a class="app-header__brand" href={hrefFor('home')}>
        <BrandMark size={28} />
        <span>{t('app.name')}</span>
      </a>
      <a class="icon-link" href={hrefFor('settings')} aria-label={t('settings.language')}>
        <Icon name="globe" />
      </a>
    </header>
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
      {subtitleKey === undefined ? null : <p class="screen-header__sub">{t(subtitleKey)}</p>}
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
      <h2 class="section__title">{t(titleKey)}</h2>
      {children}
    </section>
  );
}
