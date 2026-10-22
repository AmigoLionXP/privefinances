import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {environment} from './fixtures.mjs';
import {household} from '../src/household.mjs';
import {monthlyEquivalent, occurrences, monthlyBudget, projection, diagnosis, goalCheck, recommendations} from '../src/budget-engine.mjs';

const base = () => household({
  lang: 'pt', onboarding: {step: 'plan', completed: true},
  profile: {commune: 'Renens', work: 'employee', permit: 'B', sourceTax: 'yes'},
  family: {adults: 1, dependents: 1},
  openingBalance: {amount: 80000, confirmed: true, date: '2026-10-22'},
  incomes: [{id: 'sal', label: 'Salário', type: 'salary', amount: 500000, frequency: 'monthly', day: 25, status: 'confirmed', thirteenth: true}],
  expenses: [
    {id: 'rent', label: 'Aluguel', category: 'housing', amount: 180000, frequency: 'monthly', day: 1},
    {id: 'lamal', label: 'LAMal', category: 'lamal', amount: 42000, frequency: 'monthly', day: 1},
    {id: 'rc', label: 'RC', category: 'insurance', amount: 24000, frequency: 'annual', anchorMonth: 11, day: 5},
    {id: 'tax', label: 'Acomptes ICC', category: 'tax', amount: 60000, frequency: 'quarterly', anchorMonth: 2, day: 28},
    {id: 'phone', label: 'Telefone', category: 'telecom', amount: 6000, frequency: 'monthly', day: 15, targetAmount: 3000},
    {id: 'fun', label: 'Streaming', category: 'leisure', amount: 9000, frequency: 'monthly', day: 10}
  ],
  goal: {monthly: 30000}
});

test('equivalente mensal: trimestral, semestral, anual e pontual', () => {
  assert.equal(monthlyEquivalent({amount: 60000, frequency: 'quarterly'}, '2026-10'), 20000);
  assert.equal(monthlyEquivalent({amount: 60000, frequency: 'semiannual'}, '2026-10'), 10000);
  assert.equal(monthlyEquivalent({amount: 24000, frequency: 'annual'}, '2026-10'), 2000);
  assert.equal(monthlyEquivalent({amount: 5000, frequency: 'oneoff', month: '2026-10'}, '2026-10'), 5000);
  assert.equal(monthlyEquivalent({amount: 5000, frequency: 'oneoff', month: '2026-11'}, '2026-10'), 0);
});

test('eventos datados: trimestral nos meses certos, dia 31 ajustado, 13º em dezembro', () => {
  const q = occurrences({id: 'q', amount: 100, frequency: 'quarterly', anchorMonth: 2, day: 28}, '2026-01-01', '2027-01-01', -1).map(e => e.date);
  assert.deepEqual(q, ['2026-02-28', '2026-05-28', '2026-08-28', '2026-11-28']);
  const end = occurrences({id: 'e', amount: 100, frequency: 'monthly', day: 31}, '2026-02-01', '2026-03-01', -1);
  assert.equal(end[0].date, '2026-02-28');
  const s = occurrences({id: 's', type: 'salary', amount: 500000, frequency: 'monthly', day: 25, thirteenth: true}, '2026-12-01', '2027-01-01', +1);
  assert.equal(s.length, 2);
  assert.ok(s[1].label.includes('13'));
});

test('orçamento: confirmados × estimados, provisões separadas, 13º diluído', () => {
  const b = monthlyBudget(base(), '2026-10');
  assert.equal(b.income, 500000 + 41667);
  assert.equal(b.incomeConfirmed, b.income);
  assert.equal(b.provisions, 2000 + 20000);
  assert.equal(b.expenses, 180000 + 42000 + 2000 + 20000 + 6000 + 9000);
  assert.equal(b.essential + b.flexible, b.expenses);
});

test('projeção de 30 dias usa a data real e acha o menor saldo', () => {
  const p = projection(base(), '2026-10-22', 30);
  // 22/10 → 21/11: salário 25/10; aluguel+LAMal 01/11; RC anual 05/11; streaming 10/11; telefone 15/11.
  assert.equal(p.opening, 80000);
  assert.equal(p.nextIncome.date, '2026-10-25');
  assert.equal(p.incoming, 500000);
  assert.equal(p.outgoing, 180000 + 42000 + 24000 + 9000 + 6000);
  assert.equal(p.closing, 80000 + 500000 - 261000);
  assert.equal(p.minBalance, 80000);
  assert.equal(p.negative, false);
});

test('saldo negativo previsto vira risco crítico e recomendação', () => {
  const h = base();
  h.openingBalance = {amount: 10000, confirmed: true, date: '2026-10-28'};
  const d = diagnosis(h, '2026-10-28');
  assert.equal(d.projection.negative, true);
  assert.equal(d.projection.minDate, '2026-11-15'); // menor saldo antes do salário de 25/11
  assert.ok(d.risks.some(r => r.id === 'negative_balance_30d' && r.severity === 'critical'));
  assert.ok(recommendations(h, '2026-10-28').some(r => r.id === 'negative_balance'));
});

test('meta ajustada à capacidade, sem prometer', () => {
  const h = base();
  h.goal = {monthly: 10000000};
  const g = goalCheck(h, '2026-10');
  assert.equal(g.feasible, false);
  assert.equal(g.suggested, g.capacity);
  assert.ok(g.gap > 0);
});

