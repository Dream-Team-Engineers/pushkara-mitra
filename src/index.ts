import { d1Repository, type Repository } from './db/repository';
import { GroupLocation } from './durable-objects/GroupLocation';
import { AUTH_PREFIX, handleAuth } from './routes/googleAuth';
import { handleMapArchive, MAP_ARCHIVE_PATH } from './routes/mapArchive';
import { handlePublicNews, PUBLIC_NEWS_PATH } from './routes/news';
import { handlePublicContent, PUBLIC_CONTENT_PREFIX } from './routes/publicContent';
import { handlePublicInformation, PUBLIC_INFORMATION_PATH } from './routes/publicInformation';
import { handleV1, V1_PREFIX } from './routes/v1';
import { withSecurityHeaders } from './security/headers';
import { bindingRateLimiter, type RateLimitBinding } from './security/rateLimit';

export { GroupLocation };

export interface Env {
  ASSETS?: Fetcher;
  GROUP_LOCATION?: DurableObjectNamespace;
  /** Optional R2 bucket holding the large map archive (a whole country). Falls back to the static file. */
  MAP_TILES?: R2Bucket;
  LOCAL_SYNTHETIC_DEMO?: string;
  /** Public Google OAuth client ID. Set only where Google sign-in is switched on (staging first). */
  GOOGLE_CLIENT_ID?: string;
  /** Set to `enabled` only where the map may ask for the device position (staging). Off elsewhere. */
  DEVICE_LOCATION?: string;
  /** Worker secret that signs the sign-in cookie. Without it the person is signed in for one page view only. */
  SESSION_SECRET?: string;
  /** Optional Workers rate-limit binding for /api/auth/*; without it a per-isolate limiter applies. */
  AUTH_RATE_LIMIT?: RateLimitBinding;
  /** D1 database (sessions, consent, groups, SOS). Created and bound by an owner; absent means no storage. */
  DB?: D1Database;
  /** Kill switches. A feature is on only when its variable is exactly `enabled` (see src/flags.ts). */
  FLAG_GROUPS?: string;
  /** Live group room (ADR 0017); needs FLAG_GROUPS too. */
  FLAG_GROUP_LOCATION?: string;
  FLAG_SOS?: string;
  FLAG_CROWD?: string;
  /** App-open counters for the staff dashboard (ADR 0018). */
  FLAG_METRICS?: string;
  /** Partners: priests and volunteers (ADR 0019). */
  FLAG_PARTNERS?: string;
  /** Worker secret: the bearer token that may report crowd levels. Without it the ingest route answers 503. */
  CROWD_INGEST_TOKEN?: string;
}

function repositoryFor(env: Env): Repository | undefined {
  return env.DB === undefined ? undefined : d1Repository(env.DB);
}

async function route(request: Request, env: Env): Promise<Response> {
  if (new URL(request.url).pathname.startsWith(V1_PREFIX)) {
    return handleV1(request, {
      env,
      repo: repositoryFor(env),
      sessionSecret: env.SESSION_SECRET,
      crowdIngestToken: env.CROWD_INGEST_TOKEN,
      groupLocation: env.GROUP_LOCATION,
      googleClientId: env.GOOGLE_CLIENT_ID,
    });
  }

  if (new URL(request.url).pathname.startsWith(AUTH_PREFIX)) {
    const repo = repositoryFor(env);
    return handleAuth(request, {
      clientId: env.GOOGLE_CLIENT_ID,
      sessionSecret: env.SESSION_SECRET,
      ...(repo === undefined ? {} : { repo }),
      ...(env.AUTH_RATE_LIMIT === undefined
        ? {}
        : { limiter: bindingRateLimiter(env.AUTH_RATE_LIMIT) }),
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const { pathname, hostname } = new URL(request.url);

  if (pathname === '/healthz') {
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // This fixture is opt-in for loopback development and has no production binding.
  // It contains invented examples only and never accepts or stores user input.
  if (pathname === '/api/demo/events') {
    if (
      env.LOCAL_SYNTHETIC_DEMO !== 'enabled' ||
      (hostname !== '127.0.0.1' && hostname !== 'localhost')
    ) {
      return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(
      {
        synthetic: true,
        source: 'local-mock',
        events: [
          {
            code: 'M1',
            category: 'prepare',
            title: {
              te: 'నమూనా ప్రయాణ సన్నాహం',
              en: 'Mock preparation example',
              hi: 'तैयारी का नमूना',
            },
            detail: {
              te: 'స్థానిక పరీక్ష కోసం కల్పించిన ఉదాహరణ. నిజమైన తేదీ లేదా స్థలం కాదు.',
              en: 'Invented for local testing. No real date or venue.',
              hi: 'स्थानीय परीक्षण के लिए काल्पनिक उदाहरण। कोई वास्तविक तारीख या स्थान नहीं।',
            },
          },
          {
            code: 'M2',
            category: 'reflect',
            title: { te: 'నమూనా విశ్రాంతి', en: 'Mock rest example', hi: 'विश्राम का नमूना' },
            detail: {
              te: 'నిజమైన సేవ లేదా కార్యక్రమం కాదు.',
              en: 'Not a real service or event.',
              hi: 'यह कोई वास्तविक सेवा या कार्यक्रम नहीं है।',
            },
          },
        ],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (pathname === PUBLIC_INFORMATION_PATH) {
    return handlePublicInformation(new URL(request.url));
  }

  if (pathname === PUBLIC_NEWS_PATH) {
    return handlePublicNews(new URL(request.url));
  }

  if (pathname.startsWith(PUBLIC_CONTENT_PREFIX)) {
    return handlePublicContent(new URL(request.url));
  }

  if (pathname === MAP_ARCHIVE_PATH && env.ASSETS) {
    return handleMapArchive(request, env.ASSETS, env.MAP_TILES);
  }

  // Retina sprites are named like `light@2x.json`; asking for the canonical `%40` form avoids a
  // redirect round trip from static-asset serving.
  if (pathname.startsWith('/maps/sprites/') && pathname.includes('@') && env.ASSETS) {
    const canonical = new URL(request.url);
    canonical.pathname = pathname.replaceAll('@', '%40');
    return env.ASSETS.fetch(new Request(canonical, request));
  }

  // Unmatched API paths are answered here and never fall through to static-asset lookup.
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }
  return new Response('Not Found', { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const googleSignIn = env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_ID !== '';
    const deviceLocation = env.DEVICE_LOCATION === 'enabled';
    return withSecurityHeaders(await route(request, env), googleSignIn, deviceLocation);
  },
  /** Daily retention sweep: ended groups, and the first names on them, are deleted. */
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const repo = repositoryFor(env);
    if (repo !== undefined) await repo.purgeEndedGroups(new Date().toISOString());
  },
} satisfies ExportedHandler<Env>;
