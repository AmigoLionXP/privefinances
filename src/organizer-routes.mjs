import {financialPlan,summarizePlan,savingsPlan,installment,documentData,taxFolder} from './organizer.mjs';
import {seal,open,sha256} from './crypto.mjs';
import {jsonBody,receipt,fail,text} from './validation.mjs';
import {localGuide,aiGuide,updateCalendar} from './guide.mjs';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export async function getPlan(env,userId){const row=await env.DB.prepare('SELECT payload FROM financial_plans WHERE user_id=?').bind(userId).first();return row?open(env,row.payload,`plan:${userId}`):null;}
async function savePlan(env,userId,input){const p=financialPlan(input);await env.DB.prepare('INSERT INTO financial_plans(user_id,payload) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP').bind(userId,await seal(env,p,`plan:${userId}`)).run();return p;}
export async function organizeDocument(env,userId,id,data,confirmed=false){if(!data?.supplier||!data.date)return;const v=documentData(data);const key=await sha256(userId+':creditor:'+v.supplier.normalize('NFKC').trim().toLocaleLowerCase('fr').replace(/\s+/g,' '));const previous=await env.DB.prepare('SELECT payload FROM document_organization WHERE receipt_id=? AND user_id=?').bind(id,userId).first();const old=previous?await open(env,previous.payload,`document:${userId}:${id}`):{};
 const normalized={...old,...v,confirmed:!!confirmed,creditor:v.supplier,paymentRecord:v.kind!=='payslip',ledgerStatus:confirmed?(v.paymentState==='paid'?'paid':'to_check'):'draft',fiscalStatus:taxFolder(v.category)?'review_required':'not_classified',folders:['creditor',...(taxFolder(v.category)?['tax_review']:[])]};
 await env.DB.prepare('INSERT INTO document_organization(receipt_id,user_id,creditor_key,tax_year,tax_status,payload) VALUES(?,?,?,?,?,?) ON CONFLICT(receipt_id) DO UPDATE SET creditor_key=excluded.creditor_key,tax_year=excluded.tax_year,tax_status=excluded.tax_status,payload=excluded.payload').bind(id,userId,key,Number(v.date.slice(0,4)),normalized.fiscalStatus,await seal(env,normalized,`document:${userId}:${id}`)).run();}
export async function getDocuments(env,userId){const rows=await env.DB.prepare('SELECT receipt_id,creditor_key,tax_year,tax_status,payload FROM document_organization WHERE user_id=?').bind(userId).all();return Promise.all(rows.results.map(async r=>({id:r.receipt_id,creditorKey:r.creditor_key,taxYear:r.tax_year,...await open(env,r.payload,`document:${userId}:${r.receipt_id}`)})));}
export async function organizerRoute(req,env,user){const path=new URL(req.url).pathname,method=req.method;
 if(path==='/api/plan'&&method==='GET'){const plan=await getPlan(env,user.id);return json({plan,summary:plan?summarizePlan(plan):null});}
 if(path==='/api/plan'&&method==='PUT'){const plan=await savePlan(env,user.id,await jsonBody(req,100000));return json({plan,summary:summarizePlan(plan)});}
 if(path==='/api/savings'&&method==='GET'){const p=await getPlan(env,user.id);return json({analysis:p?savingsPlan(p):null,aiActive:false});}
 if(path==='/api/installments'&&method==='POST')return json(installment(await jsonBody(req)));
 if(path==='/api/documents'&&method==='GET'){
 // Lazily index pre-v0.3 documents without rewriting their originals or duplicating amounts.
 const rows=await env.DB.prepare('SELECT r.id,r.payload,r.confirmed FROM receipts r LEFT JOIN document_organization d ON d.receipt_id=r.id WHERE r.user_id=? AND d.receipt_id IS NULL').bind(user.id).all();for(const r of rows.results)await organizeDocument(env,user.id,r.id,await open(env,r.payload,`receipt:${user.id}:${r.id}`),r.confirmed);
 return json({documents:await getDocuments(env,user.id)});
 }
 const match=path.match(/^\/api\/documents\/([a-f0-9-]{36})(\/salary)?$/);
 if(match&&['PUT','POST'].includes(method)){const id=match[1],row=await env.DB.prepare('SELECT payload,confirmed FROM receipts WHERE id=? AND user_id=?').bind(id,user.id).first();if(!row)fail('not_found',404);const old=await open(env,row.payload,`receipt:${user.id}:${id}`);
 if(match[2]==='/salary'&&method==='POST'){const input=await jsonBody(req);if(input.confirm!==true||old.kind!=='payslip'||!row.confirmed)fail('confirmed_payslip_required');const p=await getPlan(env,user.id)||{month:new Date().toISOString().slice(0,7),salary:{netMonthly:0,employer:''},incomes:[],expenses:[]};p.salary={netMonthly:old.amount,employer:old.supplier};const plan=await savePlan(env,user.id,p);return json({plan,summary:summarizePlan(plan)});}
 if(method==='PUT'&&!match[2]){const input=await jsonBody(req);if(Object.keys(input).some(k=>!['dueDate','paymentState','reference'].includes(k)))fail('use_receipt_confirmation_for_financial_changes');const v=documentData({...old,...input,...receipt({...old,...input})});await env.DB.batch([env.DB.prepare('UPDATE receipts SET payload=? WHERE id=? AND user_id=?').bind(await seal(env,v,`receipt:${user.id}:${id}`),id,user.id)]);await organizeDocument(env,user.id,id,v,row.confirmed);return json({updated:true});}
 }
 if(path==='/api/guide'&&method==='POST'){const input=await jsonBody(req);const q=text(input.question,'question',2500),lang=input.locale==='fr'?'fr':'pt',reference=localGuide(q,lang);if(input.useAI===true){if(input.aiConsent!==true||input.privacyVersion!==env.PRIVACY_VERSION)fail('explicit_current_consent_required');return json(await aiGuide(env,q,lang,reference));}return json(reference);}
 if(path==='/api/updates'&&method==='GET')return json(updateCalendar());
 return null;
}
