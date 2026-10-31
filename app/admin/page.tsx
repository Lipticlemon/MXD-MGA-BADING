import {env} from 'cloudflare:workers';
import { requireChatGPTUser } from '../chatgpt-auth';
import {getOwner} from '../../lib/admin-auth';
import Admin from '../../components/admin';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');if(!await getOwner())return <main className="loading"><h1>ADMIN PANEL</h1><p>Owner access required.</p></main>;return <Admin cloudflare={env.DEPLOY_TARGET==='cloudflare'}/>}
