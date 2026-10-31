import { z } from "zod";
import { load, database } from "../../../lib/store";
import { body, json, rate } from "../../../lib/api";
import { digest } from "../../../lib/cloudflare-auth";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({}, 403);
  const { published: d } = await load();
  if (
    !d.analytics.enabled ||
    req.headers.get("dnt") === "1" ||
    req.headers.get("sec-gpc") === "1"
  )
    return json({});
  if (!(await rate(req, "analytics", 100))) return json({}, 429);
  try {
    const p = z
      .object({
        kind: z.enum(["view", "cta", "course", "enroll"]),
        page: z.string().max(200),
        target: z.string().max(100),
        visitor: z.string().regex(/^[a-f0-9-]{36}$/),
        source: z.string().max(200),
      })
      .parse(JSON.parse(await body(req, 2000)));
    const day = new Date().toISOString().slice(0, 10);
    await database()
      .prepare(
        "INSERT INTO events(id,kind,page,target,visitor,source,created) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        p.kind,
        p.page,
        p.target,
        await digest(day + p.visitor),
        p.source,
        new Date().toISOString(),
      )
      .run();
    return json({});
  } catch {
    return json({}, 400);
  }
}
