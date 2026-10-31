import { load } from "../../lib/store";
import { metadata } from "../../lib/page-data";
import PublicSite from "../../components/public-site";
import { notFound, redirect } from "next/navigation";
export const dynamic = "force-dynamic";
async function data(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const { published: d } = await load();
  const to = d.seo.redirects.find((r) => r.from === path)?.to;
  if (to) redirect(to);
  const p = d.pages.find((p) => p.visible && p.slug === path);
  if (!p) notFound();
  return { d, p };
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { d, p } = await data(params);
  return metadata(d, p.id);
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { d, p } = await data(params);
  return <PublicSite document={d} pageId={p.id} />;
}
