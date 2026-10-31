import { env } from "cloudflare:workers";
import { getOwner } from "../../../lib/admin-auth";
import { ownerWrite, json } from "../../../lib/api";
import { createBackup } from "../../../lib/backup";
export async function GET(req: Request) {
  if (!(await getOwner())) return json({ error: "Unauthorized" }, 401);
  const url = new URL(req.url),
    key = url.searchParams.get("key");
  if (key) {
    if (!/^backups\/[a-zA-Z0-9.-]+\.json$/.test(key))
      return json({ error: "Invalid key" }, 400);
    const object = await env.BUCKET?.get(key);
    if (!object) return json({ error: "Not found" }, 404);
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="mxd-backup.json"',
        "Cache-Control": "no-store",
      },
    });
  }
  const r = await env.BUCKET?.list({
    prefix: "backups/",
    limit: 100,
    cursor: url.searchParams.get("cursor") || undefined,
  });
  return json({
    files: r?.objects.map((x) => ({
      key: x.key,
      size: x.size,
      uploaded: x.uploaded,
    })),
    cursor: r?.truncated ? r.cursor : null,
  });
}
export async function POST(req: Request) {
  try {
    await ownerWrite(req);
    return json({ key: await createBackup(env) });
  } catch {
    return json({ error: "Backup failed" }, 500);
  }
}
