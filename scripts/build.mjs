import {mkdir,cp,rm} from "node:fs/promises";
const root = new URL("../",import.meta.url);
const out = new URL("../public/",import.meta.url);
await rm(out,{recursive:true,force:true});
for (const section of ["site","admin","shared"]) await mkdir(new URL(section+"/",out),{recursive:true});
await Promise.all([
  cp(new URL("../apps/mxd-web/index.html",import.meta.url),new URL("site/index.html",out)),
  cp(new URL("../apps/mxd-web/main.js",import.meta.url),new URL("site/main.js",out)),
  cp(new URL("../apps/admin-panel/index.html",import.meta.url),new URL("admin/index.html",out)),
  cp(new URL("../apps/admin-panel/main.js",import.meta.url),new URL("admin/main.js",out)),
  cp(new URL("../apps/admin-panel/admin.css",import.meta.url),new URL("admin/admin.css",out)),
  cp(new URL("../shared/site.js",import.meta.url),new URL("shared/site.js",out)),
  cp(new URL("../shared/site.css",import.meta.url),new URL("shared/site.css",out))
]);
console.log("Built MXD public + ADMIN PANEL assets");