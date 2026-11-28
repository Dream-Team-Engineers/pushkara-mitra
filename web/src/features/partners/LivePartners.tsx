import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { hrefFor } from '../../app/router';
import { renderCredentialButton, user } from '../../shared/auth/google';
import { ghatsResource } from '../../shared/data/resources';
import { useResource } from '../../shared/data/useResource';
import { locale, t, type MessageKey } from '../../shared/i18n/i18n';
import {
  applyAsPartner,
  disablePush,
  enablePush,
  loadInbox,
  loadMe,
  markInboxRead,
  PARTNER_KINDS,
  postVolunteerUpdate,
  pushSupported,
  setAvailable,
  UPDATE_VALUES,
  type Nudge,
  type PartnerKind,
  type PartnerMe,
  type PartnerResult,
  type PartnerRole,
  type PushResult,
} from '../../shared/partners/partnersClient';
import { Bi } from '../../shared/ui/Bi';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { KIND_LABELS } from './VolunteerStrip';

/**
 * Partners, real version (flag `partners`, staging build only; ADR 0019). Fixed choices only: no free
 * text, photo, contact detail or position is asked for or sent. Name and email are never typed here:
 * the server takes them from a fresh Google token (DI-20). Nothing is kept in the browser.
 */
type Mode = 'volunteer' | 'partner';
const MODES: readonly ChipOption<Mode>[] = [
  { value: 'volunteer', label: 'pv.mode.volunteer' },
  { value: 'partner', label: 'pv.mode.partner' },
];
/** The kinds of partner; a volunteer is chosen with the toggle above them. */
const PARTNER_ROLES: readonly ChipOption<Exclude<PartnerRole, 'volunteer'>>[] = [
  { value: 'priest', label: 'pv.role.priest' },
  { value: 'vendor', label: 'pv.role.vendor' },
  { value: 'moderator', label: 'pv.role.moderator' },
];
const ROLE_NAME: Readonly<Record<PartnerRole, MessageKey>> = {
  priest: 'pv.roleName.priest',
  volunteer: 'pv.roleName.volunteer',
  vendor: 'pv.roleName.vendor',
  moderator: 'pv.roleName.moderator',
};
const RESULT_TEXT: Readonly<Record<Exclude<PartnerResult, 'ok'>, MessageKey>> = {
  unavailable: 'pv.unavailable',
  signin: 'pv.signin',
  refused: 'pv.refused',
  limited: 'pv.limited',
  failed: 'pv.error',
};

