import test from "node:test";
import assert from "node:assert/strict";
import {initialSite,addText,addSection,copySection,renderSite,themeCSS} from "../shared/site.js";
test("initial placeholder registry is sequential and unique",()=>{
 const site=initialSite(),keys=Object.keys(site.texts);
 assert.ok(keys.length>25);
 keys.forEach((key,i)=>{assert.equal(key,"text"+(i+1));assert.equal(site.texts[key],key);});
 assert.equal(site.nextText,keys.length+1);
});
test("creating content never renumbers existing text IDs",()=>{
 const site=initialSite(),before=Object.keys(site.texts),key=addText(site);
 addSection(site,"faq");
 assert.deepEqual(Object.keys(site.texts).slice(0,before.length),before);
 assert.equal(key,"text"+(before.length+1));
 assert.equal(new Set(Object.keys(site.texts)).size,Object.keys(site.texts).length);
});
test("duplicating a section creates new text references and element IDs",()=>{
 const site=initialSite(),old=site.sections[0],copy=copySection(site,old);
 assert.notEqual(copy.id,old.id);
 assert.notEqual(copy.fields.heading,old.fields.heading);
 assert.equal(site.texts[copy.fields.heading],site.texts[old.fields.heading]);
});
test("public copy is escaped and dangerous links blocked",()=>{
 const site=initialSite(),key=site.sections[0].fields.heading;
 site.texts[key]='<img src=x onerror=alert(1)>';
 site.sections[0].primaryHref='javascript:alert(1)';
 const html=renderSite(site);
 assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
 assert.ok(!html.includes('href="javascript:'));
});
test("preview exposes permanent text identifiers",()=>{
 const html=renderSite(initialSite(),{preview:true});
 assert.ok(html.includes('data-edit-text="'));
 assert.ok(html.includes("data-section="));
});
test("theme values reject CSS injection",()=>{
 const css=themeCSS({background:"red; color:lime",radius:999,font:"bad);color:red"});
 assert.ok(css.includes("--background:#0D0A18"));
 assert.ok(css.includes("--radius:36px"));
 assert.ok(!css.includes("color:lime"));
});
test("hidden sections do not render",()=>{
 const site=initialSite();site.sections[1].visible=false;
 assert.ok(!renderSite(site).includes('data-section="'+site.sections[1].id+'"'));
});
test("maintenance mode shows editable placeholder",()=>{
 const site=initialSite();site.maintenance=true;
 const html=renderSite(site);
 assert.ok(html.includes(site.texts[site.maintenanceText]));
 assert.ok(!html.includes("course-card"));
});
