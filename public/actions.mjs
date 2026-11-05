// "Suas 3 ações agora": regras determinísticas, sem IA e sem cálculo fiscal.
// Cada ação traz um prazo público geral e uma fonte oficial. Nada aqui promete economia.

export const PROFILE_KEY = 'privefinances-profile-v1';

export const questions = [
  {id: 'permit', options: ['L', 'B', 'C', 'CH', 'other']},
  {id: 'work', options: ['employee', 'independent', 'both']},
  {id: 'sourceTax', options: ['yes', 'no', 'unknown']},
  {id: 'highIncome', options: ['no', 'yes', 'unknown']},
  {id: 'household', options: ['single', 'couple']},
  {id: 'pillar3a', options: ['yes', 'no', 'unknown']}
];

export const sources = {
  priminfo: 'https://www.priminfo.admin.ch/fr',
  subsidy: 'https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie',
  pillar3a: 'https://www.bsv.admin.ch/fr/votre-cotisation-au-3e-pilier',
  sourceTax: 'https://www.vd.ch/etat-droit-finances/impots/pour-les-employeurs/impot-a-la-source/personnes-imposees-a-la-source-/-sourciers',
  declaration: 'https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/remplir-ma-declaration-dimpot',
  avs: 'https://www.ahv-iv.ch/p/2.02.f'
};

const text = {
  pt: {
    lamalCompare: ['Compare sua LAMal para 2027', 'Os prêmios mudam todo ano. Compare no Priminfo, o comparador oficial, e decida com calma. Para trocar o seguro básico, a carta de rescisão precisa chegar à seguradora até 30/11; o OFSP recomenda enviar até 15/11.'],
    lamalSubsidy: ['Veja se você tem direito ao subsídio do prêmio', 'Em Vaud, quem tem renda modesta pode receber ajuda para pagar o plano de saúde. O direito começa no 1º dia do 2º mês após o pedido, e a ajuda para preencher é gratuita na agência da sua região.'],
    pillar3aHas: ['Confira sua previdência 3a até 31/12', 'Só conta para o ano o valor creditado até 31/12. Os bancos costumam pedir o pagamento alguns dias antes. Confira quanto já pagou e o teto do seu caso.'],
    pillar3aNo: ['Entenda se o 3a faz sentido para você', 'O 3a é uma poupança para a aposentadoria que pode reduzir a renda tributável. Antes de abrir, compare custos e condições. Pagamentos de 2026 contam se chegarem até 31/12.'],
    touDecide: ['Decida até 31/03 se quer a declaração completa (TOU)', 'Quem paga imposto na fonte pode pedir a taxation ordinaire ultérieure (TOU) para incluir deduções como o 3a. O pedido é definitivo: faça a conta antes, de preferência com um profissional.'],
    touPrepare: ['Guarde os comprovantes para avaliar a TOU', 'Se você paga imposto na fonte, reúna desde já certificado de salário, atestado 3a e despesas. Eles serão necessários para decidir sobre a TOU até 31/03.'],
    touMandatory: ['Prepare a declaração completa, obrigatória no seu caso', 'Com renda bruta acima de CHF 120.000 sujeita à fonte, a declaração completa é obrigatória. Reúna os documentos e, se possível, conte com um profissional.'],
    declaration: ['Prepare sua declaração de impostos', 'Reúna certificado de salário, atestados 3a, extratos bancários e despesas. Confira o prazo indicado no envio oficial do cantão.'],
    sourceStopped: ['Confira se o imposto na fonte parou', 'Com permis C ou passaporte suíço, o imposto na fonte termina no mês seguinte à mudança e passa a valer a declaração normal. Veja no holerite se o desconto parou.'],
    checkSourceTax: ['Descubra se você paga imposto na fonte', 'Olhe seu holerite: se houver um desconto “impôt à la source”, você paga imposto na fonte. Isso muda os prazos que valem para você.'],
    avs: ['Independente: confira sua AVS', 'Quem trabalha por conta própria paga as próprias contribuições AVS à caixa de compensação. Confira a inscrição e os pagamentos por conta (acomptes) do ano.'],
    budget: ['Organize seu orçamento do mês', 'Anote quanto entra e quanto sai. Isso ajuda nas outras decisões.']
  },
  fr: {
    lamalCompare: ['Comparez votre LAMal pour 2027', 'Les primes changent chaque année. Comparez sur Priminfo, le comparateur officiel, et décidez sereinement. Pour changer d’assurance de base, la résiliation doit parvenir à l’assureur au plus tard le 30.11 ; l’OFSP recommande de l’envoyer d’ici le 15.11.'],
    lamalSubsidy: ['Vérifiez votre droit au subside', 'Dans le canton de Vaud, les personnes aux revenus modestes peuvent recevoir une aide pour leurs primes. Le droit commence le 1er jour du 2e mois suivant la demande ; l’agence d’assurances sociales de votre région aide gratuitement à la remplir.'],
    pillar3aHas: ['Vérifiez votre prévoyance 3a d’ici le 31.12', 'Seul le montant crédité au 31.12 compte pour l’année. Les banques demandent souvent le versement quelques jours avant. Vérifiez ce que vous avez déjà versé et le plafond applicable.'],
    pillar3aNo: ['Le 3a est-il utile pour vous ?', 'Le 3a est une épargne retraite qui peut réduire le revenu imposable. Avant d’ouvrir un compte, comparez frais et conditions. Les versements 2026 comptent s’ils sont crédités au plus tard le 31.12.'],
    touDecide: ['Décidez d’ici le 31.03 si vous voulez la déclaration complète (TOU)', 'Si vous êtes imposé à la source, vous pouvez demander une taxation ordinaire ultérieure (TOU) pour faire valoir des déductions comme le 3a. La demande est irrévocable : faites le calcul avant, idéalement avec un professionnel.'],
    touPrepare: ['Gardez vos justificatifs pour évaluer la TOU', 'Si vous êtes imposé à la source, réunissez dès maintenant le certificat de salaire, l’attestation 3a et vos frais. Ils serviront à décider de la TOU avant le 31.03.'],
    touMandatory: ['Préparez la déclaration complète, obligatoire dans votre cas', 'Avec un revenu brut soumis à la source supérieur à CHF 120 000, la déclaration complète est obligatoire. Réunissez vos documents et, si possible, faites-vous accompagner.'],
    declaration: ['Préparez votre déclaration d’impôt', 'Réunissez certificat de salaire, attestations 3a, relevés bancaires et frais. Vérifiez le délai indiqué dans l’envoi officiel du canton.'],
    sourceStopped: ['Vérifiez la fin de l’impôt à la source', 'Avec un permis C ou la nationalité suisse, l’impôt à la source prend fin le mois suivant le changement et la taxation ordinaire s’applique. Vérifiez sur votre fiche de salaire que la retenue a cessé.'],
    checkSourceTax: ['Êtes-vous imposé à la source ?', 'Regardez votre fiche de salaire : une retenue « impôt à la source » signifie une imposition à la source. Les délais qui vous concernent en dépendent.'],
    avs: ['Indépendant : vérifiez votre AVS', 'En activité indépendante, vous versez vous-même vos cotisations AVS à la caisse de compensation. Vérifiez votre affiliation et les acomptes de l’année.'],
    budget: ['Organisez votre budget du mois', 'Notez ce qui entre et ce qui sort. Cela éclaire les autres décisions.']
  }
};

