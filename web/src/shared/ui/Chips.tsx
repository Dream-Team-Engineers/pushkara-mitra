import { t, type MessageKey } from '../i18n/i18n';

export interface ChipOption<V extends string> {
  readonly value: V;
  readonly label: MessageKey;
}

/** Single-choice filter or tab group built from toggle buttons (aria-pressed). */
export function ChipGroup<V extends string>({
  legend,
  options,
  selected,
  onSelect,
}: {
  readonly legend: MessageKey;
  readonly options: readonly ChipOption<V>[];
  readonly selected: V;
  readonly onSelect: (value: V) => void;
}) {
  return (
    <fieldset class="choice-group">
      <legend class="visually-hidden">{t(legend)}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          class="choice"
          aria-pressed={selected === option.value}
          onClick={() => {
            onSelect(option.value);
          }}
        >
          {t(option.label)}
        </button>
      ))}
    </fieldset>
  );
}

const CROWD_LABELS = {
  low: 'crowd.low',
  moderate: 'crowd.moderate',
  high: 'crowd.high',
  noData: 'crowd.noData',
} as const satisfies Record<string, MessageKey>;

/** Crowd level as text plus a shape class, never colour alone. Always an estimate. */
export function CrowdChip({ level }: { readonly level: keyof typeof CROWD_LABELS }) {
  return <span class={`crowd crowd--${level}`}>{t(CROWD_LABELS[level])}</span>;
}
