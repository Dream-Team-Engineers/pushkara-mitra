import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import type { HelplineFixture, HelplineKind } from '../../shared/data/fixtures';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { Bi } from '../../shared/ui/Bi';
import { Icon } from '../../shared/ui/Icon';

/**
 * Helpline rows, laid out as in the approved UI workflow (Emergency screen): a number chip, the
 * name, and a red "Call" button. A tap never dials by itself: it opens a confirmation that names
 * the number, and only "Call now" starts the call (the phone's own dialler opens). Nothing is sent
 * to any server, no location is used and no number is stored. A line without a verified number
 * shows "Not yet available" and its button is disabled.
 */
const LINES: Readonly<Record<HelplineKind, { label: MessageKey; urgent: boolean }>> = {
  emergency: { label: 'help.line.emergency', urgent: true },
  police: { label: 'help.line.police', urgent: true },
  ambulance: { label: 'help.line.ambulance', urgent: true },
  control: { label: 'help.line.control', urgent: false },
  child: { label: 'help.line.child', urgent: false },
  women: { label: 'help.line.women', urgent: false },
  tourist: { label: 'help.line.tourist', urgent: false },
  fire: { label: 'help.line.fire', urgent: true },
  medical: { label: 'help.line.medical', urgent: true },
  road: { label: 'help.line.road', urgent: false },
  disaster: { label: 'help.line.disaster', urgent: false },
  ndrf: { label: 'help.line.ndrf', urgent: false },
  distress: { label: 'help.line.distress', urgent: false },
  localControl: { label: 'help.line.localControl', urgent: false },
};

/** Digits and a leading + only, so the dial link cannot carry anything else. */
export function dialTarget(number: string): string {
  return number.replace(/[^0-9+]/g, '');
}

function CallConfirm({
  kind,
  number,
  onClose,
}: {
  readonly kind: HelplineKind;
  readonly number: string;
  readonly onClose: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div class="call-confirm" role="presentation">
      <div
        class="call-confirm__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="call-title"
        aria-describedby="call-note"
      >
        <h2 id="call-title" class="call-confirm__title">
          {t('help.call.title', { name: t(LINES[kind].label) })}
        </h2>
        <p class="call-confirm__number">{number}</p>
        <p id="call-note" class="note note--flush">
          {t('help.call.note')}
        </p>
        <div class="call-confirm__actions">
          <button type="button" class="button button--secondary" ref={cancel} onClick={onClose}>
            {t('help.call.cancel')}
          </button>
          <a class="button button--danger" href={`tel:${dialTarget(number)}`} onClick={onClose}>
            <Icon name="phone" size={20} />
            <span>{t('help.call.go', { number })}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function HelplineList({ lines }: { readonly lines: readonly HelplineFixture[] }) {
  const pending = useSignal<string | null>(null);
  const chosen = lines.find((line) => line.id === pending.value);
  return (
    <>
      <ul class="helpline-grid">
        {lines.map((line) => {
          const spec = LINES[line.kind];
          const { number } = line;
          const unverified = line.status === 'unverified';
          return (
            <li
              key={line.id}
              class={`helpline${(number?.length ?? 0) > 6 ? ' helpline--wide' : ''}`}
            >
              <button
                type="button"
                class={`helpline__call${spec.urgent ? ' helpline__call--urgent' : ''}`}
                disabled={number === null}
                aria-haspopup="dialog"
                aria-label={
                  number === null
                    ? `${t(spec.label)}: ${t('help.numbers.unavailable')}`
                    : `${t('help.call.aria', { name: t(spec.label), number })}${unverified ? `. ${t('state.unverified')}` : ''}`
                }
                onClick={() => {
                  pending.value = line.id;
                }}
              >
                <span class="helpline__chip">
                  <Icon name="phone" size={14} />
                  <span>{number ?? '—'}</span>
                </span>
                <span class="helpline__name">
                  <Bi k={spec.label} stacked />
                </span>
                {unverified ? (
                  <span class="helpline__flag" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {lines.some((line) => line.status === 'unverified') ? (
        <p class="helpline__legend">* {t('state.unverified')}</p>
      ) : null}
      <details class="helpline__sources">
        <summary>{t('help.sources')}</summary>
        <ul>
          {lines.map((line) => (
            <li key={line.id}>
              <strong>{line.number ?? '—'}</strong> {t(LINES[line.kind].label)}: {line.source}
              {line.status === 'unverified' ? ` · ${t('state.unverified')}` : ''}
            </li>
          ))}
        </ul>
      </details>
      {chosen === undefined || chosen.number === null ? null : (
        <CallConfirm
          kind={chosen.kind}
          number={chosen.number}
          onClose={() => {
            pending.value = null;
          }}
        />
      )}
    </>
  );
}
