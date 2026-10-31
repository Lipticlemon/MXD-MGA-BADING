import { z } from "zod";
export const textId = z.string().regex(/^text[1-9]\d*$/);
export const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      v === "/" ||
      v === "#" ||
      /^#[a-zA-Z0-9_-]+$/.test(v) ||
      (/^\/[a-zA-Z0-9][a-zA-Z0-9_/#?=&%.-]*$/.test(v) && !v.includes("..")) ||
      (/^https:\/\//.test(v) &&
        (() => {
          try {
            return !new URL(v).username && !new URL(v).password;
          } catch {
            return false;
          }
        })()),
    "Use HTTPS, a section anchor, or uploaded media",
  );
export const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const styleSchema = z.object({
  color: color.optional(),
  background: color.optional(),
  borderColor: color.optional(),
  shadowColor: color.optional(),
  hoverColor: color.optional(),
  hoverBackground: color.optional(),
  gradientFrom: color.optional(),
  gradientTo: color.optional(),
  gradientAngle: z.number().min(0).max(360).optional(),
  font: z.enum(["Inter", "Georgia", "system-ui"]).optional(),
  fontSize: z.number().min(8).max(160).optional(),
  fontWeight: z.number().int().min(100).max(900).optional(),
  lineHeight: z.number().min(1).max(3).optional(),
  letterSpacing: z.number().min(-5).max(10).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  padding: z.number().min(0).max(200).optional(),
  margin: z.number().min(0).max(200).optional(),
  gap: z.number().min(0).max(120).optional(),
  width: z.number().min(0).max(1600).optional(),
  radius: z.number().min(0).max(80).optional(),
  borderWidth: z.number().min(0).max(10).optional(),
  shadow: z.number().min(0).max(80).optional(),
  opacity: z.number().min(0).max(1).optional(),
  columns: z.number().int().min(1).max(4).optional(),
  hidden: z.boolean().optional(),
  animation: z.enum(["none", "fade", "slide"]).optional(),
  duration: z.number().min(0).max(5000).optional(),
  delay: z.number().min(0).max(10000).optional(),
  intensity: z.number().min(0).max(100).optional(),
  easing: z
    .enum(["ease", "linear", "ease-in", "ease-out", "ease-in-out"])
    .optional(),
});
export const responsiveStyle = z.object({
  base: styleSchema.default({}),
  tablet: styleSchema.default({}),
  mobile: styleSchema.default({}),
});
const item = z.object({
  id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .max(100),
  title: textId,
  body: textId,
  label: textId,
  url: safeUrl,
  media: safeUrl,
  alt: textId,
  price: z.number().min(0).max(100000000).nullable(),
  visible: z.boolean(),
  icon: z.enum(["diamond", "spark", "wave", "none"]).default("spark"),
  aspect: z.number().min(0.3).max(4).default(1.6),
  focalX: z.number().min(0).max(100).default(50),
  focalY: z.number().min(0).max(100).default(50),
  crop: z.enum(["cover", "contain"]).default("cover"),
  mediaKind: z.enum(["image", "video", "audio"]).default("image"),
  currency: z
    .enum(["PHP", "USD", "EUR", "GBP", "SGD", "AUD", "CAD"])
    .default("PHP"),
  salePrice: z.number().min(0).max(100000000).nullable().default(null),
  promoStart: z.string().default(""),
  promoEnd: z.string().default(""),
});
const lesson = z.object({
  id: z.string(),
  title: textId,
  body: textId,
  url: safeUrl,
  visible: z.boolean(),
});
const moduleSchema = z.object({
  id: z.string(),
  title: textId,
  bonus: z.boolean(),
  visible: z.boolean(),
  lessons: z.array(lesson).max(200),
});
export const courseSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    title: textId,
    body: textId,
    label: textId,
    category: textId,
    media: safeUrl,
    alt: textId,
    featured: z.boolean(),
    visible: z.boolean(),
    price: z.number().min(0).max(1000000).nullable(),
    salePrice: z.number().min(0).max(1000000).nullable(),
    currency: z.enum(["PHP", "USD", "EUR", "GBP", "SGD", "AUD", "CAD"]),
    promoStart: z.string(),
    promoEnd: z.string(),
    mode: z.enum(["manual", "stripe", "external"]),
    url: safeUrl,
    modules: z.array(moduleSchema).max(100),
  })
  .refine(
    (c) => c.salePrice === null || c.price === null || c.salePrice <= c.price,
    "Promotional price must not exceed base price",
  );
