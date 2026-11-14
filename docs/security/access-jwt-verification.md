# Cloudflare Access token verification (building block, disabled)

Status: **IMPLEMENTED BUT UNWIRED.** Added 2026-11-12 (IST). Source: `src/security/accessJwt.ts`. It is not imported anywhere; no admin route, sign-in or role exists. BF-02 and BF-03 are not approved ([recommendations](../proposals/BF_DECISION_RECOMMENDATIONS.md)). `tests/guards/access-jwt-disabled.test.ts` fails if the Worker imports it or adds `/admin`, `/auth` or `Cf-Access` handling.

## What it does

`verifyAccessToken(token, { issuer, audience }, lookupKey, nowSeconds)` returns `{ ok: true, principal: { issuer, subject } }` or `{ ok: false, reason }`. It never throws and never returns an email.

| Check              | Rule                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration      | Issuer must match `https://<team>.cloudflareaccess.com` exactly; audience non-empty; else `misconfigured`                                                                  |
| Shape              | At most 8192 characters, three base64url parts, JSON-object header and payload                                                                                             |
| Algorithm          | RS256 only. The header never selects the algorithm; `none`, HS*, ES*, other RS\* rejected                                                                                  |
| Headers            | `jku`, `x5u`, `jwk`, `x5c`, `crit` rejected; `typ` must be absent or `JWT`; `kid` required, at most 128 characters                                                         |
| Keys               | Supplied by the caller by `kid`, never from the token. RSA, at least 2048-bit, `alg` absent or RS256, `use` absent or `sig`                                                |
| Signature          | Platform WebCrypto, RSASSA-PKCS1-v1_5 with SHA-256. Claims are read only after it verifies                                                                                 |
| Claims             | `iss` equals the configured issuer; `aud` (string or array) contains the audience; `exp` required; `nbf` optional; `sub` required, at most 256 characters; 30 s clock skew |
| Key lookup failure | `keys_unavailable`; the caller must deny                                                                                                                                   |

## What it does not do (still open)

- Key fetching lives in `src/security/accessKeys.ts` (also unwired). It fetches `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` with a 3 s timeout and no redirects, caches for 5 minutes, refetches for an unknown `kid` at most once a minute, shares concurrent requests, and **fails closed**: expired keys are never served and a failed refresh denies. The TTL, refetch interval and no-stale policy are proposals for the BF-02 review; rotation behaviour against real Cloudflare keys is untested.
- It does not authorise. A verified identity with no `role_assignment` must still get 403 (RBAC matrix).
- It does not check Access policy, MFA, or session revocation; those are Cloudflare-side and owner-operated.
- It uses no maintained JWT library because the npm registry is unavailable to the build environment. A reviewer may prefer `jose` (BF-02 recommendation); switching would need a dependency, licence-register and SBOM update.

## Evidence

CI results are cited in the PR. A local Node run of the same module on 12 Nov 2026 (not the Vitest suite) passed nine accept/reject cases and a misconfiguration case. Not verified: behaviour with real Access tokens, key rotation, and the Cloudflare Workers runtime outside CI.
