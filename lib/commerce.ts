import { courseAmount, scheduled, type Content } from "./content.ts";
export function purchasable(d: Content, id: string, now = Date.now()) {
  if (!d.commerce.enabled) throw Error("Enrollment disabled");
  const c = d.courses.find((c) => c.id === id && c.visible);
  if (!c) throw Error("Course unavailable");
  const amount = courseAmount(c, now);
  if (amount === null) throw Error("Price not configured");
  return { course: c, amount, currency: c.currency.toLowerCase() };
}
