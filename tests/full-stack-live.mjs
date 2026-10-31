// Disposable Cloudflare QA deployment only. Production hosts are rejected.
import assert from "node:assert/strict";
import { makeSection, makeCourse, makeItem } from "../lib/editor-model.ts";
import { newText, upgradeContent, contentSchema } from "../lib/content.ts";
const input = await new Promise((resolve) =>
  process.stdin.once("data", (b) => {
    process.stdin.destroy();
    resolve(b.toString());
  }),
);
const { key } = JSON.parse(input);
const admin = "https://mxd-qa-admin.digital-world-9896a4.workers.dev",
  web = "https://mxd-qa.digital-world-9896a4.workers.dev";
let cookie = "",
  version = 0;
async function call(
  path,
  { method = "GET", data, form, publicSite = false, expected = 200 } = {},
) {
  const origin = publicSite ? web : admin;
  const headers = { Origin: origin };
  if (!publicSite && cookie) headers.Cookie = cookie;
  if (data) headers["Content-Type"] = "application/json";
  const r = await fetch(origin + path, {
    method,
    headers,
    body: form || (data && JSON.stringify(data)),
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  });
  if (r.status !== expected) {
    console.error("HTTP mismatch", path, r.status, await r.text());
    throw Error("Unexpected response");
  }
  return r;
}
const login = await fetch(admin + "/login", {
  method: "POST",
  headers: {
    Origin: admin,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ key }),
  redirect: "manual",
  signal: AbortSignal.timeout(25000),
});
assert.equal(login.status, 303);
cookie = login.headers.get("set-cookie").split(";")[0];
const initial = await (await call("/api/manage")).json();
version = initial.version;
let d = upgradeContent(initial.draft);
const original = structuredClone(d);
async function write(action = "save", document = d, revision) {
  contentSchema.parse(document);
  const out = await (
    await call("/api/manage", {
      method: "POST",
      data: { action, version, document, revision },
    })
  ).json();
  version = out.version;
  return out;
}
console.log("PASS sign-in and initial state");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1QAAAAASUVORK5CYII=",
  "base64",
);
async function upload(bytes, replace) {
  const form = new FormData();
  form.set("file", new File([bytes], "qa.png", { type: "image/png" }));
  form.set("folder", "qa");
  if (replace) form.set("replace", replace);
  return (await call("/api/media", { method: "POST", form })).json();
}
const image = await upload(png);
const hero = d.sections.find((s) => s.type === "hero");
hero.media = image.url;
hero.mediaAlt = newText(d);
d.texts[hero.mediaAlt] = "QA image";
d.texts.text1 = "QA Brand";
d.styles[hero.id] = {
  base: { fontSize: 48 },
  tablet: { fontSize: 32 },
  mobile: { fontSize: 24 },
};
const pageSection = makeSection(d, "custom");
d.texts[pageSection.title] = "QA Page";
d.sections.push(pageSection);
const page = {
  id: "qa-page",
  slug: "/qa-page",
  title: newText(d),
  description: newText(d),
  sectionIds: [pageSection.id],
  visible: true,
  noindex: false,
};
d.pages.push(page);
d.nav.push({ id: "qa-link", label: newText(d), url: "/qa-page" });
d.seo.redirects.push({ from: "/qa-old", to: "/qa-page" });
const c = makeCourse(d);
d.texts[c.title] = "QA Course";
c.price = 200;
c.salePrice = 125;
c.promoStart = "2020-01-01T00:00:00Z";
c.promoEnd = "2099-01-01T00:00:00Z";
c.modules.push({
  id: "qa-module",
  title: newText(d),
  bonus: false,
  visible: true,
  lessons: [
    {
      id: "qa-lesson",
      title: newText(d),
      body: newText(d),
      url: "https://example.com/",
      visible: true,
    },
  ],
});
d.courses.push(c);
d.commerce.enabled = true;
d.commerce.publicOrigin = web;
d.analytics.enabled = true;
d.announcements.push({
  id: "qa-banner",
  type: "banner",
  title: newText(d),
  body: newText(d),
  label: newText(d),
  url: "/",
  visible: true,
  starts: "",
  ends: "",
  pages: [page.id],
  mobile: true,
  background: "#7C3AED",
  placement: "top",
});
await write();
let state = await (await call("/api/manage")).json();
assert.equal(state.published.texts.text1, original.texts.text1);
await write("publish");
assert.ok(
  (await (await call("/", { publicSite: true })).text()).includes("QA Brand"),
);
assert.ok(
  (await (await call("/qa-page", { publicSite: true })).text()).includes(
    "QA Page",
  ),
);
await call("/qa-old", { publicSite: true, expected: 307 });
assert.ok(
  (await (await call("/sitemap.xml", { publicSite: true })).text()).includes(
    "/qa-page",
  ),
);
await call("/robots.txt", { publicSite: true });
console.log(
  "PASS draft isolation, publication, nested courses, pages, SEO and redirects",
);
const id = image.id;
await call("/api/media", {
  method: "PATCH",
  data: { id, action: "delete" },
  expected: 409,
});
const replacement = await upload(Buffer.concat([png, Buffer.from([0])]), id);
assert.notEqual(replacement.id, id);
assert.deepEqual(
  Buffer.from(
    await (await call(image.url, { publicSite: true })).arrayBuffer(),
  ),
  png,
);
d.sections.find((s) => s.id === hero.id).media = replacement.url;
await write();
assert.deepEqual(
  Buffer.from(
    await (await call(image.url, { publicSite: true })).arrayBuffer(),
  ),
  png,
);
await write("publish");
await call("/api/media", { method: "PATCH", data: { id, action: "delete" } });
await call("/api/media", { method: "PATCH", data: { id, action: "restore" } });
const versions = await (await call(replacement.url + "?versions")).json();
assert.ok(versions.length);
const recovered = await (
  await call("/api/media", {
    method: "PATCH",
    data: {
      id: replacement.id,
      action: "restore-version",
      version: versions[0].id,
    },
  })
).json();
assert.notEqual(recovered.url, replacement.url);
console.log(
  "PASS media upload, immutable draft replacement, published-reference protection, trash and version recovery",
);
const enrollment = await (
  await call("/api/enroll", {
    method: "POST",
    publicSite: true,
    data: {
      course: c.id,
      name: "QA Visitor",
      email: "qa@example.test",
      note: "Fixture",
      consent: true,
      amount: 1,
    },
  })
).json();
assert.equal(enrollment.status, "pending");
const orders = await (await call("/api/operations?mode=enrollments")).json();
const order = orders.find((x) => x.id === enrollment.id);
assert.equal(order.amount, 12500);
await call("/api/operations", {
  method: "POST",
  data: { action: "enrollment-status", id: order.id, status: "paid" },
});
c.mode = "stripe";
d.courses[0] = c;
await write("publish");
await call("/api/enroll", {
  method: "POST",
  publicSite: true,
  data: {
    course: c.id,
    name: "QA Visitor",
    email: "qa@example.test",
    note: "Fixture",
    consent: true,
  },
  expected: 503,
});
await call("/api/stripe-webhook", {
  method: "POST",
  publicSite: true,
  data: { id: "fake" },
  expected: 503,
});
console.log(
  "PASS manual enrollment, server-side prices, owner confirmation and unconfigured Stripe refusal",
);
await call("/api/events", {
  method: "POST",
  publicSite: true,
  data: {
    kind: "view",
    page: "/qa-page",
    target: "",
    visitor: "12345678-1234-1234-1234-123456789abc",
    source: "example.test",
  },
});
const metrics = await (await call("/api/operations?mode=analytics")).json();
assert.equal(metrics.enabled, true);
assert.ok(metrics.totals.find((x) => x.kind === "view").count > 0);
const backup = await (await call("/api/backup", { method: "POST" })).json();
const snapshot = await (
  await call("/api/backup?key=" + encodeURIComponent(backup.key))
).json();
assert.equal(snapshot.format, "mxd-backup-1");
assert.ok(snapshot.enrollments.length);
assert.equal(snapshot.admin_sessions, undefined);
const revs = await (await call("/api/manage")).json();
await write(
  "restore",
  d,
  revs.revisions.find((x) => x.kind === "before-publish").id,
);
state = await (await call("/api/manage")).json();
assert.ok(state.draft);
await write("publish", original);
assert.equal(
  (await (await call("/api/manage")).json()).published.texts.text1,
  original.texts.text1,
);
await call("/api/manage", { publicSite: true, expected: 404 });
await call("/api/operations", { publicSite: true, expected: 404 });
await call("/api/media/" + id + "?versions", {
  publicSite: true,
  expected: 404,
});
console.log(
  "PASS analytics, backup, privacy, restore and public/admin separation",
);
await call("/logout", { method: "POST", expected: 303 });
cookie = "";
await call("/api/manage", { expected: 401 });
console.log("ALL FULL-STACK QA CHECKS PASSED");
