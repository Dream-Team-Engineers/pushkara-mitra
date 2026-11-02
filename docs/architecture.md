# Architecture

Pushkara Mitra is an independent, Telugu-first, offline-capable PWA served from Cloudflare Workers. It is not an official application.

## C4 level 1: context

```mermaid
flowchart TB
  pilgrim([Pilgrim]) --> app[Pushkara Mitra PWA and Worker]
  vendor([Vendor]) --> app
  app --> razorpay[Razorpay]
  app --> sentry[Sentry]
  app --> sms[SMS provider]
  organisers([Official organisers]) -. no integration, never impersonated .- app
```

## C4 level 2: containers

```mermaid
flowchart LR
  subgraph device[Pilgrim device]
    pwa[PWA shell + service worker]
  end
  subgraph cf[Cloudflare]
    worker[Worker: routing, security headers, /healthz]
    assets[(Static assets)]
    do[GroupLocation Durable Object<br/>memory only]
    d1[(D1)]
    r2[(R2)]
  end
  pwa -- HTTPS --> worker
  worker --> assets
  worker --> do
  worker --> d1
  worker --> r2
```

Today only the Worker, static assets and a stub Durable Object exist. D1 and R2 are not bound yet.

## Delivery

```mermaid
flowchart LR
  pr[Pull request] --> checks[Required checks]
  checks --> merge[Squash merge to main]
  merge --> staging[Deploy staging]
  merge --> rp[release-please PR]
  rp --> prod[Release and deploy production]
  pr --> preview[Preview Worker version]
```

## Key decisions

[ADR 0002](decisions/0002-trunk-based-delivery.md), [0003](decisions/0003-offline-first-pwa.md), [0004](decisions/0004-ephemeral-location.md), [0005](decisions/0005-log-residency-and-minimisation.md).
