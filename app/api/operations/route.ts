import { env } from "cloudflare:workers";
import { getOwner } from "../../../lib/admin-auth";
import { database, load } from "../../../lib/store";
import { body, json, ownerWrite, log } from "../../../lib/api";
export async function GET(req: Request) {
  if (!(await getOwner())) return json({ error: "Unauthorized" }, 401);
  const mode = new URL(req.url).searchParams.get("mode");
  if (mode === "revisions") {
    const id = new URL(req.url).searchParams.get("id");
    const r = await database()
      .prepare("SELECT document FROM revisions WHERE id=?")
      .bind(id)
      .first<{ document: string }>();
    return r ? json(JSON.parse(r.document)) : json({ error: "Not found" }, 404);
  }
  if (mode === "enrollments") {
    const offset = Math.max(
      0,
      Math.min(
        100000,
        Number(new URL(req.url).searchParams.get("offset")) || 0,
      ),
    );
    return json(
      (
        await database()
          .prepare(
            "SELECT * FROM enrollments ORDER BY created DESC LIMIT 50 OFFSET ?",
          )
          .bind(offset)
          .all()
      ).results,
    );
  }
  if (mode === "audit")
    return json(
      (
        await database()
          .prepare("SELECT * FROM audit_log ORDER BY created DESC LIMIT 100")
          .all()
      ).results,
    );
  if (mode === "analytics") {
    const { draft } = await load();
    if (!draft.analytics.enabled) return json({ enabled: false });
    const days = draft.analytics.retentionDays;
    await database()
      .prepare("DELETE FROM events WHERE created<?")
      .bind(new Date(Date.now() - days * 86400000).toISOString())
      .run();
    const totals = await database()
      .prepare("SELECT kind,COUNT(*) AS count FROM events GROUP BY kind")
      .all();
    const visitors = await database()
      .prepare("SELECT COUNT(DISTINCT visitor) AS count FROM events")
      .first();
    const pages = await database()
      .prepare(
        "SELECT page,COUNT(*) AS views FROM events WHERE kind='view' GROUP BY page ORDER BY views DESC LIMIT 20",
      )
      .all();
    const sources = await database()
      .prepare(
        "SELECT source,COUNT(*) AS views FROM events WHERE kind='view' GROUP BY source ORDER BY views DESC LIMIT 20",
      )
      .all();
    return json({
      enabled: true,
      totals: totals.results,
      visitors,
      pages: pages.results,
      sources: sources.results,
      days,
    });
  }
  return json({
    stripeConfigured: !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET,
  });
}
export async function POST(req: Request) {
  try {
    const user = await ownerWrite(req);
    const p = JSON.parse(await body(req, 8000));
    if (p.action === "enrollment-status") {
      if (!["pending", "paid", "cancelled"].includes(p.status))
        throw Error("Invalid status");
      const row = await database()
        .prepare("SELECT provider FROM enrollments WHERE id=?")
        .bind(p.id)
        .first<{ provider: string }>();
      if (!row) return json({ error: "Not found" }, 404);
      if (row.provider === "stripe" && p.status === "paid")
        return json(
          { error: "Stripe payment must be confirmed by a verified webhook" },
          400,
        );
      await database()
        .prepare("UPDATE enrollments SET status=? WHERE id=?")
        .bind(p.status, p.id)
        .run();
      await log(user.userId, "enrollment-" + p.status, p.id);
      return json({ ok: true });
    }
    if (p.action === "revoke-sessions") {
      await database().prepare("DELETE FROM admin_sessions").run();
      await log(user.userId, "revoke-sessions", "all");
      return json({ ok: true });
    }
    return json({ error: "Unknown operation" }, 400);
  } catch {
    return json({ error: "Operation failed" }, 400);
  }
}
