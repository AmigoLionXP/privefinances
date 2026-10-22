// API de documentos: digitalizar → extrair → validar → confirmar → registrar → arquivar.
// Nenhum pagamento é executado. Nada entra no orçamento sem confirmação explícita.
import {documentInput, budgetLink} from './documents.mjs';
import {findDuplicates, folders, openBills} from '../public/documents.mjs';
import {household} from './household.mjs';
import {getHousehold, writeHousehold, overview, today} from './household-routes.mjs';
import {recommendations, realizedSavings} from './budget-engine.mjs';
import {currentPlan, track, audit} from './telemetry.mjs';
import {limit} from '../public/plans.mjs';
import {seal, open, sha256, b64, unb64, hex} from './crypto.mjs';
import {jsonBody, fail} from './validation.mjs';

const json = (v, status = 200) => new Response(JSON.stringify(v), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}});
const MAX_DOCS = 1000;
const STRONG = ['same_payment_reference', 'same_file', 'same_document'];

function sniff(bytes) {
  const h = [...bytes.subarray(0, 12)];
  if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) return 'application/pdf';
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return 'image/png';
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'image/jpeg';
  if (h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50) return 'image/webp';
  return null;
}

async function load(env, userId, id) {
  const row = await env.DB.prepare('SELECT * FROM user_documents WHERE id=? AND user_id=?').bind(id, userId).first();
  if (!row) fail('not_found', 404);
  return {row, doc: await open(env, row.payload, `doc:${userId}:${id}`)};
}
export async function getUserDocuments(env, userId) {
  const rows = await env.DB.prepare('SELECT id,payload FROM user_documents WHERE user_id=? ORDER BY created_at DESC,rowid DESC').bind(userId).all();
  return Promise.all(rows.results.map(async r => ({...await open(env, r.payload, `doc:${userId}:${r.id}`), id: r.id})));
}
async function store(env, userId, doc) {
  await env.DB.prepare('UPDATE user_documents SET payload=?,status=?,tax_year=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?')
    .bind(await seal(env, doc, `doc:${userId}:${doc.id}`), doc.status, doc.taxYear, doc.id, userId).run();
}

/** Liga a fatura ao orçamento sem contar duas vezes: linha pontual nova, linha existente ou nenhuma. */
async function linkBudget(env, userId, doc, link) {
  const rowId = 'doc_' + doc.id;
  const h = await getHousehold(env, userId);
  if (link.mode === 'existing') {
    if (!h?.expenses.some(e => e.id === link.expenseId)) fail('expense_not_found', 409);
  }
  if (link.mode === 'oneoff') {
    if (!doc.amount || doc.currency !== 'CHF') fail('budget_requires_chf_amount');
    if (!doc.dueDate) fail('due_date_required');
  }
  const base = h || household({onboarding: {step: 'welcome'}});
  const expenses = base.expenses.filter(e => e.id !== rowId);
  if (link.mode === 'oneoff') expenses.push({id: rowId, label: doc.creditor.slice(0, 120), category: doc.category || 'other', amount: doc.amount, frequency: 'oneoff', month: doc.dueDate.slice(0, 7), day: Number(doc.dueDate.slice(8, 10)), status: 'confirmed', provider: doc.creditor});
  if (!h && link.mode !== 'oneoff') return null;
  const next = household({...base, expenses});
  await writeHousehold(env, userId, next, 'document', {document: doc.id, budget: link.mode});
  return next;
}
async function unlinkBudget(env, userId, docId) {
  const h = await getHousehold(env, userId), rowId = 'doc_' + docId;
  if (!h || !h.expenses.some(e => e.id === rowId)) return;
  await writeHousehold(env, userId, household({...h, expenses: h.expenses.filter(e => e.id !== rowId)}), 'document', {document: docId, budget: 'removed'});
}

