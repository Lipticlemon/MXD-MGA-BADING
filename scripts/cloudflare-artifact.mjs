// API-upload artifact: embedded text assets avoid a separate privileged asset-upload token.
import {readdir,readFile,writeFile} from 'node:fs/promises';import {join,relative,extname} from 'node:path';
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p)}return out}
const mime={'.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const assets={};for(const file of await walk('dist/client')){if(file.split('/').pop().startsWith('.')||file.endsWith('/_headers'))continue;const type=mime[extname(file)];if(!type)throw Error(`Add binary asset support before deploying ${file}`);assets['/'+relative('dist/client',file)]={type,body:await readFile(file,'utf8')}}
const modules=[];for(const file of await walk('dist/server'))if(file.endsWith('.js'))modules.push({name:relative('dist/server',file),content:await readFile(file,'utf8')});
modules.push({name:'embedded-assets.js',content:'export default '+JSON.stringify(assets)+';'});
modules.push({name:'cloudflare-entry.js',content:`import app from './index.js';import files from './embedded-assets.js';
const assetFetch=async(request)=>{const url=new URL(typeof request==='string'?request:request.url),f=files[url.pathname];if(!f)return new Response(null,{status:404});return new Response(request.method==='HEAD'?null:f.body,{headers:{'Content-Type':f.type,'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}})};
export default {async fetch(request,env,ctx){if(files[new URL(request.url).pathname])return assetFetch(request);return app.fetch(request,{...env,ASSETS:{fetch:assetFetch}},ctx)}};`});
await writeFile('outputs/cloudflare-modules.json',JSON.stringify(modules));console.log(JSON.stringify({modules:modules.length,assets:Object.keys(assets).length}));
