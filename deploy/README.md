# Cloudflare deployment

Live targets:

- Website: https://mxd.digital-world-9896a4.workers.dev/
- ADMIN PANEL: https://mxd-admin.digital-world-9896a4.workers.dev/admin
- D1: `mxd-content`
- R2: `mxd-media`

The two Workers share the content database and media bucket. The website only permits public read routes; the admin Worker requires a valid server-side session. Both use the same renderer and schema. Sites remains a separate earlier private preview and is not the production data source for these Workers.

## Build and deploy with Wrangler

```sh
npm run typecheck
npm test
npm run build
npx wrangler deploy --config deploy/wrangler.public.json
npx wrangler deploy --config deploy/wrangler.admin.json
```

The configuration files reference the built Vinext modules and client assets. Before a new database deployment, apply generated migrations in order to the correct D1 database. Existing migrations have already been applied to `mxd-content`; do not replay them. Migration 0000 creates content/media/history; migration 0001 adds admin sessions and login attempts.

Admin-only secret bindings are `ADMIN_EMAIL` and `ADMIN_KEY_HASH`. Real values are stored in Cloudflare, never in this repository. `ADMIN_KEY_HASH` is the SHA-256 digest of the generated 256-bit random access key, not of a user-chosen password. This fast digest is suitable for this high-entropy random credential; do not replace it with a human password without adding an appropriate password KDF. No key is placed in client assets or database content.

Sessions use 256-bit random tokens. Only SHA-256 token digests are stored in D1. Cookies use Secure, HttpOnly, SameSite=Strict and a 24-hour lifetime. Logout revokes the current session. Login allows at most five attempts per IP per 15-minute time bucket; IP identifiers are hashed. Changing the access key does not automatically revoke existing sessions; also clear the `admin_sessions` table to revoke all sessions.

The Cloudflare entry guard removes incoming Sites identity headers, then inserts trusted identity only after verifying an admin session. It enforces route separation before the application handles requests. The public host cannot serve `/admin` or `/api/manage`.

## Connector deployment path

The deployed version was built locally and uploaded through the Cloudflare API. `node scripts/cloudflare-artifact.mjs` creates an ignored `outputs/cloudflare-modules.json` with server modules and embedded text client assets. `cloudflare-entry.js` serves only those immutable compiled assets and passes application requests to the same guarded Worker. This avoids requiring a separate asset-upload authorization header from the connector. Wrangler deployments can use the standard native asset binding instead.

The access key is delivered separately to the owner. It is not included here. Cloudflare Access is not enabled on this account; the application login does not require enabling that account-level product.
