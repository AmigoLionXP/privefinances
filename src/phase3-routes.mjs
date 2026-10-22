// Fase 3: planos/permissões (sem cobrança real), Meu Negócio, simulações, marketplace com consentimento,
// analytics com consentimento, métricas de negócio e administração de parceiros.
import {seal, open} from './crypto.mjs';
import {jsonBody, fail, text, amount, date} from './validation.mjs';
import {PLANS, FEATURES, can, limit, requiredPlan} from '../public/plans.mjs';
import {summary, cashflow, accountantRows, toCsv, BIZ_EXPENSE_CATEGORIES} from '../public/business-engine.mjs';
import {creditSimulation, goalProjection} from '../public/simulators.mjs';
import {NEEDS, REG_CLASSES, LICENCE_REQUIRED, solutionLadder} from '../public/solutions.mjs';
import {audit, track, currentPlan, analyticsConsent, subjectOf, EVENT_NAMES, amountBucket} from './telemetry.mjs';
import {getHousehold, today} from './household-routes.mjs';
import {monthlyBudget} from './budget-engine.mjs';

const json = (v, status = 200) => new Response(JSON.stringify(v), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}});
const id36 = /^[a-f0-9-]{36}$/;
const optDate = v => (v == null || v === '' ? null : date(v));

async function requireFeature(env, user, feature) {
  const p = await currentPlan(env, user.id);
  if (!can(p.plan, feature)) fail('plan_required', 403);
  return p;
}
function isAdmin(env, user) { return (env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(String(user.email).toLowerCase()); }

/* ---------- Meu Negócio: validação ---------- */
export function businessInput(v) {
  if (!v || typeof v !== 'object') fail('invalid_business');
  const inv = Array.isArray(v.invoices) ? v.invoices : [], exp = Array.isArray(v.expenses) ? v.expenses : [];
  if (inv.length > 500 || exp.length > 2000) fail('too_many_rows');
  const ids = new Set(), uniq = x => { const i = text(x, 'row_id', 80); if (ids.has(i)) fail('duplicate_row'); ids.add(i); return i; };
  const s = v.settings || {};
  return {
    version: 1,
    settings: {vatRegistered: s.vatRegistered === true, taxProvisionBps: s.taxProvisionBps == null || s.taxProvisionBps === '' ? null : amount(s.taxProvisionBps, 'tax_rate', 5000)},
    invoices: inv.map(i => {
      const status = ['draft', 'sent', 'paid'].includes(i.status) ? i.status : fail('invalid_status');
      return {id: uniq(i.id), client: text(i.client, 'client', 120), label: typeof i.label === 'string' ? i.label.trim().slice(0, 120) : '', amount: amount(i.amount), issueDate: date(i.issueDate), dueDate: optDate(i.dueDate), status, paidDate: status === 'paid' ? (optDate(i.paidDate) || date(i.issueDate)) : null};
    }),
    expenses: exp.map(e => ({id: uniq(e.id), label: text(e.label, 'label', 120), amount: amount(e.amount), date: date(e.date), category: BIZ_EXPENSE_CATEGORIES.includes(e.category) ? e.category : 'other', receipt: e.receipt === true}))
  };
}
async function getBusiness(env, userId) {
  const row = await env.DB.prepare('SELECT payload FROM businesses WHERE user_id=?').bind(userId).first();
  return row ? open(env, row.payload, `business:${userId}`) : null;
}
export {getBusiness};
const blankBusiness = () => ({version: 1, settings: {vatRegistered: false, taxProvisionBps: null}, invoices: [], expenses: []});

/* ---------- Parceiros: validação ---------- */
export function partnerInput(v) {
  if (!v || typeof v !== 'object') fail('invalid_partner');
  const regClass = REG_CLASSES.includes(v.regClass) ? v.regClass : fail('invalid_reg_class');
  const arr = (x, max, re) => (Array.isArray(x) ? x : []).filter(s => typeof s === 'string' && re.test(s)).slice(0, max);
  const lic = v.licence || {};
  const p = {
    name: text(v.name, 'name', 120), legalId: typeof v.legalId === 'string' ? v.legalId.trim().slice(0, 40) : '', category: text(v.category, 'category', 40),
    regClass, needs: arr(v.needs, 10, /^[a-z_0-9]{1,40}$/).filter(n => NEEDS[n]), regions: arr(v.regions, 26, /^[A-Z]{2}$/), languages: arr(v.languages, 6, /^(pt|fr|en|de|it|es)$/),
    services: arr(v.services, 10, /^.{1,120}$/),
    commercial: {model: ['commission', 'flat_fee', 'none', 'subscription'].includes(v.commercial?.model) ? v.commercial.model : fail('commercial_model_required'), disclosure: text(v.commercial?.disclosure, 'disclosure', 400), commissionBps: v.commercial?.commissionBps == null ? null : amount(v.commercial.commissionBps, 'commission', 10000)},
    pricing: {text: typeof v.pricing?.text === 'string' ? v.pricing.text.trim().slice(0, 200) : '', freeFirstContact: v.pricing?.freeFirstContact === true},
    licence: {required: LICENCE_REQUIRED.has(regClass), authority: typeof lic.authority === 'string' ? lic.authority.trim().slice(0, 80) : '', number: typeof lic.number === 'string' ? lic.number.trim().slice(0, 60) : '', verifiedAt: lic.verifiedAt ? date(lic.verifiedAt) : null},
    quality: {score: Number.isFinite(v.quality?.score) ? Math.max(0, Math.min(5, v.quality.score)) : 0},
    demo: v.demo === true
  };
  if (!p.needs.length) fail('needs_required');
  return p;
}
const publicPartner = (id, status, p) => ({id, status, name: p.name, category: p.category, regClass: p.regClass, needs: p.needs, regions: p.regions, languages: p.languages, services: p.services, commercial: {model: p.commercial.model, disclosure: p.commercial.disclosure}, pricing: p.pricing, licence: {required: p.licence.required, authority: p.licence.authority, number: p.licence.number, verifiedAt: p.licence.verifiedAt}, quality: p.quality, demo: p.demo});
async function partners(env, onlyApproved = true) {
  const rows = await env.DB.prepare(onlyApproved ? "SELECT * FROM partners WHERE status='approved'" : 'SELECT * FROM partners ORDER BY created_at DESC').all();
  return rows.results.map(r => publicPartner(r.id, r.status, JSON.parse(r.payload)));
}

/* ---------- Métricas ---------- */
async function metrics(env, now = new Date()) {
  const day = n => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);
  const d30 = day(30), d90 = day(90);
  const distinct = async (name, since) => (await env.DB.prepare('SELECT COUNT(DISTINCT subject) n FROM analytics_events WHERE name=? AND day>=?').bind(name, since).first()).n;
  const names = [...EVENT_NAMES];
  const problem = {};
  for (const n of ['onboarding_completed', 'budget_created', 'bill_registered', 'document_classified', 'alert_viewed', 'expense_reviewed', 'saving_confirmed', 'goal_reached', 'problem_solved']) problem[n] = await distinct(n, d30);
  const active30 = (await env.DB.prepare('SELECT COUNT(DISTINCT subject) n FROM analytics_events WHERE day>=?').bind(d30).first()).n;
  const northStar = (await env.DB.prepare(`SELECT COUNT(DISTINCT a.subject) n FROM analytics_events a WHERE a.name IN ('saving_confirmed','problem_solved') AND a.day>=? AND EXISTS (SELECT 1 FROM analytics_events b WHERE b.subject=a.subject AND b.day>=?)`).bind(d90, d30).first()).n;
  const users = (await env.DB.prepare('SELECT COUNT(*) n FROM users WHERE deleting=0').first()).n;
  const consented = (await env.DB.prepare("SELECT COUNT(DISTINCT user_id) n FROM consents WHERE purpose='analytics' AND revoked_at IS NULL").first()).n;
  const plans = (await env.DB.prepare('SELECT plan,status,source,COUNT(*) n FROM subscriptions GROUP BY plan,status,source').all()).results;
  const paidActive = (await env.DB.prepare("SELECT COUNT(*) n FROM entitlements WHERE product='subscription' AND status IN ('active','trialing')").first()).n;
  const canceled30 = (await env.DB.prepare("SELECT COUNT(*) n FROM subscriptions WHERE status='canceled' AND canceled_at>=?").bind(d30).first()).n;
  const pilots = plans.filter(p => p.status === 'pilot').reduce((s, p) => s + p.n, 0);
  const referrals = (await env.DB.prepare('SELECT status,COUNT(*) n FROM referrals GROUP BY status').all()).results;
  // MRR só conta assinaturas pagas reais (pilotos não geram receita). Sem cobrança ativada, é 0.
  const mrr = paidActive * PLANS.plus.priceMonthly;
  return {generatedAt: now.toISOString(), coverage: 'consented_users_only', users, analyticsConsented: consented,
    problemSolving: problem, northStar: {definition: 'distinct users with confirmed saving or solved problem in 90 days and active in 30 days', value: northStar},
    monetization: {active30, pilots, paidActive, conversionFreeToPaid: users ? paidActive / users : 0, mrrCents: mrr, arpuCents: active30 ? Math.round(mrr / active30) : 0, churn30: (pilots + paidActive + canceled30) ? canceled30 / (pilots + paidActive + canceled30) : 0, plans, referrals,
      notMeasuredYet: ['revenue_per_partner', 'net_revenue', 'acquisition_cost', 'support_and_ai_cost', 'contribution_margin']},
    events: Object.fromEntries(await Promise.all(names.map(async n => [n, await distinct(n, d30)])))};
}

