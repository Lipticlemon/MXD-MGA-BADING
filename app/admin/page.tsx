import { requireChatGPTUser } from '../chatgpt-auth';
import Admin from '../../components/admin';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');return <Admin/>}
