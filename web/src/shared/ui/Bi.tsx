import { locale, pair, type MessageKey, type MessageParams } from '../i18n/i18n';

/**
 * Shows a message in the chosen language with English beside it (dual display). `stacked` puts the
 * English on its own muted line; otherwise it follows after a dot. Each part carries its own `lang`
 * so screen readers pick the right voice. The English part is hidden from assistive technology
 * because it repeats the same meaning; the chosen language is always the one announced.
 */
export function Bi({
  k,
  params,
  stacked = false,
}: {
  readonly k: MessageKey;
  readonly params?: MessageParams;
  readonly stacked?: boolean;
}) {
  const { primary, secondary } = pair(k, params);
  return (
    <span class={stacked ? 'bi bi--stacked' : 'bi'}>
      <span lang={locale.value}>{primary}</span>
      {secondary === null ? null : (
        <span class="bi__sec" lang="en" aria-hidden="true">
          {secondary}
        </span>
      )}
    </span>
  );
}
