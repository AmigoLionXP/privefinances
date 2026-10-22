// Regras puras de documentos, compartilhadas entre servidor e PWA:
// normalização, chave de duplicidade, pastas virtuais e reconhecimento de termos administrativos.
import {ADMIN_TERMS} from './canton-vd.mjs';

export const DOC_KINDS = ['qrbill', 'invoice', 'receipt', 'payslip', 'tax', 'contract', 'letter'];
export const TAX_CATEGORIES = ['pillar3a', 'medical', 'childcare', 'transport', 'training', 'insurance', 'tax', 'salary'];

export const normalizeName = s => String(s || '').normalize('NFKC').toLocaleLowerCase('fr').replace(/[.,;:'"’]/g, ' ')
  .replace(/\b(sa|ag|sàrl|sarl|gmbh|ltd|s a)\b/g, ' ').replace(/\s+/g, ' ').trim();
export const normalizeRef = s => String(s || '').replace(/\s+/g, '').toUpperCase();

/** Chave exata: mesma fatura (IBAN + referência + valor + moeda) ou, sem referência, credor + valor + nº/data. */
export function duplicateKey(d) {
  const ref = normalizeRef(d.reference);
  if (d.iban && ref) return ['ref', normalizeRef(d.iban), ref, d.amount ?? '', d.currency || ''].join('|');
  return ['doc', normalizeName(d.creditor), d.amount ?? '', d.currency || '', d.invoiceNumber || d.documentDate || d.dueDate || ''].join('|');
}

const dayDiff = (a, b) => Math.abs(new Date(a + 'T12:00:00Z') - new Date(b + 'T12:00:00Z')) / 86400000;

/**
 * Possíveis duplicados de `doc` entre `others`.
 * reason: same_payment_reference | same_file | same_document | similar_amount_date (só um aviso).
 */
export function findDuplicates(doc, others) {
  const out = [], key = duplicateKey(doc);
  for (const o of others) {
    if (o.id === doc.id) continue;
    let reason = null;
    if (doc.fileHash && o.fileHash && doc.fileHash === o.fileHash) reason = 'same_file';
    else if (duplicateKey(o) === key) reason = doc.reference ? 'same_payment_reference' : 'same_document';
    else if (doc.amount != null && doc.amount === o.amount && normalizeName(doc.creditor) && normalizeName(doc.creditor) === normalizeName(o.creditor)) {
      const a = doc.dueDate || doc.documentDate, b = o.dueDate || o.documentDate;
      if (a && b && dayDiff(a, b) <= 31) reason = 'similar_amount_date';
    }
    if (reason) out.push({id: o.id, reason, status: o.status, creditor: o.creditor, amount: o.amount, dueDate: o.dueDate || null});
  }
  return out;
}

/** Pastas virtuais: por credor, por ano fiscal e “para análise fiscal”. Nada é deduzido automaticamente. */
export function folders(docs) {
  const creditors = new Map(), years = new Map(), tax = [];
  for (const d of docs) {
    const k = normalizeName(d.creditor) || '—';
    const c = creditors.get(k) || {key: k, name: d.creditor || '—', count: 0, open: 0, openAmount: 0, ids: []};
    c.count++; c.ids.push(d.id);
    if (d.status === 'confirmed' && d.paymentState !== 'paid' && d.amount && d.currency === 'CHF' && ['qrbill', 'invoice'].includes(d.kind)) { c.open++; c.openAmount += d.amount; }
    creditors.set(k, c);
    if (d.taxYear) { const y = years.get(d.taxYear) || {year: d.taxYear, count: 0, ids: []}; y.count++; y.ids.push(d.id); years.set(d.taxYear, y); }
    if (d.taxRelevant) tax.push(d.id);
  }
  return {
    creditors: [...creditors.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    years: [...years.values()].sort((a, b) => b.year - a.year),
    taxReview: tax
  };
}

/** Vencimentos de documentos confirmados e não pagos, por data. */
export function openBills(docs, today) {
  return docs.filter(d => d.status === 'confirmed' && d.paymentState !== 'paid' && d.dueDate && ['qrbill', 'invoice'].includes(d.kind))
    .map(d => ({id: d.id, creditor: d.creditor, amount: d.amount, currency: d.currency, dueDate: d.dueDate, late: d.dueDate < today}))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

const fold = s => String(s || '').toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Reconhece termos administrativos suíços num texto (carta, fatura). Só orientação, nunca decisão. */
export function recognizeTerms(text) {
  const t = fold(text);
  if (!t.trim()) return [];
  return ADMIN_TERMS.filter(x => x.patterns.some(p => t.includes(fold(p)))).map(x => ({id: x.id, severity: x.severity, deadlineDays: x.deadlineDays ?? null, kbId: x.kbId}));
}
