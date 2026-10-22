// Base cantonal de Vaud — versionada. Cada entrada traz fontes oficiais, data de conferência e vigência.
// Regra: nenhuma resposta jurídica sai sem uma entrada daqui; sem entrada, o app remete às fontes oficiais.
// Ao atualizar: mude o texto, a data `checkedAt` da fonte e a versão. Nunca edite sem conferir a fonte.
export const KB_VERSION = 'vd-2026.10.2';
export const KB_UPDATED = '2026-10-22';
export const REVIEW_DAYS = {law: 7, app: 90};

const src = (title, url, checkedAt = '2026-10-22') => ({title, url, checkedAt});
export const OFFICIAL_PORTALS = [
  src('ch.ch — Portal da Confederação', 'https://www.ch.ch/fr/'),
  src('vd.ch — Canton de Vaud', 'https://www.vd.ch/'),
  src('AFC — Administration fédérale des contributions', 'https://www.estv.admin.ch/fr')
];

export const KB = [
  {id: 'lamal_subsidy', scope: 'law', canton: 'VD', topic: 'insurance', validFrom: '2026-01-01', validUntil: '2026-12-31', needsProfessional: false,
    terms: ['subside', 'subsidio', 'subsídio', 'subsidy', 'ajuda', 'aide', 'prämienverbilligung', 'ovam', 'lamal', 'prime', 'prêmio'],
    sources: [src('Canton de Vaud — Subside à l’assurance-maladie', 'https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie')],
    pt: 'Em Vaud, o cantão pode pagar parte ou todo o prêmio da LAMal obrigatória, conforme renda e patrimônio (seguros complementares não entram). O pedido é feito on-line em prestations.vd.ch ou, gratuitamente, na agence d’assurances sociales da sua região; o OVAM envia uma decisão por escrito. O direito começa no 1º dia do segundo mês após o pedido (pedido em 20/05 → subsídio a partir de 01/07). Para 2026, a base é a última decisão de taxação definitiva em vigor em 17/10/2025. Mudança de renda de 20 % ou mais deve ser comunicada. O cantão alerta: empresas que cobram para fazer o pedido não são mandatadas por ele.',
    fr: 'Dans le canton de Vaud, l’État peut prendre en charge une partie ou la totalité de la prime LAMal obligatoire selon le revenu et la fortune (les assurances complémentaires ne sont pas couvertes). La demande se fait en ligne sur prestations.vd.ch ou gratuitement auprès de l’agence d’assurances sociales de votre région ; l’OVAM rend une décision écrite. Le droit commence le 1er jour du deuxième mois après la demande (demande le 20.05 → subside dès le 01.07). Pour 2026, la base est la dernière décision de taxation définitive en vigueur au 17.10.2025. Une variation de revenu de 20 % ou plus doit être annoncée. Le canton met en garde : les sociétés payantes ne sont pas mandatées par lui.',
    en: 'In Vaud, the canton can cover part or all of the mandatory LAMal premium depending on income and wealth (supplementary insurance is not covered). Apply online at prestations.vd.ch or free of charge at your regional agence d’assurances sociales; the OVAM issues a written decision. The entitlement starts on the 1st day of the second month after the request (request on 20 May → subsidy from 1 July). For 2026 the basis is the latest final tax assessment in force on 17 Oct 2025. An income change of 20% or more must be reported. The canton warns that companies charging for applications are not mandated by it.'},

  {id: 'lamal_change', scope: 'law', canton: 'CH', topic: 'insurance', validFrom: '2026-10-01', validUntil: '2026-12-31', needsProfessional: false,
    terms: ['lamal', 'assurance', 'seguro', 'insurance', 'franchise', 'franquia', 'deductible', 'trocar', 'changer', 'switch', 'résilier', 'cancelar', 'priminfo', 'caisse'],
    sources: [src('Priminfo — comparateur officiel (OFSP)', 'https://www.priminfo.admin.ch/fr', '2026-10-21'), src('OFSP — Assurance-maladie', 'https://www.bag.admin.ch/fr/assurance-maladie-primes-et-participation-aux-couts', '2026-10-21')],
    pt: 'Para trocar de seguradora LAMal no fim do ano, a carta de rescisão precisa CHEGAR à seguradora até 30/11 (o OFSP recomenda enviar até 15/11, com registro). Baixar a franquia também até 30/11; aumentar a franquia é possível até 31/12. Compare no Priminfo, o comparador oficial: prêmio menor não garante custo total menor (franquia, participação e modelo contam).',
    fr: 'Pour changer de caisse LAMal en fin d’année, la lettre de résiliation doit PARVENIR à l’assureur au plus tard le 30.11 (l’OFSP recommande l’envoi recommandé avant le 15.11). Baisser la franchise : aussi d’ici le 30.11 ; l’augmenter reste possible jusqu’au 31.12. Comparez sur Priminfo, le comparateur officiel : une prime plus basse ne garantit pas un coût total plus bas (franchise, quote-part et modèle comptent).',
    en: 'To switch LAMal insurer at year end, the cancellation letter must REACH the insurer by 30 Nov (the FOPH recommends sending it by registered mail before 15 Nov). Lowering the deductible is also due by 30 Nov; raising it is possible until 31 Dec. Compare on Priminfo, the official comparison tool: a lower premium does not guarantee a lower total cost (deductible, co-payment and model matter).'},

  {id: 'source_tax', scope: 'law', canton: 'CH', topic: 'tax', validFrom: '2021-01-01', validUntil: null, needsProfessional: true,
    terms: ['source', 'fonte', 'quellensteuer', 'tou', 'rectification', 'retificação', 'correção', 'corriger', 'taxation ordinaire', 'tributação ordinária', 'permis b', 'permis l', 'withholding'],
    sources: [src('AFC — Impôt à la source', 'https://www.estv.admin.ch/fr/impot-a-la-source'), src('AFC — Liens vers les autorités cantonales', 'https://www.estv.admin.ch/fr/impot-a-la-source-liens-vers-les-autorites-cantonales')],
    pt: 'Quem mora na Suíça sem permis C (e os fronteiriços) em regra paga imposto na fonte, descontado direto do salário — por isso ele não deve ser lançado de novo como despesa. Pedido de retificação ou de tributação ordinária posterior (TOU): até 31/03 do ano seguinte, prazo de perempção, não prorrogável, na administração fiscal do cantão de residência. Acima de CHF 120 000 brutos por ano, a TOU é obrigatória. A TOU a pedido não pode ser desfeita: vale também para os anos seguintes. Avalie com um profissional antes de pedir.',
    fr: 'Les personnes domiciliées en Suisse sans permis C (et les frontaliers) sont en règle générale imposées à la source, directement sur le salaire — il ne faut donc pas la compter une seconde fois comme dépense. Demande de rectification ou de taxation ordinaire ultérieure (TOU) : jusqu’au 31.03 de l’année suivante, délai de péremption non prolongeable, auprès de l’autorité fiscale du canton de domicile. Au-delà de CHF 120 000 bruts par an, la TOU est obligatoire. Une TOU sur demande est irrévocable et vaut aussi pour les années suivantes. Faites-vous conseiller avant de la demander.',
    en: 'People living in Switzerland without a C permit (and cross-border workers) are generally taxed at source, deducted directly from salary — so it must not be counted again as an expense. Request for correction or subsequent ordinary assessment (TOU): by 31 March of the following year, a strict non-extendable deadline, to the tax authority of the canton of residence. Above CHF 120,000 gross per year, TOU is mandatory. A TOU on request is irrevocable and also applies to later years. Get professional advice before requesting it.'},

  {id: 'tax_return_vd', scope: 'law', canton: 'VD', topic: 'tax', validFrom: '2026-01-01', validUntil: '2026-12-31', needsProfessional: false,
    terms: ['déclaration', 'declaração', 'declaration', 'tax return', 'vaudtax', 'délai', 'prazo', 'deadline', 'prolongation', 'prorrogação', 'extension', 'e-délai', 'acompte', 'impôt', 'imposto', 'tax'],
    sources: [src('Canton de Vaud — Demander un délai pour déposer ma déclaration', 'https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/demander-un-delai-pour-deposer-ma-declaration-dimpot'), src('Canton de Vaud — Remplir ma déclaration (VaudTax)', 'https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/remplir-ma-declaration-dimpot')],
    pt: 'Em Vaud, o prazo legal da declaração de impostos é 15 de março. A prorrogação é gratuita, de preferência pelo e-Délai (número de contribuinte e código de controle da declaração); pedidos até 15/05 podem ir até 30/06, pedidos a partir de 16/05 até 30/09, e todo pedido deve chegar até 30/06. Sem declaração nem prorrogação, chega uma intimação de 30 dias com taxa de CHF 50 — depois dela não há mais prorrogação.',
    fr: 'Dans le canton de Vaud, le délai légal de la déclaration d’impôt est le 15 mars. La prolongation est gratuite, de préférence par e-Délai (numéro de contribuable et code de contrôle de la déclaration) ; demandes jusqu’au 15.05 : délai possible au 30.06 ; dès le 16.05 : au 30.09 ; toute demande doit parvenir d’ici le 30.06. Sans déclaration ni délai, une sommation de 30 jours avec un émolument de CHF 50 est envoyée — ensuite plus aucune prolongation.',
    en: 'In Vaud, the legal deadline for the tax return is 15 March. Extensions are free, preferably via e-Délai (taxpayer number and the return’s control code); requests up to 15 May can be granted until 30 June, requests from 16 May until 30 September, and every request must arrive by 30 June. Without a return or extension, a 30-day summons with a CHF 50 fee is sent — after that no extension is possible.'},

  {id: 'payslip', scope: 'law', canton: 'CH', topic: 'salary', validFrom: '2026-01-01', validUntil: '2026-12-31', needsProfessional: false,
    terms: ['fiche de salaire', 'holerite', 'contracheque', 'payslip', 'salário', 'salaire', 'salary', 'avs', 'ahv', 'chômage', 'desemprego', 'ac ', 'alv', 'déduction', 'desconto', 'lohnabrechnung'],
    sources: [src('AVS/AI — Cotisations des salariés', 'https://www.ahv-iv.ch/fr/Assurances-sociales/Assurance-vieillesse-et-survivants-AVS/Cotisations', '2026-10-21')],
    pt: 'Na ficha de salário, a parte do empregado inclui em 2026: AVS/AI/APG 5,3 % e seguro-desemprego (AC) 1,1 % sobre o salário até CHF 148 200 por ano. Também aparecem a previdência profissional (LPP, varia conforme a caixa e a idade), o seguro de acidentes não profissionais e, se for o caso, o imposto na fonte. Confira se o líquido que você lança no orçamento é o valor que cai na conta.',
    fr: 'Sur la fiche de salaire, la part salarié comprend en 2026 : AVS/AI/APG 5,3 % et assurance-chômage (AC) 1,1 % sur le salaire jusqu’à CHF 148 200 par an. Figurent aussi la prévoyance professionnelle (LPP, variable selon la caisse et l’âge), l’assurance accidents non professionnels et, le cas échéant, l’impôt à la source. Vérifiez que le net saisi dans le budget correspond au montant versé.',
    en: 'On the payslip, the employee share in 2026 includes: AHV/IV/EO 5.3% and unemployment insurance (AC) 1.1% on salary up to CHF 148,200 per year. Occupational pension (LPP, varies by fund and age), non-occupational accident insurance and, where applicable, source tax also appear. Check that the net amount entered in the budget matches what is paid into your account.'},

  {id: 'pillar3a', scope: 'law', canton: 'CH', topic: 'pension', validFrom: '2026-01-01', validUntil: '2026-12-31', needsProfessional: true,
    terms: ['3a', 'pilier', 'pilar', 'pillar', 'prévoyance', 'previdência', 'pension', 'retraite', 'aposentadoria', 'lpp', 'avs'],
    sources: [src('OFAS — Le troisième pilier', 'https://www.bsv.admin.ch/fr/le-troisieme-pilier', '2026-10-21')],
    pt: 'Teto do pilar 3a em 2026: CHF 7 258 para quem tem caixa de pensão (LPP); sem LPP, 20 % da renda profissional, no máximo CHF 36 288. É preciso ter renda de atividade sujeita à AVS. O efeito no imposto depende do seu regime (no imposto na fonte, o 3a entra pela retificação/TOU até 31/03). O simulador do app soma contribuições e não promete rendimento nem economia fiscal.',
    fr: 'Plafond du pilier 3a en 2026 : CHF 7 258 avec caisse de pension (LPP) ; sans LPP, 20 % du revenu de l’activité lucrative, au maximum CHF 36 288. Un revenu d’activité soumis à l’AVS est nécessaire. L’effet fiscal dépend de votre régime (à la source, le 3a passe par la rectification/TOU d’ici le 31.03). Le simulateur additionne les versements, sans promettre de rendement ni d’économie d’impôt.',
    en: 'Pillar 3a cap in 2026: CHF 7,258 with a pension fund (LPP); without LPP, 20% of earned income, up to CHF 36,288. Earned income subject to AHV is required. The tax effect depends on your regime (if taxed at source, 3a goes through the correction/TOU request by 31 March). The app simulator adds contributions and promises neither returns nor tax savings.'},

  {id: 'debt_enforcement', scope: 'law', canton: 'CH', topic: 'debts', validFrom: '2026-01-01', validUntil: null, needsProfessional: true,
    terms: ['commandement de payer', 'zahlungsbefehl', 'poursuite', 'betreibung', 'dívida', 'dette', 'debt', 'opposition', 'oposição', 'saisie', 'penhora', 'office des poursuites'],
    sources: [src('ch.ch — Poursuites pour dettes et faillite', 'https://www.ch.ch/fr/poursuites-pour-dettes-et-faillite')],
    pt: 'Ao receber um commandement de payer (ordem de pagamento), você tem 20 dias para pagar se a dívida for devida. Se contestar a dívida, faça oposição na hora da entrega ou em até 10 dias, por escrito ou oralmente, no office des poursuites. Com oposição, o credor precisa ir à justiça. Sem pagamento nem oposição, o credor pode pedir a continuação e chegar à penhora (inclusive do salário). Procure um serviço de aconselhamento de dívidas e fale com o credor para negociar parcelas.',
    fr: 'À réception d’un commandement de payer, vous avez 20 jours pour payer si la dette est due. Pour la contester, faites opposition à la remise ou dans les 10 jours, par écrit ou oralement, auprès de l’office des poursuites. En cas d’opposition, le créancier doit aller en justice. Sans paiement ni opposition, il peut requérir la continuation jusqu’à la saisie (y compris du salaire). Contactez un service de conseil en dettes et le créancier pour négocier un arrangement.',
    en: 'When you receive a commandement de payer (payment order), you have 20 days to pay if the debt is owed. To dispute it, file an objection when it is delivered or within 10 days, in writing or orally, at the debt enforcement office. With an objection, the creditor must go to court. Without payment or objection, the creditor can request continuation up to seizure (including wages). Contact a debt counselling service and the creditor to negotiate instalments.'},

  {id: 'reminders', scope: 'law', canton: 'CH', topic: 'debts', validFrom: '2026-01-01', validUntil: null, needsProfessional: false,
    terms: ['rappel', 'lembrete', 'reminder', 'mahnung', 'sommation', 'mise en demeure', 'atraso', 'retard', 'late', 'impayé', 'não paga'],
    sources: [src('ch.ch — Poursuites pour dettes et faillite', 'https://www.ch.ch/fr/poursuites-pour-dettes-et-faillite')],
    pt: 'Um rappel (lembrete) ou uma sommation (intimação) mostram que a fatura está atrasada; o rappel não é obrigatório antes de uma cobrança judicial (poursuite). Confira se a fatura é devida e se já não foi paga, pague ou fale logo com o credor para pedir parcelamento. Guarde o comprovante. Se a dívida não for reconhecida, responda por escrito.',
    fr: 'Un rappel ou une sommation indiquent qu’une facture est en retard ; le rappel n’est pas obligatoire avant une poursuite. Vérifiez si la facture est due et pas déjà payée, payez ou contactez rapidement le créancier pour un arrangement. Gardez la preuve. Si vous contestez la dette, répondez par écrit.',
    en: 'A rappel (reminder) or sommation (formal notice) means an invoice is overdue; a reminder is not required before debt enforcement. Check that the invoice is owed and not already paid, then pay or quickly contact the creditor for an arrangement. Keep proof. If you dispute the debt, reply in writing.'},

  {id: 'rent_reference_rate', scope: 'law', canton: 'CH', topic: 'housing', validFrom: '2025-09-02', validUntil: '2026-12-01', needsProfessional: false,
    terms: ['aluguel', 'loyer', 'rent', 'taux de référence', 'taxa de referência', 'reference rate', 'bail', 'moradia', 'logement', 'housing'],
    sources: [src('OFL — Taux d’intérêt de référence', 'https://www.bwo.admin.ch/fr/taux-de-reference', '2026-10-21')],
    pt: 'A taxa de juros de referência para aluguéis é 1,25 % desde 02/09/2025 (confirmada em 01/09/2026; próxima publicação em 01/12/2026). Se o seu contrato foi calculado com uma taxa mais alta, pode haver base para pedir redução do aluguel, conforme as regras do direito de locação. Peça orientação à ASLOCA ou a um profissional antes de agir.',
    fr: 'Le taux d’intérêt de référence applicable aux loyers est de 1,25 % depuis le 02.09.2025 (confirmé le 01.09.2026 ; prochaine publication le 01.12.2026). Si votre loyer repose sur un taux plus élevé, une demande de baisse peut être fondée selon le droit du bail. Renseignez-vous auprès de l’ASLOCA ou d’un professionnel avant d’agir.',
    en: 'The reference interest rate for rents has been 1.25% since 2 Sept 2025 (confirmed on 1 Sept 2026; next publication on 1 Dec 2026). If your rent is based on a higher rate, a reduction request may be justified under tenancy law. Seek advice from ASLOCA or a professional before acting.'},

  {id: 'qrbill', scope: 'app', canton: 'CH', topic: 'bills', validFrom: '2025-11-21', validUntil: null, needsProfessional: false,
    terms: ['qr-fatura', 'qr-facture', 'qr-bill', 'qr-rechnung', 'código qr', 'code qr', 'qr code', 'fatura', 'facture', 'invoice', 'bulletin', 'scanner', 'iban', 'référence', 'referência'],
    sources: [src('SIX — Implementation Guidelines QR-bill v2.3', 'https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-en.pdf')],
    pt: 'A QR-fatura suíça traz credor, IBAN, valor, moeda e referência num código QR (norma SIX v2.3, desde 21/11/2025). O PrivéFinances lê e confere esses dados (IBAN, dígitos de controle da referência), avisa sobre possíveis duplicadas e só registra depois da sua confirmação. O app nunca paga: o pagamento é feito por você no app do seu banco.',
    fr: 'La QR-facture suisse contient créancier, IBAN, montant, monnaie et référence dans un code QR (norme SIX v2.3, depuis le 21.11.2025). PrivéFinances lit et contrôle ces données (IBAN, chiffres de contrôle de la référence), signale les doublons possibles et n’enregistre qu’après votre confirmation. L’app ne paie jamais : vous payez dans l’app de votre banque.',
    en: 'The Swiss QR-bill holds creditor, IBAN, amount, currency and reference in a QR code (SIX standard v2.3, since 21 Nov 2025). PrivéFinances reads and checks this data (IBAN, reference check digits), flags possible duplicates and only records it after your confirmation. The app never pays: you pay in your bank’s app.'},

  {id: 'budget_method', scope: 'app', canton: 'CH', topic: 'budget', validFrom: '2026-10-01', validUntil: null, needsProfessional: false,
    terms: ['orçamento', 'budget', 'economizar', 'économiser', 'save', 'saldo', 'solde', 'balance', 'meta', 'objectif', 'goal', 'reserva', 'provision'],
    sources: [],
    pt: 'No orçamento do app, salário líquido e rendas entram como confirmadas ou estimadas; contas trimestrais, semestrais e anuais viram uma reserva mensal sem ser contadas duas vezes; a projeção de 30 dias usa as datas reais e mostra o menor saldo. Recomendações só mostram economia quando você informa um valor-alvo; uma economia só conta como realizada depois que você confirma o novo valor.',
    fr: 'Dans le budget de l’app, salaire net et revenus sont confirmés ou estimés ; les charges trimestrielles, semestrielles et annuelles deviennent une provision mensuelle sans double comptage ; la projection sur 30 jours suit les vraies dates et montre le solde le plus bas. Une économie n’est affichée que si vous saisissez un montant cible et n’est comptée comme réalisée qu’après confirmation du nouveau montant.',
    en: 'In the app budget, net salary and income are confirmed or estimated; quarterly, half-yearly and annual bills become a monthly provision without double counting; the 30-day projection follows real dates and shows the lowest balance. A saving is only shown when you enter a target amount and only counts as realised after you confirm the new amount.'}
];

