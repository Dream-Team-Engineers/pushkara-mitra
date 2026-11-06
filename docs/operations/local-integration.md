# Local review integration

This is a review build. The public shell and static offline pages are available without an account. The Plan page no longer displays fictional fixtures; it shows a review-pending state while official content is assessed.

The mobile navigation has Home, Plan, Updates, About and Explore. Explore links to
review layouts for ghats, stays, transport, culture, weather/crowd conditions,
help, pass, groups, partners and staff. These layouts use original copy and show
unavailable or disabled states where verified data, operational owners and human
approvals are missing. They do not activate those services.

Use Node 22 and npm 10, then run `npm ci` and `npm run check`. Start the app with:

```sh
npx wrangler dev --local --ip 127.0.0.1
```

Open `http://127.0.0.1:8787/#plan`. The page does not fetch or show the mock examples, including when the old `local-mock=1` query is present. Official date and place candidates are documented for human review in `docs/content/official-source-review.md`; they are not approved app content. No booking, identity, contact, location or payment is provided.

The test-only mock route remains in the local Worker for regression testing; the app no longer requests it. It responds only when the explicit variable is enabled and the request
hostname is loopback. It has no binding in `wrangler.toml`, returns `404` by default,
uses `Cache-Control: no-store`, and rejects writes. The service worker caches only
fifteen canonical static resources. It does not cache the mock API or query URLs.

`npm run test:routing` starts and stops local Wrangler for all four configurations
and one opt-in mock run. It checks real HTTP routing, security headers and the
mock response. It never uploads a Worker.

The prototype, copy, translations, asset rights, external controls and human approval gates remain provisional. Issue #24 was reopened and its latest human comment says the decisions remain unresolved. See `docs/content/official-source-review.md` for the current evidence and approval boundary. A local mock response is not backend, staging, legal or release readiness evidence.