test('recomendações: no máximo 3, só economia digitada pelo usuário, sem preço inventado', () => {
  const r = recommendations(base(), '2026-10-22');
  assert.ok(r.length <= 3);
  const phone = recommendations(household({...base(), expenses: base().expenses.filter(e => e.id === 'phone')}), '2026-10-22')[0];
  assert.equal(phone.potentialMonthly, 3000);
  for (const x of r) if (!x.id.startsWith('compare_')) assert.equal(x.potentialMonthly, null);
  const discarded = household({...base(), recommendationStates: {lamal_review: 'discarded'}});
  assert.ok(!recommendations(discarded, '2026-10-22').some(x => x.id === 'lamal_review'));
});

test('validação: imposto na fonte não pode ser lançado de novo, valores em centavos inteiros', () => {
  assert.throws(() => household({incomes: [], expenses: [{id: 'x', label: 'Impôt à la source', category: 'tax', amount: 1000, frequency: 'monthly'}]}), /source_tax_already_deducted/);
  assert.throws(() => household({incomes: [{id: 'a', label: 'x', amount: 10.5, frequency: 'monthly'}], expenses: []}), /invalid_amount/);
  assert.throws(() => household({incomes: [{id: 'a', label: 'x', amount: 100, frequency: 'weekly'}], expenses: []}), /invalid_frequency/);
  assert.throws(() => household({incomes: [{id: 'a', label: 'x', amount: 1, frequency: 'monthly'}, {id: 'a', label: 'y', amount: 1, frequency: 'monthly'}], expenses: []}), /duplicate_row/);
});

const req = (env, path, method = 'GET', data) => worker.fetch(new Request(env.APP_ORIGIN + path, {method, headers: {Origin: env.APP_ORIGIN, 'Content-Type': 'application/json'}, ...(data === undefined ? {} : {body: JSON.stringify(data)})}), env);

test('API: salva cifrado, devolve visão geral, guarda histórico, exporta e isola usuários', async () => {
  const env = environment();
  env.TODAY_OVERRIDE = '2026-10-22';
  const h = base();
  let res = await req(env, '/api/household', 'PUT', h);
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.overview.projection.minBalance, 80000);
  assert.equal(out.overview.projection.daily.length, 30);
  assert.ok(!env.db.prepare('SELECT payload FROM households').get().payload.includes('Renens'));
  res = await req(env, '/api/household/recommendation', 'POST', {id: 'lamal_review', state: 'in_review'});
  assert.equal(res.status, 200);
  assert.equal((await res.json()).household.recommendationStates.lamal_review, 'in_review');
  const hist = await (await req(env, '/api/household/history')).json();
  assert.deepEqual(hist.events.map(e => e.kind).sort(), ['created', 'recommendation']);
  const exp = await (await req(env, '/api/export')).json();
  assert.equal(exp.household.profile.commune, 'Renens');
  assert.equal(exp.householdHistory.length, 2);
  // outro usuário não lê este agregado: o contexto de cifragem é ligado ao usuário
  env.db.prepare("INSERT INTO users(id,identity_cipher) VALUES('other','x')").run();
  env.db.prepare("UPDATE households SET user_id='other'").run();
  assert.equal((await (await req(env, '/api/household')).json()).household, null);
});

test('Budget AI: aumento de custo, conta recorrente fora do orçamento, meta bloqueada e economia realizada só após confirmação', async () => {
  const {realizedSavings} = await import('../src/budget-engine.mjs');
  const h = base();
  h.goal = {monthly: 400000};
  const docs = [
    {id: 'a', kind: 'qrbill', status: 'confirmed', creditor: 'Romande Energie SA', amount: 15000, currency: 'CHF', dueDate: '2026-07-30'},
    {id: 'b', kind: 'qrbill', status: 'confirmed', creditor: 'Romande Energie', amount: 18940, currency: 'CHF', dueDate: '2026-10-30'},
    {id: 'c', kind: 'qrbill', status: 'draft', creditor: 'Romande Energie', amount: 99999, currency: 'CHF', dueDate: '2026-11-30'}
  ];
  const r = recommendations(h, '2026-10-22', {documents: docs, max: 20});
  const inc = r.find(x => x.problem === 'cost_increased');
  assert.deepEqual([inc.current, inc.alternative], [18940, 15000]);
  assert.ok(r.some(x => x.problem === 'recurring_not_in_budget'));
  const goal = r.find(x => x.id === 'goal_blocked');
  assert.ok(goal.blockers.length > 0);
  for (const x of r) for (const k of ['problem', 'current', 'alternative', 'potentialMonthly', 'conditions', 'source', 'nextAction', 'state', 'priority']) assert.ok(k in x, x.id + ' sem ' + k);
  // a meta sozinha não é economia; nada de economia inventada
  assert.equal(goal.potentialMonthly, null);
  assert.equal(realizedSavings(h, '2026-10').monthly, 0);
  const done = household({...h, expenses: h.expenses.map(e => e.id === 'phone' ? {...e, previousAmount: 6000, amount: 3000, targetAmount: null} : e)});
  assert.equal(realizedSavings(done, '2026-10').monthly, 3000);
  assert.equal(realizedSavings(done, '2026-10').yearly, 36000);
});
