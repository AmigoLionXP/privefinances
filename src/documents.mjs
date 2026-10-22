// Validação estrita dos documentos (faturas QR, recibos, holerites, cartas…).
import {fail, date} from './validation.mjs';
import {validIban, validQrr, validScor} from '../public/qrbill.mjs';
import {DOC_KINDS, recognizeTerms} from '../public/documents.mjs';
import {EXPENSE_CATEGORIES} from './budget-engine.mjs';

const str = (v, max, name) => { if (v == null || v === '') return ''; if (typeof v !== 'string' || v.length > max) fail('invalid_' + name); return v.trim(); };
const optDate = v => (v == null || v === '' ? null : date(v));

export function documentInput(v, {today}) {
  if (!v || typeof v !== 'object') fail('invalid_document');
  const kind = DOC_KINDS.includes(v.kind) ? v.kind : fail('invalid_kind');
  const creditor = str(v.creditor, 120, 'creditor');
  if (['qrbill', 'invoice', 'receipt'].includes(kind) && !creditor) fail('creditor_required');
  const amount = v.amount == null || v.amount === '' ? null : (Number.isSafeInteger(v.amount) && v.amount >= 0 && v.amount <= 99_999_999_999 ? v.amount : fail('invalid_amount'));
  const currency = v.currency == null ? 'CHF' : (['CHF', 'EUR'].includes(v.currency) ? v.currency : fail('invalid_currency'));
  const iban = str(v.iban, 34, 'iban').replace(/\s+/g, '').toUpperCase();
  if (iban && !validIban(iban)) fail('invalid_iban');
  const referenceType = v.referenceType == null || v.referenceType === '' ? null : (['QRR', 'SCOR', 'NON'].includes(v.referenceType) ? v.referenceType : fail('invalid_reference_type'));
  const reference = str(v.reference, 40, 'reference').replace(/\s+/g, '').toUpperCase();
  if (referenceType === 'QRR' && !validQrr(reference)) fail('invalid_qrr_reference');
  if (referenceType === 'SCOR' && !validScor(reference)) fail('invalid_scor_reference');
  const dueDate = optDate(v.dueDate), documentDate = optDate(v.documentDate);
  const category = v.category == null || v.category === '' ? null : (EXPENSE_CATEGORIES.includes(v.category) ? v.category : fail('invalid_category'));
  const paymentState = kind === 'receipt' ? 'paid' : (['paid', 'unpaid', 'unknown'].includes(v.paymentState) ? v.paymentState : 'unpaid');
  const taxYear = v.taxYear == null ? Number((documentDate || dueDate || today).slice(0, 4)) : (Number.isInteger(v.taxYear) && v.taxYear >= 2000 && v.taxYear <= 2100 ? v.taxYear : fail('invalid_tax_year'));
  const message = str(v.message, 140, 'message'), notes = str(v.notes, 2000, 'notes');
  const invoiceNumber = str(v.invoiceNumber, 60, 'invoice_number');
  const source = ['qr', 'manual', 'ocr'].includes(v.source) ? v.source : 'manual';
  const qrWarnings = Array.isArray(v.qrWarnings) ? v.qrWarnings.filter(x => typeof x === 'string' && /^[a-z_]{1,60}$/.test(x)).slice(0, 10) : [];
  return {
    kind, source, creditor, amount, currency, iban, referenceType, reference: referenceType === 'NON' ? '' : reference,
    dueDate, documentDate, invoiceNumber, category, taxRelevant: v.taxRelevant === true, taxYear, paymentState,
    paidAt: paymentState === 'paid' ? (optDate(v.paidAt) || today) : null, message, notes, qrWarnings,
    terms: recognizeTerms([creditor, message, notes].join(' '))
  };
}

export function budgetLink(v) {
  const mode = v?.mode ?? 'none';
  if (!['oneoff', 'existing', 'none'].includes(mode)) fail('invalid_budget_mode');
  if (mode === 'existing' && (typeof v.expenseId !== 'string' || !v.expenseId)) fail('expense_id_required');
  return {mode, expenseId: mode === 'existing' ? v.expenseId : null};
}
