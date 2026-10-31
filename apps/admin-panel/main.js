import {initialSite,renderSite,addText,addSection,copySection} from "../shared/site.js";
const app=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const keys=["Dashboard","Pages","Text & Labels","Design","Courses","Media","Versions","Settings"];
let site,revision=0,publishedAt=null,history=[],mediaItems=[],active="Dashboard",selected=null,viewport="desktop",filter="",saveTimer=null,queue=Promise.resolve(),dirty=false,notice="";
const uid=()=>crypto.randomUUID();
const title=(key)=>esc(site.texts[key]||key);
const input=(key,label)=>'<label class="field">'+esc(label)+'<input data-text="'+esc(key)+'" value="'+title(key)+'"></label>';
const field=(label,value,kind,extra="")=>'<label class="field">'+esc(label)+'<input data-'+kind+'="'+esc(extra)+'" value="'+esc(value??"")+'"></label>';
const button=(action,label,extra="")=>'<button class="btn '+extra+'" data-action="'+action+'">'+label+'</button>';
const sectionName=s=>s.type[0].toUpperCase()+s.type.slice(1);
function msg(text){notice=text;const el=document.getElementById("notice");if(el){el.textContent=text;el.hidden=!text;}}
async function api(path,opts={}){
 const response=await fetch("/api/admin/"+path,{credentials:"same-origin",...opts});
 const data=await response.json().catch(()=>({error:"Invalid server response"}));
 if(!response.ok)throw Error(data.error||"Request failed");
 return data;
}
async function load(){try{
 const data=await api("state");site=data.draft;revision=data.revision;publishedAt=data.publishedAt;history=data.history||[];
 mediaItems=await api("media").catch(()=>[]);
 draw();
}catch(e){app.innerHTML='<main style="max-width:600px;margin:14vh auto;padding:25px"><h1>ADMIN PANEL</h1><p>'+esc(e.message)+'</p></main>';}}
function schedule(){dirty=true;status();clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),800);}
function status(){const el=document.querySelector(".status");if(el)el.textContent=dirty?"Unsaved changes":"Saved";}
async function save(){
 clearTimeout(saveTimer);if(!dirty)return queue;
 const snapshot=structuredClone(site);dirty=false;status();
 queue=queue.catch(()=>{}).then(async()=>{const data=await api("draft",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({revision,draft:snapshot})});revision=data.revision;});
 try{await queue;status();}catch(e){dirty=true;status();msg(e.message);}return queue;
}
async function publish(){await save();if(dirty)return;try{const result=await api("publish",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});revision=result.revision;publishedAt=result.publishedAt;msg("Published");const d=await api("state");history=d.history||[];draw();}catch(e){msg(e.message);}}
function nav(){return '<aside class="sidebar"><div class="brand"><span>◆</span> ADMIN PANEL</div><nav>'+keys.map(k=>'<button class="nav-btn '+(active===k?"active":"")+'" data-tab="'+esc(k)+'">'+esc(k)+'</button>').join("")+'</nav></aside>';}
function draw(){
 app.innerHTML='<div class="shell">'+nav()+'<div class="content"><header class="top"><div><h1>'+esc(active)+'</h1><span class="status">'+(dirty?"Unsaved changes":"Saved")+'</span></div><div class="tools">'+button("save","Save")+button("publish","Publish","primary")+'</div></header><main class="workspace"><div id="notice" class="notice" '+(!notice?"hidden":"")+'>'+esc(notice)+'</div><div id="content">'+view()+'</div></main></div></div>';
 if(active==="Pages")mountPreview();
}
function view(){switch(active){case "Dashboard":return dashboard();case "Pages":return pages();case "Text & Labels":return texts();case "Design":return design();case "Courses":return courses();case "Media":return media();case "Versions":return versions();case "Settings":return settings();default:return "";}}
function dashboard(){return '<div class="triple"><div class="stat"><span class="muted">Sections</span><strong>'+site.sections.length+'</strong></div><div class="stat"><span class="muted">Courses</span><strong>'+site.courses.length+'</strong></div><div class="stat"><span class="muted">Revision</span><strong>'+revision+'</strong></div></div><div class="panel" style="margin-top:20px"><h2 class="section-title">Publication</h2><div class="muted">Last published: '+esc(publishedAt||"Not published")+'</div></div>';}
function sectionActions(s){return '<div class="section-entry '+(selected===s.id?"selected":"")+'"><button class="select-section" data-select-section="'+s.id+'">'+sectionName(s)+'</button><button class="btn tiny" title="Move up" data-move="'+s.id+'" data-direction="-1">↑</button><button class="btn tiny" title="Move down" data-move="'+s.id+'" data-direction="1">↓</button></div>';}
function pages(){
 const s=site.sections.find(v=>v.id===selected)||site.sections[0];if(s)selected=s.id;
 return '<div class="editor-layout"><div class="panel"><h2 class="section-title">Sections</h2><div class="section-list">'+site.sections.map(sectionActions).join("")+'</div><label>Add section<select id="new-section">'+["hero","features","courses","pricing","faq","cta","footer"].map(x=>'<option>'+x+'</option>').join("")+'</select></label>'+button("add-section","Add section","primary")+'</div><div class="panel" style="padding:12px"><div class="row preview-controls">'+["desktop","tablet","mobile"].map(v=>'<button class="btn tiny '+(viewport===v?"selected":"")+'" data-viewport="'+v+'">'+v+'</button>').join("")+'</div><iframe id="preview" class="preview-frame" title="MXD preview"></iframe></div><div class="panel properties"><h2 class="section-title">Properties</h2>'+(s?sectionProperties(s):'<p class="muted">No sections</p>')+'</div></div>';
}
function sectionProperties(s){
 const fields=Object.entries(s.fields||{}).map(([name,key])=>input(key,name)).join("");
 let items="";
 if(["features","faq"].includes(s.type)){
  items=(s.items||[]).map(it=>'<div class="entry">'+Object.entries(it).filter(([k])=>k!=="id").map(([k,v])=>input(v,k)).join("")+'<button class="btn tiny danger" data-remove-item="'+it.id+'">Remove</button></div>').join("");
  items+=button("add-item","Add item");
 }
 return '<div class="row between"><label><input type="checkbox" data-visible="'+s.id+'" '+(s.visible!==false?"checked":"")+'> Visible</label><span class="pill">'+sectionName(s)+'</span></div>'+fields+items+
 (s.type==="hero"?'<label>Hero image<select data-hero-media="'+s.id+'"><option value="">Default art</option>'+mediaOptions(s.mediaId)+'</select></label>':"")+
 (["hero","pricing","cta","footer"].includes(s.type)?field("Primary URL",s.primaryHref||s.buttonHref||s.linkHref||"","section-url",s.id):"")+
 '<div class="tools" style="margin-top:16px">'+button("duplicate-section","Duplicate")+button("delete-section","Delete","danger")+'</div>';
}
function mediaOptions(selected){return mediaItems.map(m=>'<option value="'+m.id+'" '+(selected===m.id?"selected":"")+'>'+esc(m.name)+'</option>').join("");}
function mountPreview(){
 const frame=document.getElementById("preview");if(!frame)return;
 frame.style.maxWidth=({desktop:"100%",tablet:"760px",mobile:"390px"})[viewport];
 frame.srcdoc='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/shared/site.css"></head><body style="margin:0">'+renderSite(site,{preview:true})+'</body></html>';
 frame.onload=()=>{frame.contentDocument?.addEventListener("click",event=>{
  const target=event.target.closest("[data-edit-text]");const section=event.target.closest("[data-section]");
  if(target){event.preventDefault();event.stopPropagation();active="Text & Labels";filter=target.dataset.editText;draw();}
  else if(section){event.preventDefault();selected=section.dataset.section;draw();}
 },true);};
}
function texts(){
 const rows=Object.entries(site.texts).filter(([key,val])=>!filter||key.toLowerCase().includes(filter.toLowerCase())||String(val).toLowerCase().includes(filter.toLowerCase())).slice(0,300);
 return '<div class="panel"><div class="row between" style="margin-bottom:20px"><h2 class="section-title" style="margin:0">Text & Labels</h2><span class="muted">'+Object.keys(site.texts).length+' fields</span></div><input id="text-search" placeholder="Search ID or content" value="'+esc(filter)+'"><div style="overflow:auto;margin-top:14px"><table class="text-table"><thead><tr><th>ID</th><th>Value</th><th></th></tr></thead><tbody>'+rows.map(([key,val])=>'<tr><td>'+key+'</td><td><input data-text="'+key+'" value="'+esc(val)+'"></td><td><button class="btn tiny" data-reset-text="'+key+'">Reset</button></td></tr>').join("")+'</tbody></table></div></div>';
}
function design(){
 const colors=["background","surface","elevated","accent","accentSoft","foreground","muted","border"];
 return '<div class="grid"><div class="panel"><h2 class="section-title">Colors</h2><div class="swatches">'+colors.map(k=>'<label class="swatch"><input type="color" data-theme="'+k+'" value="'+esc(site.theme[k])+'"><span>'+esc(k)+'</span></label>').join("")+'</div></div><div class="panel"><h2 class="section-title">Appearance</h2><label>Font<select data-theme="font">'+["Inter","Geist","Manrope","system-ui"].map(f=>'<option '+(site.theme.font===f?"selected":"")+'>'+f+'</option>').join("")+'</select></label><label>Corner radius <input type="range" min="0" max="36" data-theme="radius" value="'+site.theme.radius+'"></label><label><input type="checkbox" data-theme="motion" '+(site.theme.motion?"checked":"")+'> Animations</label></div></div><div class="panel"><h2 class="section-title">Presets</h2><div class="row"><input id="preset-name" placeholder="Preset name">'+button("save-preset","Save preset","primary")+'</div><div class="stack" style="margin-top:14px">'+Object.keys(site.presets||{}).map(name=>'<div class="entry row between"><strong>'+esc(name)+'</strong><span>'+button("apply-preset:"+encodeURIComponent(name),"Apply")+button("delete-preset:"+encodeURIComponent(name),"Delete","danger")+'</span></div>').join("")+'</div></div>';
}
function courses(){
 return '<div class="panel"><div class="row between"><h2 class="section-title">Courses</h2>'+button("add-course","Add course","primary")+'</div>'+site.courses.map(c=>'<div class="entry"><div class="row between"><strong class="code">'+c.id.slice(0,8)+'</strong><button class="btn tiny danger" data-delete-course="'+c.id+'">Delete</button></div><div class="grid">'+input(c.title,"Title")+input(c.description,"Description")+input(c.badge,"Badge")+'</div><label>Image<select data-course-media="'+c.id+'"><option value="">No image</option>'+mediaOptions(c.mediaId)+'</select></label><h3 class="section-title" style="margin-top:24px">Modules</h3>'+(c.modules||[]).map(m=>'<div class="entry"><div class="row between"><strong class="muted">Module</strong><button class="btn tiny danger" data-delete-module="'+c.id+":"+m.id+'">Delete</button></div>'+input(m.title,"Title")+(m.lessons||[]).map(l=>'<div class="row" style="margin-top:10px"><div style="flex:1">'+input(l.title,"Lesson")+'</div><button class="btn tiny danger" data-delete-lesson="'+c.id+":"+m.id+":"+l.id+'">Delete</button></div>').join("")+'<button class="btn tiny" data-add-lesson="'+c.id+":"+m.id+'">Add lesson</button></div>').join("")+'<button class="btn" data-add-module="'+c.id+'">Add module</button></div>').join("")+'</div>';
}
function media(){return '<div class="panel"><h2 class="section-title">Media</h2><div class="row"><input type="file" id="media-file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4">'+button("upload-media","Upload","primary")+'</div><p class="muted">Max 6 MB. PNG, JPEG, WebP, GIF, MP4.</p><div class="media-grid">'+mediaItems.map(m=>'<div class="media-card">'+(m.mime.startsWith("image/")?'<img src="/media/'+m.id+'" alt="">':'<video src="/media/'+m.id+'" controls></video>')+'<div class="filename" title="'+esc(m.name)+'">'+esc(m.name)+'</div><span class="muted">'+(m.size/1024).toFixed(0)+' KB</span></div>').join("")+'</div></div>';}
function versions(){return '<div class="panel"><h2 class="section-title">Versions</h2><div class="stack">'+(history.length?history.map(h=>'<div class="entry row between"><div><strong class="code">#'+h.id+'</strong><div class="muted">'+esc(h.published_at)+'</div></div><button class="btn" data-restore="'+h.id+'">Restore to draft</button></div>').join(""):'<div class="empty">No published versions</div>')+'</div></div>';}
function settings(){
 return '<div class="grid"><div class="panel"><h2 class="section-title">Navigation</h2>'+input(site.header.brand,"Brand")+input(site.header.cta,"CTA label")+field("CTA destination",site.header.ctaHref,"header-link","cta")+
 (site.header.nav||[]).map(n=>'<div class="entry">'+input(n.label,"Label")+field("Destination",n.href,"nav-link",n.id)+'</div>').join("")+'</div><div class="panel"><h2 class="section-title">SEO</h2>'+input(site.seo.title,"Page title")+input(site.seo.description,"Description")+input(site.maintenanceText,"Maintenance text")+'<label><input type="checkbox" id="maintenance" '+(site.maintenance?"checked":"")+'> Maintenance mode</label><p class="muted">Maintenance mode displays a minimal placeholder instead of the full public page.</p></div></div>';
}
function findCourse(id){return site.courses.find(c=>c.id===id);}
function mutateAction(action){
 const s=site.sections.find(x=>x.id===selected);
 if(action==="add-section"){selected=addSection(site,document.getElementById("new-section").value).id;return true;}
 if(action==="duplicate-section"&&s){selected=copySection(site,s).id;return true;}
 if(action==="delete-section"&&s){if(!confirm("Delete section?"))return false;site.sections=site.sections.filter(x=>x.id!==s.id);selected=site.sections[0]?.id;return true;}
 if(action==="add-item"&&s){s.items ||= [];s.items.push(s.type==="faq"?{id:uid(),question:addText(site),answer:addText(site)}:{id:uid(),title:addText(site),body:addText(site)});return true;}
 if(action==="add-course"){site.courses.push({id:uid(),title:addText(site),description:addText(site),badge:addText(site),modules:[]});return true;}
 if(action==="save-preset"){const name=document.getElementById("preset-name").value.trim();if(!name||name.length>60){msg("Enter a preset name");return false;}site.presets ||= {};site.presets[name]=structuredClone(site.theme);return true;}
 if(action.startsWith("apply-preset:")){const n=decodeURIComponent(action.slice(13));if(site.presets?.[n])site.theme=structuredClone(site.presets[n]);return true;}
 if(action.startsWith("delete-preset:")){delete site.presets[decodeURIComponent(action.slice(14))];return true;}
 return false;
}
async function handleAction(action){
 if(action==="save"){await save();msg(dirty?"Save failed":"Saved");return;}
 if(action==="publish"){await publish();return;}
 if(action==="upload-media"){
  const file=document.getElementById("media-file").files[0];if(!file)return msg("Select a file");
  const form=new FormData();form.append("file",file);
  try{await api("media",{method:"POST",body:form});mediaItems=await api("media");msg("Uploaded");draw();}catch(e){msg(e.message);}return;
 }
 if(mutateAction(action)){schedule();draw();return;}
}
app.addEventListener("click",async e=>{
 const tab=e.target.closest("[data-tab]");if(tab){active=tab.dataset.tab;notice="";draw();return;}
 const sel=e.target.closest("[data-select-section]");if(sel){selected=sel.dataset.selectSection;draw();return;}
 const vp=e.target.closest("[data-viewport]");if(vp){viewport=vp.dataset.viewport;draw();return;}
 const move=e.target.closest("[data-move]");if(move){const idx=site.sections.findIndex(s=>s.id===move.dataset.move);const to=idx+Number(move.dataset.direction);if(to>=0&&to<site.sections.length){const [s]=site.sections.splice(idx,1);site.sections.splice(to,0,s);schedule();draw();}return;}
 const reset=e.target.closest("[data-reset-text]");if(reset){site.texts[reset.dataset.resetText]=reset.dataset.resetText;schedule();draw();return;}
 const remove=e.target.closest("[data-remove-item]");if(remove){const s=site.sections.find(v=>v.id===selected);s.items=s.items.filter(it=>it.id!==remove.dataset.removeItem);schedule();draw();return;}
 const delCourse=e.target.closest("[data-delete-course]");if(delCourse){if(confirm("Delete course?")){site.courses=site.courses.filter(c=>c.id!==delCourse.dataset.deleteCourse);schedule();draw();}return;}
 const mod=e.target.closest("[data-add-module]");if(mod){findCourse(mod.dataset.addModule).modules.push({id:uid(),title:addText(site),lessons:[]});schedule();draw();return;}
 const delMod=e.target.closest("[data-delete-module]");if(delMod){const [c,m]=delMod.dataset.deleteModule.split(":");findCourse(c).modules=findCourse(c).modules.filter(x=>x.id!==m);schedule();draw();return;}
 const addLesson=e.target.closest("[data-add-lesson]");if(addLesson){const [c,m]=addLesson.dataset.addLesson.split(":");findCourse(c).modules.find(x=>x.id===m).lessons.push({id:uid(),title:addText(site)});schedule();draw();return;}
 const delLesson=e.target.closest("[data-delete-lesson]");if(delLesson){const [c,m,l]=delLesson.dataset.deleteLesson.split(":");const mod=findCourse(c).modules.find(x=>x.id===m);mod.lessons=mod.lessons.filter(x=>x.id!==l);schedule();draw();return;}
 const restore=e.target.closest("[data-restore]");if(restore){if(!confirm("Restore this version to draft?"))return;try{await api("restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:Number(restore.dataset.restore)})});await load();msg("Restored to draft");}catch(err){msg(err.message);}return;}
 const action=e.target.closest("[data-action]");if(action)await handleAction(action.dataset.action);
});
app.addEventListener("input",e=>{
 const t=e.target;
 if(t.id==="text-search"){filter=t.value;const start=t.selectionStart;draw();const n=document.getElementById("text-search");n?.focus();n?.setSelectionRange(start,start);return;}
 if(t.dataset.text){site.texts[t.dataset.text]=t.value;schedule();return;}
 if(t.dataset.theme){const key=t.dataset.theme;site.theme[key]=key==="radius"?Number(t.value):key==="motion"?t.checked:t.value;schedule();return;}
 if(t.dataset.sectionUrl){const s=site.sections.find(s=>s.id===t.dataset.sectionUrl);if(s){const k=s.type==="hero"?"primaryHref":s.type==="footer"?"linkHref":"buttonHref";s[k]=t.value;schedule();}return;}
 if(t.dataset.headerLink){site.header.ctaHref=t.value;schedule();return;}
 if(t.dataset.navLink){const item=site.header.nav.find(n=>n.id===t.dataset.navLink);if(item){item.href=t.value;schedule();}return;}
 if(t.dataset.heroMedia){const s=site.sections.find(s=>s.id===t.dataset.heroMedia);s.mediaId=t.value;schedule();mountPreview();return;}
 if(t.dataset.courseMedia){findCourse(t.dataset.courseMedia).mediaId=t.value;schedule();return;}
 if(t.dataset.visible){const s=site.sections.find(s=>s.id===t.dataset.visible);s.visible=t.checked;schedule();mountPreview();return;}
 if(t.id==="maintenance"){site.maintenance=t.checked;schedule();return;}
});
load();