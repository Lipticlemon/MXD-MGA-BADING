import { load } from "./store";
import type { Content } from "./content";
export function metadata(d: Content, pageId: string) {
  const p = d.pages.find((p) => p.id === pageId);
  const origin = d.commerce.publicOrigin;
  const image = d.seo.image ? new URL(d.seo.image, origin).href : undefined;
  return {
    title: d.texts[p?.title || d.seo.title],
    description: d.texts[p?.description || d.seo.description],
    robots: { index: !d.seo.noindex && !p?.noindex, follow: true },
    alternates: { canonical: d.seo.canonical || origin + (p?.slug || "/") },
    openGraph: {
      title: d.texts[p?.title || d.seo.title],
      description: d.texts[p?.description || d.seo.description],
      images: image ? [{ url: image }] : [],
    },
    icons: { icon: d.seo.favicon || "/favicon.svg" },
  };
}
