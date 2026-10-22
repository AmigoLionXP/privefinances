// Minhas Simulações — estimativas claramente identificadas, sem oferta de mercado.
// Crédito: taxa máxima legal de 10 % (crédito em dinheiro) e 12 % (cheque especial/cartão) desde 01.01.2026;
// o exame de capacidade (LCC art. 28) considera o reembolso em 36 meses e o mínimo vital do cantão.
export const SIM_SOURCES = {
  maxRate: {title: 'Conseil fédéral — taux maximal des crédits à la consommation (31.10.2025)', url: 'https://www.admin.ch/fr/newnsb/DDMAgqQLfpn8NHgjWIIrt', checkedAt: '2026-10-22'},
  lcc28: {title: 'LCC art. 28 — Examen de la capacité de contracter un crédit', url: 'https://www.fedlex.admin.ch/eli/cc/2002/536/fr#art_28', checkedAt: '2026-10-22'}
};
export const LEGAL_MAX_BPS = {cash: 1000, overdraft: 1200};

export function annuity(principal, rateBps, months) {
  if (months <= 0) return 0;
  const r = rateBps / 10000 / 12;
  return Math.round(r === 0 ? principal / months : principal * r / (1 - Math.pow(1 + r, -months)));
}

/**
 * Crédito ao consumo: parcela, custo total, alerta de taxa acima do máximo legal e teste de 36 meses
 * contra o saldo mensal do orçamento (aproximação — o exame oficial usa o mínimo vital cantonal).
 */
export function creditSimulation({principal, rateBps, months, fees = 0, kind = 'cash'}, monthlyAvailable) {
  const payment = annuity(principal, rateBps, months), total = payment * months + fees;
  const payment36 = annuity(principal, rateBps, Math.min(36, months));
  const warnings = [];
  if (rateBps > LEGAL_MAX_BPS[kind]) warnings.push('rate_above_legal_max');
  if (months > 36) warnings.push('capacity_tested_over_36_months');
  let affordability = 'unknown';
  if (monthlyAvailable != null) affordability = monthlyAvailable <= 0 ? 'no_margin' : payment36 > monthlyAvailable ? 'not_affordable' : payment36 > monthlyAvailable * 0.6 ? 'tight' : 'ok';
  return {payment, total, cost: total - principal, payment36, legalMaxBps: LEGAL_MAX_BPS[kind], warnings, affordability, estimate: true, marketOffer: false, sources: SIM_SOURCES};
}

/** Meta de economia: em quantos meses chego lá com a capacidade atual (sem juros). */
export function goalProjection(target, saved, monthly) {
  const left = Math.max(0, target - saved);
  if (left === 0) return {months: 0, reached: true};
  if (monthly <= 0) return {months: null, reached: false};
  return {months: Math.ceil(left / monthly), reached: false};
}
