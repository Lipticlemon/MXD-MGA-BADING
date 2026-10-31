export async function maintainRecords(db: D1Database) {
  const state = await db
    .prepare("SELECT published FROM site_state WHERE id=1")
    .first<{ published: string }>();
  const configured = state
    ? JSON.parse(state.published).analytics?.retentionDays
    : undefined;
  const days =
    Number.isInteger(configured) && configured >= 7 && configured <= 365
      ? configured
      : 90;
  const now = Date.now();
  await db.batch([
    db
      .prepare("DELETE FROM events WHERE created<?")
      .bind(new Date(now - days * 86400000).toISOString()),
    db
      .prepare("DELETE FROM admin_sessions WHERE expires<=?")
      .bind(Math.floor(now / 1000)),
    db
      .prepare("DELETE FROM login_attempts WHERE window<?")
      .bind(Math.floor(now / 900000) - 1),
  ]);
}
export async function createBackup(env: {
  DB?: D1Database;
  BUCKET?: R2Bucket;
}) {
  if (!env.DB || !env.BUCKET) throw Error("Storage unavailable");
  const tables = [
    "site_state",
    "revisions",
    "media",
    "media_versions",
    "enrollments",
    "webhook_events",
    "audit_log",
  ];
  const result: Record<string, unknown> = {
    format: "mxd-backup-1",
    created: new Date().toISOString(),
  };
  const snapshots = await env.DB.batch(
    tables.map((table) => env.DB!.prepare(`SELECT * FROM ${table}`)),
  );
  tables.forEach((table, i) => {
    result[table] = snapshots[i].results;
  });
  const key =
    "backups/" +
    new Date().toISOString().replace(/[:.]/g, "-") +
    "-" +
    crypto.randomUUID() +
    ".json";
  await env.BUCKET.put(key, JSON.stringify(result), {
    httpMetadata: { contentType: "application/json" },
  });
  return key;
}
