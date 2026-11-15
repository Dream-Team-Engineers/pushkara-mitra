# Google sign-in for v1: plan and what the owner must do

**Status: DRAFT plan, NEEDS REVIEW (OQ-030).** Written 2026-11-15 by Claude Code (agent) after the owner decided that v1 includes sign-in with a Google account (the account used for the Play Store), with no OTP and no password. Nothing here is legal advice or a compliance certificate. The sign-in button exists in the app but is **switched off** (flag `googleSignIn`).

## How it works, and what is and is not stored

1. The person taps "Sign in with Google". Google, not us, checks the Google account on their phone. We never see or store a password, and no OTP is sent.
2. Google returns a signed **ID token** to the app: a short proof that says who signed in (an account ID, the email, the name, optionally a picture) and for which app it was issued.
3. Our Worker must **verify the token's signature and its audience** with Google's public keys before trusting it. A token checked only in the browser can be forged, so the browser alone is not enough for anything that must be protected.
4. After verification the Worker can show the name and email in the app header, and, if needed, issue a short session so the person stays signed in. The session can be a signed cookie, so **no user table is needed just to be signed in**.

**What this means for "storing credentials":** there are no credentials to store (no password, no OTP secret). But the email and name are personal data, and three things may still need a record:

- **Proof of consent** (who agreed, to which wording, when). The law expects us to be able to show consent was given, so a small consent log is likely needed. That is a database write, so it brings back the residency questions (OQ-026, OQ-027). Not decided.
- **Parental consent for under-18s.** A tick box saying "my parent agrees" is a declaration, not verified consent. Whether this is enough, or what stronger check is required, is a question for counsel (OQ-003, OQ-030, ADR 0006). Until counsel answers, the safest design is that under-18s cannot complete sign-in.
- **Account deletion.** Google Play expects apps that let people create accounts to offer a way to delete the account and its data, with a web link (to verify against Google's current policy). So we need a deletion route and a documented process even if the data is small.

## Web app and Play Store

On the web (the PWA), sign-in uses Google Identity Services with a web client ID. In a Play Store app (for example a Trusted Web Activity), Android's own Google sign-in is used, with an Android client ID tied to the app's signing certificate. Both end in the same kind of ID token, so the Worker verification is the same. The web app stays as the fallback.

## What the owner must do (nothing here is done yet)

1. Create a Google Cloud project and an OAuth client ID for the web app; add the staging and production addresses as authorised origins. Send the **client ID** (it is public, not a secret) to Claude. Never share a client secret in chat.
2. Complete Google's OAuth consent screen (app name, support email, privacy-policy link). Publishing the app to all users may need Google's verification review.
3. Approve the consent wording for adults and for under-18s, with counsel. The app currently shows "consent text waiting for legal review".
4. Decide the under-18 rule: block, or allow with a verified parental route (OQ-030).
5. Update and approve the privacy notice (`docs/legal/privacy-notice-v1-draft.md` is now out of date, see its banner).
6. Decide where a consent log may live (OQ-026) and the deletion process.

## What Claude builds once the client ID and wording exist

- Worker route that verifies the Google ID token (signature, issuer, audience, expiry) and returns only name and email.
- Header and Me tab showing the signed-in person, with sign-out.
- Tests that forged, expired and wrong-audience tokens are rejected, and that the token is never logged.
- Flag `googleSignIn` switched on in a reviewed change, with the owner's approval recorded.
