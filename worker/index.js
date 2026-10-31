import {initialSite} from "../shared/site.js";
const json=(v,status=200,headers={})=>new Response(JSON.stringify(v),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}});
const fail=(error,status=400)=>json({error},status);
const parse=(s)=>JSON.parse(s);
const secure=(h)=>{h.set("x-content-type-options","nosniff");h.set("referrer-policy","strict-origin-when-cross-origin");h.set("x-frame-options","DENY");h.set("permissions-policy","camera=(), microphone=(), geolocation=()");return h;};
const getCookie=(request,name)=>request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1);
function decode64url(value){const b64=value.replace(/-/g,"+").replace(/_/g,"/");const data=atob(b64.padEnd(Math.ceil(b64.length/4)*4,"="));return Uint8Array.from(data,c=>c.charCodeAt(0));}
async function authorized(req,env){
  if(!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)return false;
  const token=req.headers.get("Cf-Access-Jwt-Assertion")||getCookie(req,"CF_Authorization");
  if(!token)return false;
  try{
    const parts=token.split(".");if(parts.length!==3)return false;
    const header=parse(new TextDecoder().decode(decode64url(parts[0])));const payload=parse(new TextDecoder().decode(decode64url(parts[1])));
    const team=env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,"").replace(/\/$/,"");
    if(header.alg!=="RS256"||!header.kid||!Array.isArray(payload.aud)||!payload.aud.includes(env.ACCESS_AUD))return false;
    if(payload.iss!=="https://"+team||payload.exp*1000<Date.now()||!payload.exp|| (payload.nbf && payload.nbf*1000>Date.now()))return false;
    if(env.ALLOWED_ADMIN_EMAIL && payload.email?.toLowerCase()!==env.ALLOWED_ADMIN_EMAIL.toLowerCase())return false;
    const certs=await fetch("https://"+team+"/cdn-cgi/access/certs");
    if(!certs.ok)return false;
    const {keys=[]}=await certs.json();const jwk=keys.find(k=>k.kid===header.kid && k.kty==="RSA");if(!jwk)return false;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    return crypto.subtle.verify({name:"RSASSA-PKCS1-v1_5"},key,decode64url(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  }catch{return false;}
}
function validDraft(draft){
  if(!draft||typeof draft!=="object"||draft.schema!==1||typeof draft.texts!=="object"||!Array.isArray(draft.sections)||!Array.isArray(draft.courses))return false;
  if(draft.sections.length>80||draft.courses.length>80||Object.keys(draft.texts).length>3500)return false;
  if(Object.entries(draft.texts).some(([k,v])=>!/^text[1-9]\d*$/.test(k)||typeof v!=="string"||v.length>5000))return false;
  if(!Number.isSafeInteger(draft.nextText)||draft.nextText<1)return false;
  if(draft.sections.some(s=>!["hero","features","courses","pricing","faq","cta","footer"].includes(s.type)))return false;
  if(!draft.theme||!draft.header)return false;
  return true;
}
async function state(env){
  let row=await env.DB.prepare("SELECT draft, published, revision, published_at FROM site_state WHERE id=1").first();
  if(!row){
    const value=JSON.stringify(initialSite());
    await env.DB.prepare("INSERT OR IGNORE INTO site_state (id,draft,published,revision) VALUES (1,?,?,0)").bind(value,value).run();
    row=await env.DB.prepare("SELECT draft,published,revision,published_at FROM site_state WHERE id=1").first();
  }
  return {draft:parse(row.draft),published:parse(row.published),revision:row.revision,publishedAt:row.published_at};
}
async function publicState(env){const result=await state(env);return result.published;}
async function adminApi(request,env,path){
  const authorizedAdmin=await authorized(request,env);
  if(!authorizedAdmin)return fail("Unauthorized. Configure Cloudflare Access for ADMIN PANEL.",401);
  const reqOrigin=request.headers.get("origin");
  if(!["GET","HEAD","OPTIONS"].includes(request.method) && reqOrigin!==new URL(request.url).origin)return fail("Invalid request origin",403);
  if(path==="/api/admin/state"&&request.method==="GET"){const s=await state(env);return json({...s,history:await env.DB.prepare("SELECT id, published_at, actor FROM revisions ORDER BY id DESC LIMIT 30").all().then(r=>r.results)});}
  if(path==="/api/admin/draft"&&request.method==="PUT"){
    if(Number(request.headers.get("content-length")||0)>600000)return fail("Draft too large",413);
    const input=await request.json().catch(()=>null);
    if(!input||!validDraft(input.draft)||JSON.stringify(input.draft).length>500000)return fail("Invalid draft");
    const next=JSON.stringify({...input.draft,updatedAt:new Date().toISOString()});
    const r=await env.DB.prepare("UPDATE site_state SET draft=?, revision=revision+1 WHERE id=1 AND revision=?").bind(next,input.revision).run();
    if(!r.meta.changes)return fail("Draft conflict. Reload to review latest changes.",409);
    return json({revision:input.revision+1});
  }
  if(path==="/api/admin/publish"&&request.method==="POST"){
    const s=await state(env);
    if(!validDraft(s.draft))return fail("Invalid draft");
    const now=new Date().toISOString();
    const actor=env.ALLOWED_ADMIN_EMAIL||"access-user";
    await env.DB.batch([
      env.DB.prepare("UPDATE site_state SET published=draft, published_at=?, revision=revision+1 WHERE id=1").bind(now),
      env.DB.prepare("INSERT INTO revisions (snapshot,published_at,actor) VALUES (?,?,?)").bind(JSON.stringify(s.draft),now,actor)
    ]);
    return json({publishedAt:now,revision:s.revision+1});
  }
  if(path==="/api/admin/restore"&&request.method==="POST"){
    const {id}=await request.json().catch(()=>({}));
    const version=await env.DB.prepare("SELECT snapshot FROM revisions WHERE id=?").bind(Number(id)).first();
    if(!version)return fail("Revision not found",404);
    await env.DB.prepare("UPDATE site_state SET draft=?,revision=revision+1 WHERE id=1").bind(version.snapshot).run();
    return json({restored:true});
  }
  if(path==="/api/admin/media"&&request.method==="GET"){
    const r=await env.DB.prepare("SELECT id,name,mime,size,created_at FROM media ORDER BY created_at DESC LIMIT 200").all();
    return json(r.results);
  }
  if(path==="/api/admin/media"&&request.method==="POST"){
    if(!env.MEDIA)return fail("Media storage not configured",503);
    const form=await request.formData();
    const file=form.get("file");
    if(!file||typeof file.arrayBuffer!=="function")return fail("File required");
    if(file.size>6*1024*1024)return fail("Maximum file size is 6 MB",413);
    const types=["image/png","image/jpeg","image/webp","image/gif","video/mp4"];
    if(!types.includes(file.type))return fail("Unsupported media type",415);
    const bytes=await file.arrayBuffer();
    const signature=new Uint8Array(bytes).slice(0,12);
    const signatures={
      "image/png":signature[0]===137&&signature[1]===80&&signature[2]===78&&signature[3]===71,
      "image/jpeg":signature[0]===255&&signature[1]===216,
      "image/gif":String.fromCharCode(...signature.slice(0,3))==="GIF",
      "image/webp":String.fromCharCode(...signature.slice(0,4))==="RIFF"&&String.fromCharCode(...signature.slice(8,12))==="WEBP",
      "video/mp4":String.fromCharCode(...signature.slice(4,8))==="ftyp"
    };
    if(!signatures[file.type])return fail("File signature does not match type",415);
    const identifier=crypto.randomUUID(),key="uploads/"+identifier;
    await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:file.type}});
    await env.DB.prepare("INSERT INTO media(id,name,mime,size,object_key) VALUES (?,?,?,?,?)").bind(identifier,String(file.name).slice(0,180),file.type,file.size,key).run();
    return json({id:identifier,name:file.name,mime:file.type,size:file.size,url:"/media/"+identifier},201);
  }
  return fail("Not found",404);
}
async function media(request,env,identifier){
  const row=await env.DB.prepare("SELECT object_key,mime FROM media WHERE id=?").bind(identifier).first();
  if(!row||!env.MEDIA)return fail("Media not found",404);
  const file=await env.MEDIA.get(row.object_key);if(!file)return fail("Media not found",404);
  return new Response(file.body,{headers:{"content-type":row.mime,"cache-control":"public, max-age=3600","x-content-type-options":"nosniff"}});
}
async function serveAsset(request,env,pathname){
  const url=new URL(request.url);url.pathname=pathname;
  return env.ASSETS.fetch(new Request(url,request));
}
export default {async fetch(request,env){
  const url=new URL(request.url),path=url.pathname,host=url.hostname.toLowerCase(),adminHost=(env.ADMIN_HOST||"").toLowerCase();
  try {
    if(path==="/api/public" && request.method==="GET")return json(await publicState(env),200,{"cache-control":"public, max-age=30"});
    if(path.startsWith("/api/admin/")){
      if(adminHost&&host!==adminHost)return fail("Not found",404);
      return adminApi(request,env,path);
    }
    if(/^\/media\/[a-f0-9-]{36}$/.test(path) && request.method==="GET")return media(request,env,path.slice(7));
    if(!["GET","HEAD"].includes(request.method))return fail("Not found",404);
    const onAdminHost=!!adminHost&&host===adminHost;
    const adminPath=path==="/admin"||path.startsWith("/admin/");
    if(adminHost&&adminPath&&!onAdminHost)return fail("Not found",404);
    if(onAdminHost || adminPath){
      if(!await authorized(request,env))return new Response("ADMIN PANEL requires authorized Cloudflare Access",{status:403,headers:{"content-type":"text/plain"}});
      const file=onAdminHost?(path==="/" ?"/admin/index.html":path):path==="/admin"?"/admin/index.html":path==="/admin/"?"/admin/index.html":path;
      const rewritten=file.startsWith("/admin/")?file:"/admin"+file;
      const resp=await serveAsset(request,env,rewritten);
      return new Response(resp.body,{status:resp.status,headers:secure(new Headers(resp.headers))});
    }
    const staticFile=path.startsWith("/shared/")?path:path.startsWith("/site/")?path:(path==="/"||!path.includes(".")?"/site/index.html":path);
    const response=await serveAsset(request,env,staticFile);
    return new Response(response.body,{status:response.status,headers:secure(new Headers(response.headers))});
  }catch(err){console.error("Worker error",err);return fail("Server unavailable",503);}
}};