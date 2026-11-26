import type {
  PartnerKind,
  PartnerRecord,
  PartnerRole,
  PartnerStatus,
  Repository,
} from '../db/repository';
import { googleKeyFetcher, verifyGoogleIdToken, type KeyFetcher } from '../security/googleIdToken';
import {
  clearedNonceCookie,
  NONCE_COOKIE,
  pseudonymFor,
  readCookie,
  readNonce,
} from '../security/session';

/**
 * Partner routes (ADR 0019): priests and volunteers. Mounted by `handleV1` under `/api/v1/partners`
 * behind flag FLAG_PARTNERS (fails closed). Fixed choices only: no free text, link, photo, contact or
 * location is accepted. Pilgrim-facing data never carries a partner's identity.
 *
 *   GET  /api/v1/partners/updates       latest volunteer updates, public, under 3 hours old
 *   GET  /api/v1/partners/me            the person's own status (never their name or email)
 *   POST /api/v1/partners/apply         apply; re-verifies Google so the server learns name and email
 *   POST /api/v1/partners/availability  approved partner: available or not (expires after 12 hours)
 *   GET  /api/v1/partners/inbox         approved partner: open nudges
 *   POST /api/v1/partners/inbox/read    approved partner: mark nudges read
 *   POST /api/v1/partners/updates       approved, available partner: post a fixed-choice update
 */
export const PARTNER_PATHS: readonly string[] = [
  '/partners/updates',
  '/partners/me',
  '/partners/apply',
  '/partners/availability',
  '/partners/inbox',
  '/partners/inbox/read',
];

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const GHAT_ID = /^[a-z0-9][a-z0-9/-]{0,63}$/;
const LOCALES = ['te', 'en', 'hi'] as const;
const ROLES: readonly PartnerRole[] = ['priest', 'volunteer', 'vendor', 'moderator'];
export const PARTNER_NOTICE_VERSION = 'partner-1';

/** Values a partner may report, by kind. */
export const UPDATE_VALUES: Readonly<Record<PartnerKind, readonly string[]>> = {
  crowd: ['low', 'moderate', 'high'],
  river: ['normal', 'rising', 'high'],
  food: ['available', 'finished'],
};

/** Pilgrims see an update only while it is this fresh. */
export const UPDATE_SHOWN_SECONDS = 3 * 60 * 60;
export const AVAILABLE_SECONDS = 12 * 60 * 60;
/** A rejected person may apply again after this long. */
export const REAPPLY_AFTER_SECONDS = 30 * 24 * 60 * 60;
const SAME_SPOT_SECONDS = 10 * 60;
const DAY_SECONDS = 24 * 60 * 60;
export const MAX_UPDATES_PER_DAY = 30;

const MESSAGES = {
  INVALID_REQUEST: 'The request is not valid.',
  NOT_SIGNED_IN: 'Sign in is required.',
  FORBIDDEN: 'The request is not allowed.',
  NOT_FOUND: 'Not found.',
  METHOD_NOT_ALLOWED: 'Method not allowed.',
  RATE_LIMITED: 'Too many requests. Try again shortly.',
  UNAVAILABLE: 'The service is not available.',
  NOT_PARTNER: 'Partner access is required.',
  NOT_AVAILABLE: 'Switch to available first.',
  ALREADY_APPLIED: 'An application already exists.',
  APPLY_LATER: 'You can apply again later.',
  INVALID_TOKEN: 'Google sign-in could not be checked.',
} as const;
type ErrorCode = keyof typeof MESSAGES;

function fail(code: ErrorCode, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(
    { error: { code, message: MESSAGES[code] } },
    { status, headers: { ...NO_STORE, ...extra } },
  );
}

