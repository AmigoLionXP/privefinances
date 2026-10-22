import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {environment} from './fixtures.mjs';
import {parseQrBill, validIban, isQrIban, validQrr, validScor, parseBillingS1} from '../public/qrbill.mjs';
import {findDuplicates, folders, recognizeTerms, openBills} from '../public/documents.mjs';
import {searchKb, KB} from '../public/canton-vd.mjs';
import {localGuide} from '../src/guide.mjs';

const qr = (o = {}) => {
  const v = {iban: 'CH4431999123000889012', name: 'Romande Energie SA', amount: '189.40', ccy: 'CHF', tp: 'QRR', ref: '210000000003139471430009017', msg: 'Facture 10/2026', bill: '', ...o};
  return ['SPC', '0200', '1', v.iban, 'S', v.name, 'Rue de Lausanne', '53', '1110', 'Morges', 'CH', '', '', '', '', '', '', '', v.amount, v.ccy,
    'S', 'Ana Exemplo', 'Rue Test', '1', '1020', 'Renens', 'CH', v.tp, v.ref, v.msg, 'EPD', ...(v.bill ? [v.bill] : [])].join('\n');
};

test('QR-fatura v2.3: IBAN, QR-IBAN, QRR e SCOR com dígitos de controle', () => {
  assert.ok(validIban('CH4431999123000889012') && isQrIban('CH4431999123000889012'));
  assert.ok(validIban('CH5800791123000889012') && !isQrIban('CH5800791123000889012'));
  assert.ok(!validIban('CH4431999123000889013'));
  assert.ok(validQrr('210000000003139471430009017') && !validQrr('210000000003139471430009018'));
  assert.ok(validScor('RF18539007547034') && !validScor('RF18539007547035'));
});

test('QR-fatura: leitura completa, valor em centavos, endereço estruturado', () => {
  const r = parseQrBill(qr());
  assert.equal(r.ok, true, r.errors.join());
  assert.equal(r.data.amount, 18940);
  assert.equal(r.data.creditor.name, 'Romande Energie SA');
  assert.equal(r.data.creditor.town, 'Morges');
  assert.equal(r.data.qrIban, true);
  assert.equal(r.data.reference, '210000000003139471430009017');
});

test('QR-fatura: erros da norma são detectados (dados de leitura incorretos)', () => {
  assert.deepEqual(parseQrBill('hello').errors, ['not_swiss_qr_code']);
  assert.ok(parseQrBill(qr({iban: 'CH4431999123000889013'})).errors.includes('invalid_iban'));
  assert.ok(parseQrBill(qr({tp: 'NON', ref: ''})).errors.includes('qr_iban_requires_qrr'));
  assert.ok(parseQrBill(qr({iban: 'CH5800791123000889012'})).errors.includes('qrr_requires_qr_iban'));
  assert.ok(parseQrBill(qr({ref: '210000000003139471430009018'})).errors.includes('invalid_qrr_reference'));
  assert.ok(parseQrBill(qr({amount: '189,40'})).errors.includes('invalid_amount'));
  assert.ok(parseQrBill(qr({ccy: 'USD'})).errors.includes('invalid_currency'));
  assert.ok(parseQrBill(qr().replace('\nEPD', '\nEND')).errors.includes('missing_trailer'));
  const scor = parseQrBill(qr({iban: 'CH5800791123000889012', tp: 'SCOR', ref: 'RF18539007547034', amount: ''}));
  assert.equal(scor.ok, true);
  assert.equal(scor.data.amount, null); // valor em branco: o usuário precisa informar
  const legacy = parseQrBill(qr().replace('\nS\nRomande', '\nK\nRomande'));
  assert.ok(legacy.warnings.includes('creditor_combined_address_legacy'));
});

test('QR-fatura: informações Swico S1 sugerem o vencimento, sem impor', () => {
  const b = parseBillingS1('//S1/10/10201409/11/261015/40/2:10;0:30');
  assert.equal(b.invoiceNumber, '10201409');
  assert.equal(b.documentDate, '2026-10-15');
  assert.equal(b.dueDate, '2026-11-14');
  assert.equal(parseQrBill(qr({bill: '//S1/10/A1/11/261015/40/0:30'})).data.billing.dueDate, '2026-11-14');
});

