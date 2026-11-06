# RivalTrace

RivalTrace is an evidence-first web page change monitor. It captures a normalized
baseline for a public HTTPS page, then shows exact added and removed text blocks
on each recheck with source URL, check time, HTTP status, byte count, and a
SHA-256 content hash.

## Architecture & Scope

- Public HTTPS HTML pages only.
- Rejects credentials, custom ports, local/private IP literals, unsafe redirect
  targets, non-HTML responses, and responses over 1 MB.
- Removes scripts, styles, comments, and markup before comparison.
- Stores bounded exact evidence and a deterministic content hash in SQL (D1).
- Classifies observed changes as pricing, product, policy, positioning, or
  general content without presenting interpretation as fact.
- Keeps up to 24 added and 24 removed blocks in a single evidence response and
  reports omitted counts.

## Local development

Requires Node.js 22.13 or newer.

``powershell
npm install
npm run db:local
npm run dev
``

The database command applies any pending committed migrations to the
project-local Miniflare state. It is safe to rerun and does not touch a hosted
database.

## Validation

``powershell
npm run lint
npm test
``