// Motor de orçamento v2. Funções puras, centavos inteiros, sem I/O.
// Duas visões que nunca se somam:
//  - orçamento mensal (equivalente mensal: provisões incluídas);
//  - projeção de caixa (eventos datados: cada pagamento no dia em que acontece).
// Compartilhado entre o servidor (src/) e o PWA (public/). Sem dependências.
const fail = code => { const e = new Error(code); e.status = 400; throw e; };

export const FREQUENCIES = {monthly: 1, quarterly: 3, semiannual: 6, annual: 12, oneoff: 0};
export const INCOME_TYPES = ['salary', 'extra', 'allowance', 'benefit', 'family'];
export const EXPENSE_CATEGORIES = ['housing', 'lamal', 'food', 'transport', 'telecom', 'energy', 'insurance', 'credit', 'leasing', 'tax', 'education', 'childcare', 'remittance', 'leisure', 'other'];
export const ESSENTIAL = new Set(['housing', 'lamal', 'food', 'transport', 'energy', 'insurance', 'credit', 'leasing', 'tax', 'childcare']);

const DAY = 86400000;
const isoDay = d => new Date(d).toISOString().slice(0, 10);
const utc = s => Date.parse(s + 'T00:00:00Z');
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Valor mensal equivalente de uma linha (provisão para itens não mensais). */
export function monthlyEquivalent(row, month) {
  const f = FREQUENCIES[row.frequency];
  if (f === undefined) fail('invalid_frequency');
  if (f === 0) return row.month === month ? row.amount : 0;
  return Math.round(row.amount / f);
}

/** Meses (1-12) em que uma linha não mensal é paga, a partir do mês de referência anchorMonth. */
function payMonths(row) {
  const f = FREQUENCIES[row.frequency];
  if (f === 1) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (f === 0) return [];
  const a = row.anchorMonth || 1, out = [];
  for (let m = a; out.length < 12 / f; m += f) out.push(((m - 1) % 12) + 1);
  return out.sort((x, y) => x - y);
}

/** Eventos de caixa datados entre from (inclusive) e to (exclusive), ISO yyyy-mm-dd. */
export function occurrences(row, from, to, sign) {
  const events = [], start = utc(from), end = utc(to);
  const push = (y, m, amount, label) => {
    const d = Math.min(row.day || 1, daysInMonth(y, m));
    const t = Date.UTC(y, m - 1, d);
    if (t >= start && t < end) events.push({date: isoDay(t), amount: sign * amount, id: row.id, label, kind: sign > 0 ? 'income' : 'expense', status: row.status || 'estimated'});
  };
  if (row.frequency === 'oneoff') {
    if (/^\d{4}-\d{2}$/.test(row.month || '')) push(+row.month.slice(0, 4), +row.month.slice(5, 7), row.amount, row.label);
    return events;
  }
  const months = payMonths(row);
  for (let t = Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth(), 1); t < end; t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1)) {
    const y = new Date(t).getUTCFullYear(), m = new Date(t).getUTCMonth() + 1;
    if (months.includes(m)) push(y, m, row.amount, row.label);
    if (row.type === 'salary' && row.thirteenth && m === (row.thirteenthMonth || 12)) push(y, m, row.amount, (row.label || '') + ' · 13º');
  }
  return events;
}

/** Orçamento mensal: confirmados × estimados, essenciais × flexíveis, provisões separadas. */
export function monthlyBudget(h, month) {
  const inc = h.incomes.map(r => {
    let v = monthlyEquivalent(r, month);
    if (r.type === 'salary' && r.thirteenth) v += Math.round(r.amount / 12); // 13º diluído como provisão de renda
    return {r, v};
  });
  const exp = h.expenses.map(r => ({r, v: monthlyEquivalent(r, month)}));
  const sum = (arr, f = () => true) => arr.filter(x => f(x.r)).reduce((s, x) => s + x.v, 0);
  const income = sum(inc), expenses = sum(exp);
  return {
    month, income, expenses, balance: income - expenses,
    incomeConfirmed: sum(inc, r => r.status === 'confirmed'),
    incomeEstimated: sum(inc, r => r.status !== 'confirmed'),
    essential: sum(exp, r => r.essential ?? ESSENTIAL.has(r.category)),
    flexible: sum(exp, r => !(r.essential ?? ESSENTIAL.has(r.category))),
    provisions: sum(exp, r => r.frequency !== 'monthly' && r.frequency !== 'oneoff'),
    byCategory: Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, sum(exp, r => r.category === c)]).filter(([, v]) => v > 0))
  };
}

