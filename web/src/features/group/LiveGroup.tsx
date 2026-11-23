import { useSignal } from '@preact/signals';
import type { ComponentType } from 'preact';
import { useEffect } from 'preact/hooks';
import { hrefFor } from '../../app/router';
import { user } from '../../shared/auth/google';
import { tilesAvailable } from '../../shared/data/mapArchive';
import { FLAGS } from '../../shared/flags/flags';
import {
  connectLive,
  createGroup,
  disconnectLive,
  distanceM,
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
import { formatNumber, locale, t } from '../../shared/i18n/i18n';
import {
  deviceLocation,
  startDeviceLocation,
  stopDeviceLocation,
} from '../../shared/location/deviceLocation';
import { Bi } from '../../shared/ui/Bi';
import { ScreenHeader } from '../../shared/ui/Layout';
import { theme } from '../../shared/ui/theme';
import type { LiveMapProps, MapPerson } from '../map/LiveMap';
import { flavorFor } from '../map/mapStyle';

/**
 * My Group, real version (flag `myGroup`, staging build only; ADR 0017). Groups and join codes come
 * from /api/v1/groups; members and positions come from the group's live room while this screen is
 * open, and are kept in memory only. Sharing starts off each time and needs the person's tap and,
 * once per page load, their agreement, which is recorded as a consent.
 */
type Load = GroupLoad | { readonly status: 'loading' } | { readonly status: 'error' };

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
            label: member.you ? t('group.live.you') : member.name || t('group.live.member'),
            lat: member.pos.lat,
            lng: member.pos.lng,
            you: member.you,
          },
        ],
  );
}