const pageSchema = z.object({
  id: z.string(),
  slug: z
    .string()
    .regex(/^\/[a-zA-Z0-9_/-]*$/)
    .refine(
      (s) =>
        !s.includes("..") &&
        !s.startsWith("//") &&
        !/^\/(admin|api|login|logout|_next)(\/|$)/.test(s),
      "Reserved page path",
    ),
  title: textId,
  description: textId,
  visible: z.boolean(),
  sectionIds: z.array(z.string()).max(60),
  noindex: z.boolean(),
});
const announcement = z.object({
  id: z.string(),
  type: z.enum(["banner", "popup"]),
  title: textId,
  body: textId,
  label: textId,
  url: safeUrl,
  visible: z.boolean(),
  starts: z.string(),
  ends: z.string(),
  pages: z.array(z.string()),
  mobile: z.boolean(),
  background: color,
  placement: z.enum(["top", "bottom"]),
});
export const section = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum([
    "hero",
    "benefits",
    "courses",
    "curriculum",
    "instructor",
    "resources",
    "testimonials",
    "pricing",
    "community",
    "faq",
    "cta",
    "gallery",
    "custom",
  ]),
  title: textId,
  body: textId,
  label: textId,
  url: safeUrl,
  visible: z.boolean(),
  layout: z.enum(["split", "center", "grid", "list", "carousel"]),
  padding: z.number().min(16).max(200),
  columns: z.number().int().min(1).max(4),
  items: z.array(item).max(100),
  media: safeUrl.default(""),
  backgroundMedia: safeUrl.default(""),
  mediaAlt: textId.optional(),
  mediaKind: z.enum(["image", "video", "audio"]).default("image"),
  backgroundKind: z.enum(["image", "video"]).default("image"),
  secondaryLabel: textId.optional(),
  secondaryUrl: safeUrl.default(""),
});
export const themeSchema = z.object({
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  border: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  radius: z.number().min(0).max(40),
  width: z.number().min(800).max(1600),
  font: z.enum(["Inter", "Georgia", "system-ui"]),
  logo: safeUrl.default(""),
  navSticky: z.boolean().default(false),
  buttonHover: color.default("#8B5CF6"),
  glow: z.number().min(0).max(1).default(0.25),
  duration: z.number().min(0).max(3000).default(200),
  scale: z.number().min(0.8).max(1.4),
  motion: z.boolean(),
});
export const contentSchema = z
  .object({
    schemaVersion: z.literal(2).default(2),
    texts: z.record(textId, z.string().max(10000)),
    theme: themeSchema,
    brand: textId,
    footer: textId,
    nav: z
      .array(z.object({ id: z.string(), label: textId, url: safeUrl }))
      .max(30),
    sections: z.array(section).max(60),
    maintenance: z.object({
      enabled: z.boolean(),
      title: textId,
      body: textId,
      reopen: z.string().max(40),
      media: safeUrl.default(""),
      background: color.default("#0D0A18"),
    }),
    seo: z.object({
      title: textId,
      description: textId,
      image: safeUrl.default(""),
      favicon: safeUrl.default(""),
      canonical: safeUrl.default(""),
      noindex: z.boolean().default(false),
      sitemap: z.boolean().default(true),
      redirects: z
        .array(
          z.object({
            from: z.string().regex(/^\/[a-zA-Z0-9_/-]+$/),
            to: safeUrl,
          }),
        )
        .max(50)
        .default([]),
    }),
    presets: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(80),
          theme: themeSchema,
          styles: z
            .record(z.string().regex(/^[a-zA-Z0-9_-]+$/), responsiveStyle)
            .optional(),
          layouts: z
            .array(
              z.object({
                id: z.string(),
                layout: z.string(),
                padding: z.number(),
                columns: z.number(),
              }),
            )
            .optional(),
        }),
      )
      .max(30),
    styles: z
      .record(z.string().regex(/^[a-zA-Z0-9_-]+$/), responsiveStyle)
      .default({}),
    ui: z.record(z.string(), textId).default({}),
    pages: z.array(pageSchema).max(30).default([]),
    courses: z.array(courseSchema).max(100).default([]),
    announcements: z.array(announcement).max(30).default([]),
    commerce: z
      .object({
        enabled: z.boolean(),
        provider: z.enum(["manual", "stripe"]),
        instructions: textId.optional(),
        requireConsent: z.boolean(),
        publicOrigin: z
          .string()
          .url()
          .refine((v) => v.startsWith("https://")),
      })
      .default({
        enabled: false,
        provider: "manual",
        requireConsent: true,
        publicOrigin: "https://mxd.digital-world-9896a4.workers.dev",
      }),
    analytics: z
      .object({
        enabled: z.boolean(),
        retentionDays: z.number().int().min(1).max(365),
      })
      .default({ enabled: false, retentionDays: 30 }),
  })
  .superRefine((d, ctx) => {
    const refs = [
      d.brand,
      d.footer,
      d.seo.title,
      d.seo.description,
      d.maintenance.title,
      d.maintenance.body,
      ...Object.values(d.ui),
      ...d.nav.map((n) => n.label),
      ...d.sections.flatMap((s) => [
        s.title,
        s.body,
        s.label,
        ...s.items.flatMap((i) => [i.title, i.body, i.label, i.alt]),
        ...(s.mediaAlt ? [s.mediaAlt] : []),
        ...(s.secondaryLabel ? [s.secondaryLabel] : []),
      ]),
      ...d.pages.flatMap((p) => [p.title, p.description]),
      ...d.courses.flatMap((c) => [
        c.title,
        c.body,
        c.label,
        c.alt,
        c.category,
        ...c.modules.flatMap((m) => [
          m.title,
          ...m.lessons.flatMap((l) => [l.title, l.body]),
        ]),
      ]),
      ...d.announcements.flatMap((a) => [a.title, a.body, a.label]),
      ...(d.commerce.instructions ? [d.commerce.instructions] : []),
    ];
    if (refs.some((r) => !(r in d.texts)))
      ctx.addIssue({ code: "custom", message: "Missing text reference" });
    if (!d.pages.some((p) => p.slug === "/"))
      ctx.addIssue({ code: "custom", message: "A home page is required" });
    for (const r of d.seo.redirects) {
      let path = r.from;
      const seen = new Set<string>();
      while (d.seo.redirects.some((x) => x.from === path)) {
        if (seen.has(path)) {
          ctx.addIssue({ code: "custom", message: "Redirect loop" });
          break;
        }
        seen.add(path);
        path = d.seo.redirects.find((x) => x.from === path)!.to;
      }
    }
    for (const [list, label] of [
      [d.sections, "section"],
      [d.courses, "course"],
      [d.pages, "page"],
    ] as const)
      if (new Set(list.map((s) => s.id)).size !== list.length)
        ctx.addIssue({ code: "custom", message: `Duplicate ${label} ID` });
    if (new Set(d.pages.map((p) => p.slug)).size !== d.pages.length)
      ctx.addIssue({ code: "custom", message: "Duplicate page slug" });
    if (
      d.pages.some((p) =>
        p.sectionIds.some((id) => !d.sections.some((s) => s.id === id)),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "A page refers to a missing section",
      });
    const dates = [
      d.maintenance.reopen,
      ...d.sections.flatMap((s) =>
        s.items.flatMap((i) => [i.promoStart, i.promoEnd]),
      ),
      ...d.courses.flatMap((c) => [c.promoStart, c.promoEnd]),
      ...d.announcements.flatMap((a) => [a.starts, a.ends]),
    ];
    if (dates.some((v) => v && !Number.isFinite(Date.parse(v))))
      ctx.addIssue({ code: "custom", message: "Invalid scheduled date" });
  });
