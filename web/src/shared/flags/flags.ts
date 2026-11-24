/**
 * Feature flags for the frontend (ADR 0011, docs/frontend/architecture-blueprint.md).
 *
 * Every risky capability is OFF and stays off until its own ADR, counsel review and
 * owner approval exist (ADR 0004 location, ADR 0008 personal data, docs/compliance).
 * Flags are compile-time constants: they are never read from the URL, browser storage
 * or the network, so a user or a stale cache cannot switch a risky feature on.
 * Turning one on is a reviewed code change guarded by tests/guards/frontend-flags.test.ts.
 */
/**
 * Public Google OAuth client ID, present only in the staging build (`vite build --mode staging`
 * reads web/.env.staging). Production builds have none, so Google sign-in stays off there.
 * It is a build-time constant: not read from the URL, storage or the network.
 */
interface BuildEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_DEVICE_LOCATION?: string;
  readonly VITE_SHOW_SAMPLES?: string;
  readonly VITE_GROUPS?: string;
  readonly VITE_METRICS?: string;
  readonly VITE_PARTNERS?: string;
}
const BUILD_ENV: BuildEnv = (import.meta as unknown as { env?: BuildEnv }).env ?? {};
const CLIENT_ID = BUILD_ENV.VITE_GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_ID: string | undefined =
  typeof CLIENT_ID === 'string' && CLIENT_ID.endsWith('.apps.googleusercontent.com')
    ? CLIENT_ID
    : undefined;

/**
 * Shows the built-in sample rows ("[Sample train 1]", sample headlines, the sample sponsored strip,
 * placeholder group members). On in staging, development and tests so screens can be reviewed with
 * content; off in the production build, where a screen with no approved data shows an honest empty
 * state instead (OQ-044). Build-time constant, not read from the URL, storage or the network.
 */
export const SHOW_SAMPLES: boolean = BUILD_ENV.VITE_SHOW_SAMPLES === 'enabled';

/**
 * Counts app opens and installs for the staff dashboard (ADR 0018): the event and the language
 * only, no identifier. Staging build only. Build-time constant, not read from the URL or storage.
 */
export const COUNT_OPENS: boolean = BUILD_ENV.VITE_METRICS === 'enabled';

export const FLAGS = {
  /**
   * Shows the device's own position on the map (foreground only, after a tap, never sent or
   * stored). Owner decision 2026-11-19: on in the staging build only (`vite build --mode staging`),
   * off in production until legal review of the notice (OQ-041). Not read from the URL or storage.
   */
  geolocation: BUILD_ENV.VITE_DEVICE_LOCATION === 'enabled',
  /** Pilgrim Pass: personal details, photo, QR. Prototype only until ADR 0008 and counsel. */
  pilgrimPass: false,
  /**
   * My Group: real groups, join codes and live position sharing with the group (ADR 0017). Owner
   * scope decision 2026-11-21: on in the staging build only (`vite build --mode staging`), off in
   * production until the owner approves the release. Not read from the URL or storage.
   */
  myGroup: BUILD_ENV.VITE_GROUPS === 'enabled',
  /**
   * Partners (priests and volunteers, ADR 0019): apply, availability, inbox, fixed-choice updates and
   * the pilgrim "From a volunteer" strip. Staging build only; off in production until the owner
   * approves the release and OQ-045 and OQ-046 are decided. Not read from the URL or storage.
   */
  partners: BUILD_ENV.VITE_PARTNERS === 'enabled',
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
  /** Google sign-in (Me tab and header). Needs the Google client set up, consent wording and counsel review. */
  googleSignIn: GOOGLE_CLIENT_ID !== undefined,
  /** Donation collection. Blocked until counsel approves recipient, FCRA and tax treatment. */
  donations: false,
} as const;

export type FlagName = keyof typeof FLAGS;

export function isEnabled(name: FlagName): boolean {
  return FLAGS[name];
}