export default function LiveGroup() {
  const load = useSignal<Load>({ status: 'loading' });
  const code = useSignal('');
  const joinCode = useSignal<string | null>(null);
  const joinResult = useSignal<JoinOutcome | null>(null);
  const busy = useSignal(false);
  const actionFailed = useSignal(false);
  const agreed = useSignal(false);
  const consentRecorded = useSignal(false);
  const confirmLeave = useSignal(false);
  const confirmRemove = useSignal<string | null>(null);
  const wasRemoved = useSignal(false);
  const liveMap = useSignal<ComponentType<LiveMapProps> | null>(null);

  const refresh = async () => {
    try {
      load.value = await loadGroup();
    } catch {
      load.value = { status: 'error' };
    }
  };

  const signedIn = user.value !== null;
  useEffect(() => {
    void refresh();
  }, [signedIn]);

  const current = load.value;
  const groupId = current.status === 'in' ? current.group.id : null;
  useEffect(() => {
    if (groupId === null) return undefined;
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
    joinCode.value = null;
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
        {wasRemoved.value ? (
          <p class="notice" role="status">
            {t('group.live.removed')}
          </p>
        ) : null}
        <p class="note">{t('group.none')}</p>
        <div class="actions">
          <button
            type="button"
            class="button"
            disabled={busy.value}
            onClick={() =>
              void run(async () => {
                const created = await createGroup();
                if (created === null) return false;
                joinCode.value = created.joinCode;
                await refresh();
                return true;
              })
            }
          >
            {t('group.live.create')}
          </button>
        </div>
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
              joinResult.value = null;
            }}
          />
        </div>
        <div class="actions">
          <button
            type="button"
            class="button button--secondary"
            disabled={busy.value}
            onClick={() =>
              void run(async () => {
                const result = await joinGroup(code.value);
                joinResult.value = result;
                if (result === 'joined') await refresh();
                return result !== 'error';
              })
            }
          >
            {t('group.live.join')}
          </button>
        </div>
        {joinResult.value === 'invalid' ||
        joinResult.value === 'already' ||
        joinResult.value === 'full' ? (
          <p class="notice" role="alert">
            {t(
              joinResult.value === 'invalid'
                ? 'group.live.badCode'
                : joinResult.value === 'full'
                  ? 'group.live.full'
                  : 'group.already',
            )}
          </p>
        ) : null}
        {actionFailed.value ? (
          <p class="notice" role="alert">
            {t('group.live.error')}
          </p>
        ) : null}
        <p class="note">{t('group.live.privacy')}</p>
      </>
    );
  }

  const group = current.group;
  const members = liveMembers.value;
  const me = members.find((member) => member.you);
  const location = deviceLocation.value;
  const people = mapPeople(members);
  const GroupMap = liveMap.value;

  return (
    <>
      {header}
      {joinCode.value === null ? null : (
        <section class="card code-card" aria-labelledby="group-code-title">
          <h2 id="group-code-title" class="card__title">
            <Bi k="group.code.title" />
          </h2>
          <p class="code">{joinCode.value}</p>
          <p class="card__meta">{t('group.live.codeNote')}</p>
        </section>
      )}
      {group.role === 'owner' ? (
        <div class="actions">
          <button
            type="button"
            class="button button--secondary"
            disabled={busy.value}
            onClick={() =>
              void run(async () => {
                const fresh = await newInviteCode(group.id);
                if (fresh === null) return false;
                joinCode.value = fresh;
                return true;
              })
            }
          >
            {t('group.live.newCode')}
          </button>
        </div>
      ) : null}

      <section class="section" aria-labelledby="members-title">
        <h2 id="members-title" class="section__title">
          {t('group.members', { count: formatNumber(group.memberCount) })}
        </h2>
        <p class="note note--flush" role="status">
          {t(`group.live.status.${liveStatus.value}`)}
        </p>
        <ul class="card-list card-list--flush">
          {members.map((member) => (
            <li key={member.id} class="card member">
              <div>
                <p class="card__title">
                  {member.you ? t('group.live.you') : member.name || t('group.live.member')}
                </p>
                <p class="card__meta">{memberLine(member, me)}</p>
              </div>
              {group.role === 'owner' && !member.you ? (
                <div class="member__actions">
                  {confirmRemove.value === member.id ? (
                    <>
                      <button
                        type="button"
                        class="button button--danger"
                        disabled={busy.value}
                        onClick={() =>
                          void run(async () => {
                            const removed = await removeMember(group.id, member.id);
                            if (!removed) return false;
                            confirmRemove.value = null;
                            // The server revoked the old codes; hide the one on screen.
                            joinCode.value = null;
                            await refresh();
                            return true;
                          })
                        }
                      >
                        {t('group.live.removeConfirm')}
                      </button>
                      <button
                        type="button"
                        class="button button--secondary"
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
                      class="button button--secondary"
                      aria-label={t('group.live.removeNamed', {
                        name: member.name || t('group.live.member'),
                      })}
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
        <p class="note">{t('group.live.onlyOpen')}</p>
        {group.role === 'owner' ? <p class="note">{t('group.live.removeNote')}</p> : null}
        {GroupMap !== null && people.length > 0 ? (
          <div class="group-map">
            <GroupMap
              flavor={flavorFor(theme.value)}
              position={null}
              onOutside={() => undefined}
              people={people}
            />
            <p class="note">{t('group.live.mapNote')}</p>
          </div>
        ) : null}
      </section>

      {FLAGS.geolocation ? (
        <section class="section" aria-labelledby="share-title">
          <h2 id="share-title" class="section__title">
            <Bi k="group.share.title" />
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
          <p id="share-note" class="note note--flush">
            {sharing.value && location.status === 'off'
              ? t(`map.locate.${location.reason}`)
              : t('group.live.shareNote')}
          </p>
        </section>
      ) : null}

      {actionFailed.value ? (
        <p class="notice" role="alert">
          {t('group.live.error')}
        </p>
      ) : null}

      <div class="actions">
        {confirmLeave.value ? (
          <>
            <button
              type="button"
              class="button button--danger"
              disabled={busy.value}
              onClick={() =>
                void run(async () => {
                  stopSharing();
                  const left = await leaveGroup(group.id);
                  if (!left) return false;
                  disconnectLive();
                  joinCode.value = null;
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
              class="button button--secondary"
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
            class="button button--danger"
            onClick={() => {
              confirmLeave.value = true;
            }}
          >
            {t('group.leave')}
          </button>
        )}
      </div>
    </>
  );
}