/** Termos administrativos que o scanner reconhece em cartas e faturas. */
export const ADMIN_TERMS = [
  {id: 'commandement', severity: 'critical', deadlineDays: 10, kbId: 'debt_enforcement', patterns: ['commandement de payer', 'zahlungsbefehl', 'precetto esecutivo']},
  {id: 'sommation', severity: 'high', kbId: 'reminders', patterns: ['sommation', 'mise en demeure', 'letzte mahnung']},
  {id: 'rappel', severity: 'medium', kbId: 'reminders', patterns: ['rappel', 'mahnung', 'zahlungserinnerung']},
  {id: 'subside', severity: 'info', kbId: 'lamal_subsidy', patterns: ['subside', 'prämienverbilligung', 'ovam']},
  {id: 'source_tax', severity: 'info', kbId: 'source_tax', patterns: ['impôt à la source', 'impot a la source', 'quellensteuer', 'imposto na fonte']},
  {id: 'payslip', severity: 'info', kbId: 'payslip', patterns: ['fiche de salaire', 'décompte de salaire', 'lohnabrechnung', 'bulletin de salaire']},
  {id: 'tax_return', severity: 'info', kbId: 'tax_return_vd', patterns: ['déclaration d’impôt', "déclaration d'impôt", 'vaudtax', 'acompte']}
];

