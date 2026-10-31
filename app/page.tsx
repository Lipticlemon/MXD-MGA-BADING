import { load } from "../lib/store";
import { metadata } from "../lib/page-data";
import PublicSite from "../components/public-site";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { published: d } = await load();
  return metadata(d, d.pages.find((p) => p.slug === "/")?.id || "home");
}
export default async function Page() {
  const { published: d } = await load();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: d.texts[d.brand],
    url: d.commerce.publicOrigin,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ld).replace(/</g, "\\u003c"),
        }}
      />
      <PublicSite
        document={d}
        pageId={d.pages.find((p) => p.slug === "/")?.id || "home"}
      />
    </>
  );
}
