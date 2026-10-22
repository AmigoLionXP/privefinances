import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {environment} from './fixtures.mjs';
import {runJobs} from '../src/jobs.mjs';
import {can, ALWAYS_FREE, PLAN_ORDER, requiredPlan} from '../public/plans.mjs';
import {summary, cashflow, avsEstimate, accountantRows} from '../public/business-engine.mjs';
import {creditSimulation, goalProjection, annuity} from '../public/simulators.mjs';
import {rankPartners, solutionLadder, partnerScore} from '../public/solutions.mjs';
import {variantFor} from '../public/experiments.mjs';

test('planos: o essencial nunca é bloqueado e o business inclui tudo', () => {
  for (const f of ALWAYS_FREE) for (const p of PLAN_ORDER) assert.ok(can(p, f), p + ' ' + f);
  assert.ok(!can('essential', 'business_module') && !can('plus', 'business_module') && can('business', 'business_module'));
  assert.equal(requiredPlan('budget_ai_full'), 'plus');
  assert.equal(requiredPlan('critical_alerts'), 'essential');
});

const biz = {version: 1, settings: {vatRegistered: false, taxProvisionBps: 1200}, invoices: [
  {id: 'a', client: 'Cliente A', amount: 4000000, issueDate: '2026-02-10', dueDate: '2026-03-12', status: 'paid', paidDate: '2026-03-01'},
  {id: 'b', client: 'Cliente B', amount: 3000000, issueDate: '2026-09-30', dueDate: '2026-10-15', status: 'sent'},
  {id: 'c', client: 'Cliente C', amount: 1500000, issueDate: '2026-10-20', dueDate: '2026-11-19', status: 'sent'},
  {id: 'd', client: 'Rascunho', amount: 999900, issueDate: '2026-10-21', status: 'draft'}],
  expenses: [{id: 'e1', label: 'Material', amount: 800000, date: '2026-05-01', category: 'material', receipt: true}]};

test('Meu Negócio: resumo, provisões prudentes, TVA, fluxo de 90 dias e pacote do contador', () => {
  const s = summary(biz, '2026-10-22');
  assert.equal(s.invoiced, 8500000);
  assert.equal(s.paid, 4000000);
  assert.equal(s.outstanding, 4500000);
  assert.deepEqual(s.overdue.map(o => [o.id, o.days]), [['b', 7]]);
  assert.equal(s.profit, 3200000);
  assert.equal(s.vat, 'above_threshold'); // 85 000 × 365/295 ≈ 105 000 projetados ≥ 100 000
  assert.ok(['approaching', 'above_threshold'].includes(s.vat));
  assert.equal(s.provisions.taxRateMissing, false);
  assert.deepEqual(avsEstimate(500000), {amount: 53000, method: 'minimum_contribution'});
  assert.equal(avsEstimate(7000000).amount, 700000);
  assert.equal(avsEstimate(3000000).method, 'upper_bound_reduced_scale_may_apply');
  const cf = cashflow(biz, '2026-10-22', 90, 100000);
  assert.equal(cf.receivables, 4500000); // atrasada entra hoje, a de novembro na sua semana
  assert.equal(cf.weeks[0].in, 3000000);
  const rows = accountantRows(biz, 2026);
  assert.equal(rows.length, 1 + 3 + 1); // rascunho não vai para o contador
});

test('simulador de crédito: taxa máxima legal, teste de 36 meses e capacidade pelo orçamento', () => {
  const r = creditSimulation({principal: 2000000, rateBps: 1290, months: 60}, 50000);
  assert.ok(r.warnings.includes('rate_above_legal_max'));
  assert.ok(r.warnings.includes('capacity_tested_over_36_months'));
  assert.equal(r.payment36, annuity(2000000, 1290, 36));
  assert.equal(r.affordability, 'not_affordable');
  assert.equal(creditSimulation({principal: 500000, rateBps: 900, months: 24}, 200000).affordability, 'ok');
  assert.equal(creditSimulation({principal: 500000, rateBps: 900, months: 24}, -100).affordability, 'no_margin');
  assert.deepEqual(goalProjection(300000, 100000, 50000), {months: 4, reached: false});
});

