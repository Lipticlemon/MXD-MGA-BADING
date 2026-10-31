const validHex = (v, fallback) => /^#[0-9a-fA-F]{6}$/.test(String(v || "")) ? v : fallback;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const href = (v) => /^(https:\/\/|http:\/\/|mailto:|#|\/(?!\/))/.test(String(v || "")) ? esc(v) : "#";
const id = () => crypto.randomUUID();

export function initialSite() {
  let next = 1;
  const texts = {};
  const t = () => { const key = "text" + next++; texts[key] = key; return key; };
  const nav = [{id:id(),label:t(),href:"#courses"},{id:id(),label:t(),href:"#benefits"},{id:id(),label:t(),href:"#faq"}];
  const header = {brand:t(),nav,cta:t(),ctaHref:"#pricing",menuLabel:t()};
  const sections = [
    {id:id(),type:"hero",visible:true,fields:{eyebrow:t(),heading:t(),body:t(),primary:t(),secondary:t()},primaryHref:"#courses",secondaryHref:"#benefits"},
    {id:id(),type:"features",visible:true,fields:{eyebrow:t(),heading:t(),body:t()},items:Array.from({length:3},()=>({id:id(),title:t(),body:t()}))},
    {id:id(),type:"courses",visible:true,fields:{eyebrow:t(),heading:t(),body:t()}},
    {id:id(),type:"pricing",visible:true,fields:{eyebrow:t(),heading:t(),body:t(),price:t(),period:t(),button:t()},buttonHref:"#courses"},
    {id:id(),type:"faq",visible:true,fields:{eyebrow:t(),heading:t()},items:Array.from({length:3},()=>({id:id(),question:t(),answer:t()}))},
    {id:id(),type:"cta",visible:true,fields:{heading:t(),body:t(),button:t()},buttonHref:"#pricing"},
    {id:id(),type:"footer",visible:true,fields:{copyright:t(),link:t()},linkHref:"#top"}
  ];
  const courses = [{id:id(),title:t(),description:t(),badge:t(),modules:[{id:id(),title:t(),lessons:[{id:id(),title:t()},{id:id(),title:t()}]}]}];
  return {schema:1,nextText:next,texts,header,sections,courses,theme:{background:"#0D0A18",surface:"#151024",elevated:"#1E1533",accent:"#7C3AED",accentSoft:"#A78BFA",foreground:"#F8F7FC",muted:"#ADA5BD",border:"#302741",font:"Inter",radius:18,motion:true},presets:{},maintenance:false,seo:{title:t(),description:t()},updatedAt:null};
}
export function addText(site,value) { const n = site.nextText || 1; const key = "text"+n; site.nextText=n+1; site.texts[key] = value ?? key; return key; }
export function addSection(site,type) {
  const t=()=>addText(site);
  const common={id:id(),type,visible:true,fields:{eyebrow:t(),heading:t(),body:t()}};
  if(type==="features") common.items=[{id:id(),title:t(),body:t()}];
  if(type==="faq") common.items=[{id:id(),question:t(),answer:t()}];
  if(type==="pricing") {common.fields.price=t();common.fields.period=t();common.fields.button=t();common.buttonHref="#courses";}
  if(type==="hero"){common.fields.primary=t();common.fields.secondary=t();common.primaryHref="#courses";common.secondaryHref="#benefits";}
  if(type==="cta"){common.fields.button=t();common.buttonHref="#pricing";}
  if(type==="footer"){common.fields.copyright=t();common.fields.link=t();common.linkHref="#top";}
  site.sections.push(common); return common;
}
export function copySection(site, source) {
  const copy=structuredClone(source);
  function walk(value) { if(Array.isArray(value)){value.forEach(walk);return;} if(value && typeof value==="object"){for(const k of Object.keys(value)){if(k==="id")value[k]=id();else if(typeof value[k]==="string" && /^text\d+$/.test(value[k]))value[k]=addText(site,site.texts[value[k]]);else walk(value[k]);}}}
  walk(copy); site.sections.push(copy);return copy;
}
export function themeCSS(theme={}) {
  const fallback={background:"#0D0A18",surface:"#151024",elevated:"#1E1533",accent:"#7C3AED",accentSoft:"#A78BFA",foreground:"#F8F7FC",muted:"#ADA5BD",border:"#302741"};
  return Object.entries(fallback).map(([k,v])=>"--"+k+":"+validHex(theme[k],v)).join(";")+";--radius:"+Math.min(36,Math.max(0,Number(theme.radius)||18))+"px;--font:"+(["Inter","Geist","Manrope","system-ui"].includes(theme.font)?'"'+theme.font+'"':"Inter");
}
export function renderSite(site, {preview=false}={}) {
  if(!site) return "";
  const text=(key)=>esc(site.texts?.[key] ?? key ?? "");
  const attr=(key)=>preview?' data-edit-text="'+esc(key)+'"':"";
  const node=(tag,key,cls="")=>'<'+tag+' class="'+cls+'"'+attr(key)+'>'+text(key)+'</'+tag+'>';
  const anchor=(key,url,cls)=>'<a class="'+cls+'" href="'+href(url)+'"'+attr(key)+'>'+text(key)+'<span aria-hidden="true"> ↗</span></a>';
  const hero=(s)=>'<div class="hero-copy"><div class="eyebrow"'+attr(s.fields.eyebrow)+'>'+text(s.fields.eyebrow)+'</div>'+node("h1",s.fields.heading,"display")+
    node("p",s.fields.body,"hero-desc")+'<div class="button-row">'+anchor(s.fields.primary,s.primaryHref,"btn primary")+anchor(s.fields.secondary,s.secondaryHref,"btn ghost")+'</div></div><div class="hero-art" aria-hidden="true"><div class="orb orb-a"></div><div class="orb orb-b"></div><div class="hero-glass"><span></span><span></span><span></span></div></div>';
  const features=(s)=>'<div class="section-intro">'+node("span",s.fields.eyebrow,"eyebrow")+node("h2",s.fields.heading,"section-heading")+node("p",s.fields.body,"section-desc")+'</div><div class="feature-grid">'+(s.items||[]).map((it,i)=>'<article class="feature-card"><span class="feature-mark">0'+(i+1)+'</span>'+node("h3",it.title)+node("p",it.body)+'</article>').join("")+'</div>';
  const courses=(s)=>'<div class="section-intro">'+node("span",s.fields.eyebrow,"eyebrow")+node("h2",s.fields.heading,"section-heading")+node("p",s.fields.body,"section-desc")+'</div><div class="course-list">'+(site.courses||[]).map(c=>'<article class="course-card"><div class="course-top"><span class="course-badge"'+attr(c.badge)+'>'+text(c.badge)+'</span>'+node("h3",c.title)+node("p",c.description)+'</div><div class="course-modules">'+(c.modules||[]).map(m=>'<details class="module"><summary'+attr(m.title)+'>'+text(m.title)+'</summary><div class="lessons">'+(m.lessons||[]).map(l=>node("p",l.title)).join("")+'</div></details>').join("")+'</div></article>').join("")+'</div>';
  const pricing=(s)=>'<div class="pricing-layout"><div class="section-intro">'+node("span",s.fields.eyebrow,"eyebrow")+node("h2",s.fields.heading,"section-heading")+node("p",s.fields.body,"section-desc")+'</div><div class="pricing-card">'+node("strong",s.fields.price,"price")+node("p",s.fields.period,"subtle")+anchor(s.fields.button,s.buttonHref,"btn primary full")+'</div></div>';
  const faq=(s)=>'<div class="section-intro">'+node("span",s.fields.eyebrow,"eyebrow")+node("h2",s.fields.heading,"section-heading")+'</div><div class="faq-list">'+(s.items||[]).map(it=>'<details class="faq-item"><summary'+attr(it.question)+'>'+text(it.question)+'</summary>'+node("p",it.answer)+'</details>').join("")+'</div>';
  const cta=(s)=>'<div class="cta-inner">'+node("h2",s.fields.heading,"section-heading")+node("p",s.fields.body,"section-desc")+anchor(s.fields.button,s.buttonHref,"btn primary")+'</div>';
  const footer=(s)=>'<div class="footer-inner">'+node("p",s.fields.copyright)+anchor(s.fields.link,s.linkHref,"footer-link")+'</div>';
  const render={hero,features,courses,pricing,faq,cta,footer};
  const nav=(site.header?.nav||[]).map(n=>'<a href="'+href(n.href)+'"'+attr(n.label)+'>'+text(n.label)+'</a>').join("");
  const header='<header class="topbar"><div class="container nav-wrap"><a href="#top" class="logo"'+attr(site.header.brand)+'><span class="brand-mark" aria-hidden="true">✦</span>'+text(site.header.brand)+'</a><nav class="nav-links">'+nav+'</nav>'+anchor(site.header.cta,site.header.ctaHref,"btn small primary")+'<details class="mobile-menu"><summary aria-label="'+text(site.header.menuLabel)+'">☰</summary><nav>'+nav+'</nav></details></div></header>';
  const body=(site.sections||[]).filter(s=>s.visible!==false).map((s,i)=>'<section id="'+(s.type==="hero"?"top":s.type==="cta"?"join":s.type)+"'" class="section section-'+esc(s.type)+'" data-section="'+esc(s.id)+'"><div class="container">'+(render[s.type]||(()=>''))(s)+'</div></section>').join("");
  return '<div id="mxd-root" class="'+(site.theme?.motion===false?"reduce-motion":"")+'" style="'+themeCSS(site.theme)+'">'+header+'<main>'+body+'</main></div>';
}