const fold = s => String(s || '').toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
const pick = (e, lang) => e[lang] || e.pt;

export function reviewDue(source, scope, now = new Date()) {
  return new Date(source.checkedAt + 'T12:00:00Z').getTime() + REVIEW_DAYS[scope] * 86400000 < now.getTime();
}

/**
 * Busca na base versionada. Só devolve textos conferidos; sem correspondência,
 * declara que não há fonte verificada e indica os portais oficiais.
 */
export function searchKb(question, lang = 'pt', now = new Date(), limit = 3) {
  const q = ' ' + fold(question) + ' ';
  const scoredRaw = KB.map(e => ({e, score: e.terms.reduce((s, t) => s + (q.includes(fold(t)) ? (t.length > 6 ? 2 : 1) : 0), 0)}))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  // Só entradas com pelo menos metade da relevância da melhor (evita respostas vizinhas por uma palavra solta).
  const best = scoredRaw[0]?.score || 0;
  const scored = scoredRaw.filter(x => x.score * 2 >= best).slice(0, limit).map(x => x.e);
  const today = now.toISOString().slice(0, 10);
  const items = scored.map(e => ({
    id: e.id, topic: e.topic, canton: e.canton, scope: e.scope, text: pick(e, lang), needsProfessional: e.needsProfessional,
    validFrom: e.validFrom, validUntil: e.validUntil, expired: !!(e.validUntil && e.validUntil < today),
    sources: e.sources.map(s => ({...s, reviewDue: reviewDue(s, e.scope, now)}))
  }));
  return {kbVersion: KB_VERSION, updatedAt: KB_UPDATED, items, noVerifiedSource: items.length === 0, officialPortals: OFFICIAL_PORTALS};
}
