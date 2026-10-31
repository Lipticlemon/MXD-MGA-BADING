import assert from 'node:assert/strict';
const base=process.env.MXD_TEST_URL||'http://terminal.local:4173';if(!['localhost','127.0.0.1','terminal.local'].includes(new URL(base).hostname))throw Error('This test writes disposable data: local hosts only');
const headers={'oai-authenticated-user-id':'local-test-owner','oai-authenticated-user-email':'local@example.test',Origin:base,'Content-Type':'application/json'};
async function get(){const r=await fetch(base+'/api/manage',{headers});assert.equal(r.status,200);return r.json()}
async function post(p,status=200){const r=await fetch(base+'/api/manage',{method:'POST',headers,body:JSON.stringify(p)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d}
assert.equal((await fetch(base+'/api/manage')).status,401);
const initial=await get();const edited=structuredClone(initial.draft);edited.texts.text1='MXD';
let r=await post({action:'save',version:initial.version,document:edited});let s=await get();assert.equal(s.draft.texts.text1,'MXD');assert.deepEqual(s.published,initial.published);
await post({action:'save',version:initial.version,document:edited},409);
await post({action:'save',version:r.version,document:{...edited,brand:'missing'}},400);
r=await post({action:'publish',version:r.version,document:edited});s=await get();assert.equal(s.published.texts.text1,'MXD');const snapshot=s.revisions.find(x=>x.kind==='before-publish');assert.ok(snapshot);
r=await post({action:'restore',version:r.version,revision:snapshot.id});s=await get();assert.deepEqual(s.draft,initial.published);assert.equal(s.published.texts.text1,'MXD');
r=await post({action:'publish',version:r.version,document:s.draft});s=await get();assert.deepEqual(s.published,initial.published);
const rejected=await fetch(base+'/api/manage',{method:'POST',headers:{...headers,Origin:'https://other.test'},body:'{}'});assert.equal(rejected.status,403);
console.log('PASS: auth, save isolation, concurrency conflict, invalid document, publish, restore, republish, origin validation');
