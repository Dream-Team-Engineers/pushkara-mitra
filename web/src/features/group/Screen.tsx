import { useSignal } from '@preact/signals';
import { Bi } from '../../shared/ui/Bi';
import { hrefFor } from '../../app/router';
import { formatNumber, t } from '../../shared/i18n/i18n';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';

/**
 * My Group prototype (flags `myGroup` and `geolocation` are off). Sample members only, held in
 * component memory. No group is created, no invitation exists, no location is read or shared,
 * and nothing is sent or stored. ADR 0004 (location) and the stalking/coercion threat model
 * must be approved before any of this becomes real.
 */
export interface Member {
  readonly id: string;
  /** `null` means the signed-in person ("You"); other names are sample placeholders. */
  readonly name: string | null;
  readonly status: 'off' | 'waiting';
}

export const SAMPLE_MEMBERS: readonly Member[] = [
  { id: 'me', name: null, status: 'off' },
  { id: 'm2', name: '[Member 2]', status: 'off' },
  { id: 'm3', name: '[Member 3]', status: 'off' },
];

export const MAX_MEMBERS = 10;
const MAX_MEMBER_NAME = 40;

export type AddResult =
  | { readonly ok: true; readonly members: readonly Member[] }
  | { readonly ok: false; readonly error: 'empty' | 'duplicate' | 'full' };

/**
 * Adds a member by name. One person stays in one group only, so a name already in the group is
 * refused (compared without case or extra spaces). `id` must be unique in the list.
 */
export function addMember(members: readonly Member[], rawName: string, id: string): AddResult {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, MAX_MEMBER_NAME);
  if (name === '') return { ok: false, error: 'empty' };
  if (members.length >= MAX_MEMBERS) return { ok: false, error: 'full' };
  const key = name.toLocaleLowerCase();
  if (members.some((member) => member.name?.toLocaleLowerCase() === key)) {
    return { ok: false, error: 'duplicate' };
  }
  return { ok: true, members: [...members, { id, name, status: 'off' }] };
}

export function approveMember(members: readonly Member[], id: string): readonly Member[] {
  return members.map((member) =>
    member.id === id && member.status === 'waiting' ? { ...member, status: 'off' } : member,
  );
}

/** The creator ("me") can never be removed from their own group. */
export function removeMember(members: readonly Member[], id: string): readonly Member[] {
  return id === 'me' ? members : members.filter((member) => member.id !== id);
}

type Tab = 'create' | 'join';

const TABS: readonly ChipOption<Tab>[] = [
  { value: 'create', label: 'group.tab.create' },
  { value: 'join', label: 'group.tab.join' },
];