export type Content = z.infer<typeof contentSchema>;
export function initialContent(): Content {
  const texts: Record<string, string> = {};
  let n = 0;
  const t = () => {
    const id = `text${++n}`;
    texts[id] = id;
    return id;
  };
  const brand = t(),
    nav = ["courses", "curriculum", "pricing", "faq"].map((id) => ({
      id,
      label: t(),
      url: `#${id}`,
    }));
  const sections = [
    "hero",
    "benefits",
    "courses",
    "curriculum",
    "instructor",
    "resources",
    "testimonials",
    "pricing",
    "community",
    "faq",
    "cta",
  ].map((type, index) => ({
    id: type,
    type: type as Content["sections"][number]["type"],
    title: t(),
    body: t(),
    label: t(),
    url: type === "hero" ? "#courses" : "#pricing",
    visible: !["testimonials", "instructor", "resources", "community"].includes(
      type,
    ),
    layout:
      type === "hero"
        ? "split"
        : type === "faq" || type === "curriculum"
          ? "list"
          : "grid",
    padding: 96,
    columns: 3,
    items: Array.from(
      { length: ["hero", "cta"].includes(type) ? 0 : 3 },
      (_, i) => ({
        id: `${type}-${i}`,
        title: t(),
        body: t(),
        label: t(),
        url: "#pricing",
        media: "",
        alt: t(),
        price: null,
        visible: true,
      }),
    ),
  }));
  return upgradeContent({
    texts,
    brand,
    nav,
    sections,
    footer: t(),
    theme: {
      background: "#0D0A18",
      surface: "#151024",
      accent: "#7C3AED",
      text: "#F8F7FC",
      muted: "#ADA5BD",
      border: "#302741",
      radius: 18,
      width: 1200,
      font: "Inter",
      scale: 1,
      motion: true,
    },
    maintenance: { enabled: false, title: t(), body: t(), reopen: "" },
    seo: { title: t(), description: t() },
    presets: [],
  });
}
export function newText(d: Content) {
  const n =
    Math.max(0, ...Object.keys(d.texts).map((k) => Number(k.slice(4)))) + 1;
  const id = `text${n}`;
  d.texts[id] = id;
  return id;
}

