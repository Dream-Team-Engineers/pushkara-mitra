import { favourites, toggleFavourite } from '../prefs/favourites';
import { t } from '../i18n/i18n';

/** Star toggle for a favourite ghat. Safe inside a <summary>: it does not open or close the card. */
export function StarButton({ ghatId }: { readonly ghatId: string }) {
  const on = favourites.value.includes(ghatId);
  return (
    <button
      type="button"
      class={on ? 'star is-on' : 'star'}
      aria-pressed={on}
      aria-label={t(on ? 'fav.remove' : 'fav.add')}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavourite(ghatId);
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8z"
          fill={on ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  );
}
