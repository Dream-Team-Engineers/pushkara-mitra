import { useSignal } from '@preact/signals';
import type { ComponentType } from 'preact';
import { useEffect } from 'preact/hooks';
import { hrefFor } from '../../app/router';
import { user } from '../../shared/auth/google';
import { tilesAvailable } from '../../shared/data/mapArchive';
import { FLAGS } from '../../shared/flags/flags';
import {
  cleanGroupName,
  connectLive,
  createGroup,
  disconnectLive,
  distanceM,
  GROUP_NAME_MAX,
  joinGroup,
  leaveGroup,
  liveEnded,
  liveMembers,
  liveStatus,
  loadGroup,
  newInviteCode,
  recordGroupConsent,
  removeMember,
  sharing,
  startSharing,
  stopSharing,
  type GroupLoad,
  type JoinOutcome,
  type LiveMember,
} from '../../shared/group/groupClient';
import { forgetCode, readSavedCode, saveCode } from '../../shared/group/savedCode';
import { formatNumber, locale, t } from '../../shared/i18n/i18n';
import {
  deviceLocation,
  startDeviceLocation,
  stopDeviceLocation,
} from '../../shared/location/deviceLocation';
import { ScreenHeader } from '../../shared/ui/Layout';
import { theme } from '../../shared/ui/theme';
import type { LiveMapProps, MapPerson } from '../map/LiveMap';
import { flavorFor } from '../map/mapStyle';

/**
 * My Group, real version (flag `myGroup`, staging build only; ADR 0017). Groups and join codes come
 * from /api/v1/groups; members and positions come from the group's live room while this screen is
 * open, and are kept in memory only. Sharing starts off each time and needs the person's tap and,
 * once per page load, their agreement, which is recorded as a consent.
 *
 * Layout (owner request 2026-11-23): a compact group card first (name, the person's role, member
 * count, join code with Copy), then the members, then sharing; explanations sit in one fold.
 */
type Load = GroupLoad | { readonly status: 'loading' } | { readonly status: 'error' };

const MAX_MEMBERS = 10;

function memberLabel(member: LiveMember): string {
  return member.you ? t('group.live.you') : member.name || t('group.live.member');
}

function memberLine(member: LiveMember, me: LiveMember | undefined): string {
  if (member.pos === null) return t('group.live.notSharing');
  const parts = [
    t('group.live.sharing'),
    t('group.live.updated', { s: formatNumber(member.pos.ageS) }),
  ];
  if (!member.you && me?.pos != null) {
    const metres = distanceM(me.pos, member.pos);
    parts.push(
      metres < 1000
        ? t('group.live.awayM', { m: formatNumber(Math.round(metres / 10) * 10) })
        : t('group.live.awayKm', { km: (metres / 1000).toFixed(1) }),
    );
  }
  return parts.join(' · ');
}

/** Members who are sharing, as map markers. Positions stay in memory, as everywhere on this screen. */
function mapPeople(members: readonly LiveMember[]): readonly MapPerson[] {
  return members.flatMap((member) =>
    member.pos === null
      ? []
      : [
          {
            id: member.id,
            label: memberLabel(member),
            lat: member.pos.lat,
            lng: member.pos.lng,
            you: member.you,
          },
        ],
  );
}

