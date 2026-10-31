import { ZodError } from "zod";
import { getOwner } from "../../../lib/admin-auth";
import { contentSchema, upgradeContent } from "../../../lib/content";
import { database, load } from "../../../lib/store";
import { body } from "../../../lib/api";
import { writeRevision } from "../../../lib/repository";
export const dynamic = "force-dynamic";
const json = (d: unknown, status = 200) =>
  Response.json(d, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: Request) {
  if (!(await getOwner())) return json({ error: "Sign in required" }, 401);
  try {
    const state = await load();
    const before = new URL(req.url).searchParams.get("before")?.split("|");
    const query =
      before?.length === 2
        ? database()
            .prepare(
              "SELECT id,created,kind,actor FROM revisions WHERE created<? OR (created=? AND id<?) ORDER BY created DESC,id DESC LIMIT 50",
            )
            .bind(before[0], before[0], before[1])
        : database().prepare(
            "SELECT id,created,kind,actor FROM revisions ORDER BY created DESC,id DESC LIMIT 50",
          );
    const revisions = await query.all<{
      id: string;
      created: string;
      kind: string;
      actor: string;
    }>();
    const last = revisions.results[revisions.results.length - 1];
    return json({
      ...state,
      revisions: revisions.results,
      nextCursor:
        revisions.results.length === 50 ? last.created + "|" + last.id : null,
    });
  } catch {
    return json({ error: "Content storage unavailable" }, 503);
  }
}
export async function POST(req: Request) {
  const user = await getOwner();
  if (!user) return json({ error: "Sign in required" }, 401);
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Invalid origin" }, 403);
  if (!req.headers.get("content-type")?.includes("application/json"))
    return json({ error: "JSON required" }, 415);
  if (Number(req.headers.get("content-length") || 0) > 1000000)
    return json({ error: "Payload too large" }, 413);
  try {
    const raw = await body(req, 1000000);
    if (raw.length > 1000000) return json({ error: "Payload too large" }, 413);
    const p = JSON.parse(raw);
    if (
      !Number.isSafeInteger(p.version) ||
      !["save", "publish", "restore", "discard"].includes(p.action)
    )
      return json({ error: "Invalid operation" }, 400);
    const db = database();
    let document = p.document;
    if (p.action === "restore") {
      const r = await db
        .prepare("SELECT document FROM revisions WHERE id=?")
        .bind(String(p.revision))
        .first<{ document: string }>();
      if (!r) return json({ error: "Revision not found" }, 404);
      document = JSON.parse(r.document);
    }
    if (p.action === "discard") document = (await load()).published;
    const parsed = contentSchema.safeParse(upgradeContent(document));
    if (!parsed.success)
      return json(
        { error: parsed.error.issues.map((x) => x.message).join("; ") },
        400,
      );
    if (p.action === "publish") {
      const urls = new Set<string>();
      const visit = (v: unknown): void => {
        if (typeof v === "string" && /^\/api\/media\/[a-f0-9-]{36}$/.test(v))
          urls.add(v.split("/").pop()!);
        else if (Array.isArray(v)) v.forEach(visit);
        else if (v && typeof v === "object") Object.values(v).forEach(visit);
      };
      visit(parsed.data);
      for (const id of urls) {
        if (
          !(await db
            .prepare("SELECT id FROM media WHERE id=? AND deleted=0")
            .bind(id)
            .first())
        )
          return json({ error: "Missing or deleted media: " + id }, 400);
      }
    }
    const current = await load();
    if (p.version !== current.version)
      return json(
        { error: "Another edit was saved. Export your draft, then reload." },
        409,
      );
    const result = await writeRevision(
      db,
      current,
      parsed.data,
      p.version,
      p.action,
      user.userId,
      true,
    );
    if (!result.changed)
      return json({ error: "Conflicting edit; reload required" }, 409);
    return json({ version: result.version });
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: error.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
        },
        400,
      );
    console.error(
      "Content write failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json(
      { error: "Unable to save. Your local changes are retained." },
      400,
    );
  }
}
