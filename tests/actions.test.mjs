import test from 'node:test';
import assert from 'node:assert/strict';
import {nextActions, isComplete, likelySourceTaxed, questions} from '../public/actions.mjs';

const base = {permit: 'B', work: 'employee', sourceTax: 'yes', highIncome: 'no', household: 'single', pillar3a: 'no'};
const ids = (p, date, lang) => nextActions(p, new Date(date), lang).map(a => a.id);

test('perfil completo só com respostas válidas', () => {
  assert.equal(isComplete(base), true);
  assert.equal(isComplete({...base, permit: 'X'}), false);
  assert.equal(isComplete(null), false);
  assert.equal(questions.length, 6);
});

test('outubro: LAMal primeiro, no máximo 3 ações', () => {
  const list = nextActions(base, new Date('2026-10-21'));
  assert.equal(list.length, 3);
  assert.equal(list[0].id, 'lamalCompare');
  assert.equal(list[0].deadline, '2026-11-30');
  assert.ok(list.every(a => a.title && a.text));
});

test('dezembro: 3a vira prioridade', () => {
  assert.equal(ids({...base, pillar3a: 'yes'}, '2026-12-05')[0], 'pillar3aHas');
});

test('janeiro a março: TOU para quem paga na fonte, declaração para C e naturalizados', () => {
  assert.equal(ids(base, '2027-02-10')[0], 'touDecide');
  assert.equal(nextActions(base, new Date('2027-02-10'))[0].deadline, '2027-03-31');
  assert.equal(ids({...base, permit: 'C', sourceTax: 'no'}, '2027-02-10')[0], 'declaration');
  assert.equal(ids({...base, permit: 'CH', sourceTax: 'unknown'}, '2027-02-10')[0], 'declaration');
});

test('renda acima de 120 000 na fonte: declaração completa obrigatória, sem oferecer escolha', () => {
  const list = ids({...base, highIncome: 'yes'}, '2027-01-15');
  assert.equal(list[0], 'touMandatory');
  assert.ok(!list.includes('touDecide'));
});

test('C ou naturalizado ainda com retenção na fonte: verificar fim da fonte', () => {
  assert.ok(ids({...base, permit: 'C', sourceTax: 'yes'}, '2026-10-21').includes('sourceStopped'));
});

test('independente vê AVS fora das janelas sazonais', () => {
  assert.ok(ids({...base, work: 'independent', sourceTax: 'no', permit: 'C'}, '2026-06-01').includes('avs'));
});

test('permis L/B sem resposta sobre a fonte é tratado como provável fonte', () => {
  assert.equal(likelySourceTaxed({...base, sourceTax: 'unknown'}), true);
  assert.equal(likelySourceTaxed({...base, permit: 'C', sourceTax: 'unknown'}), false);
});

test('sem perfil ainda há ações gerais, em francês também', () => {
  const list = nextActions(null, new Date('2026-10-21'), 'fr');
  assert.equal(list[0].id, 'lamalCompare');
  assert.match(list[0].title, /LAMal/);
  assert.ok(!list.some(a => a.id === 'touDecide'));
});

test('nenhum texto promete economia garantida', () => {
  for (const lang of ['pt', 'fr']) for (const month of [1, 3, 6, 10, 12]) {
    for (const a of nextActions({...base, work: 'both'}, new Date(2026, month - 1, 10), lang)) {
      assert.doesNotMatch(a.title + a.text, /garanti/i);
    }
  }
});
