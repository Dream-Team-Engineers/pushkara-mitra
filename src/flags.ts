/**
 * Kill-switch interface (stub). Risky features must sit behind a flag that fails closed.
 * A real provider (for example Workers KV config or an env var) arrives with the first risky feature.
 */
export type KillSwitch = 'group-location' | 'payments' | 'donations' | 'missing-person-reports';

export interface FlagProvider {
  isEnabled(flag: KillSwitch): boolean;
}

/** Fails closed: every risky feature is off until a reviewed provider turns it on. */
export const failClosedFlags: FlagProvider = {
  isEnabled: () => false,
};
