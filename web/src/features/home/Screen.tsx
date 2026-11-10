import { ADS, HEADLINES } from '../../shared/data/fixtures-home';
import { countdown, EVENT, now } from '../../shared/data/time';
import { formatNumber, t, type MessageKey } from '../../shared/i18n/i18n';
import { hrefFor, type RouteId } from '../../app/router';
import { BrandMark, Icon, type IconName } from '../../shared/ui/Icon';
import { Marquee } from '../../shared/ui/Marquee';

interface QuickCard {
  readonly id: RouteId;
  readonly icon: IconName;
  readonly tone: 'teal' | 'blue' | 'saffron' | 'red';
  readonly title: MessageKey;
  readonly subtitle: MessageKey;
}

/** The ten agreed modules, in the order of the decided prototype (ADR 0011, F1). */
export const QUICK_CARDS: readonly QuickCard[] = [
  {
    id: 'pass',
    icon: 'pass',
    tone: 'teal',
    title: 'module.pass.title',
    subtitle: 'module.pass.subtitle',
  },
  {
    id: 'group',
    icon: 'group',
    tone: 'blue',
    title: 'module.group.title',
    subtitle: 'module.group.subtitle',
  },
  {
    id: 'ghats',
    icon: 'ghats',
    tone: 'teal',
    title: 'module.ghats.title',
    subtitle: 'module.ghats.subtitle',
  },
  {
    id: 'map',
    icon: 'map',
    tone: 'blue',
    title: 'module.map.title',
    subtitle: 'module.map.subtitle',
  },
  {
    id: 'stay',
    icon: 'stay',
    tone: 'saffron',
    title: 'module.stay.title',
    subtitle: 'module.stay.subtitle',
  },
  {
    id: 'travel',
    icon: 'travel',
    tone: 'saffron',
    title: 'module.travel.title',
    subtitle: 'module.travel.subtitle',
  },
  {
    id: 'help',
    icon: 'help',
    tone: 'red',
    title: 'module.help.title',
    subtitle: 'module.help.subtitle',
  },
  {
    id: 'updates',
    icon: 'updates',
    tone: 'blue',
    title: 'module.updates.title',
    subtitle: 'module.updates.subtitle',
  },
  {
    id: 'conditions',
    icon: 'conditions',
    tone: 'teal',
    title: 'module.conditions.title',
    subtitle: 'module.conditions.subtitle',
  },
  {
    id: 'partners',
    icon: 'partners',
    tone: 'saffron',
    title: 'module.partners.title',
    subtitle: 'module.partners.subtitle',
  },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function CountdownCard() {
  const state = countdown(now.value);
  return (
    <section class="countdown" aria-labelledby="countdown-title">
      <h2 id="countdown-title" class="countdown__title">
        {t('home.countdown.title')}
      </h2>
      {state.phase === 'before' ? (
        <ul class="countdown__tiles">
          <li>
            <span class="countdown__value">{formatNumber(state.days)}</span>
            <span>{t('home.countdown.days')}</span>
          </li>
          <li>
            <span class="countdown__value">{pad(state.hours)}</span>
            <span>{t('home.countdown.hours')}</span>
          </li>
          <li>
            <span class="countdown__value">{pad(state.minutes)}</span>
            <span>{t('home.countdown.minutes')}</span>
          </li>
        </ul>
      ) : (
        <p class="countdown__phase">
          {state.phase === 'during' ? t('home.countdown.during') : t('home.countdown.after')}
        </p>
      )}
      {EVENT.datesConfirmed ? null : <p class="countdown__note">{t('home.countdown.pending')}</p>}
    </section>
  );
}

function WeatherStrip() {
  return (
    <section class="weather" aria-labelledby="weather-title">
      <Icon name="cloud" />
      <div>
        <h2 id="weather-title" class="weather__city">
          {t('home.city')}
        </h2>
        <p class="weather__status">{t('home.weather.unavailable')}</p>
      </div>
    </section>
  );
}

export default function HomeScreen() {
  return (
    <>
      <WeatherStrip />
      <Marquee
        tone="news"
        badge={t('home.breakingNews')}
        label={t('home.breakingNews')}
        items={HEADLINES}
      />
      <Marquee tone="ad" badge={t('home.sponsored')} label={t('home.sponsored')} items={ADS} />
      <section class="hero">
        <BrandMark size={72} />
        <h1 id="screen-title" tabIndex={-1} class="hero__title">
          {t('app.name')}
        </h1>
        <p class="hero__tagline">{t('app.tagline')}</p>
      </section>
      <CountdownCard />
      <section class="section" aria-labelledby="quick-title">
        <h2 id="quick-title" class="section__title">
          {t('home.quickAccess')}
        </h2>
        <ul class="quick-grid">
          {QUICK_CARDS.map((card) => (
            <li key={card.id}>
              <a class={`qcard qcard--${card.tone}`} href={hrefFor(card.id)}>
                <span class="qcard__icon">
                  <Icon name={card.icon} />
                </span>
                <span class="qcard__title">{t(card.title)}</span>
                <span class="qcard__sub">{t(card.subtitle)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <p class="disclaimer">{t('app.disclaimer')}</p>
    </>
  );
}