/** Projeção de caixa diária. O saldo inicial confirmado é o ponto de partida; sem ele, parte de 0 e marca como estimado. */
export function projection(h, today, days = 30) {
  const from = today, to = isoDay(utc(today) + days * DAY);
  const events = [
    ...h.incomes.flatMap(r => occurrences(r, from, to, +1)),
    ...h.expenses.flatMap(r => occurrences(r, from, to, -1))
  ].sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
  const opening = h.openingBalance?.amount ?? 0;
  let bal = opening, min = opening, minDate = today;
  const daily = [];
  for (let t = utc(from); t < utc(to); t += DAY) {
    const d = isoDay(t);
    for (const e of events) if (e.date === d) bal += e.amount;
    daily.push({date: d, balance: bal});
    if (bal < min) { min = bal; minDate = d; }
  }
  return {
    from, to, opening, openingConfirmed: !!h.openingBalance?.confirmed, events, daily,
    closing: bal, minBalance: min, minDate, negative: min < 0,
    incoming: events.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    outgoing: -events.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0),
    nextIncome: events.find(e => e.amount > 0) || null,
    nextPayments: events.filter(e => e.amount < 0).slice(0, 5)
  };
}

/** Diagnóstico: riscos e despesas relevantes. Só fatos derivados dos dados do usuário. */
export function diagnosis(h, today) {
  const month = today.slice(0, 7), b = monthlyBudget(h, month), p = projection(h, today, 30), risks = [];
  if (b.balance < 0) risks.push({id: 'monthly_deficit', severity: 'critical', value: b.balance});
  if (p.negative) risks.push({id: 'negative_balance_30d', severity: 'critical', value: p.minBalance, date: p.minDate});
  else if (b.income > 0 && p.minBalance < Math.round(b.income * 0.1)) risks.push({id: 'low_buffer_30d', severity: 'warning', value: p.minBalance, date: p.minDate});
  const housing = b.byCategory.housing || 0;
  if (b.income > 0 && housing > b.income / 3) risks.push({id: 'housing_over_third', severity: 'warning', value: housing, share: Math.round(housing / b.income * 100)});
  if (b.income > 0 && b.incomeEstimated > b.income / 2) risks.push({id: 'income_mostly_estimated', severity: 'info', value: b.incomeEstimated});
  const top = Object.entries(b.byCategory).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([category, monthly]) => ({category, monthly, share: b.expenses ? Math.round(monthly / b.expenses * 100) : 0}));
  return {budget: b, projection: p, risks, topExpenses: top};
}

/** Meta de economia ajustada à capacidade estimada. Nunca promete o valor; só compara. */
export function goalCheck(h, month) {
  const b = monthlyBudget(h, month), goal = h.goal?.monthly || 0, capacity = Math.max(0, b.balance);
  return {goal, capacity, feasible: goal > 0 && goal <= capacity, suggested: goal > capacity ? capacity : goal, gap: Math.max(0, goal - capacity)};
}

/**
 * Até 3 recomendações priorizadas. Cada uma: problema, valor atual, alternativa (só se o usuário informou),
 * economia potencial (null quando desconhecida), condições, fonte, próxima ação, estado.
 * Nada aqui inventa preços: comparações usam apenas valores digitados pelo usuário.
 */
