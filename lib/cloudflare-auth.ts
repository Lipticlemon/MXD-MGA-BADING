import {timingSafeEqual} from 'node:crypto';
export interface DeploymentEnv {DEPLOY_TARGET?:string;MODE?:string;ADMIN_EMAIL?:string;ADMIN_KEY_HASH?:string;DB?:D1Database}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('')}
const cookieName='__Host-mxd_admin';
function response(body:string,status=200,headers:Record<string,string>={}){return new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin',...headers}})}
function loginPage(error=''){return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ADMIN PANEL</title><style>body{margin:0;background:#0d0a18;color:#f8f7fc;font:15px system-ui;min-height:100vh;display:grid;place-items:center}main{width:min(360px,calc(100vw - 64px));padding:36px;border:1px solid #302741;border-radius:18px;background:#151024}span{color:#a78bfa;font-size:36px}h1{font-size:22px;font-weight:500;margin:20px 0 32px}label{display:block;font-size:13px;color:#ada5bd}input,button{box-sizing:border-box;width:100%;margin:12px 0;padding:14px;border-radius:7px;font:inherit}input{background:#0d0a18;color:#fff;border:1px solid #493760}input:focus{outline:2px solid #a78bfa}button{background:#7c3aed;border:0;color:white;cursor:pointer}p{font-size:13px;color:#e9d5ff}</style><main><span aria-hidden="true">✳</span><h1>ADMIN PANEL</h1>${error?`<p role="alert">${error}</p>`:''}<form method="POST" action="/login"><label for="key">Access key</label><input id="key" name="key" type="password" required autocomplete="current-password" maxlength="128"><button type="submit">Sign in</button></form></main></html>`}
/** Separate-host guard. Platform identity headers are never trusted on workers.dev. */
export async function cloudflareGate(request:Request,env:DeploymentEnv):Promise<{request:Request,response?:never}|{response:Response,request?:never}>{
 const url=new URL(request.url),path=url.pathname,headers=new Headers(request.headers);
 for(const name of [...headers.keys()])if(name.startsWith('oai-authenticated-user-'))headers.delete(name);
 if(env.MODE==='public'){
  if(!['GET','HEAD'].includes(request.method)||!(path==='/'||path.startsWith('/_next/')||path==='/favicon.svg'||/^\/api\/media\/[a-f0-9-]{36}$/.test(path)))return {response:new Response(null,{status:404})};
  return {request:new Request(request,{headers})};
 }
 if(!env.DB||!env.ADMIN_KEY_HASH||!env.ADMIN_EMAIL)return {response:response('Admin login is not configured.',503)};
 const db=env.DB,now=Math.floor(Date.now()/1000);
 if(path==='/login'){
  if(request.method==='GET')return {response:response(loginPage())};
  if(request.method!=='POST')return {response:response('Method not allowed',405)};
  if(request.headers.get('origin')!==url.origin)return {response:response('Invalid origin',403)};
  const raw=await request.text();if(raw.length>2048)return {response:response('Request too large',413)};
  const window=Math.floor(now/900),ipHash=await digest(request.headers.get('CF-Connecting-IP')||'unknown');
  const row=await db.prepare('INSERT INTO login_attempts(id,count,window) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(`${window}:${ipHash}`,window).first<{count:number}>();
  if(!row||row.count>5)return {response:response(loginPage('Too many attempts. Try again in 15 minutes.'),429,{'Retry-After':'900'})};
  const key=new URLSearchParams(raw).get('key')||'',supplied=await digest(key);
  if(!timingSafeEqual(new TextEncoder().encode(supplied),new TextEncoder().encode(env.ADMIN_KEY_HASH)))return {response:response(loginPage('Invalid access key.'),401)};
  const token=randomToken();await db.batch([db.prepare('INSERT INTO admin_sessions(id,expires) VALUES(?,?)').bind(await digest(token),now+86400),db.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now),db.prepare('DELETE FROM login_attempts WHERE window<?').bind(window-1)]);
  return {response:response('',303,{'Location':'/admin','Set-Cookie':`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`})};
 }
 const cookies=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));const token=cookies.length===1?cookies[0].slice(cookieName.length+1):'';
 const session=/^[a-f0-9]{64}$/.test(token)?await db.prepare('SELECT id FROM admin_sessions WHERE id=? AND expires>?').bind(await digest(token),now).first():null;
 if(path==='/logout'){
  if(request.method!=='POST'||request.headers.get('origin')!==url.origin)return {response:response('Invalid logout request',403)};
  if(session)await db.prepare('DELETE FROM admin_sessions WHERE id=?').bind(await digest(token)).run();
  return {response:response('',303,{'Location':'/login','Set-Cookie':`${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`})};
 }
 if(!session){if(path.startsWith('/api/'))return {response:Response.json({error:'Sign in required'},{status:401,headers:{'Cache-Control':'no-store'}})};return {response:response('',303,{'Location':'/login'})}}
 if(path==='/')return {response:response('',303,{'Location':'/admin'})};
 headers.set('oai-authenticated-user-id','cloudflare-owner');headers.set('oai-authenticated-user-email',env.ADMIN_EMAIL);
 return {request:new Request(request,{headers})};
}
