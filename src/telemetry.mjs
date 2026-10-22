// Plano atual, auditoria e analytics com consentimento.
// Analytics: só com consentimento ativo; sujeito pseudônimo (hash com segredo do servidor); propriedades em lista branca.
// Auditoria: ações sensíveis, sem conteúdo pessoal, guardadas 24 meses.
import {sha256} from './crypto.mjs';
import {PLANS} from '../public/plans.mjs';

export const EVENT_NAMES = new Set(['app_open', 'onboarding_completed', 'budget_created', 'bill_registered', 'document_classified', 'alert_viewed', 'expense_reviewed', 'saving_confirmed', 'goal_reached', 'problem_solved', 'paywall_view', 'plan_selected', 'plan_canceled', 'referral_created', 'experiment_exposure', 'guide_question']);
const PROP_KEYS = {experiment: /^[a-z_]{1,40}$/, variant: /^[a-z_]{1,40}$/, plan: /^(essential|plus|business)$/, amountBucket: /^(0-50|50-200|200\+)$/, kind: /^[a-z_]{1,20}$/, need: /^[a-z_0-9]{1,40}$/, topic: /^[a-z_]{1,20}$/, feature: /^[a-z_0-9]{1,40}$/};
export const amountBucket = cents => cents < 5000 ? '0-50' : cents < 20000 ? '50-200' : '200+';

export async function subjectOf(env, userId) { return sha256('subject:' + (env.DATA_KEYS || '') + ':' + userId); }

export async function audit(env, userId, action, meta = {}) {
  const safe = Object.fromEntries(Object.entries(meta).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 80) : v]));
  await env.DB.prepare('INSERT INTO audit_events(id,subject,action,meta) VALUES(?,?,?,?)').bind(crypto.randomUUID(), await subjectOf(env, userId), action, JSON.stringify(safe)).run();
}

export async function analyticsConsent(env, userId) {
  return !!await env.DB.prepare("SELECT id FROM consents WHERE user_id=? AND purpose='analytics' AND revoked_at IS NULL").bind(userId).first();
}
export function cleanProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) if (PROP_KEYS[k] && typeof v === 'string' && PROP_KEYS[k].test(v)) out[k] = v;
  return out;
}
/** Registra um evento só se o usuário consentiu. Devolve true se gravou. */
export async function track(env, userId, name, props = {}, now = new Date()) {
  if (!EVENT_NAMES.has(name) || !await analyticsConsent(env, userId)) return false;
  await env.DB.prepare('INSERT INTO analytics_events(id,subject,name,props,day) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), await subjectOf(env, userId), name, JSON.stringify(cleanProps(props)), now.toISOString().slice(0, 10)).run();
  return true;
}

/** Plano efetivo: assinatura piloto/ativa → plano; assinatura paga do provedor → plus; senão gratuito. */
export async function currentPlan(env, userId) {
  const s = await env.DB.prepare('SELECT plan,status,source,canceled_at FROM subscriptions WHERE user_id=?').bind(userId).first();
  if (s && ['pilot', 'active'].includes(s.status) && PLANS[s.plan]) return {plan: s.plan, status: s.status, source: s.source, canceledAt: null};
  const paid = await env.DB.prepare("SELECT status FROM entitlements WHERE user_id=? AND product='subscription' AND status IN ('active','trialing')").bind(userId).first();
  if (paid) return {plan: 'plus', status: 'active', source: 'stripe', canceledAt: null};
  return {plan: 'essential', status: s?.status === 'canceled' ? 'canceled' : 'free', source: s?.source || null, canceledAt: s?.canceled_at || null};
}
