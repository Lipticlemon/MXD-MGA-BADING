import { load } from '../lib/store';
import PublicSite from '../components/public-site';
export const dynamic='force-dynamic';
export async function generateMetadata(){const {published:d}=await load();return {title:d.texts[d.seo.title],description:d.texts[d.seo.description]}}
export default async function Page(){const {published}=await load();return <PublicSite document={published}/>}
