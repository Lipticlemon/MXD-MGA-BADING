# MXD

A midnight-purple public renderer and ADMIN PANEL built with React, TypeScript, Vinext and Cloudflare D1/R2. The public renderer and draft preview share one typed content model. All seeded public copy uses sequential `textN` placeholders.

## Current delivery

- Public page at `/`; protected editor at `/admin`.
- Text search/editing; section add/remove/duplicate/reorder/visibility; item editing and ordering.
- Theme colors, font, scale, container width, radius, section spacing and columns.
- Course, pricing, FAQ and curriculum sections use editable entries. Prices are numeric PHP values; checkout is not implemented.
- Draft autosave, explicit save, preview, publish, undo/redo and persistent snapshot restoration.
- Named theme presets, content backup export/import, maintenance and SEO settings.
- PNG/JPEG/WebP uploads stored in R2, with reusable media URLs. Media is retained for revision recovery.
- Server input validation, parameterized SQL, optimistic concurrency and atomic snapshot/content writes.

## Hosting and authorization boundary

The initial deployment is an **owner-private Sites application**. Sites owns sign-in and secure sessions. Admin pages and APIs require platform identity, while owner-only access is enforced by the Sites audience. The app must remain owner-private: an authenticated visitor is not independently checked against a role/membership table. Do not switch this deployment to public sharing.

This implementation uses one deployment with two route surfaces. It does **not yet meet the specification's separate public and admin frontend deployment requirement**. Public launch requires separate deployments plus explicit owner authorization, origin/CORS configuration, and the target domain. No domain ownership is assumed.

## Development

Use Node 24 and the committed pnpm lockfile. Install with `corepack pnpm install --frozen-lockfile` (or the Sites dependency installer in managed environments).

```sh
npm run db:generate
npm run typecheck
npm test
npm run build
```

For local D1, build once, then apply the migration:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wakeful_avengers.sql
```

Start development with `npm run dev`. The managed preview uses `sites-preview start PATH`. Platform sign-in is available on deployed Sites; the managed local preview does not emulate it. `tests/workflow.mjs` is a local-only API integration harness requiring a reachable preview and local test identity headers. It is not a production authentication bypass.

`.openai/hosting.json` declares the Sites project and `DB`/`BUCKET` bindings. Sites provisions these resources and applies generated migrations on deployment. Do not commit runtime secrets or state. The `oai-authenticated-*` identity headers must be supplied only by trusted Sites dispatch; a direct unprotected Worker deployment would not have that boundary.

## Recovery

Before publication, the current published document is saved as a revision. Draft saves also snapshot the preceding draft. Restoring a revision changes the draft only; explicitly publish to affect the website. Conflict responses preserve local edits; export them before reloading. History shows the latest 100 revisions, while the database retains older records.

Export content from Versions or Settings. Import validates the entire document and restores to draft. Theme presets are included. Content exports do not include media bytes; R2 and D1 need independent provider backups before public launch. Retained media URLs preserve revision references. No automatic disaster recovery or media deletion UI is claimed.

## Verification

Seven automated tests cover sequential text IDs, unsafe URLs, invalid references, duplicate sections, unsafe theme values, draft/published isolation, persistent restore, stale-writer rejection, and atomic rollback on failed database writes. TypeScript checks and the production build pass. The public page was inspected in managed browser preview. Local admin sign-in was unavailable, so authenticated browser workflow verification remains pending until hosted sign-in is available.

## Remaining specification work

This is an initial functional implementation, not the complete 32-section specification. Still pending: separate frontend deployments; explicit owner/roles authorization for public hosting; page-level drag-and-drop; nested course modules/lessons; arbitrary component style/responsive overrides; video/audio uploads; enrollment/payment integrations; promotions/countdowns; banners/popups; analytics; richer media management; full SEO/social/sitemap controls; managed backups; rate limits and CSP hardening; mobile/accessibility and authenticated end-to-end browser coverage.

Do not treat these as completed features or expose the admin to the public before authorization is extended.
