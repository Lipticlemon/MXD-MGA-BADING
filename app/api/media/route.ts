import { env } from "cloudflare:workers";
import { getOwner } from "../../../lib/admin-auth";
import { database, load } from "../../../lib/store";
import { json, ownerWrite, log, body } from "../../../lib/api";
import { sniff, mediaReferences } from "../../../lib/media";
export async function GET(req: Request) {
  if (!(await getOwner())) return json({ error: "Unauthorized" }, 401);
  const url = new URL(req.url);
  const offset = Math.max(
    0,
    Math.min(100000, Number(url.searchParams.get("offset")) || 0),
  );
  const r = await database()
    .prepare("SELECT * FROM media ORDER BY created DESC LIMIT 100 OFFSET ?")
    .bind(offset)
    .all();
  const state = await load();
  return json(
    r.results.map((row) => ({
      ...row,
      usage: {
        draft: mediaReferences(state.draft, String(row.id)),
        published: mediaReferences(state.published, String(row.id)),
      },
    })),
  );
}
export async function POST(req: Request) {
  try {
    const user = await ownerWrite(req);
    const len = Number(req.headers.get("content-length"));
    if (!len || len > 52000000)
      return json({ error: "Maximum upload 50 MB" }, 413);
    if (!env.BUCKET) return json({ error: "Storage unavailable" }, 503);
    const form = await req.formData(),
      f = form.get("file");
    if (!(f instanceof File) || f.size > 50000000)
      return json({ error: "Invalid file" }, 400);
    const bytes = new Uint8Array(await f.arrayBuffer()),
      mime = sniff(bytes);
    if (!mime)
      return json(
        {
          error:
            "Use PNG, JPEG, WebP, GIF, MP4, WebM or MP3. SVG files are converted to PNG by the editor.",
        },
        400,
      );
    const replace = String(form.get("replace") || "");
    const previous = replace
      ? await database()
          .prepare("SELECT * FROM media WHERE id=?")
          .bind(replace)
          .first<{
            id: string;
            name: string;
            mime: string;
            size: number;
            object_key: string;
            created: string;
          }>()
      : null;
    if (replace && !previous) return json({ error: "Media not found" }, 404);
    const id = crypto.randomUUID(),
      key = id + "/versions/" + crypto.randomUUID();
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
    const statements = [];
    if (previous)
      statements.push(
        database()
          .prepare(
            "INSERT INTO media_versions(id,media,object_key,mime,size,created) VALUES(?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            previous.object_key || previous.id,
            previous.mime,
            previous.size,
            new Date().toISOString(),
          ),
      );
    statements.push(
      database()
        .prepare(
          "INSERT INTO media(id,name,mime,size,created,folder,object_key) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          f.name.slice(0, 200),
          mime,
          f.size,
          new Date().toISOString(),
          String(form.get("folder") || "").slice(0, 80),
          key,
        ),
    );
    await database().batch(statements);
    await log(user.userId, previous ? "replace-media" : "upload-media", id);
    return json({ id, url: "/api/media/" + id, mime });
  } catch {
    return json({ error: "Upload failed" }, 400);
  }
}
export async function PATCH(req: Request) {
  try {
    const user = await ownerWrite(req),
      p = JSON.parse(await body(req, 8000));
    if (!/^[a-f0-9-]{36}$/.test(p.id)) throw Error("Invalid ID");
    if (p.action === "delete") {
      const { published } = await load();
      if (mediaReferences(published, p.id).length)
        return json(
          {
            error:
              "This file is used on the published website. Remove its references and publish first.",
          },
          409,
        );
      await database()
        .prepare("UPDATE media SET deleted=1 WHERE id=?")
        .bind(p.id)
        .run();
    } else if (p.action === "restore")
      await database()
        .prepare("UPDATE media SET deleted=0 WHERE id=?")
        .bind(p.id)
        .run();
    else if (p.action === "rename")
      await database()
        .prepare("UPDATE media SET name=?,folder=? WHERE id=?")
        .bind(
          String(p.name).slice(0, 200),
          String(p.folder || "").slice(0, 80),
          p.id,
        )
        .run();
    else if (p.action === "restore-version") {
      const v = await database()
        .prepare("SELECT * FROM media_versions WHERE id=? AND media=?")
        .bind(p.version, p.id)
        .first<{ object_key: string; mime: string; size: number }>();
      if (!v) return json({ error: "Not found" }, 404);
      const old = await database()
        .prepare(
          "SELECT name,folder,object_key,mime,size FROM media WHERE id=?",
        )
        .bind(p.id)
        .first<{
          name: string;
          folder: string;
          object_key: string;
          mime: string;
          size: number;
        }>();
      if (!old) return json({ error: "Not found" }, 404);
      const newId = crypto.randomUUID();
      await database()
        .prepare(
          "INSERT INTO media(id,name,mime,size,created,folder,object_key) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          newId,
          old.name,
          v.mime,
          v.size,
          new Date().toISOString(),
          old.folder,
          v.object_key,
        )
        .run();
      await database()
        .prepare(
          "INSERT INTO media_versions(id,media,object_key,mime,size,created) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          newId,
          old.object_key || p.id,
          old.mime,
          old.size,
          new Date().toISOString(),
        )
        .run();
      await log(user.userId, "restore-media-version", newId);
      return json({ ok: true, url: "/api/media/" + newId });
    } else return json({ error: "Unknown operation" }, 400);
    await log(user.userId, "media-" + p.action, p.id);
    return json({ ok: true });
  } catch {
    return json({ error: "Operation failed" }, 400);
  }
}
