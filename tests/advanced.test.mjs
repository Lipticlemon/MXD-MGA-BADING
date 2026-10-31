import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import {
  initialContent,
  upgradeContent,
  contentSchema,
  newText,
  courseAmount,
  scheduled,
} from "../lib/content.ts";
import {
  makeCourse,
  makeSection,
  makeItem,
  duplicateSection,
  applyPreset,
} from "../lib/editor-model.ts";
import { purchasable } from "../lib/commerce.ts";
import { sniff, mediaReferences } from "../lib/media.ts";
import { designCss } from "../lib/styles.ts";
import { readText } from "../lib/request-body.ts";
import { parseStripeEvent, paymentMatches } from "../lib/stripe.ts";
test("legacy content upgrades without losing IDs, text or published sections", () => {
  const current = initialContent();
  current.texts.text1 = "Owner edited";
  const legacy = { ...current };
  delete legacy.ui;
  delete legacy.pages;
  delete legacy.courses;
  delete legacy.styles;
  const upgraded = upgradeContent(legacy);
  assert.equal(upgraded.texts.text1, "Owner edited");
  assert.deepEqual(
    upgraded.sections.map((s) => s.id),
    current.sections.map((s) => s.id),
  );
  assert.equal(
    new Set(Object.values(upgraded.ui)).size,
    Object.keys(upgraded.ui).length,
  );
  assert.ok(contentSchema.safeParse(upgraded).success);
});
test("new templates and duplicated blocks allocate independent stable text IDs", () => {
  const d = initialContent();
  const s = makeSection(d, "gallery");
  s.items.push(makeItem(d));
  d.sections.push(s);
  d.pages[0].sectionIds.push(s.id);
  d.texts[s.items[0].title] = "Original";
  const id = duplicateSection(d, s.id);
  const copy = d.sections.find((s) => s.id === id);
  d.texts[copy.items[0].title] = "Copy";
  assert.equal(d.texts[s.items[0].title], "Original");
  assert.equal(d.texts[copy.items[0].title], "Copy");
  assert.ok(d.pages[0].sectionIds.includes(copy.id));
  assert.ok(contentSchema.safeParse(d).success);
});
test("design presets preserve commercial content and text", () => {
  const d = initialContent();
  d.courses.push(makeCourse(d));
  d.courses[0].price = 199;
  const original = structuredClone(d);
  d.presets.push({
    id: "saved",
    name: "saved",
    theme: { ...d.theme, accent: "#112233" },
    styles: {},
    layouts: [],
  });
  applyPreset(d, "saved");
  assert.equal(d.theme.accent, "#112233");
  assert.deepEqual(d.courses, original.courses);
  assert.deepEqual(d.texts, original.texts);
});
test("checkout prices come from published course and schedule, not browser values", () => {
  const d = initialContent(),
    c = makeCourse(d);
  d.courses.push(c);
  d.commerce.enabled = true;
  c.price = 250;
  c.salePrice = 199;
  c.promoStart = "2026-01-01T00:00:00Z";
  c.promoEnd = "2026-02-01T00:00:00Z";
  assert.equal(purchasable(d, c.id, Date.parse("2026-01-15")).amount, 19900);
  assert.equal(purchasable(d, c.id, Date.parse("2026-03-01")).amount, 25000);
  c.visible = false;
  assert.throws(() => purchasable(d, c.id));
  c.visible = true;
  d.commerce.enabled = false;
  assert.throws(() => purchasable(d, c.id));
  assert.equal(
    scheduled("2026-01-01", "2026-02-01", Date.parse("2026-02-01")),
    false,
  );
});
test("responsive styles accept whitelisted values, reject CSS injection and unsafe selectors", () => {
  const d = initialContent();
  d.styles.hero = {
    base: { fontSize: 45 },
    tablet: { fontSize: 32 },
    mobile: { fontSize: 22 },
  };
  assert.ok(designCss(d).includes("@media(max-width:760px)"));
  d.styles.hero.base.color = "red;display:none";
  assert.equal(contentSchema.safeParse(d).success, false);
  delete d.styles.hero.base.color;
  d.presets.push({
    id: "bad",
    name: "bad",
    theme: d.theme,
    styles: { 'x"]{body{display:none}': { base: {}, tablet: {}, mobile: {} } },
  });
  assert.equal(contentSchema.safeParse(d).success, false);
});
test("page references, reserved routes and redirect loops cannot publish", () => {
  const d = initialContent();
  d.pages[0].slug = "/admin";
  assert.equal(contentSchema.safeParse(d).success, false);
  d.pages[0].slug = "/";
  d.pages[0].sectionIds.push("missing");
  assert.equal(contentSchema.safeParse(d).success, false);
  d.pages[0].sectionIds.pop();
  d.seo.redirects = [
    { from: "/a", to: "/b" },
    { from: "/b", to: "/a" },
  ];
  assert.equal(contentSchema.safeParse(d).success, false);
});
test("media byte validation rejects executable HTML and SVG; reference checks include published styles and courses", () => {
  assert.equal(
    sniff(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),
    null,
  );
  assert.equal(sniff(new TextEncoder().encode("<html>bad</html>")), null);
  assert.equal(
    sniff(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0])),
    "image/png",
  );
  const d = initialContent();
  d.theme.logo = "/api/media/12345678-1234-1234-1234-123456789abc";
  assert.equal(
    mediaReferences(d, "12345678-1234-1234-1234-123456789abc").length,
    1,
  );
});
test("bounded body reader rejects oversized and accepts valid streams", async () => {
  assert.equal(
    await readText(
      new Request("https://example.test", { method: "POST", body: "abc" }),
      3,
    ),
    "abc",
  );
  await assert.rejects(() =>
    readText(
      new Request("https://example.test", { method: "POST", body: "abcd" }),
      3,
    ),
  );
});
test("Stripe webhook signatures reject tampering and expired events", async () => {
  const stripe = new Stripe("sk_test_not_live"),
    secret = "whsec_test_fixture";
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test" } },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(
    (await parseStripeEvent(payload, header, secret)).id,
    "evt_test",
  );
  await assert.rejects(() => parseStripeEvent(payload + " ", header, secret));
  const expired = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: 1,
  });
  await assert.rejects(() => parseStripeEvent(payload, expired, secret));
});
test("payment confirmation rejects wrong amount, currency, session and unpaid state", () => {
  const row = { amount: 10000, currency: "php", checkout: "cs_real" },
    s = {
      id: "cs_real",
      amount_total: 10000,
      currency: "php",
      payment_status: "paid",
    };
  assert.equal(paymentMatches(row, s), true);
  for (const patch of [
    { amount_total: 1 },
    { currency: "usd" },
    { id: "cs_fake" },
    { payment_status: "unpaid" },
  ])
    assert.equal(paymentMatches(row, { ...s, ...patch }), false);
});
