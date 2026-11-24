import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { hrefFor } from '../../app/router';
import { renderCredentialButton, user } from '../../shared/auth/google';
import { ghatsResource } from '../../shared/data/resources';
import { useResource } from '../../shared/data/useResource';
import { locale, t, type MessageKey } from '../../shared/i18n/i18n';
import {
  applyAsPartner,
  loadInbox,
  loadMe,
  markInboxRead,
  PARTNER_KINDS,
  postVolunteerUpdate,
  setAvailable,
  UPDATE_VALUES,
  type Nudge,
  type PartnerKind,
  type PartnerMe,
  type PartnerResult,
  type PartnerRole,
} from '../../shared/partners/partnersClient';
import { Bi } from '../../shared/ui/Bi';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { KIND_LABELS, valueLabel } from './VolunteerStrip';

/**
 * Partners, real version (flag `partners`, staging build only; ADR 0019). Fixed choices only: no free
 * text, photo, contact detail or position is asked for or sent. Name and email are never typed here:
 * the server takes them from a fresh Google token (DI-20). Nothing is kept in the browser.
 */
const ROLES: readonly ChipOption<PartnerRole>[] = [
  { value: 'priest', label: 'pv.role.priest' },
  { value: 'volunteer', label: 'pv.role.volunteer' },
];
const KINDS: readonly ChipOption<PartnerKind>[] = PARTNER_KINDS.map((kind) => ({
  value: kind,
  label: KIND_LABELS[kind],
}));
type Availability = 'on' | 'off';
const AVAILABILITY: readonly ChipOption<Availability>[] = [
  { value: 'on', label: 'pv.available.on' },
  { value: 'off', label: 'pv.available.off' },
];

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
}: {
  readonly id: string;
  readonly label: MessageKey;
  readonly value: string;
  readonly emptyLabel: MessageKey;
  readonly onChange: (value: string) => void;
}) {
  const state = useResource(ghatsResource);
  const ghats = state.status === 'ready' ? state.data : [];
  return (
    <div class="field">
      <label for={id}>
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

function ApplyForm({ onApplied }: { readonly onApplied: () => void }) {
  const role = useSignal<PartnerRole>('volunteer');
  const ghat = useSignal('');
  const consent = useSignal(false);
  const problem = useSignal<MessageKey | null>(null);
  const sending = useSignal(false);
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = slot.current;
    if (!consent.value || parent === null) return;
    problem.value = null;
    renderCredentialButton(parent, (credential) => {
      if (credential === null) {
        problem.value = 'pv.error';
        return;
      }
      sending.value = true;
      applyAsPartner({
        credential,
        role: role.value,
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
  }, [consent.value]);

  return (
    <>
      <p class="note">{t('pv.intro')}</p>
      <ChipGroup
        legend="pv.role.legend"
        options={ROLES}
        selected={role.value}
        onSelect={(value) => {
          role.value = value;
        }}
      />
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
      {consent.value ? (
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

function Inbox({ unread, onRead }: { readonly unread: number; readonly onRead: () => void }) {
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
    <section class="section" aria-labelledby="pv-inbox-title">
      <h2 id="pv-inbox-title" class="section__title">
        <Bi k="pv.inbox.title" />
      </h2>
      {failed.value ? <p class="notice">{t('pv.error')}</p> : null}
      {nudges.value !== null && nudges.value.length === 0 ? (
        <p class="note">{t('pv.inbox.empty')}</p>
      ) : null}
      <ul class="card-list">
        {(nudges.value ?? []).map((nudge) => (
          <li key={nudge.id} class="card">
            <p class="card__title">
              {nudge.read ? '' : '● '}
              {t(`pv.nudge.${nudge.kind}`)}
            </p>
            <p class="card__meta">
              {nudge.ghatId === null
                ? t('pv.nudge.anyGhat')
                : (names.get(nudge.ghatId) ?? nudge.ghatId)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PostUpdate() {
  const kind = useSignal<PartnerKind>('crowd');
  const ghat = useSignal('');
  const value = useSignal('');
  const message = useSignal<MessageKey | null>(null);
  const sending = useSignal(false);
  const choices = UPDATE_VALUES[kind.value];
  const options: readonly ChipOption<string>[] = choices.flatMap((choice) => {
    const label = valueLabel(kind.value, choice);
    return label === null ? [] : [{ value: choice, label }];
  });
  const ready = ghat.value !== '' && value.value !== '' && !sending.value;

  return (
    <section class="section" aria-labelledby="pv-post-title">
      <h2 id="pv-post-title" class="section__title">
        <Bi k="pv.post.title" />
      </h2>
      <ChipGroup
        legend="pv.kind.legend"
        options={KINDS}
        selected={kind.value}
        onSelect={(next) => {
          kind.value = next;
          value.value = '';
          message.value = null;
        }}
      />
      <GhatSelect
        id="pv-post-ghat"
        label="pv.post.ghat"
        value={ghat.value}
        emptyLabel="pv.post.pick"
        onChange={(next) => {
          ghat.value = next;
          message.value = null;
        }}
      />
      <ChipGroup
        legend="pv.post.value"
        options={options}
        selected={value.value}
        onSelect={(next) => {
          value.value = next;
          message.value = null;
        }}
      />
      <div class="actions">
        <button
          type="button"
          class="button"
          disabled={!ready}
          onClick={() => {
            sending.value = true;
            postVolunteerUpdate({ kind: kind.value, ghatId: ghat.value, value: value.value })
              .then((result) => {
                sending.value = false;
                message.value = result === 'ok' ? 'pv.post.done' : RESULT_TEXT[result];
                if (result === 'ok') value.value = '';
              })
              .catch(() => {
                sending.value = false;
                message.value = 'pv.error';
              });
          }}
        >
          {t('pv.post.send')}
        </button>
      </div>
      {message.value === null ? null : (
        <p class="notice" role="status">
          {t(message.value)}
        </p>
      )}
      <p class="note">{t('pv.post.note')}</p>
      {kind.value === 'river' ? <p class="note">{t('pv.strip.river')}</p> : null}
    </section>
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
  return (
    <>
      <p class="note">{t('pv.status.approved')}</p>
      <section class="section" aria-labelledby="pv-avail-title">
        <h2 id="pv-avail-title" class="section__title">
          <Bi k="pv.available.title" />
        </h2>
        <ChipGroup
          legend="pv.available.title"
          options={AVAILABILITY}
          selected={me.available ? 'on' : 'off'}
          onSelect={(next) => {
            if (busy.value) return;
            busy.value = true;
            setAvailable(next === 'on')
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
        <p class="note">{t('pv.available.note')}</p>
        {problem.value === null ? null : <p class="notice">{t(problem.value)}</p>}
      </section>
      <Inbox unread={me.unread} onRead={reload} />
      {me.available ? <PostUpdate /> : <p class="note">{t('pv.post.needAvailable')}</p>}
    </>
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
