import { handlePublicContent, PUBLIC_CONTENT_PREFIX } from '../../../../src/routes/publicContent';

/**
 * Web tests run on Node without a Worker. Requests to the public content API are answered by the
 * real Worker handler with the repository's real PUBLISHED_CONTENT, so screens see exactly what a
 * deployment of this commit would serve. Every other request keeps Node's default behaviour.
 */
const original = globalThis.fetch;

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  // The handler reads only the path and query, so any absolute base works.
  const url = new URL(raw, 'file:///');
  if (url.pathname.startsWith(PUBLIC_CONTENT_PREFIX)) {
    return Promise.resolve(handlePublicContent(url));
  }
  return original(input, init);
};