const SOURCES = {
  lamal: 'https://www.priminfo.admin.ch/fr',
  subsidy: 'https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie',
  housing: 'https://www.bwo.admin.ch/fr/taux-de-reference',
  budget: 'https://www.budgetberatung.ch'
};
const normName = s => String(s || '').normalize('NFKC').toLocaleLowerCase('fr').replace(/[.,;:'"’]/g, ' ').replace(/\b(sa|ag|sàrl|sarl|gmbh|ltd)\b/g, ' ').replace(/\s+/g, ' ').trim();

/** Economias realizadas: só linhas em que o usuário confirmou o novo valor (previousAmount > amount). */
export function realizedSavings(h, month) {
  const rows = h.expenses.filter(r => r.previousAmount != null && r.previousAmount > r.amount);
  const items = rows.map(r => ({id: r.id, label: r.label, category: r.category, before: monthlyEquivalent({...r, amount: r.previousAmount}, month), after: monthlyEquivalent(r, month)}))
    .map(x => ({...x, monthly: x.before - x.after}));
  return {monthly: items.reduce((s, x) => s + x.monthly, 0), yearly: items.reduce((s, x) => s + x.monthly, 0) * 12, items};
}

/**
 * Budget AI (motor de regras, determinístico — não usa modelo de linguagem).
 * Cada recomendação traz: problema, valor atual, alternativa, economia potencial, condições, fonte,
 * próxima ação e estado. Nada inventa preços: alternativas e economias vêm só do que o usuário
 * digitou ou de documentos que ele confirmou.
 * ctx.documents: documentos confirmados (faturas) para detectar aumentos e contas recorrentes.
 */
export function recommendations(h, today, ctx = {}) {
  const month = today.slice(0, 7), d = diagnosis(h, today), b = d.budget, out = [];
  const add = (id, impact, ease, data) => out.push({id, impact: Math.round(impact), ease, state: (h.recommendationStates || {})[id] || 'suggested', alternative: null, potentialMonthly: null, conditions: null, source: null, ...data});
  for (const r of h.expenses) {
    if (r.targetAmount != null && r.targetAmount < r.amount) {
      const saving = monthlyEquivalent({...r, amount: r.amount - r.targetAmount}, month);
      add('compare_' + r.id, saving, 2, {problem: 'user_found_cheaper_option', category: r.category, label: r.label, rowId: r.id, current: monthlyEquivalent(r, month), alternative: monthlyEquivalent({...r, amount: r.targetAmount}, month), potentialMonthly: saving, conditions: r.category === 'lamal' || r.category === 'insurance' ? 'compare_coverage_and_deadlines' : 'check_contract_terms', source: r.category === 'lamal' ? SOURCES.lamal : null, nextAction: 'review_contract'});
    }
  }
  if (b.byCategory.lamal) add('lamal_review', b.byCategory.lamal * 0.1, 3, {problem: 'lamal_premium_can_be_compared', category: 'lamal', current: b.byCategory.lamal, conditions: 'change_by_30_11_letter_must_arrive', source: SOURCES.lamal, nextAction: 'compare_on_priminfo'});
  // Sem limiar de renda inventado: só lembramos que o subsídio existe e apontamos os critérios oficiais.
  if (b.byCategory.lamal) add('lamal_subsidy', b.byCategory.lamal * 0.05, 2, {problem: 'subsidy_may_apply', category: 'lamal', current: b.byCategory.lamal, conditions: 'official_income_criteria_no_guarantee', source: SOURCES.subsidy, nextAction: 'check_subsidy_conditions'});
  if (b.byCategory.insurance) add('insurance_review', b.byCategory.insurance * 0.05, 3, {problem: 'insurance_can_be_reviewed', category: 'insurance', current: b.byCategory.insurance, conditions: 'check_notice_period_and_coverage', nextAction: 'list_policies_and_notice_dates'});
  if ((b.byCategory.housing || 0) > b.income / 3 && b.income > 0) add('rent_reference_rate', (b.byCategory.housing || 0) * 0.03, 3, {problem: 'housing_over_third', category: 'housing', current: b.byCategory.housing, conditions: 'depends_on_rate_in_lease', source: SOURCES.housing, nextAction: 'check_reference_rate_in_lease'});
  if (d.projection.negative) add('negative_balance', Math.abs(d.projection.minBalance) * 2, 1, {problem: 'negative_balance_30d', current: d.projection.minBalance, date: d.projection.minDate, source: SOURCES.budget, nextAction: 'move_flexible_expenses_or_contact_budget_service'});
  const flexCats = Object.entries(b.byCategory).filter(([c, v]) => !ESSENTIAL.has(c) && v > 0).sort((x, y) => y[1] - x[1]);
  if (flexCats[0]) add('review_flexible_' + flexCats[0][0], flexCats[0][1] * 0.15, 1, {problem: 'largest_flexible_expense', category: flexCats[0][0], current: flexCats[0][1], nextAction: 'review_subscriptions_and_habits'});
  const subs = (b.byCategory.telecom || 0) + (b.byCategory.leisure || 0);
  if (subs > 0 && flexCats[0]?.[0] !== 'leisure' && flexCats[0]?.[0] !== 'telecom') add('review_subscriptions', subs * 0.1, 1, {problem: 'subscriptions_add_up', category: 'telecom', current: subs, nextAction: 'list_and_cancel_unused_subscriptions'});
  // Meta: mostra o que impede atingir a meta, sem prometer.
  const g = goalCheck(h, month);
  if (g.goal && g.gap > 0) {
    const blockers = []; let sum = 0;
    for (const [c, v] of flexCats) { if (sum >= g.gap) break; blockers.push(c); sum += v; }
    add('goal_blocked', g.gap, 2, {problem: 'goal_above_capacity', current: g.capacity, alternative: g.suggested, blockers, conditions: 'adjust_goal_or_reduce_flexible', nextAction: 'adjust_goal_or_reduce_flexible'});
  }
  // Documentos confirmados: aumentos de custo e contas recorrentes fora do orçamento.
  const bills = (ctx.documents || []).filter(x => x.status === 'confirmed' && x.amount && x.currency === 'CHF' && ['qrbill', 'invoice'].includes(x.kind));
  const byCreditor = new Map();
  for (const x of bills) { const k = normName(x.creditor); if (!k) continue; (byCreditor.get(k) || byCreditor.set(k, []).get(k)).push(x); }
  const inBudget = new Set(h.expenses.map(e => normName(e.provider || e.label)));
  for (const [k, list] of byCreditor) {
    const sorted = list.slice().sort((x, y) => String(x.dueDate || x.documentDate || x.confirmedAt).localeCompare(String(y.dueDate || y.documentDate || y.confirmedAt)));
    const last = sorted.at(-1), prev = sorted.at(-2);
    if (prev && last.amount > prev.amount * 1.05) add('increase_' + k.replace(/[^a-z0-9]+/g, '_').slice(0, 40), last.amount - prev.amount, 2, {problem: 'cost_increased', label: last.creditor, current: last.amount, alternative: prev.amount, conditions: 'compare_bills_check_reason', nextAction: 'ask_creditor_or_compare'});
    const linked = list.some(x => x.budget?.mode === 'existing');
    if (list.length >= 2 && !linked && !inBudget.has(k)) add('recurring_' + k.replace(/[^a-z0-9]+/g, '_').slice(0, 40), last.amount, 1, {problem: 'recurring_not_in_budget', label: last.creditor, current: last.amount, conditions: null, nextAction: 'add_as_recurring_expense'});
  }
  const max = ctx.max ?? 3;
  return out.filter(r => r.state !== 'discarded').sort((x, y) => (y.impact / y.ease) - (x.impact / x.ease)).slice(0, max).map((r, i) => ({...r, priority: i + 1}));
}
