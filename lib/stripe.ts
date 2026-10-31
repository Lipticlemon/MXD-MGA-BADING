import Stripe from "stripe";
export async function parseStripeEvent(
  payload: string,
  signature: string,
  secret: string,
) {
  const stripe = new Stripe("sk_test_signature_validation_only", {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return stripe.webhooks.constructEventAsync(
    payload,
    signature,
    secret,
    300,
    Stripe.createSubtleCryptoProvider(),
  );
}
export function paymentMatches(
  row: { amount: number; currency: string; checkout: string },
  session: {
    id: string;
    amount_total: number | null;
    currency: string | null;
    payment_status: string;
  },
) {
  return (
    session.payment_status === "paid" &&
    row.checkout === session.id &&
    row.amount === session.amount_total &&
    row.currency === session.currency
  );
}
