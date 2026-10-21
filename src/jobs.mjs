import {open} from './crypto.mjs';
import {deliver} from './integrations.mjs';
export async function runJobs(env,now=new Date()){
 // Recovery: interrupted sends are retried with the same idempotency key. Gateways must deduplicate.
 await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Math.floor(now.getTime()/1000)).run();
 if(env.DELIVERY_ENABLED!=='true')return;
 for(const table of ['leads','reminders']){
 const query=table==='leads'?"SELECT l.* FROM leads l JOIN users u ON u.id=l.user_id JOIN consents c ON c.id=l.consent_id WHERE l.status IN ('pending','sending') AND l.attempts<5 AND u.deleting=0 AND c.revoked_at IS NULL":"SELECT r.* FROM reminders r JOIN users u ON u.id=r.user_id WHERE r.status IN ('pending','sending') AND r.due_at<=? AND r.attempts<5 AND u.deleting=0";
 const st=env.DB.prepare(query);const result=await (table==='reminders'?st.bind(now.toISOString()):st).all();
 for(const row of result.results||[]){try{
 // One scheduled invocation expected; provider idempotency is required for retried/concurrent delivery.
 const check=await env.DB.prepare(table==='leads'?'SELECT c.revoked_at,u.deleting FROM consents c JOIN users u ON u.id=c.user_id WHERE c.id=?':'SELECT deleting FROM users WHERE id=?').bind(table==='leads'?row.consent_id:row.user_id).first();if(!check||check.deleting||check.revoked_at)continue;
 await env.DB.prepare(`UPDATE ${table} SET status='sending',attempts=attempts+1 WHERE id=?`).bind(row.id).run();
 const payload=await open(env,row.payload,`${table}:${row.user_id}:${row.id}`);
 await deliver(table==='leads'?env.LEAD_API_URL:env.NOTIFICATION_API_URL,table==='leads'?env.LEAD_API_TOKEN:env.NOTIFICATION_API_TOKEN,{trackingId:row.id,...payload,...(table==='leads'?{vertical:row.vertical}:{channel:row.channel,dueAt:row.due_at})},row.id);
 await env.DB.prepare(`UPDATE ${table} SET status='sent' WHERE id=? AND status='sending'`).bind(row.id).run();
 }catch{await env.DB.prepare(`UPDATE ${table} SET status='pending' WHERE id=? AND status='sending'`).bind(row.id).run();}}
 }
 await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Math.floor(now.getTime()/1000)).run();
}
