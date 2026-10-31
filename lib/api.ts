import { getOwner } from "./admin-auth";
import { database } from "./store";
import { digest } from "./cloudflare-auth";
export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export { readText as body } from "./request-body";
export async function ownerWrite(req: Request) {
  const user = await getOwner();
  if (!user) throw Error("Sign in required");
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw Error("Invalid origin");
  return user;
}
export async function rate(req: Request, key: string, max: number) {
  const window = Math.floor(Date.now() / 900000),
    id =
      key +
      ":" +
      window +
      ":" +
      (await digest(req.headers.get("CF-Connecting-IP") || "unknown"));
  const r = await database()
    .prepare(
      "INSERT INTO login_attempts(id,count,window) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(id, window)
    .first<{ count: number }>();
  return !!r && r.count <= max;
}
export async function log(actor: string, action: string, target: string) {
  await database()
    .prepare(
      "INSERT INTO audit_log(id,actor,action,target,created) VALUES(?,?,?,?,?)",
    )
    .bind(crypto.randomUUID(), actor, action, target, new Date().toISOString())
    .run();
}