function GhatSelect({
  id,
  label,
  value,
  emptyLabel,
  onChange,
  hideLabel = false,
}: {
  readonly id: string;
  readonly label: MessageKey;
  readonly value: string;
  readonly emptyLabel: MessageKey;
  readonly onChange: (value: string) => void;
  readonly hideLabel?: boolean;
}) {
  const state = useResource(ghatsResource);
  const ghats = state.status === 'ready' ? state.data : [];
  return (
    <div class="field">
      <label for={id} class={hideLabel ? 'visually-hidden' : undefined}>
        <Bi k={label} />
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      >
        <option value="">{t(emptyLabel)}</option>
        {ghats.map((ghat) => (
          <option key={ghat.id} value={ghat.id}>
            {ghat.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ApplyForm({
  onApplied,
  initialMode = 'volunteer',
}: {
  readonly onApplied: () => void;
  readonly initialMode?: Mode;
}) {
  const mode = useSignal<Mode>(initialMode);
  const kind = useSignal<Exclude<PartnerRole, 'volunteer'>>('priest');
  const ghat = useSignal('');
  const consent = useSignal(false);
  const adult = useSignal(false);
  const problem = useSignal<MessageKey | null>(null);
  const sending = useSignal(false);
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = slot.current;
    if (!consent.value || !adult.value || parent === null) return;
    problem.value = null;
    renderCredentialButton(parent, (credential) => {
      if (credential === null) {
        problem.value = 'pv.error';
        return;
      }
      sending.value = true;
      applyAsPartner({
        credential,
        role: mode.value === 'volunteer' ? 'volunteer' : kind.value,
        ghatId: ghat.value === '' ? null : ghat.value,
        locale: locale.value,
      })
        .then((result) => {
          sending.value = false;
          if (result === 'ok') onApplied();
          else problem.value = RESULT_TEXT[result];
        })
        .catch(() => {
          sending.value = false;
          problem.value = 'pv.error';
        });
    }).catch(() => {
      problem.value = 'pv.error';
    });
    // The button is drawn once consent is given; later choices are read when the token arrives.
  }, [consent.value, adult.value]);

  return (
    <>
      <p class="note">{t('pv.intro')}</p>
      <div class="pv-mode">
        <ChipGroup
          legend="pv.mode.legend"
          options={MODES}
          selected={mode.value}
          onSelect={(value) => {
            mode.value = value;
          }}
        />
        {mode.value === 'partner' ? (
          <ChipGroup
            legend="pv.mode.kind"
            options={PARTNER_ROLES}
            selected={kind.value}
            onSelect={(value) => {
              kind.value = value;
            }}
          />
        ) : null}
      </div>
      <GhatSelect
        id="pv-ghat"
        label="pv.ghat.label"
        value={ghat.value}
        emptyLabel="pv.ghat.none"
        onChange={(value) => {
          ghat.value = value;
        }}
      />
      <div class="field field--check">
        <input
          id="pv-consent"
          type="checkbox"
          checked={consent.value}
          onChange={(event) => {
            consent.value = event.currentTarget.checked;
          }}
        />
        <label for="pv-consent">{t('pv.consent')}</label>
      </div>
      <div class="field field--check">
        <input
          id="pv-adult"
          type="checkbox"
          checked={adult.value}
          onChange={(event) => {
            adult.value = event.currentTarget.checked;
          }}
        />
        <label for="pv-adult">{t('pv.adult')}</label>
      </div>
      {consent.value && adult.value ? (
        <>
          <p class="note">{t('pv.apply.hint')}</p>
          <div ref={slot} />
        </>
      ) : (
        <p class="note">{t('pv.consent.first')}</p>
      )}
      {sending.value ? <p role="status">{t('pv.apply.sending')}</p> : null}
      {problem.value === null ? null : (
        <p class="notice" role="alert">
          {t(problem.value)}
        </p>
      )}
      <p class="note">{t('pv.privacy')}</p>
    </>
  );
}

function Inbox({
  unread,
  onRead,
  onReport,
}: {
  readonly unread: number;
  readonly onRead: () => void;
  readonly onReport: () => void;
}) {
  const nudges = useSignal<readonly Nudge[] | null>(null);
  const failed = useSignal(false);
  const ghats = useResource(ghatsResource);
  const names = new Map(
    ghats.status === 'ready' ? ghats.data.map((ghat) => [ghat.id, ghat.name] as const) : [],
  );

  useEffect(() => {
    const alive = { current: true };
    const isLive = (): boolean => alive.current;
    loadInbox()
      .then(async (list) => {
        if (!alive.current) return;
        nudges.value = list;
        if (list.some((nudge) => !nudge.read)) {
          // Opening the inbox counts as reading it; the unread badge is refreshed afterwards.
          if ((await markInboxRead()) === 'ok' && isLive()) onRead();
        }
      })
      .catch(() => {
        if (alive.current) failed.value = true;
      });
    return () => {
      alive.current = false;
    };
  }, [unread]);

  return (
    <section class="b-card" aria-labelledby="pv-inbox-title">
      <h2 id="pv-inbox-title" class="section__title">
        <Bi k="pv.inbox.title" />
      </h2>
      {failed.value ? <p class="notice">{t('pv.error')}</p> : null}
      {nudges.value !== null && nudges.value.length === 0 ? (
        <p class="note">{t('pv.inbox.empty')}</p>
      ) : null}
      <ul class="card-list">
        {(nudges.value ?? []).map((nudge) => (
          <li key={nudge.id} class="card pv-request">
            <div>
              <p class="card__title">
                {nudge.read ? '' : '● '}
                {t(`pv.nudge.${nudge.kind}`)}
              </p>
              <p class="card__meta">
                {nudge.ghatId === null
                  ? t('pv.nudge.anyGhat')
                  : (names.get(nudge.ghatId) ?? nudge.ghatId)}
              </p>
            </div>
            <button type="button" class="button pv-request__go" onClick={onReport}>
              {t('pv.inbox.report')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One short word per choice, so each report fits on a single line. */
const SHORT_LABEL: Readonly<Record<PartnerKind, Readonly<Record<string, MessageKey>>>> = {
  crowd: { low: 'pv.crowd.low', moderate: 'pv.crowd.moderate', high: 'pv.crowd.high' },
  river: { normal: 'pv.river.normal', rising: 'pv.river.rising', high: 'pv.river.high' },
  food: { available: 'pv.yes', finished: 'pv.no' },
};

function PostUpdate() {
  const ghat = useSignal('');
  const picks = useSignal<Readonly<Partial<Record<PartnerKind, string>>>>({});
  const message = useSignal<MessageKey | null>(null);
  const sending = useSignal(false);
  const chosen = PARTNER_KINDS.filter((kind) => (picks.value[kind] ?? '') !== '');
  const ready = ghat.value !== '' && chosen.length > 0 && !sending.value;

  const send = (): void => {
    sending.value = true;
    message.value = null;
    const ghatId = ghat.value;
    Promise.all(
      chosen.map(async (kind) => ({
        kind,
        result: await postVolunteerUpdate({ kind, ghatId, value: picks.value[kind] ?? '' }),
      })),
    )
      .then((outcomes) => {
        sending.value = false;
        // Items that went through are cleared; the others stay selected so they can be sent again.
        const kept: Partial<Record<PartnerKind, string>> = {};
        for (const { kind, result } of outcomes) {
          if (result !== 'ok') {
            const value = picks.value[kind];
            if (value !== undefined) kept[kind] = value;
          }
        }
        picks.value = kept;
        const failed = outcomes.filter((outcome) => outcome.result !== 'ok');
        const first = failed[0];
        if (first === undefined) message.value = 'pv.post.done';
        else if (failed.length < outcomes.length) message.value = 'pv.post.partial';
        else if (first.result === 'limited') message.value = 'pv.post.waitTen';
        else message.value = first.result === 'ok' ? 'pv.error' : RESULT_TEXT[first.result];
      })
      .catch(() => {
        sending.value = false;
        message.value = 'pv.error';
      });
  };

  return (
    <section class="b-card" aria-labelledby="pv-post-title">
      <h2 id="pv-post-title" class="section__title">
        <Bi k="pv.post.title" />
      </h2>
      <GhatSelect
        id="pv-post-ghat"
        label="pv.post.ghat"
        value={ghat.value}
        emptyLabel="pv.post.pick"
        hideLabel
        onChange={(next) => {
          ghat.value = next;
          message.value = null;
        }}
      />
      {PARTNER_KINDS.map((kind) => (
        <div key={kind} class="pv-line">
          <span class="pv-line__name" id={`pv-kind-${kind}`}>
            {t(kind === 'food' ? 'pv.kind.foodShort' : KIND_LABELS[kind])}
          </span>
          <div class="pv-line__picks" role="group" aria-labelledby={`pv-kind-${kind}`}>
            {UPDATE_VALUES[kind].map((choice) => (
              <button
                key={choice}
                type="button"
                class="choice"
                aria-pressed={picks.value[kind] === choice}
                onClick={() => {
                  // Tapping the chosen option again clears it, so a tab can be left out.
                  picks.value = {
                    ...picks.value,
                    [kind]: picks.value[kind] === choice ? '' : choice,
                  };
                  message.value = null;
                }}
              >
                {t(SHORT_LABEL[kind][choice] ?? 'pv.error')}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div class="actions">
        <button type="button" class="button" disabled={!ready} onClick={send}>
          {t('pv.post.send')}
        </button>
      </div>
      {message.value === null ? null : (
        <p class="notice" role="status">
          {t(message.value)}
        </p>
      )}
    </section>
  );
}

/** One line: a label, Yes/No and a small switch. */
function ToggleRow({
  id,
  label,
  on,
  disabled,
  onToggle,
}: {
  readonly id: string;
  readonly label: MessageKey;
  readonly on: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div class="pv-row">
      <span id={id} class="pv-row__label">
        {t(label)}
      </span>
      <span class="pv-row__state" aria-hidden="true">
        {t(on ? 'pv.yes' : 'pv.no')}
      </span>
      <button
        type="button"
        class="switch"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        disabled={disabled}
        onClick={onToggle}
      >
        <span class="switch__knob" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Phone notifications (ADR 0020): off until the partner taps; the message is always the same fixed line. */
function PushRow({
  push,
  reload,
}: {
  readonly push: { readonly key: string; readonly on: boolean };
  readonly reload: () => void;
}) {
  const busy = useSignal(false);
  const problem = useSignal<MessageKey | null>(null);
  const run = (job: Promise<PushResult>) => {
    busy.value = true;
    job
      .then((result) => {
        busy.value = false;
        problem.value =
          result === 'ok'
            ? null
            : result === 'denied'
              ? 'pv.push.denied'
              : result === 'unsupported'
                ? 'pv.push.unsupported'
                : RESULT_TEXT[result];
        reload();
      })
      .catch(() => {
        busy.value = false;
        problem.value = 'pv.error';
      });
  };
  const supported = pushSupported();
  return (
    <>
      <ToggleRow
        id="pv-push-title"
        label="pv.push.title"
        on={push.on}
        disabled={busy.value || (!push.on && !supported)}
        onToggle={() => {
          if (busy.value) return;
          run(push.on ? disablePush(locale.value) : enablePush(push.key, locale.value));
        }}
      />
      {!supported ? <p class="notice">{t('pv.push.unsupported')}</p> : null}
      {problem.value === null ? null : <p class="notice">{t(problem.value)}</p>}
    </>
  );
}

function ApprovedView({
  me,
  reload,
}: {
  readonly me: Extract<PartnerMe, { status: 'approved' }>;
  readonly reload: () => void;
}) {
  const busy = useSignal(false);
  const problem = useSignal<MessageKey | null>(null);
  const goToReport = (): void => {
    const scroll = (): void => {
      window.setTimeout(() => {
        document.getElementById('pv-post-title')?.scrollIntoView({ block: 'start' });
      }, 400);
    };
    if (me.available || busy.value) {
      scroll();
      return;
    }
    // Reporting needs the partner to be available, so the button switches that on first.
    busy.value = true;
    setAvailable(true)
      .then((result) => {
        busy.value = false;
        problem.value = result === 'ok' ? null : RESULT_TEXT[result];
        reload();
        if (result === 'ok') scroll();
      })
      .catch(() => {
        busy.value = false;
        problem.value = 'pv.error';
      });
  };
  return (
    <>
      <section class="b-card pv-quick" aria-label={t('pv.available.title')}>
        <ToggleRow
          id="pv-avail-title"
          label="pv.available.title"
          on={me.available}
          disabled={busy.value}
          onToggle={() => {
            if (busy.value) return;
            busy.value = true;
            setAvailable(!me.available)
              .then((result) => {
                busy.value = false;
                problem.value = result === 'ok' ? null : RESULT_TEXT[result];
                reload();
              })
              .catch(() => {
                busy.value = false;
                problem.value = 'pv.error';
              });
          }}
        />
        {me.push === null ? null : <PushRow push={me.push} reload={reload} />}
        {problem.value === null ? null : <p class="notice">{t(problem.value)}</p>}
      </section>
      <Inbox unread={me.unread} onRead={reload} onReport={goToReport} />
      {me.available ? <PostUpdate /> : <p class="note">{t('pv.post.needAvailable')}</p>}
      <ChangeRole onApplied={reload} />
      <div class="pv-foot">
        <p class="note">{t('pv.status.approvedAs', { role: t(ROLE_NAME[me.role]) })}</p>
        <p class="note">{t('pv.available.note')}</p>
        {me.push === null ? null : <p class="note">{t('pv.push.note')}</p>}
        <p class="note">{t('pv.post.pickOne')}</p>
        <p class="note">{t('pv.post.note')}</p>
        <p class="note">{t('pv.strip.river')}</p>
      </div>
    </>
  );
}

/**
 * Another role (owner request 2026-11-26): an approved or waiting partner can ask to be a priest,
 * vendor, moderator or volunteer instead. The new request waits for staff like the first one.
 */
function ChangeRole({ onApplied }: { readonly onApplied: () => void }) {
  const open = useSignal(false);
  return (
    <section class="b-card" aria-labelledby="pv-change-title">
      <h2 id="pv-change-title" class="section__title">
        <Bi k="pv.change.title" />
      </h2>
      <p class="note">{t('pv.change.note')}</p>
      {open.value ? (
        <>
          <ApplyForm onApplied={onApplied} initialMode="partner" />
          <div class="actions">
            <button
              type="button"
              class="button button--secondary"
              onClick={() => {
                open.value = false;
              }}
            >
              {t('pv.change.cancel')}
            </button>
          </div>
        </>
      ) : (
        <div class="actions">
          <button
            type="button"
            class="button button--secondary"
            onClick={() => {
              open.value = true;
            }}
          >
            {t('pv.change.start')}
          </button>
        </div>
      )}
    </section>
  );
}

export default function LivePartners() {
  const me = useSignal<PartnerMe | null>(null);
  const failed = useSignal(false);
  const signedIn = user.value !== null;

  const reload = (): void => {
    loadMe()
      .then((next) => {
        me.value = next;
        failed.value = false;
      })
      .catch(() => {
        failed.value = true;
      });
  };

  useEffect(() => {
    if (!signedIn) {
      me.value = null;
      return;
    }
    reload();
  }, [signedIn]);

  let body;
  if (!signedIn) {
    body = (
      <p class="notice">
        {t('pv.signin')} <a href={hrefFor('pass')}>{t('nav.me')}</a>
      </p>
    );
  } else if (failed.value) {
    body = <p class="notice">{t('pv.error')}</p>;
  } else if (me.value === null) {
    body = <p class="note">{t('pv.loading')}</p>;
  } else if (me.value.status === 'unavailable') {
    body = <p class="note">{t('pv.unavailable')}</p>;
  } else if (me.value.status === 'signin') {
    body = (
      <p class="notice">
        {t('pv.signin')} <a href={hrefFor('pass')}>{t('nav.me')}</a>
      </p>
    );
  } else if (me.value.status === 'none') {
    body = <ApplyForm onApplied={reload} />;
  } else if (me.value.status === 'approved') {
    body = <ApprovedView me={me.value} reload={reload} />;
  } else if (me.value.status === 'pending') {
    body = (
      <>
        <p class="notice">{t('pv.status.pending')}</p>
        <ChangeRole onApplied={reload} />
      </>
    );
  } else {
    body = <p class="notice">{t(`pv.status.${me.value.status}`)}</p>;
  }

  return (
    <>
      <ScreenHeader titleKey="module.partners.title" subtitleKey="module.partners.subtitle" />
      {body}
      <p class="note">
        <a href={hrefFor('help')}>{t('partners.emergency')}</a>
      </p>
    </>
  );
}
