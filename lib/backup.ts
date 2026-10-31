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
