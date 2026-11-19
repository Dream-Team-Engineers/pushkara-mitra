import { useSignal } from '@preact/signals';
import { t } from '../i18n/i18n';
import { Icon } from './Icon';

export interface MarqueeItem {
  readonly id: string;
  readonly text: string;
  /** https link to the story; the item then renders as a link to a new tab. */
  readonly href?: string;
}

function MarqueeText({ item }: { readonly item: MarqueeItem }) {
  return item.href === undefined ? (
    <>{item.text}</>
  ) : (
    <a href={item.href} target="_blank" rel="noopener noreferrer">
      {item.text}
    </a>
  );
}

/**
 * Scrolling strip with a visible pause control (WCAG 2.2.2). It also pauses on hover and focus,
 * and the CSS stops the animation entirely for reduced motion. The repeated copy is hidden from
 * assistive technology so each item is read once.
 */
export function Marquee({
  badge,
  label,
  tone,
  items,
}: {
  readonly badge: string;
  readonly label: string;
  readonly tone: 'news' | 'ad';
  readonly items: readonly MarqueeItem[];
}) {
  const paused = useSignal(false);
  return (
    <section class={`marquee marquee--${tone}`} aria-label={label}>
      <span class="marquee__badge">{badge}</span>
      <div class="marquee__viewport">
        <ul class={paused.value ? 'marquee__track is-paused' : 'marquee__track'}>
          {items.map((item) => (
            <li key={item.id}>
              <MarqueeText item={item} />
            </li>
          ))}
          {items.map((item) => (
            <li key={`${item.id}-copy`} class="marquee__copy" aria-hidden="true">
              {item.text}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        class="marquee__toggle"
        aria-pressed={paused.value}
        aria-label={paused.value ? t('action.resume') : t('action.pause')}
        onClick={() => {
          paused.value = !paused.value;
        }}
      >
        <Icon name={paused.value ? 'play' : 'pause'} size={20} />
      </button>
    </section>
  );
}
