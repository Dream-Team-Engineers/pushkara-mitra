# 0005. Log residency and minimisation

Status: Proposed (acceptance is an M0 exit criterion)
Date: 2026-11-02

## Context

CERT-In Directions (April 2022) are said to require 180-day retention of ICT logs within India, subject to an applicability assessment that has not been done (unverified, see [cert-in-checklist](../compliance/cert-in-checklist.md)). Data minimisation requires that logs hold no more personal data than needed. These two pull in opposite directions.

## Decision (proposed)

1. Logs contain operational and security events only: timestamp, event type, request ID, status, coarse error class.
2. Logs never contain location, message or report content, payment data, or full identifiers. Identifiers are hashed with a rotating key where correlation is needed.
3. If CERT-In applies, retain these minimal logs for 180 days in an India-resident sink; otherwise keep the shortest period that supports security work.
4. The `no-location-persistence` guard also fails the build on coordinate fields in logger calls.

## Consequences

- A log pipeline and sink in India must be chosen (open question).
- Debugging is harder by design. Use request IDs and metrics rather than payloads.