function ok(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

const iso = (seconds: number): string => new Date(seconds * 1000).toISOString();

export interface PartnerContext {
  readonly request: Request;
  readonly repo: Repository;
  readonly now: number;
  readonly sessionSecret: string | undefined;
  readonly googleClientId: string | undefined;
  readonly googleKeys: KeyFetcher | undefined;
  readonly requireSession: () => Promise<{ subjectRef: string; name: string } | Response>;
  readonly readJson: () => Promise<Record<string, unknown> | Response>;
  readonly hasOnlyKeys: (body: Record<string, unknown>, keys: readonly string[]) => boolean;
  readonly sameOrigin: () => boolean;
  /** Writes a consent record (append-only ledger) for the signed-in person. */
  readonly recordConsent: (subjectRef: string, locale: 'te' | 'en' | 'hi') => Promise<void>;
}

async function ownPartner(
  ctx: PartnerContext,
  subjectRef: string,
  need: PartnerStatus,
): Promise<PartnerRecord | Response> {
  const partner = await ctx.repo.getPartner(subjectRef);
  // A person who is not an approved partner gets the same answer whether or not they applied.
  if (partner === null || partner.status !== need) return fail('NOT_PARTNER', 403);
  return partner;
}

async function apply(ctx: PartnerContext, subjectRef: string): Promise<Response> {
  if (!ctx.sameOrigin()) return fail('FORBIDDEN', 403);
  const body = await ctx.readJson();
  if (body instanceof Response) return body;
  if (!ctx.hasOnlyKeys(body, ['credential', 'role', 'ghatId', 'locale', 'consent'])) {
    return fail('INVALID_REQUEST', 400);
  }
  const { credential, role, ghatId, locale, consent } = body;
  if (
    typeof credential !== 'string' ||
    typeof role !== 'string' ||
    !(ROLES as readonly string[]).includes(role) ||
    (ghatId !== null && (typeof ghatId !== 'string' || !GHAT_ID.test(ghatId))) ||
    typeof locale !== 'string' ||
    !(LOCALES as readonly string[]).includes(locale) ||
    consent !== true
  ) {
    return fail('INVALID_REQUEST', 400);
  }
  const secret = ctx.sessionSecret;
  if (secret === undefined || secret === '') return fail('UNAVAILABLE', 503);

  // The server learns the name and email only from a Google token it verifies itself, with the
  // nonce from this browser's cookie (replay protection), and only for the signed-in account.
  const cookie = readCookie(ctx.request.headers.get('Cookie'), NONCE_COOKIE);
  const nonce = cookie === null ? null : await readNonce(cookie, secret, ctx.now);
  if (nonce === null) return fail('INVALID_TOKEN', 401);
  const user = await verifyGoogleIdToken(credential, {
    clientId: ctx.googleClientId ?? '',
    nowSeconds: ctx.now,
    getKeys: ctx.googleKeys ?? googleKeyFetcher(() => Math.floor(Date.now() / 1000)),
    expectedNonce: nonce,
  });
  if (user === null || (await pseudonymFor(user.sub, secret)) !== subjectRef) {
    return fail('INVALID_TOKEN', 401);
  }

  const result = await ctx.repo.applyPartner({
    subjectRef,
    role: role as PartnerRole,
    ghatId,
    name: user.name.trim().slice(0, 60),
    email: user.email.slice(0, 254),
    nowIso: iso(ctx.now),
    cooldownBeforeIso: iso(ctx.now - REAPPLY_AFTER_SECONDS),
  });
  if (result === 'exists') return fail('ALREADY_APPLIED', 409);
  if (result === 'cooldown') return fail('APPLY_LATER', 409);
  await ctx.recordConsent(subjectRef, locale as 'te' | 'en' | 'hi');
  const headers = new Headers(NO_STORE);
  headers.append('Set-Cookie', clearedNonceCookie());
  return Response.json({ status: 'pending' }, { status: 201, headers });
}

async function postUpdate(ctx: PartnerContext, subjectRef: string): Promise<Response> {
  if (!ctx.sameOrigin()) return fail('FORBIDDEN', 403);
  const partner = await ownPartner(ctx, subjectRef, 'approved');
  if (partner instanceof Response) return partner;
  const nowIso = iso(ctx.now);
  if (partner.availableUntil === null || partner.availableUntil <= nowIso) {
    return fail('NOT_AVAILABLE', 409);
  }
  const body = await ctx.readJson();
  if (body instanceof Response) return body;
  if (!ctx.hasOnlyKeys(body, ['kind', 'ghatId', 'value'])) return fail('INVALID_REQUEST', 400);
  const { kind, ghatId, value } = body;
  if (
    typeof kind !== 'string' ||
    !(kind in UPDATE_VALUES) ||
    typeof ghatId !== 'string' ||
    !GHAT_ID.test(ghatId) ||
    typeof value !== 'string' ||
    !UPDATE_VALUES[kind as PartnerKind].includes(value)
  ) {
    return fail('INVALID_REQUEST', 400);
  }
  const spot = { kind: kind as PartnerKind, ghatId };
  if (
    (await ctx.repo.countPartnerUpdates(subjectRef, iso(ctx.now - SAME_SPOT_SECONDS), spot)) > 0 ||
    (await ctx.repo.countPartnerUpdates(subjectRef, iso(ctx.now - DAY_SECONDS))) >=
      MAX_UPDATES_PER_DAY
  ) {
    return fail('RATE_LIMITED', 429, { 'Retry-After': String(SAME_SPOT_SECONDS) });
  }
  await ctx.repo.insertPartnerUpdate({
    subjectRef,
    kind: kind as PartnerKind,
    ghatId,
    value,
    createdAt: nowIso,
  });
  return ok({ recorded: true }, 201);
}

/** Handles every `/partners/...` path. `path` keeps its leading slash, e.g. `/partners/me`. */
export async function handlePartners(ctx: PartnerContext, path: string): Promise<Response> {
  const method = ctx.request.method;

  if (path === '/partners/updates' && method === 'GET') {
    // Public and read-only. No identity of any partner is in the answer.
    const updates = await ctx.repo.listPublicPartnerUpdates(iso(ctx.now - UPDATE_SHOWN_SECONDS));
    return ok({
      source: 'volunteer',
      official: false,
      shownForSeconds: UPDATE_SHOWN_SECONDS,
      updates,
    });
  }

  const signed = await ctx.requireSession();
  if (signed instanceof Response) return signed;
  const { subjectRef } = signed;

  switch (path) {
    case '/partners/me': {
      if (method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET' });
      const partner = await ctx.repo.getPartner(subjectRef);
      if (partner === null) return ok({ status: 'none' });
      const nowIso = iso(ctx.now);
      const nudges =
        partner.status === 'approved'
          ? await ctx.repo.listNudges(subjectRef, partner.ghatId, nowIso)
          : [];
      return ok({
        status: partner.status,
        role: partner.role,
        ghatId: partner.ghatId,
        available: partner.availableUntil !== null && partner.availableUntil > nowIso,
        availableUntil:
          partner.availableUntil !== null && partner.availableUntil > nowIso
            ? partner.availableUntil
            : null,
        unread: nudges.filter((n) => !n.read).length,
      });
    }
    case '/partners/apply':
      if (method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
      return apply(ctx, subjectRef);
    case '/partners/availability': {
      if (method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
      if (!ctx.sameOrigin()) return fail('FORBIDDEN', 403);
      const partner = await ownPartner(ctx, subjectRef, 'approved');
      if (partner instanceof Response) return partner;
      const body = await ctx.readJson();
      if (body instanceof Response) return body;
      if (!ctx.hasOnlyKeys(body, ['available']) || typeof body['available'] !== 'boolean') {
        return fail('INVALID_REQUEST', 400);
      }
      const until = body['available'] ? iso(ctx.now + AVAILABLE_SECONDS) : null;
      if (!(await ctx.repo.setAvailability(subjectRef, until))) return fail('NOT_PARTNER', 403);
      return ok({ available: body['available'], availableUntil: until });
    }
    case '/partners/inbox': {
      if (method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET' });
      const partner = await ownPartner(ctx, subjectRef, 'approved');
      if (partner instanceof Response) return partner;
      return ok({ nudges: await ctx.repo.listNudges(subjectRef, partner.ghatId, iso(ctx.now)) });
    }
    case '/partners/inbox/read': {
      if (method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
      if (!ctx.sameOrigin()) return fail('FORBIDDEN', 403);
      const partner = await ownPartner(ctx, subjectRef, 'approved');
      if (partner instanceof Response) return partner;
      await ctx.repo.markNudgesRead(subjectRef, iso(ctx.now));
      return new Response(null, { status: 204, headers: NO_STORE });
    }
    case '/partners/updates':
      if (method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, POST' });
      return postUpdate(ctx, subjectRef);
    default:
      return fail('NOT_FOUND', 404);
  }
}
