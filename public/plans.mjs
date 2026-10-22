// Planos e permissões. Os preços são HIPÓTESES comerciais a validar — nenhuma cobrança real é feita
// sem autorização expressa (PAYMENTS_ENABLED) e sem preços configurados no provedor.
export const PLANS = {
  essential: {id: 'essential', priceMonthly: 0, hypothesis: false},
  plus: {id: 'plus', priceMonthly: 690, hypothesis: true},
  business: {id: 'business', priceMonthly: 1490, hypothesis: true}
};
export const PLAN_ORDER = ['essential', 'plus', 'business'];

// O que nunca é bloqueado para forçar conversão: informação pública, alertas críticos, exportar e excluir dados.
export const ALWAYS_FREE = ['budget', 'manual_expenses', 'deadlines_basic', 'public_guides', 'diagnosis', 'critical_alerts', 'top3_recommendations', 'guide', 'export_delete', 'scanner_basic', 'solutions_ladder'];
const PLUS = ['scanner_unlimited', 'budget_ai_full', 'document_archive', 'tax_folders', 'advanced_alerts', 'simulations_advanced', 'history'];
const BUSINESS = ['business_module', 'business_cashflow', 'accountant_export'];
export const FEATURES = {
  essential: new Set(ALWAYS_FREE),
  plus: new Set([...ALWAYS_FREE, ...PLUS]),
  business: new Set([...ALWAYS_FREE, ...PLUS, ...BUSINESS])
};
export const LIMITS = {essential: {documents: 20, recommendations: 3}, plus: {documents: 1000, recommendations: 8}, business: {documents: 1000, recommendations: 8}};

export const can = (plan, feature) => (FEATURES[plan] || FEATURES.essential).has(feature);
export const limit = (plan, key) => (LIMITS[plan] || LIMITS.essential)[key];
/** Plano mínimo que libera um recurso (para a mensagem de upgrade). */
export const requiredPlan = feature => PLAN_ORDER.find(p => can(p, feature)) || 'business';
