# MXD

A midnight-purple website and separate **ADMIN PANEL**, built with React, TypeScript, Vinext, Cloudflare Workers, D1 and R2. Public pages and responsive draft previews use the same typed renderer. Existing numbered `textN` content IDs survive upgrades.

## Delivered features

- Visual page editor with structure, live preview and contextual properties; click to select, drag to reorder, accessible ordering buttons, section templates, reusable blocks and independent duplication.
- Multiple pages, navigation, visibility, desktop/tablet/mobile appearance overrides, safe formatted text, searchable text labels and validated bulk import/export.
- Theme controls and named presets, including import/export and preview. Presets preserve text, courses and commercial data.
- Courses with modules, lessons, visibility, numeric prices, scheduled promotions, countdowns, manual enrollment and external enrollment links.
- Enrollment inbox with manual payment confirmation. Stripe Checkout and verified webhook integration are implemented; **Stripe is disabled until provider secrets and webhook configuration are supplied**. An unconfigured provider returns an explicit error and never claims payment succeeded.
- PNG/JPEG/WebP/GIF, video and audio media; folders, search, usage checks, presentation crop/focal controls, immutable draft replacement, recoverable trash and version recovery. SVG uploads are rasterized to PNG in the browser; raw executable SVG/HTML is rejected by the server.
- Scheduled banners/popups, maintenance controls, page metadata, social images, favicon, canonical URLs, redirects, robots and sitemap.
- Optional real visitor/click analytics, disabled by default, with retention and privacy signals respected. No fabricated statistics or testimonials.
- Snapshot-aware autosave, explicit drafts, undo/redo, atomic publication, conflict detection, paginated revision history, revision preview and draft restoration.
- Owner-only backup creation/download, daily database snapshots in R2, audit history and session revocation. Media objects remain immutable and retained for recovery.

## Live deployment

- [Website](https://mxd.digital-world-9896a4.workers.dev/)
- [ADMIN PANEL login](https://mxd-admin.digital-world-9896a4.workers.dev/login)

The two Workers share D1 and R2. The public Worker rejects administrative routes. A random access key creates an expiring server-side admin session; secrets never enter public content or Git. See [deployment and recovery operations](deploy/README.md).

The earlier owner-private Sites preview is independent of Cloudflare production data.

## Development

Use Node 24 and the committed pnpm lockfile.

```sh
corepack pnpm install --frozen-lockfile
npm run typecheck
npm test
npm run build
```

For local D1, apply migrations `0000` through `0003` in order using Wrangler against the local database before testing. Start development with `npm run dev`. `tests/workflow.mjs` is a local-only integration harness; its test identity headers are not trusted by Cloudflare production.

`npm run db:generate` generates new migrations after schema changes. Never replay already applied SQL against production. Do not commit runtime state, output bundles, credentials or environment secrets.

## Verification

Automated tests cover legacy upgrades, stable text IDs, independent duplication, preset isolation, validated styles/URLs/pages, authoritative promotion prices, bounded request streams, upload signatures, webhook authentication, payment matching, owner authorization, login/origin/session protection, draft isolation, restoration, stale writers and transaction rollback.

`tests/full-stack-live.mjs` runs against disposable `mxd-qa` deployments only and reads a test key from standard input. It exercises real D1/R2 publication, pages, nested courses, media replacement/recovery, enrollment, analytics, backup and restoration. It deliberately refuses production hosts. Live card charges require a separate Stripe test-mode acceptance check after configuration.

## Editing and recovery

Save changes to a draft, inspect Preview, then Publish to update the website. A failed or conflicting save retains local edits; export them before reloading. Revision restoration modifies the draft, requiring a separate publication. Media replacement creates a new URL so an unpublished replacement cannot alter the live website.

Content exports contain content and configuration, not media bytes or credentials. Scheduled backups additionally include revisions, media metadata, enrollments and audit records. Full account-loss recovery requires the retained R2 objects or a separate bucket copy, plus restoration of the database snapshot; see the operations guide.

## Configuration still required

Replace numbered public copy and upload your actual media. Enable analytics or enrollment only when desired. For card payments, configure your own Stripe account, secrets and signed webhook endpoint, then complete test-mode checkout before enabling live payments. Optional additional administrators/roles and custom domains are not provisioned by this release.