/* ---------- Rotas ---------- */
export async function phase3Route(req, env, user) {
  const url = new URL(req.url), path = url.pathname, method = req.method, day = today(env);

  if (path === '/api/subscription' && method === 'GET') {
    const p = await currentPlan(env, user.id);
    return json({...p, prices: PLANS, chargesEnabled: env.PAYMENTS_ENABLED === 'true', pricesAreHypotheses: true, features: [...FEATURES[p.plan]], limits: {documents: limit(p.plan, 'documents'), recommendations: limit(p.plan, 'recommendations')}});
  }
  if (path === '/api/subscription' && method === 'POST') {
    const input = await jsonBody(req);
    if (!['plus', 'business'].includes(input.plan)) fail('invalid_plan');
    // Sem autorização de cobrança, o plano só pode ser ativado como piloto gratuito.
    if (env.PAYMENTS_ENABLED === 'true') fail('use_checkout', 409);
    await env.DB.prepare("INSERT INTO subscriptions(user_id,plan,status,source) VALUES(?,?,'pilot','pilot') ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,status='pilot',source='pilot',canceled_at=NULL,updated_at=CURRENT_TIMESTAMP").bind(user.id, input.plan).run();
    await audit(env, user.id, 'plan_change', {plan: input.plan, source: 'pilot'});
    await track(env, user.id, 'plan_selected', {plan: input.plan});
    return json(await currentPlan(env, user.id));
  }
  if (path === '/api/subscription/cancel' && method === 'POST') {
    const s = await env.DB.prepare('SELECT plan,status FROM subscriptions WHERE user_id=?').bind(user.id).first();
    if (!s || !['pilot', 'active'].includes(s.status)) fail('no_active_plan', 409);
    await env.DB.prepare("UPDATE subscriptions SET status='canceled',canceled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(user.id).run();
    await audit(env, user.id, 'plan_cancel', {plan: s.plan});
    await track(env, user.id, 'plan_canceled', {plan: s.plan});
    // Os dados continuam disponíveis para exportação; nada é apagado ao cancelar.
    return json({...await currentPlan(env, user.id), dataKept: true});
  }

  if (path === '/api/business' && method === 'GET') {
    await requireFeature(env, user, 'business_module');
    const b = await getBusiness(env, user.id) || blankBusiness();
    return json({business: b, summary: summary(b, day), cashflow: cashflow(b, day)});
  }
  if (path === '/api/business' && method === 'PUT') {
    await requireFeature(env, user, 'business_module');
    const b = businessInput(await jsonBody(req, 400000));
    await env.DB.prepare('INSERT INTO businesses(user_id,payload) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP').bind(user.id, await seal(env, b, `business:${user.id}`)).run();
    return json({business: b, summary: summary(b, day), cashflow: cashflow(b, day)});
  }
  if (path === '/api/business/accountant.csv' && method === 'GET') {
    await requireFeature(env, user, 'accountant_export');
    const b = await getBusiness(env, user.id) || blankBusiness(), y = Number(url.searchParams.get('year')) || Number(day.slice(0, 4));
    await audit(env, user.id, 'accountant_export', {year: y});
    return new Response(toCsv(accountantRows(b, y)), {headers: {'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="privefinances-contador-${y}.csv"`}});
  }

  if (path === '/api/simulate/credit' && method === 'POST') {
    await requireFeature(env, user, 'simulations_advanced');
    const v = await jsonBody(req);
    const months = amount(v.months, 'months', 120); if (months < 1) fail('invalid_months');
    const h = await getHousehold(env, user.id);
    const available = h ? monthlyBudget(h, day.slice(0, 7)).balance : null;
    const goal = h?.goal?.monthly && v.goalTarget ? goalProjection(amount(v.goalTarget), amount(v.goalSaved ?? 0), Math.max(0, available ?? 0)) : null;
    return json({...creditSimulation({principal: amount(v.principal), rateBps: amount(v.rateBps, 'rate', 5000), months, fees: amount(v.fees ?? 0), kind: v.kind === 'overdraft' ? 'overdraft' : 'cash'}, available), monthlyAvailable: available, goal});
  }

  if (path === '/api/solutions' && method === 'GET') {
    const need = url.searchParams.get('need');
    if (!NEEDS[need]) fail('invalid_need');
    const list = (await partners(env)).filter(p => !p.demo || env.SHOW_DEMO_PARTNERS === 'true');
    return json(solutionLadder(need, list, {region: 'VD', lang: url.searchParams.get('lang') || 'pt'}));
  }
  if (path === '/api/referrals' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT r.id,r.partner_id,r.need,r.status,r.created_at,r.payload,p.payload pp FROM referrals r JOIN partners p ON p.id=r.partner_id WHERE r.user_id=? ORDER BY r.created_at DESC').bind(user.id).all();
    return json({referrals: await Promise.all(rows.results.map(async r => ({id: r.id, partner: JSON.parse(r.pp).name, need: r.need, status: r.status, createdAt: r.created_at, shared: await open(env, r.payload, `referral:${user.id}:${r.id}`)})))});
  }
  if (path === '/api/referrals' && method === 'POST') {
    const v = await jsonBody(req);
    if (v.consent !== true || v.privacyVersion !== env.PRIVACY_VERSION) fail('explicit_current_consent_required');
    if (!id36.test(v.partnerId || '') || !NEEDS[v.need]) fail('invalid_referral');
    const row = await env.DB.prepare("SELECT payload FROM partners WHERE id=? AND status='approved'").bind(v.partnerId).first();
    if (!row) fail('partner_not_available', 404);
    const p = JSON.parse(row.payload);
    if (!p.needs.includes(v.need)) fail('partner_does_not_serve_need');
    // Compartilha só o que o usuário marcou; o resumo é texto livre limitado, sem documentos.
    const shared = {need: v.need, ...(v.share?.name ? {name: text(v.share.name, 'name', 120)} : {}), ...(v.share?.email ? {email: user.email} : {}), ...(v.share?.summary ? {summary: text(v.share.summary, 'summary', 500)} : {})};
    const id = crypto.randomUUID(), consent = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO consents(id,user_id,purpose,vertical,version) VALUES(?,?,?,?,?)').bind(consent, user.id, 'partner_referral', v.partnerId, env.PRIVACY_VERSION),
      env.DB.prepare('INSERT INTO referrals(id,user_id,partner_id,consent_id,need,status,payload) VALUES(?,?,?,?,?,?,?)').bind(id, user.id, v.partnerId, consent, v.need, 'pending', await seal(env, shared, `referral:${user.id}:${id}`))
    ]);
    await audit(env, user.id, 'referral_create', {need: v.need});
    await track(env, user.id, 'referral_created', {need: v.need});
    return json({id, status: 'pending', deliveryConfigured: false, commercialDisclosure: p.commercial.disclosure}, 201);
  }
  const rm = path.match(/^\/api\/referrals\/([a-f0-9-]{36})$/);
  if (rm && method === 'DELETE') {
    const r = await env.DB.prepare('SELECT consent_id FROM referrals WHERE id=? AND user_id=?').bind(rm[1], user.id).first();
    if (!r) fail('not_found', 404);
    await env.DB.batch([
      env.DB.prepare("UPDATE referrals SET status='cancelled' WHERE id=? AND user_id=?").bind(rm[1], user.id),
      env.DB.prepare('UPDATE consents SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').bind(r.consent_id, user.id)
    ]);
    await audit(env, user.id, 'referral_revoke', {});
    return json({cancelled: true, previousDeliveryCannotBeRecalled: true});
  }

  if (path === '/api/consents/analytics' && method === 'POST') {
    const v = await jsonBody(req);
    if (v.granted === true) {
      if (v.privacyVersion !== env.PRIVACY_VERSION) fail('explicit_current_consent_required');
      if (!await analyticsConsent(env, user.id)) await env.DB.prepare('INSERT INTO consents(id,user_id,purpose,vertical,version) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), user.id, 'analytics', 'none', env.PRIVACY_VERSION).run();
    } else {
      await env.DB.prepare("UPDATE consents SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND purpose='analytics' AND revoked_at IS NULL").bind(user.id).run();
      // Retirar o consentimento apaga os eventos já registrados desse usuário.
      await env.DB.prepare('DELETE FROM analytics_events WHERE subject=?').bind(await subjectOf(env, user.id)).run();
    }
    await audit(env, user.id, 'consent_change', {purpose: 'analytics', granted: v.granted === true});
    return json({analytics: v.granted === true});
  }
  if (path === '/api/events' && method === 'POST') {
    const v = await jsonBody(req, 4000);
    if (typeof v.name !== 'string' || !EVENT_NAMES.has(v.name)) fail('invalid_event');
    const stored = await track(env, user.id, v.name, v.props || {});
    return json({stored});
  }

  if (path.startsWith('/api/admin/')) {
    if (!isAdmin(env, user)) fail('forbidden', 403);
    if (path === '/api/admin/metrics' && method === 'GET') return json(await metrics(env));
    if (path === '/api/admin/partners' && method === 'GET') return json({partners: await partners(env, false)});
    if (path === '/api/admin/partners' && method === 'POST') {
      const p = partnerInput(await jsonBody(req, 20000)), pid = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO partners(id,status,payload) VALUES(?,'draft',?)").bind(pid, JSON.stringify(p)).run();
      await audit(env, user.id, 'partner_create', {regClass: p.regClass});
      return json({id: pid, status: 'draft'}, 201);
    }
    const pm = path.match(/^\/api\/admin\/partners\/([a-f0-9-]{36})\/status$/);
    if (pm && method === 'POST') {
      const v = await jsonBody(req), row = await env.DB.prepare('SELECT payload FROM partners WHERE id=?').bind(pm[1]).first();
      if (!row) fail('not_found', 404);
      if (!['draft', 'approved', 'suspended'].includes(v.status)) fail('invalid_status');
      const p = JSON.parse(row.payload);
      // Atividade regulada só é aprovada com habilitação verificada (FINMA, autorização cantonal LCC etc.).
      if (v.status === 'approved' && p.licence.required && (!p.licence.verifiedAt || !p.licence.authority || !p.licence.number)) fail('licence_verification_required', 409);
      if (v.status === 'approved' && !p.commercial.disclosure) fail('commercial_disclosure_required', 409);
      await env.DB.prepare('UPDATE partners SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.status, pm[1]).run();
      await audit(env, user.id, 'partner_status', {status: v.status});
      return json({id: pm[1], status: v.status});
    }
    fail('not_found', 404);
  }
  return null;
}
export {requiredPlan, amountBucket};
