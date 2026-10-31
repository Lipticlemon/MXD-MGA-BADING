import { load } from "../../lib/store";
export async function GET() {
  const { published: d } = await load();
  return new Response(
    "User-agent: *\n" +
      (d.seo.noindex ? "Disallow: /" : "Allow: /") +
      (d.seo.sitemap
        ? "\nSitemap: " + d.commerce.publicOrigin + "/sitemap.xml"
        : ""),
    { headers: { "Content-Type": "text/plain", "Cache-Control": "no-cache" } },
  );
}
