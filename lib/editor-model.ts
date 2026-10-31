import { newText, section, courseSchema, type Content } from "./content.ts";
export function makeItem(d: Content) {
  return {
    id: crypto.randomUUID(),
    title: newText(d),
    body: newText(d),
    label: newText(d),
    alt: newText(d),
    url: "#pricing",
    media: "",
    mediaKind: "image" as const,
    price: null,
    visible: true,
    icon: "spark" as const,
    aspect: 1.6,
    focalX: 50,
    focalY: 50,
    crop: "cover" as const,
    currency: "PHP" as const,
    salePrice: null,
    promoStart: "",
    promoEnd: "",
  };
}
export function makeSection(
  d: Content,
  type: Content["sections"][number]["type"],
) {
  return section.parse({
    id: type + "-" + crypto.randomUUID(),
    type,
    title: newText(d),
    body: newText(d),
    label: newText(d),
    url: "#courses",
    visible: true,
    layout: type === "hero" ? "split" : type === "faq" ? "list" : "grid",
    padding: 96,
    columns: 3,
    items: [],
  });
}
export function makeCourse(d: Content) {
  return courseSchema.parse({
    id: crypto.randomUUID(),
    title: newText(d),
    body: newText(d),
    label: newText(d),
    category: newText(d),
    alt: newText(d),
    media: "",
    featured: false,
    visible: true,
    price: null,
    salePrice: null,
    currency: "PHP",
    promoStart: "",
    promoEnd: "",
    mode: "manual",
    url: "",
    modules: [],
  });
}
export function duplicateSection(d: Content, id: string) {
  const src = d.sections.find((s) => s.id === id);
  if (!src) return;
  const copy = structuredClone(src),
    original = copy.id;
  copy.id = copy.type + "-" + crypto.randomUUID();
  function copyText(id: string) {
    const next = newText(d);
    d.texts[next] = d.texts[id];
    if (d.styles[id]) d.styles[next] = structuredClone(d.styles[id]);
    return next;
  }
  for (const field of ["title", "body", "label"] as const)
    copy[field] = copyText(copy[field]);
  if (copy.mediaAlt) copy.mediaAlt = copyText(copy.mediaAlt);
  copy.items = copy.items.map((item) => {
    const next = { ...item, id: crypto.randomUUID() };
    for (const f of ["title", "body", "label", "alt"] as const)
      next[f] = copyText(item[f]);
    for (const suffix of ["", "-button", "-media"])
      if (d.styles[item.id + suffix])
        d.styles[next.id + suffix] = structuredClone(
          d.styles[item.id + suffix],
        );
    return next;
  });
  for (const suffix of ["", "-button", "-media"])
    if (d.styles[original + suffix])
      d.styles[copy.id + suffix] = structuredClone(d.styles[original + suffix]);
  d.sections.push(copy);
  for (const p of d.pages) {
    const index = p.sectionIds.indexOf(id);
    if (index >= 0) p.sectionIds.splice(index + 1, 0, copy.id);
  }
  return copy.id;
}
export function applyPreset(d: Content, id: string) {
  const p = d.presets.find((p) => p.id === id);
  if (!p) return;
  d.theme = structuredClone(p.theme);
  if (p.styles) d.styles = structuredClone(p.styles);
  if (p.layouts)
    for (const l of p.layouts) {
      const s = d.sections.find((s) => s.id === l.id);
      if (s) {
        s.layout = l.layout as typeof s.layout;
        s.padding = l.padding;
        s.columns = l.columns;
      }
    }
}
export function move<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  items.splice(to, 0, items.splice(from, 1)[0]);
}
