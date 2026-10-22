// Leitor de QR-fatura suíça (Swiss Payments Code).
// Referência: SIX, "Swiss Implementation Guidelines for the QR-bill", v2.3, válida desde 21.11.2025
// https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-en.pdf
// Só leitura: o PrivéFinances nunca executa pagamentos.
export const QR_SPEC = {name: 'SIX IG QR-bill', version: '2.3', validFrom: '2025-11-21', checkedAt: '2026-10-22',
  url: 'https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-en.pdf'};

const MAX_TOTAL = 997;
const QRR_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

/** Resto módulo 97 de uma string numérica longa (sem BigInt para manter compatibilidade). */
function mod97(digits) {
  let r = 0;
  for (let i = 0; i < digits.length; i += 7) r = Number(String(r) + digits.slice(i, i + 7)) % 97;
  return r;
}
const lettersToDigits = s => s.toUpperCase().replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));

export function validIban(iban) {
  const v = String(iban || '').replace(/\s+/g, '').toUpperCase();
  if (!/^(CH|LI)\d{2}[0-9A-Z]{17}$/.test(v)) return false;
  return mod97(lettersToDigits(v.slice(4) + v.slice(0, 4))) === 1;
}
/** QR-IBAN: IID (posições 5–9) entre 30000 e 31999. */
export function isQrIban(iban) {
  const v = String(iban || '').replace(/\s+/g, '').toUpperCase();
  const iid = Number(v.slice(4, 9));
  return validIban(v) && iid >= 30000 && iid <= 31999;
}
/** Referência QR (QRR): 27 dígitos, o último é o dígito de controle módulo 10 recursivo. */
export function validQrr(ref) {
  const v = String(ref || '').replace(/\s+/g, '');
  if (!/^\d{27}$/.test(v)) return false;
  let carry = 0;
  for (const d of v.slice(0, 26)) carry = QRR_TABLE[(carry + Number(d)) % 10];
  return (10 - carry) % 10 === Number(v[26]);
}
/** Referência do credor ISO 11649 (SCOR): RF + 2 dígitos de controle + até 21 caracteres, módulo 97-10. */
export function validScor(ref) {
  const v = String(ref || '').replace(/\s+/g, '').toUpperCase();
  if (!/^RF\d{2}[0-9A-Z]{1,21}$/.test(v)) return false;
  return mod97(lettersToDigits(v.slice(4) + v.slice(0, 4))) === 1;
}
export const formatIban = iban => String(iban || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
export const formatQrr = ref => {
  const v = String(ref || '').replace(/\s+/g, '');
  return v.length === 27 ? v.slice(0, 2) + ' ' + v.slice(2).replace(/(.{5})/g, '$1 ').trim() : v;
};

// Conjunto de caracteres da v2.3: Latin básico, Latin-1, Latin Extended-A, Ș ș Ț ț e €.
const ALLOWED = /^[ -~ -ÿĀ-ſȘ-ț€]*$/;

function address(lines, i, group, errors, warnings, required) {
  const [type, name, a, b, postcode, town, country] = lines.slice(i, i + 7).map(x => (x ?? '').trim());
  const empty = !type && !name && !a && !b && !postcode && !town && !country;
  if (empty) { if (required) errors.push(group + '_missing'); return null; }
  if (type === 'K') warnings.push(group + '_combined_address_legacy');
  else if (type !== 'S') { errors.push(group + '_invalid_address_type'); return null; }
  if (!name || name.length > 70) errors.push(group + '_invalid_name');
  if (!/^[A-Z]{2}$/.test(country)) errors.push(group + '_invalid_country');
  if (type === 'S') {
    if (a.length > 70 || b.length > 16 || postcode.length > 16 || town.length > 35) errors.push(group + '_field_too_long');
    if (!postcode || !town) errors.push(group + '_postcode_town_required');
    return {type, name, street: a, number: b, postcode, town, country};
  }
  // Tipo K (endereço combinado, versões anteriores): linhas 1 e 2 livres.
  return {type, name, street: a, number: '', postcode: '', town: b, country};
}

/** Lê as informações de faturação Swico S1 (//S1/10/…/11/…/40/…). Tudo opcional e só sugestivo. */
export function parseBillingS1(raw) {
  if (!raw || !raw.startsWith('//S1/')) return null;
  const out = {};
  const parts = raw.slice(5).split(/(?<!\\)\//).map(x => x.replace(/\\\//g, '/'));
  for (let i = 0; i + 1 < parts.length; i += 2) out[parts[i]] = parts[i + 1];
  const yymmdd = v => /^\d{6}$/.test(v || '') ? `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}` : null;
  const res = {invoiceNumber: out['10'] || null, documentDate: yymmdd(out['11']?.slice(0, 6)), customerRef: out['20'] || null, uid: out['30'] || null, conditions: out['40'] || null, dueDate: null};
  // /40/ "desconto:dias;…"; o vencimento líquido é a entrada com 0 % de desconto.
  if (res.documentDate && res.conditions) {
    const net = res.conditions.split(';').map(c => c.split(':')).find(([p]) => Number(p) === 0);
    const days = net ? Number(net[1]) : NaN;
    if (Number.isInteger(days) && days >= 0 && days <= 365) {
      const d = new Date(res.documentDate + 'T12:00:00Z');
      if (Number.isFinite(d.getTime())) { d.setUTCDate(d.getUTCDate() + days); res.dueDate = d.toISOString().slice(0, 10); }
    }
  }
  return res;
}

/**
 * Analisa o conteúdo de texto de um Swiss QR Code.
 * Devolve {ok, errors, warnings, data}. ok=false significa que a fatura não segue a norma
 * e não deve ser registrada sem revisão completa do usuário.
 */
export function parseQrBill(text) {
  const errors = [], warnings = [];
  if (typeof text !== 'string' || !text.trim()) return {ok: false, errors: ['empty'], warnings, data: null};
  if (text.length > MAX_TOTAL) errors.push('too_long');
  const crlf = text.includes('\r\n'), lf = /(^|[^\r])\n/.test(text);
  if (crlf && lf) warnings.push('mixed_line_separators');
  let body = text.replace(/^﻿/, '');
  if (/\r?\n$/.test(body)) { warnings.push('trailing_line_break'); body = body.replace(/(\r?\n)+$/, ''); }
  const lines = body.split(/\r?\n/);
  if (lines[0] !== 'SPC') return {ok: false, errors: ['not_swiss_qr_code'], warnings, data: null};
  if (lines.length < 31) return {ok: false, errors: ['missing_elements'], warnings, data: null};
  if (lines[1] !== '0200') errors.push('unsupported_version');
  if (lines[2] !== '1') errors.push('unsupported_coding');
  if (!ALLOWED.test(body.replace(/\r?\n/g, ''))) warnings.push('characters_outside_charset');

  const iban = lines[3].trim().toUpperCase();
  const ibanOk = validIban(iban);
  if (!ibanOk) errors.push('invalid_iban');
  const qrIban = ibanOk && isQrIban(iban);
  const creditor = address(lines, 4, 'creditor', errors, warnings, true);
  if (lines.slice(11, 18).some(x => x.trim())) warnings.push('ultimate_creditor_must_be_empty');

  const amtRaw = lines[18].trim();
  let amount = null;
  if (amtRaw) {
    if (!/^\d{1,9}\.\d{2}$/.test(amtRaw)) errors.push('invalid_amount');
    else {
      amount = Math.round(Number(amtRaw) * 100);
      if (amount < 1) errors.push('invalid_amount');
    }
  }
  const currency = lines[19].trim();
  if (!['CHF', 'EUR'].includes(currency)) errors.push('invalid_currency');
  const debtor = address(lines, 20, 'debtor', errors, warnings, false);

  const refType = lines[27].trim();
  const reference = lines[28].trim().replace(/\s+/g, '');
  if (!['QRR', 'SCOR', 'NON'].includes(refType)) errors.push('invalid_reference_type');
  if (qrIban && refType !== 'QRR') errors.push('qr_iban_requires_qrr');
  if (ibanOk && !qrIban && refType === 'QRR') errors.push('qrr_requires_qr_iban');
  if (refType === 'QRR' && !validQrr(reference)) errors.push('invalid_qrr_reference');
  if (refType === 'SCOR' && !validScor(reference)) errors.push('invalid_scor_reference');
  if (refType === 'NON' && reference) errors.push('reference_must_be_empty');

  const message = (lines[29] ?? '').trim();
  if (lines[30] !== 'EPD') errors.push('missing_trailer');
  const billingRaw = (lines[31] ?? '').trim();
  if (message.length + billingRaw.length > 140) errors.push('additional_information_too_long');
  const alt = lines.slice(32).map(x => x.trim()).filter(Boolean);
  if (alt.length > 2 || alt.some(x => x.length > 100)) errors.push('invalid_alternative_schemes');

  return {
    ok: errors.length === 0, errors, warnings,
    data: {
      spec: QR_SPEC.version, iban, qrIban, creditor, amount, currency: currency || null, debtor,
      referenceType: refType || null, reference: refType === 'NON' ? '' : reference, message,
      billing: billingRaw ? {raw: billingRaw, ...(parseBillingS1(billingRaw) || {})} : null,
      alternativeSchemes: alt
    }
  };
}