test('duplicados, pastas por credor e ano, vencimentos e termos administrativos', () => {
  const a = {id: '1', kind: 'qrbill', status: 'confirmed', creditor: 'Romande Energie SA', amount: 18940, currency: 'CHF', iban: 'CH4431999123000889012', reference: '210000000003139471430009017', dueDate: '2026-11-14', taxYear: 2026, paymentState: 'unpaid'};
  assert.equal(findDuplicates({...a, id: '2'}, [a])[0].reason, 'same_payment_reference');
  assert.equal(findDuplicates({...a, id: '3', iban: '', reference: '', dueDate: '2026-11-20'}, [a])[0].reason, 'similar_amount_date');
  assert.equal(findDuplicates({...a, id: '4', amount: 5000, reference: '', iban: ''}, [a]).length, 0);
  const f = folders([a, {...a, id: '5', creditor: 'ROMANDE ENERGIE', reference: 'x', taxYear: 2025, paymentState: 'paid', taxRelevant: true}]);
  assert.equal(f.creditors.length, 1);
  assert.equal(f.creditors[0].count, 2);
  assert.equal(f.creditors[0].openAmount, 18940);
  assert.deepEqual(f.years.map(y => y.year), [2026, 2025]);
  assert.deepEqual(f.taxReview, ['5']);
  assert.equal(openBills([a], '2026-11-20')[0].late, true);
  const t = recognizeTerms('Office des poursuites — COMMANDEMENT DE PAYER n° 123');
  assert.equal(t[0].id, 'commandement');
  assert.equal(t[0].deadlineDays, 10);
  assert.deepEqual(recognizeTerms('2e rappel'), [{id: 'rappel', severity: 'medium', deadlineDays: null, kbId: 'reminders'}]);
});

