// Meu Negócio — motor do trabalhador independente (valores em centavos inteiros).
// Fontes: OFAS/AVS mémento 2.02 (indépendants, état 01.01.2026); LTVA art. 10 (limite de CHF 100 000).
// Provisões são ESTIMATIVAS prudentes; a contribuição real é fixada pela caisse de compensation.
export const BIZ_SOURCES = {
  avs: {title: 'AVS/AI — Mémento 2.02, Cotisations des indépendants (état 01.01.2026)', url: 'https://ahv-iv.ch/p/2.02.f', checkedAt: '2026-10-22'},
  vat: {title: 'LTVA art. 10 — Assujettissement (CHF 100 000)', url: 'https://www.fedlex.admin.ch/eli/cc/2009/615/fr#art_10', checkedAt: '2026-10-21'}
};
export const AVS_INDEPENDENT_2026 = {maxRateBps: 1000, fullRateFrom: 6050000, scaleFrom: 1010000, minContribution: 53000, lowestScaleRateBps: 537};
export const VAT_THRESHOLD = 10000000;
export const BIZ_EXPENSE_CATEGORIES = ['material', 'rent', 'vehicle', 'phone', 'insurance', 'training', 'software', 'other'];

const year = d => Number(d.slice(0, 4));
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dayOfYear = d => Math.floor((new Date(d + 'T12:00:00Z') - new Date(d.slice(0, 4) + '-01-01T12:00:00Z')) / 86400000) + 1;

/** Contribuição AVS/AI/APG prudente: mínimo legal abaixo da escala, taxa cheia (10 %) acima — a escala reduzida pode dar menos. */
export function avsEstimate(annualProfit) {
  const a = AVS_INDEPENDENT_2026;
  if (annualProfit <= 0) return {amount: 0, method: 'no_profit'};
  if (annualProfit < a.scaleFrom) return {amount: a.minContribution, method: 'minimum_contribution'};
  const full = Math.round(annualProfit * a.maxRateBps / 10000);
  return {amount: full, method: annualProfit >= a.fullRateFrom ? 'full_rate' : 'upper_bound_reduced_scale_may_apply'};
}

export function summary(b, today) {
  const y = year(today), inYear = d => d && year(d) === y;
  const issued = b.invoices.filter(i => i.status !== 'draft' && inYear(i.issueDate));
  const invoiced = issued.reduce((s, i) => s + i.amount, 0);
  const paid = b.invoices.filter(i => i.status === 'paid' && inYear(i.paidDate || i.issueDate)).reduce((s, i) => s + i.amount, 0);
  const open = b.invoices.filter(i => i.status === 'sent');
  const outstanding = open.reduce((s, i) => s + i.amount, 0);
  const overdue = open.filter(i => i.dueDate && i.dueDate < today).map(i => ({id: i.id, client: i.client, amount: i.amount, dueDate: i.dueDate, days: Math.round((new Date(today) - new Date(i.dueDate)) / 86400000)}));
  const expenses = b.expenses.filter(e => inYear(e.date)).reduce((s, e) => s + e.amount, 0);
  const profit = paid - expenses;
  const factor = 365 / Math.max(30, dayOfYear(today)); // projeção linear, mínimo de 30 dias para não exagerar em janeiro
  const projectedProfit = Math.round(profit * factor), projectedTurnover = Math.round(invoiced * factor);
  const avs = avsEstimate(projectedProfit);
  const tax = b.settings.taxProvisionBps == null ? null : Math.round(Math.max(0, projectedProfit) * b.settings.taxProvisionBps / 10000);
  const vat = b.settings.vatRegistered ? 'registered' : projectedTurnover >= VAT_THRESHOLD ? 'above_threshold' : projectedTurnover >= VAT_THRESHOLD * 0.8 ? 'approaching' : 'below';
  return {year: y, invoiced, paid, outstanding, overdue, expenses, profit, projectedProfit, projectedTurnover,
    provisions: {avs: avs.amount, avsMethod: avs.method, tax, monthly: Math.round(((avs.amount || 0) + (tax || 0)) / 12), taxRateMissing: tax == null},
    vat, sources: BIZ_SOURCES, estimate: true};
}

/** Fluxo de caixa de 90 dias por semana: recebíveis pelas datas de vencimento, provisões mensais como saída. */
export function cashflow(b, today, days = 90, opening = 0) {
  const s = summary(b, today), end = addDays(today, days), weeks = [];
  for (let i = 0; i < Math.ceil(days / 7); i++) weeks.push({from: addDays(today, i * 7), in: 0, out: 0});
  const slot = d => Math.min(weeks.length - 1, Math.max(0, Math.floor((new Date(d + 'T12:00:00Z') - new Date(today + 'T12:00:00Z')) / (7 * 86400000))));
  for (const i of b.invoices) if (i.status === 'sent') { const d = !i.dueDate || i.dueDate < today ? today : i.dueDate; if (d <= end) weeks[slot(d)].in += i.amount; }
  for (let m = 0; m < 4; m++) { const d = addDays(today.slice(0, 8) + '28', 30 * m).slice(0, 8) + '28'; if (d >= today && d <= end) weeks[slot(d)].out += s.provisions.monthly; }
  let bal = opening; const out = weeks.map(w => ({...w, balance: (bal += w.in - w.out)}));
  return {opening, weeks: out, lowest: Math.min(opening, ...out.map(w => w.balance)), receivables: out.reduce((a, w) => a + w.in, 0)};
}

/** Pacote para o contador: linhas CSV (receitas e despesas do ano). */
export function accountantRows(b, y) {
  const rows = [['type', 'date', 'party_or_label', 'category', 'amount_chf', 'status', 'due_date', 'paid_date']];
  for (const i of b.invoices.filter(i => i.status !== 'draft' && year(i.issueDate) === y)) rows.push(['income', i.issueDate, i.client, 'invoice', (i.amount / 100).toFixed(2), i.status, i.dueDate || '', i.paidDate || '']);
  for (const e of b.expenses.filter(e => year(e.date) === y)) rows.push(['expense', e.date, e.label, e.category, (e.amount / 100).toFixed(2), e.receipt ? 'receipt_kept' : 'no_receipt', '', '']);
  return rows;
}
export const toCsv = rows => '﻿' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
