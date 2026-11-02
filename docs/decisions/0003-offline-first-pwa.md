# 0003. Offline-first PWA

Status: Accepted (adopted by Kickoff Prompt V1)
Date: 2026-11-02

## Context

Officials expect 8 to 10 crore devotees (unverified). Crowds at that scale saturate mobile networks, so connectivity cannot be assumed.

## Decision

Pushkara Mitra is a Progressive Web App built offline-first: core information works from cache, writes queue and sync when a network returns, and payloads stay small.

The service worker must **never cache personal data or API responses that contain it.** The current stub caches nothing.

## Consequences

- A cache strategy, versioning and an update flow are designed in M2.
- Features that need a live connection (group location) must degrade clearly and honestly.
- Static assets are served by the Worker's asset binding rather than a separate Pages project. See OQ-010.