test('base de Vaud: toda entrada jurídica tem fonte oficial, data e vigência', () => {
  for (const e of KB) {
    assert.ok(e.pt && e.fr && e.en, e.id + ' sem tradução');
    assert.ok(e.validFrom, e.id);
    if (e.scope === 'law') {
      assert.ok(e.sources.length > 0, e.id + ' sem fonte');
      for (const s of e.sources) { assert.match(s.url, /^https:\/\/(www\.)?(vd\.ch|ch\.ch|estv\.admin\.ch|bag\.admin\.ch|priminfo\.admin\.ch|ahv-iv\.ch|bsv\.admin\.ch|bwo\.admin\.ch|six-group\.com)\//); assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/); }
    }
  }
  const r = searchKb('Recebi um commandement de payer, o que faço?', 'pt', new Date('2026-10-22'));
  assert.equal(r.items[0].id, 'debt_enforcement');
  assert.equal(r.items[0].needsProfessional, true);
  const none = localGuide('Qual a melhor criptomoeda para comprar?', 'pt', new Date('2026-10-22'));
  assert.equal(none.noVerifiedSource, true);
  assert.equal(none.mode, 'no_verified_source');
  assert.ok(none.sources.every(s => s.scope === 'portal'));
  const en = localGuide('When is the tax return deadline in Vaud?', 'en', new Date('2026-10-22'));
  assert.equal(en.items[0].id, 'tax_return_vd');
  assert.match(en.answer, /15 March/);
});

const req = (env, path, method = 'GET', data, user = 'u1') => worker.fetch(new Request(env.APP_ORIGIN + path, {method, headers: {Origin: env.APP_ORIGIN, 'Content-Type': 'application/json', 'x-test-user': user}, ...(data === undefined ? {} : {body: JSON.stringify(data)})}), env);
const fromQr = text => { const d = parseQrBill(text).data; return {kind: 'qrbill', source: 'qr', creditor: d.creditor.name, amount: d.amount, currency: d.currency, iban: d.iban, referenceType: d.referenceType, reference: d.reference, message: d.message}; };

test('API: importar QR, confirmar, entrar no orçamento, bloquear duplicado, arquivar e excluir', async () => {
  const env = environment();
  env.TODAY_OVERRIDE = '2026-10-22';
  await req(env, '/api/household', 'PUT', {onboarding: {step: 'plan', completed: true}, openingBalance: {amount: 50000, confirmed: true, date: '2026-10-22'}, incomes: [{id: 'sal', label: 'Salário', type: 'salary', amount: 400000, frequency: 'monthly', day: 25, status: 'confirmed'}], expenses: [{id: 'lamal', label: 'LAMal', category: 'lamal', amount: 42000, frequency: 'monthly', day: 1}]});
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
  let res = await req(env, '/api/docs', 'POST', {document: fromQr(qr()), file: png});
  assert.equal(res.status, 201);
  const {document: draft, duplicates} = await res.json();
  assert.equal(draft.status, 'draft');
  assert.equal(duplicates.length, 0);
  // rascunho não mexe no orçamento
  assert.equal((await (await req(env, '/api/household')).json()).household.expenses.length, 1);
  // valor em euro não entra no orçamento em CHF
  res = await req(env, `/api/docs/${draft.id}/confirm`, 'POST', {document: {currency: 'EUR'}, budget: {mode: 'oneoff'}});
  assert.equal((await res.json()).error, 'budget_requires_chf_amount');
  res = await req(env, `/api/docs/${draft.id}/confirm`, 'POST', {document: {dueDate: '2026-11-14', category: 'energy', taxRelevant: false}, budget: {mode: 'oneoff'}});
  assert.equal(res.status, 200);
  const conf = await res.json();
  assert.equal(conf.document.status, 'confirmed');
  const row = conf.household.expenses.find(e => e.id === 'doc_' + draft.id);
  assert.deepEqual([row.amount, row.frequency, row.month, row.day, row.category], [18940, 'oneoff', '2026-11', 14, 'energy']);
  assert.ok(conf.overview.projection.outgoing >= 42000 + 18940);
  // segunda importação da mesma fatura: aviso e bloqueio na confirmação
  res = await req(env, '/api/docs', 'POST', {document: fromQr(qr())});
  const second = await res.json();
  assert.equal(second.duplicates[0].reason, 'same_payment_reference');
  res = await req(env, '/api/docs', 'POST', {document: {kind: 'receipt', creditor: 'Outro nome'}, file: png});
  const sameFile = await res.json();
  assert.equal(sameFile.duplicates[0].reason, 'same_file');
  await req(env, `/api/docs/${sameFile.document.id}`, 'DELETE');
  res = await req(env, `/api/docs/${second.document.id}/confirm`, 'POST', {document: {dueDate: '2026-11-14'}, budget: {mode: 'oneoff'}});
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, 'possible_duplicate');
  await req(env, `/api/docs/${second.document.id}`, 'DELETE');
  // ligar a uma despesa existente não cria linha nova
  res = await req(env, '/api/docs', 'POST', {document: {kind: 'invoice', creditor: 'Assura', amount: 42000, currency: 'CHF', dueDate: '2026-11-01'}});
  const lam = (await res.json()).document;
  res = await req(env, `/api/docs/${lam.id}/confirm`, 'POST', {budget: {mode: 'existing', expenseId: 'lamal'}});
  assert.equal((await res.json()).household.expenses.length, 2);
  // IBAN digitado errado é recusado
  res = await req(env, '/api/docs', 'POST', {document: {kind: 'qrbill', creditor: 'X', iban: 'CH4431999123000889013'}});
  assert.equal((await res.json()).error, 'invalid_iban');
  // carta com commandement de payer é reconhecida
  res = await req(env, '/api/docs', 'POST', {document: {kind: 'letter', creditor: 'Office des poursuites de l’Ouest lausannois', notes: 'Commandement de payer'}});
  assert.equal((await res.json()).document.terms[0].id, 'commandement');
  // pastas, vencimentos e arquivo
  const list = await (await req(env, '/api/docs')).json();
  assert.equal(list.documents.length, 3);
  assert.equal(list.openBills.length, 2);
  assert.ok(list.folders.creditors.some(c => c.name === 'Romande Energie SA' && c.openAmount === 18940));
  const file = await req(env, `/api/docs/${draft.id}/file`);
  assert.equal(file.headers.get('content-type'), 'image/png');
  // pago
  res = await req(env, `/api/docs/${draft.id}/paid`, 'POST', {paid: true});
  assert.equal((await res.json()).document.paymentState, 'paid');
  // nada fica cifrado em claro
  assert.ok(![...env.db.prepare('SELECT payload FROM user_documents').all()].some(r => r.payload.includes('Romande')));
  // export inclui documentos; outro usuário não vê nada
  assert.equal((await (await req(env, '/api/export')).json()).documents.length, 3);
  env.db.prepare("INSERT INTO users(id,identity_cipher) VALUES('other','x')").run();
  env.db.prepare("UPDATE user_documents SET user_id='other' WHERE id=?").run(draft.id);
  assert.equal((await req(env, `/api/docs/${draft.id}`)).status, 404);
  env.db.prepare("UPDATE user_documents SET user_id=(SELECT user_id FROM households) WHERE id=?").run(draft.id);
  // excluir a fatura remove a linha pontual do orçamento e o arquivo
  await req(env, `/api/docs/${draft.id}`, 'DELETE');
  assert.ok(!(await (await req(env, '/api/household')).json()).household.expenses.some(e => e.id === 'doc_' + draft.id));
  assert.equal([...env.objects.keys()].filter(k => k.includes(draft.id)).length, 0);
});
