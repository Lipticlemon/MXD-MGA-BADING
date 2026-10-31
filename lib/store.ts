import { env } from 'cloudflare:workers';
import { initialContent, type Content } from './content';
export function database(){if(!env.DB)throw Error('Storage unavailable');return env.DB}
export async function load(){const db=database();let row=await db.prepare('SELECT * FROM site_state WHERE id=1').first<{draft:string,published:string,version:number}>();if(!row){const initial=JSON.stringify(initialContent());await db.prepare('INSERT OR IGNORE INTO site_state(id,draft,published,version) VALUES(1,?,?,0)').bind(initial,initial).run();row=await db.prepare('SELECT * FROM site_state WHERE id=1').first<typeof row>()}if(!row)throw Error('Initialization failed');return {draft:JSON.parse(row.draft) as Content,published:JSON.parse(row.published) as Content,version:row.version}}
