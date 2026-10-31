import { env } from "cloudflare:workers";
import Stripe from "stripe";
import { parseStripeEvent, paymentMatches } from "../../../lib/stripe";
import { database } from "../../../lib/store";
import { body, json } from "../../../lib/api";
export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET)
    return json({ error: "Not configured" }, 503);
  try {
    const event = await parseStripeEvent(
      await body(req, 1000000),
      req.headers.get("stripe-signature") || "",
      env.STRIPE_WEBHOOK_SECRET,
    );
    if (
      ![
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    )
      return json({ received: true });
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") return json({ received: true });
    const id = s.client_reference_id;
    const row = await database()
      .prepare(
        "SELECT amount,currency,checkout FROM enrollments WHERE id=? AND provider=?",
      )
      .bind(id, "stripe")
      .first<{ amount: number; currency: string; checkout: string }>();
    if (!row || !paymentMatches(row, s))
      return json({ error: "Payment mismatch" }, 400);
    await database().batch([
      database()
        .prepare(
          "UPDATE enrollments SET status='paid' WHERE id=? AND status='pending'",
        )
        .bind(id),
      database()
        .prepare("INSERT OR IGNORE INTO webhook_events(id,created) VALUES(?,?)")
        .bind(event.id, new Date().toISOString()),
    ]);
    return json({ received: true });
  } catch {
    return json({ error: "Invalid webhook" }, 400);
  }
}
