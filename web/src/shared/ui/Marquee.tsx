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

/** Reading pace: seconds of scrolling per character, so a long strip is not faster than a short one. */
const SECONDS_PER_CHARACTER = 0.4;
/** Loop durations (seconds) that exist as CSS classes; inline styles are blocked by the page policy. */
const DURATIONS = [30, 45, 60, 90, 120, 180, 240] as const;

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
  const characters = items.reduce((sum, item) => sum + item.text.length, 0);
  const needed = characters * SECONDS_PER_CHARACTER;
  const seconds = DURATIONS.find((value) => value >= needed) ?? DURATIONS[DURATIONS.length - 1];
  return (
    <section class={`marquee marquee--${tone}`} aria-label={label}>
      <span class="marquee__badge">{badge}</span>
      <div class="marquee__viewport">
        <ul
          class={`marquee__track marquee__track--${String(seconds)}${paused.value ? ' is-paused' : ''}`}
        >
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
