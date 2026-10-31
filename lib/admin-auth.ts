import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { isOwner } from './authorization';
export async function getOwner(){const user=await getChatGPTUser();return isOwner(user,env.ADMIN_EMAIL)?user:null}
