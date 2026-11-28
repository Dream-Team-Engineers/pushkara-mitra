/**
 * Kill switches. Every risky feature sits behind a flag that fails closed: a flag is on only when the
 * matching Worker variable is exactly `enabled`. A missing, empty or misspelt value means off.
 * Flags are set per environment (wrangler.toml `[env.<name>.vars]` or the dashboard), never in code.
 */
export type KillSwitch =
  | 'group-location'
  | 'groups'
  | 'sos'
  | 'crowd'
  | 'pilgrim-pass'
  | 'photo-upload'
  | 'payments'
  | 'donations'
  | 'missing-person-reports'
  | 'metrics'
  | 'partners'
  | 'partner-push';

export interface FlagProvider {
  isEnabled(flag: KillSwitch): boolean;
}

/** Worker variable that turns each switch on. */
export const FLAG_VARIABLES: Readonly<Record<KillSwitch, string>> = {
  'group-location': 'FLAG_GROUP_LOCATION',
  groups: 'FLAG_GROUPS',
  sos: 'FLAG_SOS',
  crowd: 'FLAG_CROWD',
  'pilgrim-pass': 'FLAG_PILGRIM_PASS',
  'photo-upload': 'FLAG_PHOTO_UPLOAD',
  payments: 'FLAG_PAYMENTS',
  donations: 'FLAG_DONATIONS',
  'missing-person-reports': 'FLAG_MISSING_PERSON_REPORTS',
  metrics: 'FLAG_METRICS',
  partners: 'FLAG_PARTNERS',
  'partner-push': 'FLAG_PARTNER_PUSH',
};

/** Fails closed: every risky feature is off. */
export const failClosedFlags: FlagProvider = {
  isEnabled: () => false,
};

/** Reads switches from the Worker environment. Anything other than `enabled` is off. */
export function envFlags(env: object): FlagProvider {
  const vars = env as Record<string, unknown>;
  return {
    isEnabled: (flag) => vars[FLAG_VARIABLES[flag]] === 'enabled',
  };
}
