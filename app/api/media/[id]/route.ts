import { env } from "cloudflare:workers";
import { database } from "../../../../lib/store";
import { getOwner } from "../../../../lib/admin-auth";
import { json } from "../../../../lib/api";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
  if (new URL(req.url).searchParams.has("versions")) {
    if (!(await getOwner())) return json({ error: "Unauthorized" }, 401);
    return json(
      (
        await database()
          .prepare(
            "SELECT id,created,mime,size FROM media_versions WHERE media=? ORDER BY created DESC LIMIT 100",
          )
          .bind(id)
          .all()
      ).results,
    );
  }
  const meta = await database()
    .prepare("SELECT object_key,mime,deleted,size FROM media WHERE id=?")
    .bind(id)
    .first<{
      object_key: string;
      mime: string;
      deleted: number;
      size: number;
    }>();
  if (!meta || meta.deleted) return new Response(null, { status: 404 });
  const header = req.headers.has("if-range") ? null : req.headers.get("range");
  let range: { offset: number; length: number } | undefined;
  if (header) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!m || (!m[1] && !m[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": "bytes */" + meta.size },
      });
    const start = m[1] ? Number(m[1]) : Math.max(0, meta.size - Number(m[2])),
      end = m[1]
        ? m[2]
          ? Math.min(meta.size - 1, Number(m[2]))
          : meta.size - 1
        : meta.size - 1;
    if (start >= meta.size || end < start || (!m[1] && Number(m[2]) <= 0))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": "bytes */" + meta.size },
      });
    range = { offset: start, length: end - start + 1 };
  }
  const obj = await env.BUCKET?.get(
    meta.object_key || id,
    range ? { range } : undefined,
  );
  if (!obj) return new Response(null, { status: 404 });
  const headers = new Headers({
    "Content-Type": meta.mime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=0, must-revalidate",
    ETag: obj.httpEtag,
    "Accept-Ranges": "bytes",
    "Content-Length": String(range ? range.length : obj.size),
  });
  if (req.headers.get("if-none-match") === obj.httpEtag)
    return new Response(null, { status: 304, headers });
  if (range)
    headers.set(
      "Content-Range",
      `bytes ${range.offset}-${range.offset + range.length - 1}/${meta.size}`,
    );
  return new Response(req.method === "HEAD" ? null : obj.body, {
    status: range ? 206 : 200,
    headers,
  });
}
