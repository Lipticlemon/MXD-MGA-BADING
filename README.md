# MXD

An original Midnight Violet course landing page and separate private **ADMIN PANEL**. The project uses a schema-driven renderer and a Cloudflare Worker, D1 database and R2 bucket.

## Current scope

This is an initial implementation, **not the entire MXD master specification**. Implemented: a responsive landing page; sequential numbered text placeholders; text editing; section visibility/order/duplication; theme customization and presets; course/module/lesson editing; media upload and selection; draft, preview, publish, history and restore-to-draft. The ADMIN PANEL is access-restricted.

Not implemented yet: full freeform drag/drop builder, independently configurable mobile layout, analytics, secure checkout, all popup scheduling, complete backup automation, and full multi-user workflows.

## Repository structure

- apps/mxd-web — public frontend
- apps/admin-panel — separate admin frontend
- shared — schema/rendering and public design
- worker — Cloudflare routes, Access verification and API
- db — D1 migrations
- scripts — asset build
- tests — Node unit tests

## Setup

Requires Node 22+, Cloudflare Wrangler, a Cloudflare account with D1, R2, and Access.

1. Run npm install.
2. Create a D1 database using npx wrangler d1 create mxd-db.
3. Replace REPLACE_WITH_D1_DATABASE_ID in wrangler.toml with its actual ID.
4. Create an R2 bucket named mxd-media with npx wrangler r2 bucket create mxd-media.
5. Apply migrations using npx wrangler d1 migrations apply mxd-db --local (and --remote before deployment).
6. Configure Cloudflare Access for your separate **admin hostname**, allowing authorized identities with MFA. Access must protect the whole admin hostname.
7. Configure Worker variables ADMIN_HOST, ACCESS_TEAM_DOMAIN, ACCESS_AUD and optionally ALLOWED_ADMIN_EMAIL. The AUD must correspond to your Access application.
8. Route the public hostname and admin hostname to the Worker. The public root serves the MXD site; the admin root serves ADMIN PANEL. Without an admin hostname, a protected /admin/ route is supported during testing.
9. Run npm run build and npm run deploy (or npx wrangler dev for local work).

The exact domain extension has NOT been supplied. MXD is the project name and does not imply ownership of mxd.com.

**The ADMIN PANEL fails closed without a valid Cloudflare Access JWT.** It is intentionally inaccessible on unconfigured localhost. Do not disable authentication to simplify setup. Live admin testing requires a properly configured Access hostname.

## API routes

Public: GET /api/public; GET /media/:id.

Admin (signed Cloudflare Access JWT required): GET /api/admin/state; PUT /api/admin/draft; POST /api/admin/publish; POST /api/admin/restore; GET/POST /api/admin/media.

Updates are saved to drafts first; publishing switches the public site to the draft version. Restoring an earlier version places it back into draft, which must be published again.

Uploads accept PNG/JPEG/WebP/GIF/MP4 up to 6 MB and use R2, with signature checks. Pricing is currently a display-only editable section. Payment gateway integration is not yet present.

## Test

Run npm test and npm run build. Syntax checks can use node --check on worker/index.js and both frontend main.js files. CI repeats these checks on PRs and supported branches.

Database, authentication, R2, production performance and actual deployment must be tested once a Cloudflare environment is configured. No deployment has been claimed.

## Security

JWT signature verification, restricted server writes, input validation, SQL parameterization, output escaping, safe link schemes and origin checks are part of this foundation. This is not a security audit or payment certification. Configure Cloudflare Access at the edge, keep secret values out of source control, and perform real deployment/security testing before production use.

## Next tasks

Finalize accessible preview interactions, file/media reference management, responsive editor enhancements, real analytics once available, secure enrollment/checkout only if requested, collaboration conflict handling, stronger audit logging, backups and end-to-end browser testing.
