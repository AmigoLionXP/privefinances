import {summarizePlan} from './organizer.mjs';
import {organizerRoute,organizeDocument,getPlan,getDocuments} from './organizer-routes.mjs';
import draftRules from './draft-rules.mjs';
import {AppError,fail,jsonBody,profile,receipt,text,verticals,date} from './validation.mjs';
import {authenticate} from './auth.mjs';
import {seal,open,sha256,b64,unb64} from './crypto.mjs';
import {simulate,deadlines} from './rules.mjs';
import {extractReceipt,imageMime,checkout,stripeSignature} from './integrations.mjs';
import {debtGuide} from './legal.mjs';
import {runJobs} from './jobs.mjs';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function rules(env,year){let row=await env.DB.prepare("SELECT * FROM rulesets WHERE tax_year=? AND canton='VD' ORDER BY CASE status WHEN 'approved' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,version DESC LIMIT 1").bind(year).first();if(!row&&draftRules[year]){const r=draftRules[year],raw=JSON.stringify(r);await env.DB.prepare('INSERT OR IGNORE INTO rulesets(id,tax_year,canton,version,status,payload,sha256) VALUES(?,?,?,?,?,?,?)').bind(r.id,r.taxYear,r.canton,r.version,r.status,raw,await sha256(raw)).run();row=await env.DB.prepare('SELECT * FROM rulesets WHERE id=?').bind(r.id).first();}if(!row)return null;if(await sha256(row.payload)!==row.sha256)fail('rules_integrity_error',503);const r=JSON.parse(row.payload);if(r.status!==row.status||r.taxYear!==row.tax_year||r.id!==row.id)fail('rules_integrity_error',503);return {...r,hash:row.sha256};}
async function getProfile(env,id){const row=await env.DB.prepare('SELECT payload FROM profiles WHERE user_id=?').bind(id).first();return row?await open(env,row.payload,`profile:${id}`):null;}
async function getReceipts(env,id){const rows=await env.DB.prepare('SELECT * FROM receipts WHERE user_id=? ORDER BY created_at DESC').bind(id).all();return Promise.all((rows.results||[]).map(async r=>({id:r.id,confirmed:!!r.confirmed,data:await open(env,r.payload,`receipt:${id}:${r.id}`)})));}
async function limit(env,id,scope,max){const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/3600),key=`${id}:${scope}:${bucket}`;const row=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+7200).first();if(row?.count>max)fail('rate_limit_exceeded',429);}
async function webhook(req,env){
 const raw=await limitedText(req,1000000);if(!await stripeSignature(raw,req.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET))fail('invalid_webhook_signature',400);let event;try{event=JSON.parse(raw);}catch{fail('invalid_webhook');}if(typeof event.id!=='string'||!event.data?.object)fail('invalid_webhook');
 if(await env.DB.prepare('SELECT id FROM billing_events WHERE id=?').bind(event.id).first())return json({received:true,duplicate:true});
 let obj=event.data.object;let checkoutId,userId,product,status,subscriptionId;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
 checkoutId=obj.metadata?.checkout_id;userId=obj.metadata?.user_id;product=obj.metadata?.product;subscriptionId=obj.subscription||null;status=obj.payment_status==='paid'?'paid':'pending';
 if(product==='subscription')status='pending'; // Access for subscriptions is derived from the current subscription, never a stale Checkout event.
 }else if(event.type.startsWith('customer.subscription.')){
 if(!env.STRIPE_SECRET_KEY)fail('payments_not_configured',503);
 const res=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(obj.id)}`,{headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`},signal:AbortSignal.timeout(15000)});if(!res.ok)fail('payment_provider_error',502);obj=await res.json();checkoutId=obj.metadata?.checkout_id;userId=obj.metadata?.user_id;product='subscription';subscriptionId=obj.id;status=obj.status;
 }
 const statements=[];
 if(checkoutId&&userId){const row=await env.DB.prepare('SELECT * FROM checkouts WHERE id=? AND user_id=? AND product=?').bind(checkoutId,userId,product).first();if(row){
 // pending checkout events cannot downgrade a subscription already synchronized by a subscription event.
 if(!(product==='subscription'&&status==='pending'))statements.push(env.DB.prepare('INSERT INTO entitlements(checkout_id,user_id,product,status,subscription_id) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM billing_events WHERE id=?) ON CONFLICT(checkout_id) DO UPDATE SET status=excluded.status,subscription_id=excluded.subscription_id,updated_at=CURRENT_TIMESTAMP').bind(checkoutId,userId,product,status,subscriptionId,event.id));
 }}
 statements.push(env.DB.prepare('INSERT OR IGNORE INTO billing_events(id,type) VALUES(?,?)').bind(event.id,event.type));await env.DB.batch(statements);return json({received:true});
}
async function limitedText(req,max){if(!req.body)fail('invalid_webhook');const reader=req.body.getReader();let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();fail('body_too_large',413);}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return new TextDecoder().decode(bytes);}
async function route(req,env){const url=new URL(req.url),path=url.pathname,method=req.method;
 if(path==='/api/health')return json({ok:true,version:'0.3.0',productionReady:false});
 if(path==='/api/stripe/webhook'&&method==='POST')return webhook(req,env);
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 if(!['GET','HEAD'].includes(method)&&req.headers.get('origin')!==env.APP_ORIGIN&&!(env.ALLOW_LOCAL_DEV==='true'&&['localhost','127.0.0.1'].includes(url.hostname)&&req.headers.get('origin')===url.origin))fail('invalid_origin',403);
 const user=await authenticate(req,env);await limit(env,user.id,'api',300);if(path==='/api/guide')await limit(env,user.id,'guide',15);const organized=await organizerRoute(req,env,user);if(organized)return organized;
 if(path==='/api/me'&&method==='GET')return json({email:user.email,privacyVersion:env.PRIVACY_VERSION,features:{guideAI:env.GUIDE_AI_ENABLED==='true'&&!!env.ANTHROPIC_API_KEY,ai:env.AI_ENABLED==='true',payments:env.PAYMENTS_ENABLED==='true',delivery:env.DELIVERY_ENABLED==='true'}});
 if(path==='/api/dashboard'&&method==='GET'){const p=await getProfile(env,user.id);const rows=await getReceipts(env,user.id);const latest=await env.DB.prepare('SELECT id,payload FROM simulations WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').bind(user.id).first();const detailed=await getPlan(env,user.id);return json({planSummary:detailed?summarizePlan(detailed):null,profile:p,confirmedReceipts:rows.filter(r=>r.confirmed).length,latest:latest?await open(env,latest.payload,`simulation:${user.id}:${latest.id}`):null});}
 if(path==='/api/profile'&&method==='GET')return json({profile:await getProfile(env,user.id)});
 if(path==='/api/profile'&&method==='PUT'){const p=profile(await jsonBody(req));await env.DB.prepare('INSERT INTO profiles(user_id,payload) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP').bind(user.id,await seal(env,p,`profile:${user.id}`)).run();return json({profile:p});}
 if(path==='/api/simulations'&&method==='POST'){const p=profile(await jsonBody(req));const r=await rules(env,p.taxYear);const result=simulate(p,await getReceipts(env,user.id),r);const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO simulations(id,user_id,ruleset_id,ruleset_hash,payload) VALUES(?,?,?,?,?)').bind(id,user.id,r?.id??null,r?.hash??null,await seal(env,{input:p,result},`simulation:${user.id}:${id}`)).run();return json({id,...result},201);}
 if(path==='/api/rules'&&method==='GET'){const year=Number(url.searchParams.get('year'));if(![2025,2026].includes(year))fail('unsupported_year');return json({rules:await rules(env,year)});}
 if(path==='/api/deadlines'&&method==='GET'){const p=await getProfile(env,user.id);if(!p)return json({deadlines:[],reason:'profile_required'});const r=await rules(env,p.taxYear);return json({deadlines:deadlines(r,p),reason:r?.status==='approved'?null:'professional_review_required'});}
 if(path==='/api/receipts'&&method==='GET')return json({receipts:await getReceipts(env,user.id)});
 if(path==='/api/receipts'&&method==='POST'){
 await limit(env,user.id,'upload',30);const input=await jsonBody(req,7_100_000);if(typeof input.image!=='string'||input.image.length>7_000_000)fail('invalid_image');let bytes;try{bytes=unb64(input.image);}catch{fail('invalid_image');}if(bytes.length>5_000_000||bytes.length<8)fail('invalid_image');if(input.aiConsent===true&&input.privacyVersion!==env.PRIVACY_VERSION)fail('privacy_version_changed',409);const mime=imageMime(bytes),id=crypto.randomUUID(),objectKey=`${user.id}/${id}`;
 const encrypted=await seal(env,{mime,image:b64(bytes)},`file:${user.id}:${id}`);await env.FILES.put(objectKey,encrypted,{httpMetadata:{contentType:'application/octet-stream'}});
 let extraction={needsReview:true,fields:null},extractionError=null;
 // Explicit OCR consent is separate from storage. Providers may process outside Europe.
 if(input.aiConsent===true){if(input.privacyVersion!==env.PRIVACY_VERSION)fail('privacy_version_changed',409);try{extraction=await extractReceipt(env,bytes,mime);}catch{extractionError='ai_unavailable';}}
 try{await env.DB.prepare('INSERT INTO receipts(id,user_id,object_key,payload) VALUES(?,?,?,?)').bind(id,user.id,objectKey,await seal(env,{mime,kind:['invoice','receipt','payslip'].includes(input.kind)?input.kind:'invoice',...extraction.fields,extraction,aiConsent:input.aiConsent===true,privacyVersion:env.PRIVACY_VERSION,consentedAt:new Date().toISOString()},`receipt:${user.id}:${id}`)).run();}catch(e){await env.FILES.delete(objectKey);throw e;}
 if(extraction.fields)await organizeDocument(env,user.id,id,extraction.fields,false);return json({id,confirmed:false,extraction,extractionError},201);
 }
 const match=path.match(/^\/api\/receipts\/([a-f0-9-]{36})(\/confirm|\/file)?$/);
 if(match){const [,id,action]=match;const row=await env.DB.prepare('SELECT * FROM receipts WHERE id=? AND user_id=?').bind(id,user.id).first();if(!row)fail('not_found',404);
 if(method==='POST'&&action==='/confirm'){const input=await jsonBody(req);const original=await open(env,row.payload,`receipt:${user.id}:${id}`);const v=receipt({...original,...input});const audit=original.audit||{aiConsent:original.aiConsent,privacyVersion:original.privacyVersion,consentedAt:original.consentedAt,extraction:original.extraction};await env.DB.prepare('UPDATE receipts SET payload=?,confirmed=1 WHERE id=? AND user_id=?').bind(await seal(env,{...v,audit,confirmedAt:new Date().toISOString()},`receipt:${user.id}:${id}`),id,user.id).run();await organizeDocument(env,user.id,id,v,true);return json({confirmed:true,data:v});}
 if(method==='GET'&&action==='/file'){const file=await env.FILES.get(row.object_key);if(!file)fail('not_found',404);const data=await open(env,await file.text(),`file:${user.id}:${id}`);return new Response(unb64(data.image),{headers:{'Content-Type':data.mime,'Cache-Control':'no-store','Content-Disposition':'attachment; filename="receipt.'+(data.mime==='image/png'?'png':'jpg')+'"'}});}
 if(method==='DELETE'&&!action){await env.FILES.delete(row.object_key);await env.DB.prepare('DELETE FROM receipts WHERE id=? AND user_id=?').bind(id,user.id).run();return json({deleted:true});}}
 if(path==='/api/debts'&&method==='GET')return json(debtGuide(url.searchParams.get('stage'),url.searchParams.get('lang')));
 if(path==='/api/leads'&&method==='POST'){
 const input=await jsonBody(req);if(input.consent!==true||input.privacyVersion!==env.PRIVACY_VERSION)fail('explicit_current_consent_required');if(!verticals.includes(input.vertical))fail('invalid_vertical');await limit(env,user.id,'leads',10);const id=crypto.randomUUID(),consent=crypto.randomUUID();const payload={name:text(input.name,'name',120),email:user.email,purpose:'contact_requested',privacyVersion:env.PRIVACY_VERSION};
 await env.DB.batch([env.DB.prepare('INSERT INTO consents(id,user_id,purpose,vertical,version) VALUES(?,?,?,?,?)').bind(consent,user.id,'marketplace_contact',input.vertical,env.PRIVACY_VERSION),env.DB.prepare('INSERT INTO leads(id,user_id,consent_id,vertical,payload) VALUES(?,?,?,?,?)').bind(id,user.id,consent,input.vertical,await seal(env,payload,`leads:${user.id}:${id}`))]);await env.DB.prepare("UPDATE leads SET status='review_pending' WHERE id=? AND user_id=?").bind(id,user.id).run();return json({trackingId:id,consentId:consent,status:'review_pending',requiresAdministrativeApproval:true},201);
 }

 // Administrative approval is deliberately server-side: no client-supplied role or owner identifier.
 if(path==='/api/admin/leads' || /^\/api\/admin\/leads\/[a-f0-9-]{36}\/decision$/.test(path)){
  if(!env.ADMIN_REVIEWER_USER_ID || user.id!==env.ADMIN_REVIEWER_USER_ID)fail('forbidden',403);
  if(path==='/api/admin/leads'&&method==='GET'){
   const rows=await env.DB.prepare("SELECT l.id,l.user_id,l.vertical,l.status,l.created_at,l.payload,c.revoked_at FROM leads l JOIN consents c ON c.id=l.consent_id ORDER BY l.created_at DESC LIMIT 100").all();
   return json({leads:await Promise.all((rows.results||[]).map(async r=>({id:r.id,vertical:r.vertical,status:r.status,createdAt:r.created_at,consentValid:!r.revoked_at,contact:await open(env,r.payload,`leads:${r.user_id}:${r.id}`)})))});
  }
  if(method==='POST'){
   const leadId=path.split('/')[4],input=await jsonBody(req);
   if(!['approve','reject','request_documents'].includes(input.decision))fail('invalid_decision',400);
   const row=await env.DB.prepare("SELECT l.*,c.revoked_at,u.deleting FROM leads l JOIN consents c ON c.id=l.consent_id JOIN users u ON u.id=l.user_id WHERE l.id=?").bind(leadId).first();
   if(!row)fail('not_found',404);
   if(row.status!=='review_pending')fail('lead_not_pending_review',409);
   if(row.revoked_at||row.deleting)fail('consent_revoked',409);
   const next={approve:'approved',reject:'rejected',request_documents:'needs_documents'}[input.decision];
   const result=await env.DB.prepare("UPDATE leads SET status=? WHERE id=? AND status='review_pending' AND EXISTS (SELECT 1 FROM consents WHERE id=leads.consent_id AND revoked_at IS NULL)").bind(next,leadId).run();
   if(!result.meta?.changes)fail('lead_state_changed',409);
   return json({trackingId:leadId,status:next,approvedBy:user.id});
  }
  fail('not_found',404);
 }
 if(path==='/api/consents'&&method==='GET'){const c=await env.DB.prepare('SELECT id,purpose,vertical,version,granted_at,revoked_at FROM consents WHERE user_id=?').bind(user.id).all();const l=await env.DB.prepare('SELECT id,vertical,status,consent_id FROM leads WHERE user_id=?').bind(user.id).all();return json({consents:c.results,leads:l.results});}
 if(/^\/api\/consents\/[a-f0-9-]{36}$/.test(path)&&method==='DELETE'){const id=path.split('/').pop();const own=await env.DB.prepare('SELECT id FROM consents WHERE id=? AND user_id=?').bind(id,user.id).first();if(!own)fail('not_found',404);await env.DB.batch([env.DB.prepare('UPDATE consents SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').bind(id,user.id),env.DB.prepare("UPDATE leads SET status='cancelled' WHERE consent_id=? AND user_id=? AND status IN ('review_pending','approved','pending','sending','needs_documents')").bind(id,user.id)]);return json({revoked:true,previousDeliveryCannotBeRecalled:true});}
 if(path==='/api/reminders'&&method==='GET'){const rows=await env.DB.prepare("SELECT id,due_at,channel,status,payload FROM reminders WHERE user_id=? AND status!='cancelled' ORDER BY due_at").bind(user.id).all();return json({reminders:await Promise.all(rows.results.map(async r=>{const payload=await open(env,r.payload,`reminders:${user.id}:${r.id}`);return {id:r.id,due_at:r.due_at,channel:r.channel,status:r.status,label:payload.label};}))});}
 if(path==='/api/reminders'&&method==='POST'){const input=await jsonBody(req);if(input.consent!==true||input.privacyVersion!==env.PRIVACY_VERSION)fail('explicit_current_consent_required');if(!['email','push','whatsapp'].includes(input.channel))fail('invalid_channel');const day=date(input.date);if(day<new Date().toISOString().slice(0,10))fail('past_reminder');const id=crypto.randomUUID(),payload={label:text(input.label,'label'),email:user.email,locale:input.locale==='fr'?'fr':'pt'};
 // Push subscriptions / phone must be verified by a gateway before enabling these channels.
 if(input.channel!=='email')fail('channel_gateway_not_implemented',503);
 await env.DB.prepare('INSERT INTO reminders(id,user_id,payload,due_at,channel) VALUES(?,?,?,?,?)').bind(id,user.id,await seal(env,payload,`reminders:${user.id}:${id}`),day+'T07:00:00.000Z',input.channel).run();return json({id,status:'pending',deliveryConfigured:env.DELIVERY_ENABLED==='true'},201);}
 if(/^\/api\/reminders\/[a-f0-9-]{36}$/.test(path)&&method==='DELETE'){await env.DB.prepare("UPDATE reminders SET status='cancelled' WHERE id=? AND user_id=?").bind(path.split('/').pop(),user.id).run();return json({cancelled:true});}
 if(path==='/api/checkout'&&method==='POST'){const input=await jsonBody(req);await limit(env,user.id,'checkout',10);const product=input.product;if(!['pack','review','subscription'].includes(product))fail('invalid_product');const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO checkouts(id,user_id,product) VALUES(?,?,?)').bind(id,user.id,product).run();const session=await checkout(env,user,product,id);await env.DB.prepare('UPDATE checkouts SET stripe_id=? WHERE id=?').bind(session.id,id).run();return json({url:session.url});}
 if(path==='/api/billing'&&method==='GET'){const rows=await env.DB.prepare('SELECT product,status,updated_at FROM entitlements WHERE user_id=?').bind(user.id).all();return json({entitlements:rows.results});}
 if(path==='/api/export'&&method==='GET'){const p=await getProfile(env,user.id);const receipts=await getReceipts(env,user.id);const simRows=await env.DB.prepare('SELECT * FROM simulations WHERE user_id=?').bind(user.id).all();const simulations=await Promise.all((simRows.results||[]).map(r=>open(env,r.payload,`simulation:${user.id}:${r.id}`)));return json({profile:p,receipts,simulations,financialPlan:await getPlan(env,user.id),organizedDocuments:await getDocuments(env,user.id)});}
 if(path==='/api/account'&&method==='DELETE'){
 const input=await jsonBody(req);if(input.confirm!=='DELETE')fail('deletion_confirmation_required');const active=await env.DB.prepare("SELECT checkout_id FROM entitlements WHERE user_id=? AND product='subscription' AND status IN ('active','trialing','past_due','unpaid','paused')").bind(user.id).first();if(active)fail('cancel_subscription_with_support_first',409);
 await env.DB.batch([env.DB.prepare('UPDATE users SET deleting=1 WHERE id=?').bind(user.id),env.DB.prepare('UPDATE consents SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(user.id),env.DB.prepare("UPDATE leads SET status='cancelled' WHERE user_id=? AND status!='sent'").bind(user.id),env.DB.prepare("UPDATE reminders SET status='cancelled' WHERE user_id=? AND status!='sent'").bind(user.id)]);
 await purgeAccount(env,user.id);return json({deleted:true,externalProviderRetention:'see_privacy_notice'});
 }
 fail('not_found',404);
}
export async function purgeAccount(env,id){let cursor;do{const list=await env.FILES.list({prefix:id+'/',cursor});if(list.objects.length)await env.FILES.delete(list.objects.map(x=>x.key));cursor=list.truncated?list.cursor:undefined;}while(cursor);await env.DB.batch([env.DB.prepare('DELETE FROM rate_limits WHERE key LIKE ?').bind(id+':%'),env.DB.prepare('DELETE FROM users WHERE id=? AND deleting=1').bind(id)]);}
export default {async fetch(req,env){let response;try{response=await route(req,env);}catch(e){response=json({error:e instanceof AppError?e.message:'internal_error'},e instanceof AppError?e.status:500);}const out=new Response(response.body,response);out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','no-referrer');out.headers.set('X-Frame-Options','DENY');out.headers.set('Permissions-Policy','camera=(self), microphone=(), geolocation=()');out.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");return out;},async scheduled(controller,env,ctx){ctx.waitUntil((async()=>{const deleting=await env.DB.prepare('SELECT id FROM users WHERE deleting=1').all();for(const u of deleting.results||[])await purgeAccount(env,u.id);await runJobs(env);})());}};
