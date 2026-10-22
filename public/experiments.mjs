// Testes de conversão: atribuição determinística de variante por usuário (sem cookies de terceiros).
// Só mudam textos de benefício; nunca bloqueiam informação essencial nem alertas.
export const EXPERIMENTS = {
  upgrade_copy: {variants: ['benefit', 'checklist'], startedAt: '2026-10-22'}
};
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
export function variantFor(seed, experiment) {
  const e = EXPERIMENTS[experiment];
  if (!e || !seed) return e?.variants[0] ?? null;
  return e.variants[fnv(experiment + ':' + seed) % e.variants.length];
}
