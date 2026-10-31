import {renderSite} from "../shared/site.js";
async function boot(){
 try{const response=await fetch("/api/public",{cache:"no-store"});if(!response.ok)throw Error("site fetch");const site=await response.json();document.title=site.texts?.[site.seo?.title]||"text1";document.getElementById("app").innerHTML=renderSite(site);}catch(error){console.error("MXD load failed",error);document.getElementById("app").textContent="text1";}}
boot();