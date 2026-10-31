import { env } from "cloudflare:workers";
import Stripe from "stripe";
import { z } from "zod";
import { load, database } from "../../../lib/store";
import { body, json, rate } from "../../../lib/api";
import { purchasable } from "../../../lib/commerce";
const schema = z.object({
  course: z.string().max(100),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(254),
  note: z.string().max(2000).default(""),
  consent: z.boolean(),
  website: z.string().max(0).optional(),
});
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Invalid origin" }, 403);
  if (!(await rate(req, "enroll", 10)))
    return json({ error: "Rate limited" }, 429);
  try {
    const data = schema.parse(JSON.parse(await body(req, 8000)));
    const { published: d } = await load();
    if (d.commerce.requireConsent && !data.consent)
      return json({ error: "Consent required" }, 400);
    if (
      d.maintenance.enabled &&
      (!d.maintenance.reopen || Date.parse(d.maintenance.reopen) > Date.now())
    )
      return json({ error: "Maintenance" }, 503);
    const { course, amount, currency } = purchasable(d, data.course),
      provider = course.mode === "stripe" ? "stripe" : "manual";
    if (course.mode === "external") return json({ url: course.url });
    if (
      provider === "stripe" &&
      (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET)
    )
      return json({ error: "Payment provider not configured" }, 503);
    const id = crypto.randomUUID();
    await database()
      .prepare(
        "INSERT INTO enrollments(id,course,name,email,note,amount,currency,status,provider,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        course.id,
        data.name,
        data.email,
        data.note,
        amount,
        currency,
        "pending",
        provider,
        new Date().toISOString(),
      )
      .run();
    if (provider === "stripe") {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
        httpClient: Stripe.createFetchHttpClient(),
      });
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: data.email,
          client_reference_id: id,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency,
                unit_amount: amount,
                product_data: { name: d.texts[course.title].slice(0, 200) },
              },
            },
          ],
          success_url: d.commerce.publicOrigin + "/?checkout=success",
          cancel_url: d.commerce.publicOrigin + "/?checkout=cancelled",
          metadata: { enrollment: id },
        },
        { idempotencyKey: id },
      );
      await database()
        .prepare("UPDATE enrollments SET checkout=? WHERE id=?")
        .bind(session.id, id)
        .run();
      return json({ id, url: session.url });
    }
    return json({ id, status: "pending" });
  } catch {
    return json({ error: "Enrollment could not be submitted" }, 400);
  }
}
