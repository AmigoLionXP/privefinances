// Agregado familiar + onboarding: validação estrita do documento cifrado por usuário.
import {fail, text, amount} from './validation.mjs';
import {FREQUENCIES, INCOME_TYPES, EXPENSE_CATEGORIES} from './budget-engine.mjs';

export const ONBOARDING_STEPS = ['welcome', 'profile', 'income', 'family', 'expenses', 'diagnosis', 'plan'];
const WORK = ['employee', 'independent', 'both', 'unemployed', 'retired'];
const PERMITS = ['L', 'B', 'C', 'CH', 'other', null];
const LANGS = ['pt', 'fr', 'en'];
const month = v => { if (v != null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) fail('invalid_month'); return v ?? null; };
const opt = (v, list, name) => { if (v == null) return null; if (!list.includes(v)) fail('invalid_' + name); return v; };
const int = (v, min, max, name) => { if (v == null) return null; if (!Number.isInteger(v) || v < min || v > max) fail('invalid_' + name); return v; };
const bool = v => v === true;

function row(r, kind, ids) {
  if (!r || typeof r !== 'object') fail('invalid_row');
  const id = text(r.id, 'row_id', 80);
  if (ids.has(id)) fail('duplicate_row');
  ids.add(id);
  if (!(r.frequency in FREQUENCIES)) fail('invalid_frequency');
  const base = {
    id, label: text(r.label, 'label', 120), amount: amount(r.amount), frequency: r.frequency,
    day: int(r.day ?? 1, 1, 31, 'day'),
    anchorMonth: r.frequency === 'monthly' || r.frequency === 'oneoff' ? null : int(r.anchorMonth ?? 1, 1, 12, 'anchor_month'),
    month: r.frequency === 'oneoff' ? (month(r.month) ?? fail('invalid_month')) : null,
    status: r.status === 'confirmed' ? 'confirmed' : 'estimated'
  };
  if (kind === 'income') {
    const type = opt(r.type ?? 'extra', INCOME_TYPES, 'income_type');
    return {...base, type, variable: bool(r.variable), thirteenth: type === 'salary' && bool(r.thirteenth), thirteenthMonth: type === 'salary' && r.thirteenth ? int(r.thirteenthMonth ?? 12, 1, 12, 'thirteenth_month') : null};
  }
  const category = opt(r.category, EXPENSE_CATEGORIES, 'expense_category');
  // O salário informado é líquido: o imposto na fonte já foi descontado. Recusar para não contar duas vezes.
  if (/imp[oô]t\s*à\s*la\s*source|imposto\s*na\s*fonte|quellensteuer/i.test(base.label) && category === 'tax') fail('source_tax_already_deducted');
  return {
    ...base, category,
    essential: r.essential == null ? null : bool(r.essential),
    shared: bool(r.shared),
    provider: typeof r.provider === 'string' ? r.provider.trim().slice(0, 120) : '',
    targetAmount: r.targetAmount == null ? null : amount(r.targetAmount),
    // Valor anterior, gravado só quando o usuário confirma um novo valor (economia realizada).
    previousAmount: r.previousAmount == null ? null : amount(r.previousAmount)
  };
}

export function household(v) {
  if (!v || typeof v !== 'object') fail('invalid_household');
  const incomes = Array.isArray(v.incomes) ? v.incomes : [], expenses = Array.isArray(v.expenses) ? v.expenses : [];
  if (incomes.length > 30 || expenses.length > 120) fail('too_many_rows');
  const ids = new Set();
  const p = v.profile || {};
  const f = v.family || {};
  const states = {};
  for (const [k, s] of Object.entries(v.recommendationStates || {})) {
    if (!/^[a-z0-9_]{1,80}$/i.test(k) || !['suggested', 'in_review', 'done', 'discarded'].includes(s)) fail('invalid_recommendation_state');
    states[k] = s;
  }
  return {
    version: 2,
    lang: opt(v.lang ?? 'pt', LANGS, 'lang'),
    onboarding: {
      step: opt(v.onboarding?.step ?? 'welcome', ONBOARDING_STEPS, 'step'),
      completed: bool(v.onboarding?.completed)
    },
    profile: {
      canton: 'VD',
      commune: typeof p.commune === 'string' ? p.commune.trim().slice(0, 80) : '',
      work: opt(p.work, WORK, 'work'),
      permit: opt(p.permit ?? null, PERMITS, 'permit'),
      sourceTax: opt(p.sourceTax ?? null, ['yes', 'no', 'unknown', null], 'source_tax')
    },
    family: {adults: int(f.adults ?? 1, 1, 6, 'adults'), dependents: int(f.dependents ?? 0, 0, 12, 'dependents'), otherContributions: amount(f.otherContributions ?? 0)},
    openingBalance: v.openingBalance ? {amount: Number.isSafeInteger(v.openingBalance.amount) && Math.abs(v.openingBalance.amount) <= 1e10 ? v.openingBalance.amount : fail('invalid_opening_balance'), confirmed: bool(v.openingBalance.confirmed), date: typeof v.openingBalance.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.openingBalance.date) ? v.openingBalance.date : null} : null,
    incomes: incomes.map(r => row(r, 'income', ids)),
    expenses: expenses.map(r => row(r, 'expense', ids)),
    goal: v.goal ? {monthly: amount(v.goal.monthly ?? 0), label: typeof v.goal.label === 'string' ? v.goal.label.trim().slice(0, 80) : ''} : null,
    recommendationStates: states
  };
}

/** Resumo de mudança para o histórico: só contagens e totais, nunca o conteúdo completo. */
export function changeSummary(prev, next) {
  const tot = h => h ? {incomes: h.incomes.length, expenses: h.expenses.length, step: h.onboarding.step, goal: h.goal?.monthly ?? 0} : null;
  return {before: tot(prev), after: tot(next)};
}
