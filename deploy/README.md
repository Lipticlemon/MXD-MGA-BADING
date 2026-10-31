# Cloudflare deployment

Live targets:

- Website: https://mxd.digital-world-9896a4.workers.dev/
- ADMIN PANEL: https://mxd-admin.digital-world-9896a4.workers.dev/admin
- D1: `mxd-content`
- R2: `mxd-media`

The two Workers share the content database and media bucket. The website permits public reads and only the enrollment, optional analytics and signed payment-webhook POST endpoints; the admin Worker requires a valid server-side session. Both use the same renderer and schema. Sites remains a separate earlier private preview and is not the production data source for these Workers.

## Build and deploy with Wrangler

```sh
npm run typecheck
npm test
npm run build
npx wrangler deploy --config deploy/wrangler.public.json
npx wrangler deploy --config deploy/wrangler.admin.json
```

The configuration files reference the built Vinext modules and client assets. Before a new database deployment, apply generated migrations in order to the correct D1 database. Do not replay applied migrations. Migration 0000 creates content/media/history; 0001 adds admin sessions and login attempts; 0002 adds enrollment, events, webhook deduplication, media versions, audit records and media folder/object keys; 0003 adds query indexes. The 0002/0003 migration is additive and preserves existing content and credentials.

Admin-only secret bindings are `ADMIN_EMAIL` and `ADMIN_KEY_HASH`. Real values are stored in Cloudflare, never in this repository. `ADMIN_KEY_HASH` is the SHA-256 digest of the generated 256-bit random access key, not of a user-chosen password. This fast digest is suitable for this high-entropy random credential; do not replace it with a human password without adding an appropriate password KDF. No key is placed in client assets or database content.

Sessions use 256-bit random tokens. Only SHA-256 token digests are stored in D1. Cookies use Secure, HttpOnly, SameSite=Strict and a 24-hour lifetime. Logout revokes the current session. Login allows at most five attempts per IP per 15-minute time bucket; IP identifiers are hashed. Changing the access key does not automatically revoke existing sessions; also clear the `admin_sessions` table to revoke all sessions.

The Cloudflare entry guard removes incoming Sites identity headers, then inserts trusted identity only after verifying an admin session. It enforces route separation before the application handles requests. The public host cannot serve `/admin` or `/api/manage`.

## Connector deployment path

The deployed version was built locally and uploaded through the Cloudflare API. `node scripts/cloudflare-artifact.mjs` creates an ignored `outputs/cloudflare-modules.json` with server modules and embedded text client assets. `cloudflare-entry.js` serves only those immutable compiled assets and passes application requests to the same guarded Worker. This avoids requiring a separate asset-upload authorization header from the connector. Wrangler deployments can use the standard native asset binding instead.

The access key is delivered separately to the owner. It is not included here. Cloudflare Access is not enabled on this account; the application login does not require enabling that account-level product.

## Login origin handling

The login form requires a same-origin POST. Login responses use `Referrer-Policy: strict-origin-when-cross-origin`; `no-referrer` can make a native browser form send `Origin: null` and fail validation before checking the key. Null and foreign origins remain rejected. Refresh `/login` after deploying a policy change. An incorrect key displays an error in the login form.

## Payments

Manual enrollment stores a pending request, using the published course price and active promotion on the server. An owner can confirm receipt in Enrollments. This does not charge a card or automatically deliver access to an external learning platform.

For Stripe, configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as secret bindings on the public Worker. Set the same bindings on the admin Worker for its configuration status indicator. Never place them in content exports or plain-text Wrangler vars. Set the site's public origin, choose Stripe on a published course, and register `https://mxd.digital-world-9896a4.workers.dev/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Use Stripe test mode first. Check that checkout uses the server price, a signed paid event marks the matching enrollment paid exactly once, and tampered/expired/incorrect-amount events are rejected. Only then configure live-mode credentials. No Stripe keys are supplied by this repository. External enrollment URLs can link to an existing enrollment service.

## Backups and restoration

The admin Worker runs `0 18 * * *` (02:00 Asia/Manila daily), purging analytics beyond the published retention setting and expired sessions/login counters, then creating a consistent D1 snapshot in the private R2 `backups/` prefix. Settings provides manual creation, paginated listing and authenticated download. Backups exclude access keys, session cookies and session records. Revisions, media metadata, enrollment records, webhook deduplication IDs and audit history are included. Media objects are retained at immutable keys in the same bucket; the JSON snapshot does not duplicate their bytes. Backups are retained until the owner removes them.

For a content mistake, use History to preview and restore a revision to the draft, then review and publish. For an unpublished change, discard the draft. For a removed media item, restore it from Media trash; replacement history creates a new immutable asset.

For database disaster recovery, first export the current database and retain the chosen JSON backup. Restore its table rows into a separate D1 database using parameterized inserts in dependency order (`site_state`, `revisions`, `media`, `media_versions`, `enrollments`, `webhook_events`, `audit_log`), then validate content references and sample media against the retained R2 bucket. Start with a fresh session/login-attempt store and verify the restored deployment before rebinding production. Full database recovery is an operator procedure, not a one-click content import. Keep an independent R2 copy if protection from bucket/account loss is required.
