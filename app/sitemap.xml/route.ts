import { load } from "../../lib/store";
export async function GET() {
  const { published: d } = await load();
  const urls =
    d.seo.sitemap && !d.seo.noindex
      ? d.pages
          .filter((p) => p.visible && !p.noindex)
          .map(
            (p) =>
              "<url><loc>" +
              new URL(p.slug, d.commerce.publicOrigin).href.replace(
                /&/g,
                "&amp;",
              ) +
              "</loc></url>",
          )
          .join("")
      : "";
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      urls +
      "</urlset>",
    {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache",
      },
    },
  );
}