export async function documentsRoute(req, env, user) {
  const url = new URL(req.url), path = url.pathname, method = req.method, day = today(env);
  if (path === '/api/docs' && method === 'GET') {
    const docs = await getUserDocuments(env, user.id);
    return json({documents: docs, folders: folders(docs), openBills: openBills(docs, day), today: day});
  }
  if (path === '/api/docs' && method === 'POST') {
    const input = await jsonBody(req, 7_200_000);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM user_documents WHERE user_id=?').bind(user.id).first();
    if (count.n >= MAX_DOCS) fail('too_many_documents', 409);
    const plan = (await currentPlan(env, user.id)).plan;
    if (count.n >= limit(plan, 'documents')) return json({error: 'plan_limit_documents', limit: limit(plan, 'documents'), plan}, 402);
    const id = crypto.randomUUID();
    const doc = {id, status: 'draft', ...documentInput(input.document, {today: day}), budget: {mode: 'none', expenseId: null}, createdAt: new Date().toISOString(), confirmedAt: null, fileHash: null, fileMime: null};
    let fileKey = null;
    if (input.file != null) {
      if (typeof input.file !== 'string' || input.file.length > 7_000_000) fail('invalid_file');
      let bytes; try { bytes = unb64(input.file); } catch { fail('invalid_file'); }
      if (bytes.length < 8 || bytes.length > 5_000_000) fail('invalid_file');
      const mime = sniff(bytes); if (!mime) fail('unsupported_file_type');
      // Hash ligado ao usuário: duas contas não conseguem saber se têm o mesmo arquivo.
      doc.fileHash = await sha256(user.id + ':' + hex(await crypto.subtle.digest('SHA-256', bytes)));
      doc.fileMime = mime;
      fileKey = `${user.id}/doc-${id}`;
      await env.FILES.put(fileKey, await seal(env, {mime, data: b64(bytes)}, `docfile:${user.id}:${id}`), {httpMetadata: {contentType: 'application/octet-stream'}});
    }
    try {
      await env.DB.prepare('INSERT INTO user_documents(id,user_id,status,tax_year,file_key,payload) VALUES(?,?,?,?,?,?)').bind(id, user.id, 'draft', doc.taxYear, fileKey, await seal(env, doc, `doc:${user.id}:${id}`)).run();
    } catch (e) { if (fileKey) await env.FILES.delete(fileKey); throw e; }
    const duplicates = findDuplicates(doc, await getUserDocuments(env, user.id));
    return json({document: doc, duplicates}, 201);
  }
  if (path === '/api/advice' && method === 'GET') {
    const h = await getHousehold(env, user.id);
    if (!h) return json({recommendations: [], realized: null});
    const docs = await getUserDocuments(env, user.id);
    const plan = (await currentPlan(env, user.id)).plan, max = limit(plan, 'recommendations');
    const all = recommendations(h, day, {documents: docs, max: 8});
    // O plano gratuito vê as 3 principais; nada crítico fica bloqueado (saldo negativo é sempre a primeira).
    return json({recommendations: all.slice(0, max), lockedCount: Math.max(0, all.length - max), plan, realized: realizedSavings(h, day.slice(0, 7)), engine: 'rules_v2_no_llm'});
  }
  const m = path.match(/^\/api\/docs\/([a-f0-9-]{36})(\/confirm|\/file|\/paid)?$/);
  if (!m) return null;
  const [, id, action] = m;
  const {row, doc} = await load(env, user.id, id);

  if (action === '/confirm' && method === 'POST') {
    const input = await jsonBody(req, 50_000);
    const fields = documentInput({...doc, ...(input.document || {})}, {today: day});
    const next = {...doc, ...fields, id, fileHash: doc.fileHash, fileMime: doc.fileMime};
    const others = (await getUserDocuments(env, user.id)).filter(o => o.id !== id && o.status === 'confirmed');
    const duplicates = findDuplicates(next, others);
    if (duplicates.some(d => STRONG.includes(d.reason)) && input.acknowledgeDuplicate !== true) return json({error: 'possible_duplicate', duplicates}, 409);
    const link = budgetLink(input.budget);
    next.status = 'confirmed'; next.confirmedAt = doc.confirmedAt || new Date().toISOString(); next.budget = link;
    const h = await linkBudget(env, user.id, next, link);
    await store(env, user.id, next);
    await track(env, user.id, ['qrbill', 'invoice'].includes(next.kind) ? 'bill_registered' : 'document_classified', {kind: next.kind});
    return json({document: next, duplicates, household: h, overview: h ? overview(h, day) : null});
  }
  if (action === '/paid' && method === 'POST') {
    const input = await jsonBody(req);
    if (doc.status !== 'confirmed') fail('confirm_first', 409);
    const next = {...doc, paymentState: input.paid === false ? 'unpaid' : 'paid', paidAt: input.paid === false ? null : (input.paidAt || day)};
    await store(env, user.id, next);
    return json({document: next});
  }
  if (action === '/file' && method === 'GET') {
    if (!row.file_key) fail('not_found', 404);
    const file = await env.FILES.get(row.file_key); if (!file) fail('not_found', 404);
    const data = await open(env, await file.text(), `docfile:${user.id}:${id}`);
    const ext = {'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'}[data.mime];
    return new Response(unb64(data.data), {headers: {'Content-Type': data.mime, 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="document.${ext}"`}});
  }
  if (!action && method === 'DELETE') {
    if (row.file_key) await env.FILES.delete(row.file_key);
    await env.DB.prepare('DELETE FROM user_documents WHERE id=? AND user_id=?').bind(id, user.id).run();
    if (doc.budget?.mode === 'oneoff') await unlinkBudget(env, user.id, id);
    await audit(env, user.id, 'document_delete', {kind: doc.kind});
    return json({deleted: true});
  }
  if (!action && method === 'GET') return json({document: {...doc, id}});
  fail('not_found', 404);
}
