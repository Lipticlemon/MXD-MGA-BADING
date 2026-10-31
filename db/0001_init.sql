-- Apply using: npx wrangler d1 migrations apply mxd-db --remote
CREATE TABLE IF NOT EXISTS site_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 draft TEXT NOT NULL,
 published TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 published_at TEXT
);
CREATE TABLE IF NOT EXISTS revisions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 snapshot TEXT NOT NULL,
 published_at TEXT NOT NULL,
 actor TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revisions_published_at ON revisions(published_at);
CREATE TABLE IF NOT EXISTS media (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 mime TEXT NOT NULL,
 size INTEGER NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);