/** Leader first, then you, then everyone else by name. */
function ordered(members: readonly LiveMember[]): readonly LiveMember[] {
  const rank = (member: LiveMember) => (member.role === 'owner' ? 0 : member.you ? 1 : 2);
  return [...members].sort(
    (a, b) => rank(a) - rank(b) || memberLabel(a).localeCompare(memberLabel(b)),
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function LiveGroup() {
  const load = useSignal<Load>({ status: 'loading' });
  const code = useSignal('');
  const groupName = useSignal('');
  const nameInvalid = useSignal(false);
  const savedCode = useSignal<string | null>(null);
  const copied = useSignal<'yes' | 'failed' | null>(null);
  const joinResult = useSignal<JoinOutcome | null>(null);
  const busy = useSignal(false);
  const actionFailed = useSignal(false);
  const agreed = useSignal(false);
  const consentRecorded = useSignal(false);
  const confirmLeave = useSignal(false);
  const confirmRemove = useSignal<string | null>(null);
  const wasRemoved = useSignal(false);
  const liveMap = useSignal<ComponentType<LiveMapProps> | null>(null);

  const refresh = async (): Promise<Load> => {
    try {
      load.value = await loadGroup();
    } catch {
      load.value = { status: 'error' };
    }
    return load.value;
  };

  const signedIn = user.value !== null;
  useEffect(() => {
    void refresh();
  }, [signedIn]);

  const current = load.value;
  const groupId = current.status === 'in' ? current.group.id : null;
  useEffect(() => {
    if (groupId === null) return undefined;
    savedCode.value = readSavedCode(groupId);
    connectLive(groupId);
    return () => {
      disconnectLive();
      stopDeviceLocation();
    };
  }, [groupId]);

  // The owner removed this person: the room closed the connection; show the screen without a group.
  const ended = liveEnded.value;
  useEffect(() => {
    if (ended !== 'removed') return;
    wasRemoved.value = true;
    forgetCode();
    savedCode.value = null;
    void refresh();
  }, [ended]);

  // The small map loads only once somebody is sharing and the regional map is on this site.
  const anyoneSharing = liveMembers.value.some((member) => member.pos !== null);
  useEffect(() => {
    if (!anyoneSharing || liveMap.value !== null) return undefined;
    const mounted = { current: true };
    const isMounted = (): boolean => mounted.current;
    void tilesAvailable().then(async (available) => {
      if (!available || !isMounted()) return;
      try {
        const module = await import('../map/LiveMap');
        if (isMounted()) liveMap.value = module.LiveMap;
      } catch {
        // The member list with distances is the fallback; the map is an enhancement.
      }
    });
    return () => {
      mounted.current = false;
    };
  }, [anyoneSharing]);

  const run = async (action: () => Promise<boolean>) => {
    busy.value = true;
    actionFailed.value = false;
    try {
      actionFailed.value = !(await action());
    } catch {
      actionFailed.value = true;
    } finally {
      busy.value = false;
    }
  };

  const header = <ScreenHeader titleKey="module.group.title" subtitleKey="module.group.subtitle" />;

  if (current.status === 'loading') {
    return (
      <>
        {header}
        <p class="note">{t('group.live.loading')}</p>
      </>
    );
  }
  if (current.status === 'signin' || !signedIn) {
    return (
      <>
        {header}
        <p class="notice">
          {t('group.live.signin')} <a href={hrefFor('pass')}>{t('nav.me')}</a>
        </p>
      </>
    );
  }
  if (current.status === 'unavailable' || current.status === 'error') {
    return (
      <>
        {header}
        <p class="notice">
          {t(current.status === 'error' ? 'group.live.error' : 'group.live.unavailable')}
        </p>
      </>
    );
  }

  if (current.status === 'none') {
    return (
      <>
        {header}
        <div class="group-compact">
          {wasRemoved.value ? (
            <p class="notice" role="status">
              {t('group.live.removed')}
            </p>
          ) : null}
          <p class="note">{t('group.none')}</p>

          <section class="group-panel" aria-labelledby="create-title">
            <h2 id="create-title" class="group-panel__name">
              {t('group.live.create')}
            </h2>
            <label class="group-field" for="group-name">
              <span>{t('group.live.nameLabel')}</span>
              <input
                id="group-name"
                type="text"
                autocomplete="off"
                maxLength={GROUP_NAME_MAX}
                aria-describedby="group-name-hint"
                aria-invalid={nameInvalid.value}
                value={groupName.value}
                onInput={(event) => {
                  groupName.value = event.currentTarget.value;
                  nameInvalid.value = cleanGroupName(groupName.value) === null;
                }}
              />
            </label>
            <p
              id="group-name-hint"
              class="group-panel__hint"
              role={nameInvalid.value ? 'alert' : undefined}
            >
              {t(nameInvalid.value ? 'group.live.badName' : 'group.live.nameHint')}
            </p>
            <button
              type="button"
              class="button button--compact"
              disabled={busy.value || nameInvalid.value}
              onClick={() =>
                void run(async () => {
                  const created = await createGroup(groupName.value);
                  if (created === null) return false;
                  saveCode(created.id, created.joinCode);
                  groupName.value = '';
                  await refresh();
                  return true;
                })
              }
            >
              {t('group.live.create')}
            </button>
          </section>

          <section class="group-panel" aria-labelledby="join-title">
            <h2 id="join-title" class="group-panel__name">
              {t('group.live.join')}
            </h2>
            <label class="group-field" for="group-code">
              <span>{t('group.live.codeLabel')}</span>
              <input
                id="group-code"
                type="text"
                autocomplete="off"
                autocapitalize="characters"
                maxLength={12}
                value={code.value}
                onInput={(event) => {
                  code.value = event.currentTarget.value;
                  joinResult.value = null;
                }}
              />
            </label>
            <button
              type="button"
              class="button button--secondary button--compact"
              disabled={busy.value}
              onClick={() =>
                void run(async () => {
                  const entered = code.value.toUpperCase().replaceAll(/[\s-]/g, '');
                  const result = await joinGroup(entered);
                  joinResult.value = result;
                  if (result === 'joined') {
                    const after = await refresh();
                    if (after.status === 'in') saveCode(after.group.id, entered);
                    code.value = '';
                  }
                  return result !== 'error';
                })
              }
            >
              {t('group.live.join')}
            </button>
            {joinResult.value === 'invalid' ||
            joinResult.value === 'already' ||
            joinResult.value === 'full' ? (
              <p class="group-panel__hint group-panel__hint--alert" role="alert">
                {t(
                  joinResult.value === 'invalid'
                    ? 'group.live.badCode'
                    : joinResult.value === 'full'
                      ? 'group.live.full'
                      : 'group.already',
                )}
              </p>
            ) : null}
          </section>

          {actionFailed.value ? (
            <p class="notice" role="alert">
              {t('group.live.error')}
            </p>
          ) : null}
          <p class="note">{t('group.live.privacy')}</p>
        </div>
      </>
    );
  }

  const group = current.group;
  const isLeader = group.role === 'owner';
  const members = ordered(liveMembers.value);
  const me = members.find((member) => member.you);
  const location = deviceLocation.value;
  const people = mapPeople(members);
  const GroupMap = liveMap.value;
  const shownCode = savedCode.value;

  return (
    <>
      {header}
      <div class="group-compact">
        <section class="group-panel" aria-labelledby="group-title">
          <div class="group-panel__row">
            <h2 id="group-title" class="group-panel__name">
              {group.name ?? t('group.live.unnamed')}
            </h2>
            <span class={isLeader ? 'role-badge role-badge--leader' : 'role-badge'}>
              {t(isLeader ? 'group.live.roleLeader' : 'group.live.roleMember')}
            </span>
          </div>
          <p class="group-panel__meta">
            {t('group.live.count', {
              count: formatNumber(group.memberCount),
              max: formatNumber(MAX_MEMBERS),
            })}
            {' · '}
            {t('group.live.online', { n: formatNumber(members.length) })}
          </p>

          <div class="group-code">
            <span class="group-code__label">{t('group.live.codeLabel')}</span>
            {shownCode === null ? (
              <span class="group-code__none">
                {t(isLeader ? 'group.live.codeNoneLeader' : 'group.live.codeNoneMember')}
              </span>
            ) : (
              <>
                <span class="group-code__value" aria-label={shownCode.split('').join(' ')}>
                  {shownCode}
                </span>
                <button
                  type="button"
                  class="button button--secondary button--compact"
                  onClick={() =>
                    void copyText(shownCode).then((ok) => {
                      copied.value = ok ? 'yes' : 'failed';
                      setTimeout(() => {
                        copied.value = null;
                      }, 2500);
                    })
                  }
                >
                  {t(copied.value === 'yes' ? 'group.live.copied' : 'group.live.copy')}
                </button>
              </>
            )}
            {isLeader ? (
              <button
                type="button"
                class="button button--secondary button--compact"
                disabled={busy.value}
                onClick={() =>
                  void run(async () => {
                    const fresh = await newInviteCode(group.id);
                    if (fresh === null) return false;
                    saveCode(group.id, fresh);
                    savedCode.value = fresh;
                    return true;
                  })
                }
              >
                {t('group.live.newCode')}
              </button>
            ) : null}
          </div>
          <p class="group-panel__hint" role="status">
            {copied.value === 'failed'
              ? t('group.live.copyFailed')
              : shownCode === null
                ? ''
                : t('group.live.codeNote')}
          </p>
        </section>

        <section class="group-section" aria-labelledby="members-title">
          <div class="group-panel__row">
            <h2 id="members-title" class="group-section__title">
              {t('group.live.membersTitle')}
            </h2>
            <span class="group-panel__meta" role="status">
              {t(`group.live.status.${liveStatus.value}`)}
            </span>
          </div>
          <ul class="member-list">
            {members.map((member) => (
              <li key={member.id} class="member-row">
                <span class="member-row__avatar" aria-hidden="true">
                  {memberLabel(member).slice(0, 1).toUpperCase()}
                </span>
                <div class="member-row__body">
                  <p class="member-row__name">
                    {memberLabel(member)}
                    {member.role === 'owner' ? (
                      <span class="role-badge role-badge--leader">
                        {t('group.live.roleLeader')}
                      </span>
                    ) : null}
                  </p>
                  <p class="member-row__meta">{memberLine(member, me)}</p>
                </div>
                {isLeader && !member.you ? (
                  <div class="member-row__actions">
                    {confirmRemove.value === member.id ? (
                      <>
                        <button
                          type="button"
                          class="button button--danger button--compact"
                          disabled={busy.value}
                          onClick={() =>
                            void run(async () => {
                              const removed = await removeMember(group.id, member.id);
                              if (!removed) return false;
                              confirmRemove.value = null;
                              // The server revoked every earlier code; this phone's copy is dead too.
                              forgetCode();
                              savedCode.value = null;
                              await refresh();
                              return true;
                            })
                          }
                        >
                          {t('group.live.removeConfirm')}
                        </button>
                        <button
                          type="button"
                          class="button button--secondary button--compact"
                          onClick={() => {
                            confirmRemove.value = null;
                          }}
                        >
                          {t('group.live.cancel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        class="button button--secondary button--compact"
                        aria-label={t('group.live.removeNamed', { name: memberLabel(member) })}
                        onClick={() => {
                          confirmRemove.value = member.id;
                        }}
                      >
                        {t('group.live.remove')}
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {GroupMap !== null && people.length > 0 ? (
            <div class="group-map">
              <GroupMap
                flavor={flavorFor(theme.value)}
                position={null}
                onOutside={() => undefined}
                people={people}
              />
            </div>
          ) : null}
        </section>

        {FLAGS.geolocation ? (
          <section class="group-section" aria-labelledby="share-title">
            <h2 id="share-title" class="group-section__title">
              {t('group.share.title')}
            </h2>
            {consentRecorded.value ? null : (
              <label class="consent-line">
                <input
                  type="checkbox"
                  checked={agreed.value}
                  onChange={(event) => {
                    agreed.value = event.currentTarget.checked;
                  }}
                />
                <span>{t('group.live.consent')}</span>
              </label>
            )}
            <div class="share-row">
              <button
                type="button"
                class="switch"
                role="switch"
                aria-checked={sharing.value}
                aria-describedby="share-note"
                disabled={busy.value || (!consentRecorded.value && !agreed.value)}
                onClick={() => {
                  if (sharing.value) {
                    stopSharing();
                    return;
                  }
                  void run(async () => {
                    if (!consentRecorded.value) {
                      if (!(await recordGroupConsent(locale.value))) return false;
                      consentRecorded.value = true;
                    }
                    startDeviceLocation();
                    startSharing();
                    return true;
                  });
                }}
              >
                <span class="switch__knob" aria-hidden="true" />
                <span class="visually-hidden">{t('group.share.title')}</span>
              </button>
              <span>{t(sharing.value ? 'group.live.sharingOn' : 'group.live.sharingOff')}</span>
            </div>
            {sharing.value && location.status === 'off' ? (
              <p id="share-note" class="group-panel__hint group-panel__hint--alert">
                {t(`map.locate.${location.reason}`)}
              </p>
            ) : (
              <p id="share-note" class="group-panel__hint">
                {t('group.live.shareNote')}
              </p>
            )}
          </section>
        ) : null}

        {actionFailed.value ? (
          <p class="notice" role="alert">
            {t('group.live.error')}
          </p>
        ) : null}

        <details class="group-help">
          <summary>{t('group.live.help')}</summary>
          <p>{t('group.live.privacy')}</p>
          <p>{t('group.live.onlyOpen')}</p>
          {people.length > 0 ? <p>{t('group.live.mapNote')}</p> : null}
          {isLeader ? <p>{t('group.live.removeNote')}</p> : null}
        </details>

        <div class="group-actions">
          {confirmLeave.value ? (
            <>
              <button
                type="button"
                class="button button--danger button--compact"
                disabled={busy.value}
                onClick={() =>
                  void run(async () => {
                    stopSharing();
                    const left = await leaveGroup(group.id);
                    if (!left) return false;
                    disconnectLive();
                    forgetCode();
                    savedCode.value = null;
                    confirmLeave.value = false;
                    await refresh();
                    return true;
                  })
                }
              >
                {t('group.live.leaveConfirm')}
              </button>
              <button
                type="button"
                class="button button--secondary button--compact"
                onClick={() => {
                  confirmLeave.value = false;
                }}
              >
                {t('group.live.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              class="button button--danger button--compact"
              onClick={() => {
                confirmLeave.value = true;
              }}
            >
              {t('group.leave')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
