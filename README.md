# RivalTrace

RivalTrace is an evidence-first competitor page monitor. It captures a normalized
baseline for a public HTTPS page, then shows exact added and removed text blocks
on each recheck with source URL, check time, HTTP status, byte count, and a
SHA-256 content hash.

This repository is the private working V0. Manual baselines and rechecks work.
API access requires the hosting platform's authenticated-user header, and
watchlists are isolated by a one-way identity digest. Automated scheduling,
notifications, rate limiting, and billing are not yet connected and are not
claimed by the interface.

## Current product contract

- Public HTTPS HTML pages only.
- Rejects credentials, custom ports, local/private IP literals, unsafe redirect
  targets, non-HTML responses, and responses over 1 MB.
- Removes scripts, styles, comments, and markup before comparison.
- Stores bounded exact evidence and a deterministic content hash in D1.
- Classifies observed changes as pricing, product, policy, positioning, or
  general content without presenting interpretation as fact.
- Keeps up to 24 added and 24 removed blocks in a single evidence response and
  reports omitted counts.

The preview does not handle authenticated target pages, JavaScript-only
rendering, CAPTCHAs, semantic equivalence, or DNS-level rebinding defenses.
Those are explicit boundaries, not hidden capabilities. The deployment remains
owner-only while identity isolation and the remaining paid-launch gates are
tested.

## Local development

Requires Node.js 22.13 or newer.

```powershell
npm install
npm run db:local
npm run dev
```

The database command applies any pending committed migrations to the
project-local Miniflare state. It is safe to rerun and does not touch a hosted
database.

## Validation

```powershell
npm run lint
npm test
```

The test gate builds the Cloudflare-compatible worker, verifies the rendered
commercial and boundary copy, and exercises URL validation, HTML normalization,
hashing, redirects, response limits, and exact change evidence.

## Hosting

The app uses Sites with a logical D1 binding named `DB`. The hosting control
plane owns the real database and applies the generated migration. Do not put a
database ID or hosted credential in this repository.

## Launch direction

The intended initial tiers are Free (three weekly URLs), Solo at $9/month
(fifteen daily URLs), and Studio at $19/month after Solo validation. They remain
launch targets until scheduling, rate limits, notifications, identity-isolation
testing, and billing pass the release gate.

RivalTrace is a product from [YY](https://www.yycore.ai).