export function upgradeContent(input: unknown): Content {
  const d = structuredClone(input) as Record<string, any>;
  d.texts ||= {};
  d.ui ||= {};
  if (d.schemaVersion !== 2 && !d.presets?.length)
    d.presets = [
      {
        id: "midnight-violet",
        name: "Midnight Violet",
        theme: themeSchema.parse(d.theme),
      },
    ];
  d.schemaVersion = 2;
  const alloc = () => {
    const n =
      Math.max(0, ...Object.keys(d.texts).map((k) => Number(k.slice(4)))) + 1;
    const id = `text${n}`;
    d.texts[id] = id;
    return id;
  };
  for (const key of [
    "close",
    "name",
    "email",
    "note",
    "consent",
    "submit",
    "received",
    "error",
    "pending",
    "unavailable",
    "reference",
    "instructions",
    "course",
    "back",
    "loading",
    "checkout",
    "expired",
    "bonus",
    "menu",
    "skip",
    "empty",
    "price",
    "success",
    "cancelled",
  ])
    if (!d.ui[key]) d.ui[key] = alloc();
  d.commerce ||= {
    enabled: false,
    provider: "manual",
    requireConsent: true,
    publicOrigin: "https://mxd.digital-world-9896a4.workers.dev",
  };
  if (!d.commerce.instructions) d.commerce.instructions = alloc();
  if (!d.pages?.length)
    d.pages = [
      {
        id: "home",
        slug: "/",
        title: d.seo.title,
        description: d.seo.description,
        visible: true,
        noindex: false,
        sectionIds: d.sections.map((s: any) => s.id),
      },
    ];
  return contentSchema.parse(d);
}
export function courseAmount(
  course: Pick<
    Content["courses"][number],
    "price" | "salePrice" | "promoStart" | "promoEnd"
  >,
  now = Date.now(),
) {
  const active =
    (!course.promoStart || Date.parse(course.promoStart) <= now) &&
    (!course.promoEnd || Date.parse(course.promoEnd) > now);
  const price =
    active && course.salePrice !== null ? course.salePrice : course.price;
  return price === null ? null : Math.round(price * 100);
}
export function scheduled(starts: string, ends: string, now = Date.now()) {
  return (
    (!starts || Date.parse(starts) <= now) && (!ends || Date.parse(ends) > now)
  );
}
