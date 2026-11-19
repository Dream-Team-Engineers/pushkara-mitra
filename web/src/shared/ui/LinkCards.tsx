import type { SourceLink } from '../data/sourceLinks';
import { locale, t } from '../i18n/i18n';
import { Icon, type IconName } from './Icon';

/** One colour per kind of task: trips and stays saffron, culture navy, everything else teal. */
const TONES: Partial<Record<IconName, string>> = {
  train: 'saffron',
  bus: 'saffron',
  plane: 'saffron',
  bed: 'saffron',
  temple: 'navy',
  partners: 'navy',
  book: 'navy',
};

/**
 * Icon cards that open an official or primary source in a new tab. The card names the publisher
 * and says whether the page has been checked, so a link is never presented as verified when it
 * has not been opened by a person or the agent.
 */
export function LinkCards({ links }: { readonly links: readonly SourceLink[] }) {
  const lang = locale.value;
  return (
    <ul class="card-list link-cards">
      {links.map((link) => (
        <li key={link.id}>
          <a
            class="card link-card"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            lang={lang}
          >
            <span
              class={
                TONES[link.icon] === undefined
                  ? 'link-card__icon'
                  : `link-card__icon link-card__icon--${TONES[link.icon] ?? ''}`
              }
            >
              <Icon name={link.icon} />
            </span>
            <span class="link-card__body">
              <span class="card__title">{link.title[lang]}</span>
              <span class="card__meta">{link.note[lang]}</span>
              <span class="stamp">
                <span>{t('state.source', { source: link.publisher })}</span>
                {link.checked === null ? (
                  <span class="badge badge--warn">{t('links.ownerConfirm')}</span>
                ) : (
                  <span>{t('links.checkedOn', { date: link.checked })}</span>
                )}
              </span>
            </span>
            <span class="link-card__go">
              <Icon name="external" size={20} />
              <span class="visually-hidden">{t('links.opensNewTab')}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
