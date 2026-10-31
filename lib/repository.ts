// The same parameterized statements run against D1 and the SQLite test adapter.
export async function writeRevision(db:any,current:{draft:unknown,published:unknown},document:unknown,version:number,action:string,actor:string){
const publish=action==='publish',body=JSON.stringify(document),id=crypto.randomUUID();
const result=await db.batch([
 db.prepare('INSERT INTO revisions(id,document,created,actor,kind) SELECT ?,?, ?,?,? WHERE EXISTS(SELECT 1 FROM site_state WHERE id=1 AND version=?)').bind(id,JSON.stringify(publish?current.published:current.draft),new Date().toISOString(),actor,publish?'before-publish':action==='restore'?'before-restore':'before-save',version),
 db.prepare(`UPDATE site_state SET draft=?,published=${publish?'?':'published'},version=version+1 WHERE id=1 AND version=?`).bind(...(publish?[body,body,version]:[body,version]))]);
return {changed:result[1].meta.changes>0,version:version+1};
}
