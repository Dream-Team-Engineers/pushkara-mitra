/**
 * Feature flags for the frontend (ADR 0011, docs/frontend/architecture-blueprint.md).
 *
 * Every risky capability is OFF and stays off until its own ADR, counsel review and
 * owner approval exist (ADR 0004 location, ADR 0008 personal data, docs/compliance).
 * Flags are compile-time constants: they are never read from the URL, browser storage
 * or the network, so a user or a stale cache cannot switch a risky feature on.
 * Turning one on is a reviewed code change guarded by tests/guards/frontend-flags.test.ts.
 */
export const FLAGS = {
  /** Reads device location (foreground only). Needs ADR 0004 accepted and M2 authorised. */
  geolocation: false,
  /** Pilgrim Pass: personal details, photo, QR. Prototype only until ADR 0008 and counsel. */
  pilgrimPass: false,
  /** My Group: live sharing, invitations. Needs ADR 0004 and a stalking/coercion threat model. */
  myGroup: false,
  /** Live map overlays of people or groups. Public base map is not behind this flag. */
  liveMap: false,
  /** SOS dispatch to responders. The app never replaces police or emergency services. */
  sosDispatch: false,
  /** Photo capture or upload. EXIF stripping and retention must be approved first. */
  photoUpload: false,
  /** Missing-person and lost-and-found listings. Dedicated safety and legal review first. */
  missingPersons: false,
  /** Partner or volunteer contact forms that send personal data. */
  partnerContact: false,
  /** Razorpay or any payment flow. Payments review and merchant checks first. */
  payments: false,
  /**
   * Fetches reviewed app information from GET /api/public/information. Needs LEAD approval of the
   * route and approved copy (docs/proposals/BACKEND_CONTRACT_ACCEPTANCE.md); until then it is off.
   */
  publishedInformation: false,
  /** Donation collection. Blocked until counsel approves recipient, FCRA and tax treatment. */
  donations: false,
} as const;

export type FlagName = keyof typeof FLAGS;

export function isEnabled(name: FlagName): boolean {
  return FLAGS[name];
}