export default function GroupScreen() {
  const tab = useSignal<Tab>('create');
  const groupName = useSignal('');
  const code = useSignal('');
  const created = useSignal(false);
  const joined = useSignal(false);
  const members = useSignal<readonly Member[]>(SAMPLE_MEMBERS);
  // The person starts in the sample group (themselves plus two members), and can be in only one.
  const inGroup = useSignal(true);
  const newName = useSignal('');
  const addError = useSignal<'empty' | 'duplicate' | 'full' | null>(null);
  const nextId = useSignal(4);

  return (
    <>
      <ScreenHeader titleKey="module.group.title" subtitleKey="module.group.subtitle" />
      <PrototypeBanner />
      <ChipGroup
        legend="group.tab.legend"
        options={TABS}
        selected={tab.value}
        onSelect={(value) => {
          tab.value = value;
        }}
      />
      {tab.value === 'create' ? (
        <>
          <div class="field">
            <label for="group-name">
              <Bi k="group.name.label" />
            </label>
            <input
              id="group-name"
              type="text"
              autocomplete="off"
              maxLength={40}
              value={groupName.value}
              onInput={(event) => {
                groupName.value = event.currentTarget.value;
              }}
            />
          </div>
          <div class="actions">
            <button
              type="button"
              class="button"
              onClick={() => {
                if (inGroup.value) return;
                created.value = true;
                inGroup.value = true;
                members.value = SAMPLE_MEMBERS;
              }}
            >
              {t('group.create')}
            </button>
          </div>
          {inGroup.value && !created.value ? <p class="notice">{t('group.already')}</p> : null}
          {created.value ? (
            <section class="card code-card" aria-labelledby="group-code-title">
              <h2 id="group-code-title" class="card__title">
                <Bi k="group.code.title" />
              </h2>
              <p class="code">PM-SAMPLE</p>
              <p class="card__meta">{t('group.code.note')}</p>
              <p class="card__meta">{t('group.invite.pending')}</p>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <div class="field">
            <label for="group-code">
              <Bi k="group.code.label" />
            </label>
            <input
              id="group-code"
              type="text"
              autocomplete="off"
              autocapitalize="characters"
              maxLength={12}
              value={code.value}
              onInput={(event) => {
                code.value = event.currentTarget.value;
              }}
            />
          </div>
          <div class="actions">
            <button
              type="button"
              class="button"
              onClick={() => {
                if (inGroup.value) return;
                joined.value = true;
              }}
            >
              {t('group.join')}
            </button>
          </div>
          <p class="note">{t('group.join.note')}</p>
          {inGroup.value ? <p class="notice">{t('group.already')}</p> : null}
          {joined.value && !inGroup.value ? (
            <p class="notice">{t('group.status.waiting')}</p>
          ) : null}
        </>
      )}
      {inGroup.value ? null : <p class="note">{t('group.none')}</p>}
      <section class="section" aria-labelledby="members-title" hidden={!inGroup.value}>
        <h2 id="members-title" class="section__title">
          {t('group.members', { count: formatNumber(members.value.length) })}
        </h2>
        <ul class="card-list card-list--flush">
          {members.value.map((member) => (
            <li key={member.id} class="card member">
              <div>
                <p class="card__title">{member.name ?? t('group.you')}</p>
                <p class="card__meta">
                  {member.status === 'waiting' ? t('group.status.waiting') : t('group.status.off')}
                </p>
              </div>
              {member.id === 'me' ? null : (
                <div class="member__actions">
                  {member.status === 'waiting' ? (
                    <button
                      type="button"
                      class="button button--secondary"
                      onClick={() => {
                        members.value = approveMember(members.value, member.id);
                      }}
                    >
                      {t('group.approve')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    class="button button--secondary"
                    aria-label={`${t('group.remove')}: ${member.name ?? ''}`}
                    onClick={() => {
                      members.value = removeMember(members.value, member.id);
                    }}
                  >
                    {/* SVG, not the "×" character: no bundled font has that glyph. */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M2 2l10 10M12 2L2 12"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        fill="none"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div class="field member-add">
          <label for="member-name">
            <Bi k="group.add.label" />
          </label>
          <div class="member-add__row">
            <input
              id="member-name"
              type="text"
              autocomplete="off"
              maxLength={40}
              value={newName.value}
              aria-invalid={addError.value !== null}
              aria-describedby={addError.value === null ? undefined : 'member-add-error'}
              onInput={(event) => {
                newName.value = event.currentTarget.value;
                addError.value = null;
              }}
            />
            <button
              type="button"
              class="button"
              onClick={() => {
                const result = addMember(members.value, newName.value, `m${String(nextId.value)}`);
                if (result.ok) {
                  members.value = result.members;
                  nextId.value += 1;
                  newName.value = '';
                  addError.value = null;
                } else {
                  addError.value = result.error;
                }
              }}
            >
              {t('group.add.button')}
            </button>
          </div>
          {addError.value === null ? null : (
            <p id="member-add-error" class="notice" role="alert">
              {addError.value === 'full'
                ? t('group.add.full', { max: formatNumber(MAX_MEMBERS) })
                : t(addError.value === 'empty' ? 'group.add.empty' : 'group.add.duplicate')}
            </p>
          )}
        </div>
      </section>
      <section class="section" aria-labelledby="share-title">
        <h2 id="share-title" class="section__title">
          <Bi k="group.share.title" />
        </h2>
        <button
          type="button"
          class="switch"
          role="switch"
          aria-checked="false"
          aria-describedby="share-note"
          disabled
        >
          <span class="switch__knob" aria-hidden="true" />
          <span class="visually-hidden">{t('group.share.title')}</span>
        </button>
        <p id="share-note" class="note note--flush">
          {t('group.share.disabled')}
        </p>
      </section>
      <div class="actions">
        <a class="button button--secondary" href={hrefFor('map')}>
          <Bi k="group.seeOnMap" />
        </a>
        <button
          type="button"
          class="button button--danger"
          onClick={() => {
            members.value = [];
            inGroup.value = false;
            addError.value = null;
            newName.value = '';
            created.value = false;
            joined.value = false;
            groupName.value = '';
            code.value = '';
          }}
        >
          {t('group.leave')}
        </button>
      </div>
      <p class="note">{t('proto.notSent')}</p>
    </>
  );
}