function iso(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

export function isComplete(profile) {
  return !!profile && questions.every(q => q.options.includes(profile[q.id]));
}

// Provavelmente tributado na fonte: resposta explícita, ou permis L/B sem resposta.
export function likelySourceTaxed(p) {
  if (p.sourceTax === 'yes') return true;
  if (p.sourceTax === 'no') return false;
  return p.permit === 'L' || p.permit === 'B';
}

export function nextActions(profile, now = new Date(), lang = 'pt') {
  const t = text[lang === 'fr' ? 'fr' : 'pt'];
  const year = now.getFullYear(), month = now.getMonth() + 1;
  const list = [];
  const add = (id, priority, deadline, source, page) => list.push({id, priority, title: t[id][0], text: t[id][1], deadline, source, page});
  const p = isComplete(profile) ? profile : null;
  const settled = p && (p.permit === 'C' || p.permit === 'CH');
  const sourceTaxed = p ? likelySourceTaxed(p) && !(settled && p.sourceTax !== 'yes') : false;
  const mandatoryTou = sourceTaxed && p.highIncome === 'yes';
  const independent = p && (p.work === 'independent' || p.work === 'both');

  if (month >= 10 && month <= 11) {
    add('lamalCompare', 1, iso(year, 11, 30), sources.priminfo, 'savings');
    add('lamalSubsidy', p && p.household === 'couple' ? 2 : 3, null, sources.subsidy, 'savings');
  }
  if (month >= 9) add(p && p.pillar3a === 'yes' ? 'pillar3aHas' : 'pillar3aNo', month === 12 ? 1 : 4, iso(year, 12, 31), sources.pillar3a, 'simulator');
  if (settled && p.sourceTax === 'yes') add('sourceStopped', 2, null, sources.sourceTax, 'guide');
  if (month <= 3) {
    if (mandatoryTou) add('touMandatory', 1, null, sources.sourceTax, 'tutorial');
    else if (sourceTaxed) add('touDecide', 1, iso(year, 3, 31), sources.sourceTax, 'tutorial');
    else if (p) add('declaration', 1, null, sources.declaration, 'tutorial');
  } else if (month >= 10 && sourceTaxed && !mandatoryTou) {
    add('touPrepare', 5, iso(year + 1, 3, 31), sources.sourceTax, 'receipts');
  }
  if (p && p.sourceTax === 'unknown' && p.permit === 'other') add('checkSourceTax', 2, null, sources.sourceTax, 'guide');
  if (independent) add('avs', 3, null, sources.avs, 'guide');
  add('budget', 9, null, null, 'simulator');

  return list.sort((a, b) => a.priority - b.priority).slice(0, 3);
}