test('marketplace: serviço oficial primeiro e ordenação que ignora a comissão', () => {
  const base = {status: 'approved', category: 'fiduciary', needs: ['tax_return'], regions: ['VD'], languages: ['pt'], commercial: {disclosure: 'Comissão paga pelo parceiro'}, pricing: {text: 'CHF 120 por declaração'}, licence: {}, quality: {score: 4}};
  const a = {...base, name: 'A', commercial: {...base.commercial, commissionBps: 5000}}, b = {...base, name: 'B', pricing: {text: 'CHF 120', freeFirstContact: true}, commercial: {...base.commercial, commissionBps: 0}};
  assert.deepEqual(rankPartners([a, b], 'tax_return').map(p => p.name), ['B', 'A']);
  const richer = {...a, commercial: {...a.commercial, commissionBps: 10000}};
  assert.equal(partnerScore(richer, 'tax_return'), partnerScore(a, 'tax_return'));
  const l = solutionLadder('tax_return', [a]);
  assert.equal(l.steps[0].type, 'official_free');
  assert.match(l.steps[0].items[0].url, /^https:\/\/www\.vd\.ch\//);
  assert.equal(l.steps.at(-1).type, 'partners');
  assert.ok(['benefit', 'checklist'].includes(variantFor('abc', 'upgrade_copy')));
  assert.equal(variantFor('abc', 'upgrade_copy'), variantFor('abc', 'upgrade_copy'));
});

const req = (env, path, method = 'GET', data) => worker.fetch(new Request(env.APP_ORIGIN + path, {method, headers: {Origin: env.APP_ORIGIN, 'Content-Type': 'application/json'}, ...(data === undefined ? {} : {body: JSON.stringify(data)})}), env);
const j = async r => (await r).json();

test('API: plano piloto sem cobrança, recursos liberados, cancelamento mantém os dados', async () => {
  const env = environment(); env.TODAY_OVERRIDE = '2026-10-22';
  let p = await j(req(env, '/api/subscription'));
  assert.equal(p.plan, 'essential'); assert.equal(p.chargesEnabled, false); assert.equal(p.pricesAreHypotheses, true);
  assert.equal((await req(env, '/api/business')).status, 403);
  assert.equal((await req(env, '/api/simulate/credit', 'POST', {principal: 100000, rateBps: 900, months: 12})).status, 403);
  p = await j(req(env, '/api/subscription', 'POST', {plan: 'business'}));
  assert.deepEqual([p.plan, p.status, p.source], ['business', 'pilot', 'pilot']);
  const put = await j(req(env, '/api/business', 'PUT', biz));
  assert.equal(put.summary.outstanding, 4500000);
  assert.ok(!env.db.prepare('SELECT payload FROM businesses').get().payload.includes('Cliente'));
  const csv = await req(env, '/api/business/accountant.csv?year=2026');
  assert.match(await csv.text(), /income;2026-02-10;Cliente A;invoice;40000.00;paid/);
  const sim = await j(req(env, '/api/simulate/credit', 'POST', {principal: 100000, rateBps: 1500, months: 12}));
  assert.ok(sim.warnings.includes('rate_above_legal_max'));
  const c = await j(req(env, '/api/subscription/cancel', 'POST', {}));
  assert.deepEqual([c.plan, c.status, c.dataKept], ['essential', 'canceled', true]);
  assert.equal((await req(env, '/api/business')).status, 403);
  assert.equal((await j(req(env, '/api/export'))).business.invoices.length, 4);
  assert.equal((await req(env, '/api/subscription/cancel', 'POST', {})).status, 409);
  env.PAYMENTS_ENABLED = 'true';
  assert.equal((await j(req(env, '/api/subscription', 'POST', {plan: 'plus'}))).error, 'use_checkout');
  const audit = env.db.prepare('SELECT action,meta FROM audit_events').all();
  assert.ok(['plan_change', 'plan_cancel', 'accountant_export', 'export'].every(a => audit.some(x => x.action === a)));
  assert.ok(audit.every(x => !x.meta.includes('demo@example.invalid')));
});

test('API: limites do gratuito sem esconder o essencial', async () => {
  const env = environment(); env.TODAY_OVERRIDE = '2026-10-22';
  for (let i = 0; i < 20; i++) assert.equal((await req(env, '/api/docs', 'POST', {document: {kind: 'receipt', creditor: 'Loja ' + i, amount: 100 + i}})).status, 201);
  const r = await req(env, '/api/docs', 'POST', {document: {kind: 'receipt', creditor: 'Loja 21', amount: 1}});
  assert.equal(r.status, 402);
  assert.equal((await r.json()).error, 'plan_limit_documents');
  assert.equal((await j(req(env, '/api/docs'))).documents.length, 20); // os documentos existentes continuam acessíveis
  await req(env, '/api/household', 'PUT', {incomes: [{id: 's', label: 'S', type: 'salary', amount: 100000, frequency: 'monthly', day: 25}], expenses: [{id: 'r', label: 'Aluguel', category: 'housing', amount: 90000, frequency: 'monthly'}, {id: 'l', label: 'LAMal', category: 'lamal', amount: 40000, frequency: 'monthly'}, {id: 'i', label: 'RC', category: 'insurance', amount: 3000, frequency: 'monthly'}, {id: 't', label: 'Tel', category: 'telecom', amount: 5000, frequency: 'monthly', targetAmount: 2000}, {id: 'f', label: 'Lazer', category: 'leisure', amount: 6000, frequency: 'monthly'}], openingBalance: {amount: 1000, confirmed: true, date: '2026-10-22'}});
  const adv = await j(req(env, '/api/advice'));
  assert.equal(adv.recommendations.length, 3);
  assert.ok(adv.lockedCount > 0);
  assert.equal(adv.recommendations[0].problem, 'negative_balance_30d'); // alerta crítico nunca fica atrás do plano
  await req(env, '/api/subscription', 'POST', {plan: 'plus'});
  assert.equal((await req(env, '/api/docs', 'POST', {document: {kind: 'receipt', creditor: 'Loja 21', amount: 1}})).status, 201);
  assert.equal((await j(req(env, '/api/advice'))).lockedCount, 0);
});

test('API: analytics só com consentimento, propriedades filtradas e apagadas ao retirar', async () => {
  const env = environment();
  assert.equal((await j(req(env, '/api/events', 'POST', {name: 'app_open'}))).stored, false);
  assert.equal((await req(env, '/api/events', 'POST', {name: 'anything'})).status, 400);
  assert.equal((await req(env, '/api/consents/analytics', 'POST', {granted: true})).status, 400); // exige versão de privacidade
  await req(env, '/api/consents/analytics', 'POST', {granted: true, privacyVersion: 'test-v1'});
  assert.equal((await j(req(env, '/api/events', 'POST', {name: 'experiment_exposure', props: {experiment: 'upgrade_copy', variant: 'benefit', email: 'x@y.z', amount: '123'}}))).stored, true);
  const row = env.db.prepare('SELECT subject,props FROM analytics_events').get();
  assert.deepEqual(JSON.parse(row.props), {experiment: 'upgrade_copy', variant: 'benefit'});
  assert.ok(!row.subject.includes('local'));
  assert.equal((await j(req(env, '/api/me'))).analytics, true);
  await req(env, '/api/consents/analytics', 'POST', {granted: false});
  assert.equal(env.db.prepare('SELECT COUNT(*) n FROM analytics_events').get().n, 0);
});

test('API: parceiros aprovados só com habilitação, encaminhamento consentido, métricas e retenção', async () => {
  const env = environment(); env.TODAY_OVERRIDE = '2026-10-22';
  assert.equal((await req(env, '/api/admin/metrics')).status, 403);
  env.ADMIN_EMAILS = 'demo@example.invalid';
  const partner = {name: 'Fiduciária Exemplo (teste)', category: 'fiduciary', regClass: 'regulated_advice', needs: ['tax_return', 'source_tax'], regions: ['VD'], languages: ['pt', 'fr'], services: ['Declaração de impostos'], commercial: {model: 'commission', disclosure: 'O parceiro paga uma comissão ao PrivéFinances por contato.', commissionBps: 2000}, pricing: {text: 'A partir de CHF 150', freeFirstContact: true}};
  const {id} = await j(req(env, '/api/admin/partners', 'POST', partner));
  assert.equal((await j(req(env, `/api/admin/partners/${id}/status`, 'POST', {status: 'approved'}))).error, 'licence_verification_required');
  const lic = await j(req(env, '/api/admin/partners', 'POST', {...partner, licence: {authority: 'Registro de teste', number: 'T-1', verifiedAt: '2026-10-20'}}));
  assert.equal((await j(req(env, `/api/admin/partners/${lic.id}/status`, 'POST', {status: 'approved'}))).status, 'approved');
  const ladder = await j(req(env, '/api/solutions?need=tax_return'));
  assert.equal(ladder.steps[0].type, 'official_free');
  const listed = ladder.steps.at(-1).items;
  assert.deepEqual(listed.map(p => p.id), [lic.id]);
  assert.equal(listed[0].commercial.commissionBps, undefined); // condição comercial exposta como texto, não como taxa
  assert.equal((await req(env, '/api/referrals', 'POST', {partnerId: lic.id, need: 'tax_return'})).status, 400);
  assert.equal((await req(env, '/api/referrals', 'POST', {partnerId: id, need: 'tax_return', consent: true, privacyVersion: 'test-v1'})).status, 404);
  const ref = await j(req(env, '/api/referrals', 'POST', {partnerId: lic.id, need: 'tax_return', consent: true, privacyVersion: 'test-v1', share: {name: 'Ana', summary: 'Quero ajuda com a declaração'}}));
  assert.equal(ref.status, 'pending');
  const mine = await j(req(env, '/api/referrals'));
  assert.deepEqual(Object.keys(mine.referrals[0].shared).sort(), ['name', 'need', 'summary']); // e-mail não foi marcado, não é compartilhado
  await req(env, `/api/referrals/${ref.id}`, 'DELETE');
  assert.equal(env.db.prepare("SELECT revoked_at FROM consents WHERE purpose='partner_referral'").get().revoked_at !== null, true);
  await req(env, '/api/subscription', 'POST', {plan: 'plus'});
  const m = await j(req(env, '/api/admin/metrics'));
  assert.equal(m.monetization.mrrCents, 0); // piloto não é receita
  assert.equal(m.monetization.pilots, 1);
  assert.ok('northStar' in m && m.coverage === 'consented_users_only');
  // retenção: rascunho antigo some, com o arquivo
  await req(env, '/api/docs', 'POST', {document: {kind: 'invoice', creditor: 'Velho', amount: 100}, file: Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64')});
  env.db.prepare("UPDATE user_documents SET created_at='2026-01-01 00:00:00'").run();
  await runJobs(env, new Date('2026-10-22T12:00:00Z'));
  assert.equal(env.db.prepare('SELECT COUNT(*) n FROM user_documents').get().n, 0);
  assert.equal([...env.objects.keys()].filter(k => k.includes('/doc-')).length, 0);
});

test('segurança: outro usuário não lê negócio nem cancela encaminhamento alheio; eventos limitados', async () => {
  const env = environment(); env.ADMIN_EMAILS = 'demo@example.invalid';
  await req(env, '/api/subscription', 'POST', {plan: 'business'});
  await req(env, '/api/business', 'PUT', biz);
  const {id} = await j(req(env, '/api/admin/partners', 'POST', {name: 'P', category: 'fiduciary', regClass: 'lead', needs: ['tax_return'], commercial: {model: 'none', disclosure: 'Sem comissão'}}));
  await req(env, `/api/admin/partners/${id}/status`, 'POST', {status: 'approved'});
  const ref = await j(req(env, '/api/referrals', 'POST', {partnerId: id, need: 'tax_return', consent: true, privacyVersion: 'test-v1'}));
  // o mesmo registro passa para outro dono: o usuário atual deixa de enxergar
  env.db.prepare("INSERT INTO users(id,identity_cipher) VALUES('other','x')").run();
  env.db.prepare("UPDATE businesses SET user_id='other'").run();
  env.db.prepare("UPDATE referrals SET user_id='other'").run();
  assert.equal((await j(req(env, '/api/business'))).business.invoices.length, 0);
  assert.equal((await req(env, `/api/referrals/${ref.id}`, 'DELETE')).status, 404);
  assert.equal((await j(req(env, '/api/referrals'))).referrals.length, 0);
  let last;
  for (let i = 0; i < 121; i++) last = await req(env, '/api/events', 'POST', {name: 'app_open'});
  assert.equal(last.status, 429);
});
