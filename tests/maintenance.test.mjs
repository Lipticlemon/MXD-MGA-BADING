import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { maintainRecords } from "../lib/backup.ts";
test("daily maintenance uses published retention and preserves active sessions", async () => {
  const sql = new DatabaseSync(":memory:");
  sql.exec(
    "CREATE TABLE site_state(id INTEGER,published TEXT); CREATE TABLE events(created TEXT); CREATE TABLE admin_sessions(id TEXT,expires INTEGER); CREATE TABLE login_attempts(id TEXT,window INTEGER)",
  );
  const now = Date.now();
  sql
    .prepare("INSERT INTO site_state VALUES(1,?)")
    .run(JSON.stringify({ analytics: { retentionDays: 7 } }));
  for (const days of [2, 8])
    sql
      .prepare("INSERT INTO events VALUES(?)")
      .run(new Date(now - days * 86400000).toISOString());
  sql
    .prepare("INSERT INTO admin_sessions VALUES(?,?)")
    .run("active", Math.floor(now / 1000) + 3600);
  sql
    .prepare("INSERT INTO admin_sessions VALUES(?,?)")
    .run("expired", Math.floor(now / 1000) - 3600);
  sql
    .prepare("INSERT INTO login_attempts VALUES(?,?)")
    .run("old", Math.floor(now / 900000) - 3);
  sql
    .prepare("INSERT INTO login_attempts VALUES(?,?)")
    .run("current", Math.floor(now / 900000));
  const db = {
    prepare(q) {
      const s = sql.prepare(q);
      return {
        first: async () => s.get(),
        bind(...p) {
          return { run: () => s.run(...p) };
        },
      };
    },
    batch: async (statements) => statements.map((s) => s.run()),
  };
  await maintainRecords(db);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM events").get().n, 1);
  assert.equal(sql.prepare("SELECT id FROM admin_sessions").get().id, "active");
  assert.equal(
    sql.prepare("SELECT id FROM login_attempts").get().id,
    "current",
  );
  sql.close();
});
