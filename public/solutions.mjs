// Marketplace de soluções — desacoplado do núcleo financeiro.
// Ordem: serviço oficial gratuito → solução no app → comparação informativa → profissional pago → parceiro.
// A ordenação de parceiros usa adequação, qualidade, transparência e custo — NUNCA a comissão.
export const REG_CLASSES = ['information', 'comparison', 'lead', 'regulated_advice', 'intermediation'];
// Classes que exigem habilitação verificada antes da aprovação (ex.: intermediário de seguros no registro FINMA,
// intermediário de crédito com autorização cantonal segundo a LCC, assessoria fiscal/jurídica conforme a atividade).
export const LICENCE_REQUIRED = new Set(['regulated_advice', 'intermediation']);

const L = (pt, fr, en) => ({pt, fr, en});
export const NEEDS = {
  lamal_premium: {official: [{title: L('Priminfo — comparador oficial da Confederação', 'Priminfo — comparateur officiel de la Confédération', 'Priminfo — official federal comparison tool'), url: 'https://www.priminfo.admin.ch/fr'}], inApp: 'money:savings', comparison: true, categories: ['insurance_broker', 'insurance_advice']},
  lamal_subsidy: {official: [{title: L('Subsídio LAMal — Canton de Vaud (pedido gratuito)', 'Subside LAMal — Canton de Vaud (demande gratuite)', 'LAMal subsidy — Canton of Vaud (free application)'), url: 'https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie'}], inApp: 'life:guide', comparison: false, categories: []},
  tax_return: {official: [{title: L('VaudTax e prazos — Canton de Vaud', 'VaudTax et délais — Canton de Vaud', 'VaudTax and deadlines — Canton of Vaud'), url: 'https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/remplir-ma-declaration-dimpot'}], inApp: 'docs:folders', comparison: false, categories: ['fiduciary']},
  source_tax: {official: [{title: L('AFC — Imposto na fonte', 'AFC — Impôt à la source', 'FTA — Source tax'), url: 'https://www.estv.admin.ch/fr/impot-a-la-source'}], inApp: 'life:guide', comparison: false, categories: ['fiduciary']},
  debts: {official: [{title: L('ch.ch — Cobranças e dívidas', 'ch.ch — Poursuites pour dettes et faillite', 'ch.ch — Debt enforcement'), url: 'https://www.ch.ch/fr/poursuites-pour-dettes-et-faillite'}], inApp: 'money:budget', comparison: false, categories: ['debt_counselling', 'legal']},
  pillar3a: {official: [{title: L('OFAS — O terceiro pilar', 'OFAS — Le troisième pilier', 'FSIO — The third pillar'), url: 'https://www.bsv.admin.ch/fr/le-troisieme-pilier'}], inApp: 'money:p3', comparison: true, categories: ['pension_advice']},
  credit: {official: [{title: L('LCC art. 28 — capacidade de crédito', 'LCC art. 28 — capacité de contracter', 'LCC art. 28 — creditworthiness'), url: 'https://www.fedlex.admin.ch/eli/cc/2002/536/fr#art_28'}], inApp: 'money:install', comparison: false, categories: ['credit_broker', 'debt_counselling']},
  business_accounting: {official: [{title: L('KMU — Portal PME da Confederação', 'PME — Portail PME de la Confédération', 'SME portal of the Confederation'), url: 'https://www.kmu.admin.ch/kmu/fr/home.html'}], inApp: 'money:biz', comparison: false, categories: ['fiduciary']}
};

/**
 * Pontuação de um parceiro para uma necessidade. A comissão não entra na conta (teste automático garante).
 * Pesos: adequação 50, qualidade 25, transparência 15, custo 10.
 */
export function partnerScore(p, need, ctx = {}) {
  const cats = NEEDS[need]?.categories || [];
  const fit = (p.needs?.includes(need) ? 30 : 0) + (cats.includes(p.category) ? 10 : 0) + (p.regions?.includes(ctx.region || 'VD') ? 5 : 0) + (p.languages?.includes(ctx.lang || 'pt') ? 5 : 0);
  const quality = (p.licence?.verifiedAt ? 15 : 0) + Math.min(10, Math.round((p.quality?.score ?? 0) * 2));
  const transparency = (p.commercial?.disclosure ? 10 : 0) + (p.pricing?.text ? 5 : 0);
  const cost = p.pricing?.freeFirstContact ? 10 : p.pricing?.text ? 5 : 0;
  return fit + quality + transparency + cost;
}
export function rankPartners(partners, need, ctx) {
  return partners.filter(p => p.status === 'approved' && p.needs?.includes(need))
    .map(p => ({p, s: partnerScore(p, need, ctx)})).sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name)).map(x => ({...x.p, score: x.s}));
}

/** Escada de soluções para uma necessidade. */
export function solutionLadder(need, partners = [], ctx = {}) {
  const n = NEEDS[need];
  if (!n) return null;
  return {need, steps: [
    {type: 'official_free', items: n.official},
    {type: 'in_app', route: n.inApp},
    ...(n.comparison ? [{type: 'comparison', items: n.official.filter(o => /priminfo|bsv/.test(o.url))}] : []),
    {type: 'partners', items: rankPartners(partners, need, ctx)}
  ]};
}
