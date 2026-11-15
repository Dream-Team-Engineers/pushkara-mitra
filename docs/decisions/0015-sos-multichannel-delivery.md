# 0015. SOS: multi-channel delivery — owner-stated direction

Status: **PROPOSED — owner direction recorded 2026-11-15; operational and legal review PENDING.** SOS is life-safety. Nothing here may be presented to users as guaranteed emergency service. No emergency number may be shown unless verified against an official source (OQ-register item for emergency numbers).

## Decision (proposed)

Channels, in escalation order:

1. **WebSocket** (Durable Object) for real-time group updates and for staff dashboards. Location lives in DO memory only (ADR 0004).
2. **HTTP API fallback** for SOS submission when the socket is unavailable. Idempotent (client-generated request ID), rate-limited, schema-validated, no login required.
3. **Local queue** in the PWA (IndexedDB) stores unsent SOS requests while offline and retries with backoff when connectivity returns. The user sees the true state: queued, sent, acknowledged. Never show "sent" before the server acknowledges.
4. **SMS** as alternative notification (to staff and, if approved, to a configured contact). Provider, DLT registration and cost unverified.
5. **Staff call** as manual escalation: the staff console shows an unacknowledged-SOS timer and the on-duty contact list; a human phones the pilgrim or responders.

## Conflict that needs an owner decision (OQ-033)

A useful SOS conveys where the person is. Hard Rule 1 and ADR 0004 forbid persisting or logging location. Proposed handling, not approved: the SOS payload carries location only to the staff view in memory and in the SMS text; the Postgres SOS record stores no coordinates (time, status, acknowledgement, free-text category only). Whether even an SMS body containing coordinates violates the rule's intent, and what retention applies to the SMS provider's own logs, needs a written owner and counsel decision and an ADR 0004 amendment before any implementation.

## Requirements

- Abuse controls (rate limit, no PII echo), audit log of staff acknowledgements without location.
- Accessibility: large button, Telugu and Hindi labels, works one-handed.
- Test on slow and offline networks before any claim of reliability.
