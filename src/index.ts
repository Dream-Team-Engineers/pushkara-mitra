import { GroupLocation } from './durable-objects/GroupLocation';
import { withSecurityHeaders } from './security/headers';

export { GroupLocation };

export interface Env {
  ASSETS?: Fetcher;
  GROUP_LOCATION?: DurableObjectNamespace;
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const { pathname } = new URL(request.url);

  if (pathname === '/healthz') {
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
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
