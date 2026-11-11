import { GroupLocation } from './durable-objects/GroupLocation';
import { handlePublicInformation, PUBLIC_INFORMATION_PATH } from './routes/publicInformation';
import { withSecurityHeaders } from './security/headers';

export { GroupLocation };

export interface Env {
  ASSETS?: Fetcher;
  GROUP_LOCATION?: DurableObjectNamespace;
  LOCAL_SYNTHETIC_DEMO?: string;
}

async function route(request: Request, env: Env): Promise<Response> {
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
    return withSecurityHeaders(await route(request, env));
  },
} satisfies ExportedHandler<Env>;
