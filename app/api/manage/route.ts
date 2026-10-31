import { getChatGPTUser } from '../../chatgpt-auth';
import { contentSchema } from '../../../lib/content';
import { database,load } from '../../../lib/store';
import {writeRevision} from '../../../lib/repository';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){if(!await getChatGPTUser())return json({error:'Sign in required'},401);try{const state=await load();const revisions=await database().prepare('SELECT id,created,kind FROM revisions ORDER BY created DESC LIMIT 100').all();return json({...state,revisions:revisions.results})}catch{return json({error:'Content storage unavailable'},503)}}
export async function POST(req:Request){const user=await getChatGPTUser();if(!user)return json({error:'Sign in required'},401);if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Invalid origin'},403);if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required'},415);if(Number(req.headers.get('content-length')||0)>1000000)return json({error:'Payload too large'},413);
try{const raw=await req.text();if(raw.length>1000000)return json({error:'Payload too large'},413);const p=JSON.parse(raw);if(!Number.isSafeInteger(p.version)||!['save','publish','restore'].includes(p.action))return json({error:'Invalid operation'},400);const db=database();let document=p.document;
if(p.action==='restore'){const r=await db.prepare('SELECT document FROM revisions WHERE id=?').bind(String(p.revision)).first<{document:string}>();if(!r)return json({error:'Revision not found'},404);document=JSON.parse(r.document)}
const parsed=contentSchema.safeParse(document);if(!parsed.success)return json({error:parsed.error.issues.map(x=>x.message).join('; ')},400);
const current=await load();if(p.version!==current.version)return json({error:'Another edit was saved. Export your draft, then reload.'},409);
const result=await writeRevision(db,current,parsed.data,p.version,p.action,user.userId);
if(!result.changed)return json({error:'Conflicting edit; reload required'},409);return json({version:result.version});
}catch{return json({error:'Unable to save. Your local changes are retained.'},400)}}
