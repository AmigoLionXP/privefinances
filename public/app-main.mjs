
import {monthlyBudget,projection,diagnosis,goalCheck,recommendations,EXPENSE_CATEGORIES} from './budget-engine.mjs';
/* ---------- Dados e armazenamento (modo de teste: tudo fica neste aparelho) ---------- */
const KEY='privefinances-test-v1';
const blank=()=>({profile:null,lang:null,budget:{income:[],expenses:[]},receipts:[],reminders:[],checklist:{},leads:[],pillar:{hasLpp:'yes',paid:0,income:0},example:false,guides:{},payslips:[],payslipDraft:null,remit:null,biz:null,lamalCalc:null,rates:null});
let S=blank();
function load(){try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(blank(),JSON.parse(raw));}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));return true;}catch(e){toast(t('storageFail'));return false;}}
load();
let lang=S.lang||((navigator.language||'').startsWith('fr')?'fr':'pt');
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chf=v=>new Intl.NumberFormat(lang==='fr'?'fr-CH':'de-CH',{style:'currency',currency:'CHF',maximumFractionDigits:2}).format(Number(v)||0);
const num=v=>{const n=Number(String(v).replace(/[’'\s]/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
const today=()=>new Date();
const iso=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const fmtDate=s=>{if(!s)return '';const [y,m,d]=s.split('-');return `${d}.${m}.${y}`;};
const daysTo=s=>Math.round((Date.parse(s+'T12:00:00')-Date.parse(iso(today().getFullYear(),today().getMonth()+1,today().getDate())+'T12:00:00'))/864e5);

/* ---------- Fontes oficiais ---------- */
const SRC={priminfo:'https://www.priminfo.admin.ch/fr',subsidy:'https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie',pillar3a:'https://www.bsv.admin.ch/fr/votre-cotisation-au-3e-pilier',sourceTax:'https://www.vd.ch/etat-droit-finances/impots/pour-les-employeurs/impot-a-la-source/personnes-imposees-a-la-source-/-sourciers',declaration:'https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/remplir-ma-declaration-dimpot',avs:'https://www.ahv-iv.ch/p/2.02.f',debtor:'https://www.vd.ch/economie/poursuites-et-faillites/procedure-de-poursuite-ordinaire/vous-etes-poursuivi-debiteur',plan:'https://www.vd.ch/prestation/demander-un-plan-de-recouvrement-personne-physique-ou-morale',help:'https://www.vd.ch/aides-financieres-et-soutien-social/2023-parlons-cash-dettes-et-surendettement',ofsp:'https://www.bag.admin.ch/dam/fr/sd-web/92VbSMPCd--v/PG27-FB-Versichererwechsel_FR.pdf'};

/* ---------- Textos PT / FR ---------- */
const T={pt:{
navHome:'Início',navMoney:'Meu dinheiro',navDocs:'Documentos',navDeadlines:'Prazos',navHelp:'Ajuda',
testPill:'Versão de teste · dados só neste aparelho',testPillSync:'Versão de teste · conta conectada',footTest:'Versão de teste. Use dados fictícios.',footIndep:'Serviço independente, sem ligação com o Estado de Vaud.',
heroLabel:'Suas finanças. Seu espaço privado.',heroTitle:'Será que você está deixando dinheiro na mesa?',heroText:'Subsídio da LAMal, 3a, imposto na fonte: em 3 perguntas, o PrivéFinances mostra o que pode valer para você, com prazo e fonte oficial. Sem susto, um passo de cada vez.',heroCta:'Responder 3 perguntas',heroCta2:'Ver minhas ações',illustrative:'Imagens ilustrativas',storiesLabel:'No dia a dia',storiesTitle:'Situações que o app ajuda a organizar',
loadExample:'Carregar exemplo fictício',clearExample:'Apagar exemplo',exampleOn:'Exemplo fictício carregado. Os valores não são seus.',
profLabel:'Seu perfil em 3 perguntas',profTitle:'Conte um pouco sobre você.',profIntro:'Com 3 respostas, mostramos os prazos e as ações que podem valer para o seu caso. As respostas ficam só neste aparelho.',
choose:'Escolha…',
qPermit:'Qual é a sua autorização de residência?',L:'Permis L',B:'Permis B',C:'Permis C',CH:'Passaporte suíço (naturalizado)',other:'Outra / ainda não sei',
qWork:'Como você trabalha?',employee:'Assalariado(a), com contrato',independent:'Autônomo(a), por conta própria',both:'Os dois',
qSourceTax:'Seu holerite tem desconto de “impôt à la source”?',yes:'Sim',no:'Não',unknown:'Não sei',
qHighIncome:'Sua renda bruta anual passa de CHF 120.000?',qHousehold:'Você é casado(a) ou tem parceria registrada?',single:'Não',couple:'Sim',qPillar3a:'Você já tem uma conta 3a?',
seeActions:'Ver minhas ações',editProfile:'Ajustar meu perfil',profileSaved:'Perfil salvo neste aparelho.',
actLabel:'Suas 3 ações agora',actTitle:'O que merece sua atenção nesta época do ano',actNote:'Orientação geral com fontes oficiais. Confira sempre o seu caso: isto não é aconselhamento fiscal nem jurídico.',
deadline:'Prazo',officialSource:'Fonte oficial ↗',openInApp:'Abrir no app',
stBalance:'Saldo previsto do mês',stSpend:'Gastos do mês',stReceipts:'Comprovantes',stNext:'Próximo prazo',none:'Nenhum',inDays:'em {n} dias',todayW:'hoje',lateW:'atrasado',
moneyTitle:'Meu dinheiro',segBudget:'Orçamento',segSavings:'Onde economizar',segInstall:'Parcelas',seg3a:'3a',
budgetIntro:'Anote o que entra e o que sai. Valores anuais viram uma reserva por mês; valores “só este mês” contam uma vez.',
incomes:'O que entra',expenses:'O que sai',description:'Descrição',category:'Categoria',amount:'Valor (CHF)',frequency:'Frequência',monthly:'Por mês',annual:'Por ano',once:'Só este mês',
addIncome:'Adicionar entrada',addExpense:'Adicionar gasto',remove:'Remover',
totIn:'Entradas no mês',totOut:'Gastos no mês',totReserve:'dos quais reservas anuais',totBal:'Saldo previsto',
catHousing:'Moradia',catHealth:'Saúde e LAMal',catTransport:'Transporte',catFood:'Alimentação',catKids:'Filhos e creche',catTax:'Impostos',catInsurance:'Outros seguros',catCredit:'Crédito e leasing',catLeisure:'Lazer',catSend:'Envio à família',catOther:'Outros',
savingsIntro:'Seus maiores gastos do mês e perguntas para revisar cada um. Nada é cancelado ou trocado automaticamente.',
noBudget:'Preencha o orçamento para ver onde está o seu dinheiro.',ofTotal:'do total',
tipHousing:'O aluguel está acima de um terço da renda? Vale conferir subsídios de moradia da sua comuna.',tipHealth:'Compare a LAMal no Priminfo antes de 30/11 e veja se tem direito ao subsídio.',tipTransport:'Assinatura anual ou meio-preço podem custar menos que bilhetes avulsos.',tipFood:'Planejar as compras da semana costuma reduzir este gasto.',tipKids:'Abonos de família e tarifas de creche por renda podem se aplicar.',tipTax:'Reservar todo mês evita uma conta grande de uma vez.',tipInsurance:'Confira se há seguros duplicados ou coberturas que você não usa.',tipCredit:'Compare o custo total antes de renovar ou assumir outro crédito.',tipLeisure:'Assinaturas digitais esquecidas somam no fim do mês.',tipSend:'Compare as taxas de câmbio e de envio entre serviços.',tipOther:'Descreva melhor este gasto para entender de onde ele vem.',
installIntro:'Simulação aritmética para comparar opções. Não é oferta, nem taxa efetiva oficial, nem aprovação de crédito.',
product:'Produto',pCredit:'Crédito',pLeasing:'Leasing',pInsurance:'Seguro',principal:'Valor do bem ou do crédito (CHF)',down:'Entrada (CHF)',rate:'Taxa anual nominal (%)',months:'Prazo (meses)',residual:'Valor residual no fim (CHF)',premium:'Prêmio anual (CHF)',fees:'Taxas no período (CHF)',
monthlyPay:'Parcela por mês',totalPaid:'Total pago no período',totalCost:'Custo além do valor financiado',addToBudget:'Adicionar ao orçamento',added:'Adicionado ao orçamento.',
p3Intro:'Veja quanto ainda cabe no seu 3a em 2026. Só conta o valor creditado até 31/12.',hasLpp:'Seu salário desconta previdência da empresa (LPP)?',paid3a:'Já pago em 2026 (CHF)',income3a:'Renda líquida de atividade no ano (CHF)',income3aHelp:'Só para quem não tem LPP: o teto é 20% desta renda.',
cap3a:'Teto estimado para 2026',left3a:'Ainda cabe até 31/12',perMonth:'Se dividir pelos meses que faltam',p3Note:'Estimativa a partir dos valores oficiais de 2026 (CHF 7.258 com LPP; 20% da renda, até CHF 36.288, sem LPP). Confirme com o seu banco ou seguradora.',
docsTitle:'Documentos',docsIntro:'Guarde faturas, recibos e holerites. Você digita os dados e confirma; a foto fica só neste aparelho.',
newDoc:'Novo comprovante',photo:'Foto do documento',photoHelp:'JPEG ou PNG. A imagem é reduzida para ocupar pouco espaço.',kind:'Tipo',invoice:'Fatura',receipt:'Recibo',payslip:'Holerite',supplier:'Empresa ou empregador',date:'Data do documento',status:'Situação',paid:'Pago',unpaid:'A pagar',dueDate:'Vencimento',taxFolder:'Separar para a declaração de impostos',taxFolderHelp:'Separar não significa que a despesa é dedutível.',
saveDoc:'Salvar comprovante',saved:'Salvo.',filterAll:'Todos',filterUnpaid:'A pagar',filterTax:'Para a declaração',noDocs:'Nenhum comprovante ainda. Adicione o primeiro acima.',
confirmDelete:'Confirmar exclusão',deleted:'Excluído.',exportCsv:'Baixar planilha (CSV)',copyCsv:'Copiar dados',copied:'Copiado.',copyFail:'Não foi possível copiar. Selecione o texto manualmente.',
deadlinesTitle:'Prazos',deadlinesIntro:'Prazos gerais do ano, vencimentos dos seus comprovantes e seus lembretes, em ordem de data.',
reminder:'Lembrete pessoal',remLabel:'Descrição',remDate:'Data',addReminder:'Salvar lembrete',noDeadlines:'Nenhum prazo nos próximos meses.',
dlLamal:'LAMal: a carta de rescisão precisa chegar à seguradora',dlLamalRec:'LAMal: envio recomendado pelo OFSP',dlFranchise:'LAMal: último dia para aumentar a franquia',dl3a:'3a: último dia para o valor ser creditado',dlTou:'TOU: pedido para quem paga imposto na fonte',dlBill:'Vencimento',dlYour:'Seu lembrete',
helpTitle:'Ajuda',segGlossary:'Glossário',segDebts:'Dívidas',segDecl:'Declaração',segExperts:'Especialistas',segPrivacy:'Seus dados',
glossIntro:'Termos suíços em palavras simples.',
debtsIntro:'Escolha a etapa para ver os caminhos previstos em Vaud. Leve o documento recebido a um serviço especializado; existe ajuda gratuita.',stage:'Etapa',sReminder:'Lembrete ou dívida de imposto',sPoursuite:'Commandement de payer (poursuite)',sSaisie:'Saisie (penhora)',sFaillite:'Faillite (falência)',freeHelp:'Ajuda gratuita para dívidas em Vaud ↗',
declIntro:'Lista para preparar a declaração com calma. Marque o que já tem; fica salvo neste aparelho.',
d1:'Identidade, município, situação familiar e ano fiscal conferidos',d2:'Certificado de salário de cada empregador',d3:'Atestado do 3a e da caixa de pensão (LPP), se houver',d4:'Extratos bancários de 31/12 e dívidas',d5:'Comprovantes de despesas profissionais, saúde e creche, sem os valores reembolsados',d6:'Para quem paga na fonte: decisão sobre a TOU até 31/03',d7:'Revisão com um fiduciaire, se precisar',d8:'Envio pelo serviço oficial do cantão e comprovante guardado',
declOfficial:'Instruções oficiais do cantão ↗',
expertsIntro:'Peça para um especialista falar com você. Nesta versão de teste o pedido fica guardado aqui e não é enviado a ninguém.',
name:'Seu nome',area:'Área',aFiduciary:'Fiduciaire (impostos e contas)',aLamal:'LAMal',a3a:'3a e previdência',aLegal:'Proteção jurídica',aDebt:'Dívidas',
leadConsent:'Autorizo compartilhar meu nome com um parceiro desta área, só para responder a este pedido. Parceiros podem ser remunerados pela indicação.',sendLead:'Registrar pedido',leadSaved:'Pedido registrado neste aparelho. O envio a parceiros ainda está desativado.',yourLeads:'Seus pedidos',pending:'Pendente',
privIntro:'Nesta versão de teste não há servidor: tudo o que você digita fica só neste navegador. Para trocar de aparelho, baixe seus dados.',downloadJson:'Baixar meus dados (JSON)',deleteAll:'Apagar todos os meus dados',confirmDeleteAll:'Sim, apagar tudo',allDeleted:'Todos os dados foram apagados deste aparelho.',
storageFail:'Este navegador não permitiu salvar. Os dados valem só até fechar a página.',
required:'Preencha os campos obrigatórios.',chooseAll:'Responda as 3 primeiras perguntas.'
},fr:{
navHome:'Accueil',navMoney:'Mon argent',navDocs:'Documents',navDeadlines:'Délais',navHelp:'Aide',
testPill:'Version de test · données sur cet appareil',testPillSync:'Version de test · compte connecté',footTest:'Version de test. Utilisez des données fictives.',footIndep:'Service indépendant, sans lien avec l’État de Vaud.',
heroLabel:'Vos finances. Votre espace privé.',heroTitle:'Laissez-vous de l’argent sur la table ?',heroText:'Subside LAMal, 3a, impôt à la source : en 3 questions, PrivéFinances montre ce qui peut vous concerner, avec délai et source officielle. Sans stress, étape par étape.',heroCta:'Répondre à 3 questions',heroCta2:'Voir mes actions',illustrative:'Images d’illustration',storiesLabel:'Au quotidien',storiesTitle:'Des situations que l’app aide à organiser',
loadExample:'Charger un exemple fictif',clearExample:'Effacer l’exemple',exampleOn:'Exemple fictif chargé. Ces montants ne sont pas les vôtres.',
profLabel:'Votre profil en 3 questions',profTitle:'Parlez-nous un peu de vous.',profIntro:'Avec 3 réponses, nous affichons les délais et les actions qui peuvent s’appliquer à votre situation. Les réponses restent sur cet appareil.',
choose:'Choisir…',
qPermit:'Quel est votre titre de séjour ?',L:'Permis L',B:'Permis B',C:'Permis C',CH:'Passeport suisse (naturalisé)',other:'Autre / je ne sais pas encore',
qWork:'Comment travaillez-vous ?',employee:'Salarié(e), avec contrat',independent:'Indépendant(e)',both:'Les deux',
qSourceTax:'Votre fiche de salaire comporte-t-elle une retenue « impôt à la source » ?',yes:'Oui',no:'Non',unknown:'Je ne sais pas',
qHighIncome:'Votre revenu brut annuel dépasse-t-il CHF 120 000 ?',qHousehold:'Êtes-vous marié(e) ou en partenariat enregistré ?',single:'Non',couple:'Oui',qPillar3a:'Avez-vous déjà un compte 3a ?',
seeActions:'Voir mes actions',editProfile:'Modifier mon profil',profileSaved:'Profil enregistré sur cet appareil.',
actLabel:'Vos 3 actions maintenant',actTitle:'Ce qui mérite votre attention à cette période de l’année',actNote:'Orientation générale, avec sources officielles. Vérifiez toujours votre situation : il ne s’agit pas d’un conseil fiscal ou juridique.',
deadline:'Délai',officialSource:'Source officielle ↗',openInApp:'Ouvrir dans l’app',
stBalance:'Solde prévu du mois',stSpend:'Dépenses du mois',stReceipts:'Justificatifs',stNext:'Prochain délai',none:'Aucun',inDays:'dans {n} jours',todayW:'aujourd’hui',lateW:'en retard',
moneyTitle:'Mon argent',segBudget:'Budget',segSavings:'Où économiser',segInstall:'Mensualités',seg3a:'3a',
budgetIntro:'Notez ce qui entre et ce qui sort. Les montants annuels deviennent une réserve mensuelle ; « ce mois-ci » compte une seule fois.',
incomes:'Ce qui entre',expenses:'Ce qui sort',description:'Description',category:'Catégorie',amount:'Montant (CHF)',frequency:'Fréquence',monthly:'Par mois',annual:'Par an',once:'Ce mois-ci',
addIncome:'Ajouter une entrée',addExpense:'Ajouter une dépense',remove:'Supprimer',
totIn:'Entrées du mois',totOut:'Dépenses du mois',totReserve:'dont réserves annuelles',totBal:'Solde prévu',
catHousing:'Logement',catHealth:'Santé et LAMal',catTransport:'Transports',catFood:'Alimentation',catKids:'Enfants et crèche',catTax:'Impôts',catInsurance:'Autres assurances',catCredit:'Crédit et leasing',catLeisure:'Loisirs',catSend:'Envois à la famille',catOther:'Autres',
savingsIntro:'Vos plus grosses dépenses du mois et des questions pour revoir chacune. Rien n’est résilié ni changé automatiquement.',
noBudget:'Remplissez le budget pour voir où va votre argent.',ofTotal:'du total',
tipHousing:'Le loyer dépasse-t-il un tiers du revenu ? Vérifiez les aides au logement de votre commune.',tipHealth:'Comparez la LAMal sur Priminfo avant le 30.11 et vérifiez votre droit au subside.',tipTransport:'Un abonnement annuel ou demi-tarif peut coûter moins que des billets.',tipFood:'Planifier les courses de la semaine réduit souvent ce poste.',tipKids:'Allocations familiales et tarifs de crèche selon le revenu peuvent s’appliquer.',tipTax:'Mettre de côté chaque mois évite une grosse facture d’un coup.',tipInsurance:'Vérifiez les assurances en double ou les couvertures inutilisées.',tipCredit:'Comparez le coût total avant de renouveler ou de prendre un autre crédit.',tipLeisure:'Les abonnements numériques oubliés s’additionnent.',tipSend:'Comparez taux de change et frais entre services.',tipOther:'Précisez cette dépense pour comprendre d’où elle vient.',
installIntro:'Calcul arithmétique pour comparer des options. Ce n’est ni une offre, ni un taux effectif officiel, ni un accord de crédit.',
product:'Produit',pCredit:'Crédit',pLeasing:'Leasing',pInsurance:'Assurance',principal:'Prix du bien ou montant du crédit (CHF)',down:'Acompte (CHF)',rate:'Taux annuel nominal (%)',months:'Durée (mois)',residual:'Valeur résiduelle (CHF)',premium:'Prime annuelle (CHF)',fees:'Frais sur la période (CHF)',
monthlyPay:'Mensualité',totalPaid:'Total payé sur la période',totalCost:'Coût au-delà du montant financé',addToBudget:'Ajouter au budget',added:'Ajouté au budget.',
p3Intro:'Voyez ce qu’il reste à verser sur votre 3a en 2026. Seul le montant crédité au 31.12 compte.',hasLpp:'Votre salaire inclut-il une caisse de pension (LPP) ?',paid3a:'Déjà versé en 2026 (CHF)',income3a:'Revenu net d’activité de l’année (CHF)',income3aHelp:'Seulement sans LPP : le plafond est 20 % de ce revenu.',
cap3a:'Plafond estimé 2026',left3a:'Reste possible d’ici le 31.12',perMonth:'Réparti sur les mois restants',p3Note:'Estimation à partir des montants officiels 2026 (CHF 7 258 avec LPP ; 20 % du revenu, jusqu’à CHF 36 288, sans LPP). Vérifiez auprès de votre banque ou assureur.',
docsTitle:'Documents',docsIntro:'Conservez factures, reçus et fiches de salaire. Vous saisissez les données et confirmez ; la photo reste sur cet appareil.',
newDoc:'Nouveau justificatif',photo:'Photo du document',photoHelp:'JPEG ou PNG. L’image est réduite pour prendre peu de place.',kind:'Type',invoice:'Facture',receipt:'Reçu',payslip:'Fiche de salaire',supplier:'Entreprise ou employeur',date:'Date du document',status:'État',paid:'Payé',unpaid:'À payer',dueDate:'Échéance',taxFolder:'Mettre de côté pour la déclaration d’impôt',taxFolderHelp:'Mettre de côté ne signifie pas que la dépense est déductible.',
saveDoc:'Enregistrer',saved:'Enregistré.',filterAll:'Tous',filterUnpaid:'À payer',filterTax:'Pour la déclaration',noDocs:'Aucun justificatif. Ajoutez le premier ci-dessus.',
confirmDelete:'Confirmer la suppression',deleted:'Supprimé.',exportCsv:'Télécharger (CSV)',copyCsv:'Copier les données',copied:'Copié.',copyFail:'Copie impossible. Sélectionnez le texte manuellement.',
deadlinesTitle:'Délais',deadlinesIntro:'Délais généraux de l’année, échéances de vos justificatifs et vos rappels, par date.',
reminder:'Rappel personnel',remLabel:'Description',remDate:'Date',addReminder:'Enregistrer le rappel',noDeadlines:'Aucun délai dans les prochains mois.',
dlLamal:'LAMal : la résiliation doit parvenir à l’assureur',dlLamalRec:'LAMal : envoi recommandé par l’OFSP',dlFranchise:'LAMal : dernier jour pour augmenter la franchise',dl3a:'3a : dernier jour pour que le versement soit crédité',dlTou:'TOU : demande pour les personnes imposées à la source',dlBill:'Échéance',dlYour:'Votre rappel',
helpTitle:'Aide',segGlossary:'Glossaire',segDebts:'Dettes',segDecl:'Déclaration',segExperts:'Spécialistes',segPrivacy:'Vos données',
glossIntro:'Les termes suisses en mots simples.',
debtsIntro:'Choisissez l’étape pour voir les voies prévues dans le canton de Vaud. Apportez le document reçu à un service spécialisé ; une aide gratuite existe.',stage:'Étape',sReminder:'Rappel ou dette d’impôt',sPoursuite:'Commandement de payer (poursuite)',sSaisie:'Saisie',sFaillite:'Faillite',freeHelp:'Aide gratuite en cas de dettes, canton de Vaud ↗',
declIntro:'Liste pour préparer la déclaration sereinement. Cochez ce que vous avez ; c’est enregistré sur cet appareil.',
d1:'Identité, commune, situation familiale et année fiscale vérifiées',d2:'Certificat de salaire de chaque employeur',d3:'Attestation 3a et caisse de pension (LPP), le cas échéant',d4:'Relevés bancaires au 31.12 et dettes',d5:'Justificatifs de frais professionnels, santé et crèche, sans les montants remboursés',d6:'Si vous êtes imposé à la source : décision sur la TOU d’ici le 31.03',d7:'Relecture par une fiduciaire, si besoin',d8:'Envoi par le service officiel du canton et confirmation conservée',
declOfficial:'Instructions officielles du canton ↗',
expertsIntro:'Demandez qu’un spécialiste vous contacte. Dans cette version de test, la demande reste ici et n’est envoyée à personne.',
name:'Votre nom',area:'Domaine',aFiduciary:'Fiduciaire (impôts et comptes)',aLamal:'LAMal',a3a:'3a et prévoyance',aLegal:'Protection juridique',aDebt:'Dettes',
leadConsent:'J’autorise la transmission de mon nom à un partenaire de ce domaine, uniquement pour répondre à cette demande. Les partenaires peuvent être rémunérés pour la recommandation.',sendLead:'Enregistrer la demande',leadSaved:'Demande enregistrée sur cet appareil. L’envoi aux partenaires est encore désactivé.',yourLeads:'Vos demandes',pending:'En attente',
privIntro:'Cette version de test n’a pas de serveur : tout ce que vous saisissez reste dans ce navigateur. Pour changer d’appareil, téléchargez vos données.',downloadJson:'Télécharger mes données (JSON)',deleteAll:'Effacer toutes mes données',confirmDeleteAll:'Oui, tout effacer',allDeleted:'Toutes les données ont été effacées de cet appareil.',
storageFail:'Ce navigateur n’a pas permis l’enregistrement. Les données valent jusqu’à la fermeture de la page.',
required:'Remplissez les champs obligatoires.',chooseAll:'Répondez aux 3 premières questions.'
}};
const t=(k,v)=>{let s=(T[lang]&&T[lang][k])??T.pt[k]??k;if(v)for(const [a,b] of Object.entries(v))s=s.replace('{'+a+'}',b);return s;};

const GLOSS={pt:[['LAMal','Seguro de saúde básico, obrigatório para quem mora na Suíça. Cada pessoa paga um prêmio mensal.'],['Franquia (franchise)','Parte das despesas médicas que você paga antes de o seguro começar a pagar.'],['Subsídio (subside)','Ajuda do cantão para pagar o prêmio da LAMal quando a renda é modesta.'],['Imposto na fonte (impôt à la source)','Imposto descontado direto do salário, comum para quem tem permis L ou B.'],['TOU','Taxation ordinaire ultérieure: pedido para fazer a declaração completa e incluir deduções. Prazo: 31/03 do ano seguinte; o pedido é definitivo.'],['3a (3e pilier A)','Poupança para a aposentadoria com vantagem fiscal, dentro de um teto anual.'],['LPP (2e pilier)','Previdência da empresa, descontada do salário.'],['AVS','Aposentadoria pública. Quem é autônomo paga as próprias contribuições.'],['Fiduciaire','Profissional ou escritório que prepara declarações e contas.'],['Poursuite','Procedimento oficial de cobrança de dívida. Os prazos podem ser curtos: vale procurar ajuda cedo.']],
fr:[['LAMal','Assurance-maladie de base, obligatoire pour toute personne domiciliée en Suisse. Chacun paie une prime mensuelle.'],['Franchise','Part des frais médicaux que vous payez avant que l’assurance ne prenne le relais.'],['Subside','Aide du canton pour payer la prime LAMal lorsque les revenus sont modestes.'],['Impôt à la source','Impôt retenu directement sur le salaire, fréquent avec un permis L ou B.'],['TOU','Taxation ordinaire ultérieure : demande pour faire une déclaration complète et faire valoir des déductions. Délai : 31.03 de l’année suivante ; la demande est irrévocable.'],['3a (3e pilier A)','Épargne retraite avec avantage fiscal, dans la limite d’un plafond annuel.'],['LPP (2e pilier)','Prévoyance professionnelle, retenue sur le salaire.'],['AVS','Retraite publique. Les indépendants versent eux-mêmes leurs cotisations.'],['Fiduciaire','Professionnel ou bureau qui prépare déclarations et comptes.'],['Poursuite','Procédure officielle de recouvrement de dette. Les délais peuvent être courts : mieux vaut demander de l’aide tôt.']]};

const DEBTS={pt:{reminder:['Peça ao office d’impôt um plano de pagamento se a dificuldade for temporária.','Uma remise d’impôt (perdão) pode ser examinada em situação de dificuldade grave; não é automática.'],poursuite:['Na poursuite ordinária, quem contesta a dívida pode apresentar opposition ao office em até 10 dias da notificação do commandement de payer.','Peça a verificação imediata do documento e da data de notificação. Exceções e suspensões exigem análise do caso.'],saisie:['A saisie pode atingir rendimentos e bens penhoráveis. O minimum vital depende da situação e das despesas aceitas pelo office.','Reúna os comprovantes de despesas e procure acompanhamento. Não existe um valor universal de minimum vital.'],faillite:['A faillite e seus efeitos dependem da situação e do procedimento. Ela não elimina automaticamente todas as dívidas.','Procure um serviço especializado antes de iniciar qualquer procedimento.']},
fr:{reminder:['Demandez à l’office d’impôt un arrangement de paiement en cas de difficulté temporaire.','Une remise d’impôt peut être examinée en situation de détresse ; elle n’est ni automatique ni garantie.'],poursuite:['En poursuite ordinaire, une opposition peut être formée auprès de l’office dans les 10 jours dès la notification du commandement de payer si vous contestez la dette.','Faites vérifier immédiatement l’acte et la date de notification. Les exceptions et suspensions nécessitent un examen du dossier.'],saisie:['La saisie peut porter sur des revenus et biens saisissables. Le minimum vital est déterminé selon la situation et les dépenses admises par l’office.','Transmettez vos justificatifs de charges et demandez un accompagnement. Il n’existe pas de minimum vital forfaitaire universel.'],faillite:['La faillite et ses effets dépendent du statut et de la procédure. Elle n’efface pas automatiquement toutes les dettes.','Faites examiner votre situation par un service spécialisé avant toute démarche.']}};

/* ---------- Imagens ilustrativas (pessoas fictícias, nunca apresentadas como clientes) ---------- */
const IMG=k=>'img/'+k+'.webp';
const ALT={pt:{hero:'Mulher na mesa da cozinha à noite, olhando as contas no celular',lamal:'Pai com a filha no colo lendo uma carta na mesa da cozinha',receipts:'Cozinheira fotografando um recibo no balcão do restaurante',budget:'Eletricista anotando o orçamento num caderno ao lado do notebook',deadlines:'Cuidadora no ponto de ônibus ao amanhecer, olhando o celular',p3a:'Cuidadora sentada num banco de jardim durante a pausa, com o celular',conquest:'Mulher ao lado do carro, com uma pasta de documentos e a chave na mão',debts:'Casal conversando com calma na mesa da cozinha, com uma folha entre os dois',experts:'Consultora mostrando algo no notebook a um cliente',tou:'Trabalhador da construção organizando envelopes numa pasta à noite',profile:'Mãos segurando um cartão de autorização de residência',empty:'Mesa da cozinha com caneca, caderno em branco e celular'},
fr:{hero:'Femme à la table de la cuisine le soir, consultant ses comptes sur son téléphone',lamal:'Père avec sa fille sur les genoux lisant une lettre à la table de la cuisine',receipts:'Cuisinière photographiant un reçu sur le plan de travail du restaurant',budget:'Électricien notant son budget dans un carnet à côté de son ordinateur',deadlines:'Soignante à l’arrêt de bus à l’aube, regardant son téléphone',p3a:'Soignante assise sur un banc de jardin pendant sa pause, avec son téléphone',conquest:'Femme à côté de sa voiture, avec un dossier et la clé à la main',debts:'Couple discutant calmement à la table de la cuisine, une feuille entre eux',experts:'Conseillère montrant quelque chose sur l’ordinateur à un client',tou:'Ouvrier du bâtiment classant des enveloppes dans un dossier le soir',profile:'Mains tenant une carte de titre de séjour',empty:'Table de cuisine avec une tasse, un carnet vierge et un téléphone'}};
const photo=(k,cls='')=>`<div class="photo ${cls}"><img src="${IMG(k)}" alt="${esc(ALT[lang][k])}" loading="lazy" decoding="async"></div>`;
const STORIES={pt:[['receipts','Recibo no balcão, guardado em segundos','Fotografe e organize por empresa e por ano.','docs'],['lamal','A carta da LAMal chegou','Compare o prêmio e veja se tem direito ao subsídio.','money:savings'],['budget','Pro seu mês caber','Entradas, gastos e reservas num só lugar.','money:budget'],['deadlines','Depois do turno, o prazo no celular','LAMal, 3a, TOU e suas faturas, por data.','deadlines'],['p3a','Quanto ainda cabe no 3a','Veja o teto de 2026 antes de 31/12.','money:p3'],['conquest','O carro quitado','Compare o custo das parcelas antes de assinar.','money:install'],['debts','Uma conversa difícil, com calma','Os caminhos previstos em Vaud e a ajuda gratuita.','help:debts'],['experts','Quando vale chamar um especialista','Fiduciaire, LAMal, 3a: peça contato só se quiser.','help:experts']],
fr:[['receipts','Un reçu sur le comptoir, rangé en quelques secondes','Photographiez et classez par entreprise et par année.','docs'],['lamal','La lettre de la LAMal est arrivée','Comparez la prime et vérifiez votre droit au subside.','money:savings'],['budget','Pour que le mois tienne','Entrées, dépenses et réserves au même endroit.','money:budget'],['deadlines','Après le service, le délai sur le téléphone','LAMal, 3a, TOU et vos factures, par date.','deadlines'],['p3a','Ce qu’il reste à verser au 3a','Voyez le plafond 2026 avant le 31.12.','money:p3'],['conquest','La voiture payée','Comparez le coût des mensualités avant de signer.','money:install'],['debts','Une conversation difficile, sereinement','Les voies prévues dans le canton de Vaud et l’aide gratuite.','help:debts'],['experts','Quand faire appel à un spécialiste','Fiduciaire, LAMal, 3a : demandez un contact si vous le souhaitez.','help:experts']]};
const ALABEL={lamalCompare:'aCompare',lamalSubsidy:'aSubsidy',pillar3aHas:'a3a',pillar3aNo:'a3a',touDecide:'aDecl',touMandatory:'aDecl',declaration:'aDecl',touPrepare:'aDocs',sourceStopped:'aPayslip',checkSourceTax:'aPayslip',avs:'aBiz',budget:'aBudget'};
const ACTIMG={lamalCompare:'lamal',lamalSubsidy:'debts',pillar3aHas:'p3a',pillar3aNo:'p3a',touDecide:'tou',touPrepare:'tou',touMandatory:'tou',declaration:'tou',sourceStopped:'profile',checkSourceTax:'profile',avs:'budget',budget:'budget'};
function pagehead(k,title,sub){return `<header class="pagehead"><img src="${IMG(k)}" alt="${esc(ALT[lang][k])}" decoding="async"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div></header>`;}

/* ---------- Regras das "3 ações" (sem IA, sem cálculo fiscal) ---------- */
const QUESTIONS=[['permit',['L','B','C','CH','other']],['work',['employee','independent','both']],['sourceTax',['yes','no','unknown']],['highIncome',['no','yes','unknown']],['household',['single','couple']],['pillar3a',['yes','no','unknown']]];
const QLABEL={permit:'qPermit',work:'qWork',sourceTax:'qSourceTax',highIncome:'qHighIncome',household:'qHousehold',pillar3a:'qPillar3a'};
const ACT={pt:{lamalCompare:['Compare sua LAMal para 2027','Os prêmios mudam todo ano. Compare no Priminfo, o comparador oficial, e decida com calma. Para trocar o seguro básico, a carta de rescisão precisa chegar à seguradora até 30/11; o OFSP recomenda enviar até 15/11.'],lamalSubsidy:['Veja se você tem direito ao subsídio do prêmio','Em Vaud, quem tem renda modesta pode receber ajuda para pagar o plano de saúde. O direito começa no 1º dia do 2º mês após o pedido, e a agência de seguros sociais da sua região ajuda a preencher.'],pillar3aHas:['Confira sua previdência 3a até 31/12','Só conta para o ano o valor creditado até 31/12. Os bancos costumam pedir o pagamento alguns dias antes. Veja quanto ainda cabe no simulador de 3a.'],pillar3aNo:['Entenda se o 3a faz sentido para você','O 3a é uma poupança para a aposentadoria que pode reduzir a renda tributável. Antes de abrir, compare custos e condições. Pagamentos de 2026 contam se forem creditados até 31/12.'],touDecide:['Decida até 31/03 se quer a declaração completa (TOU)','Quem paga imposto na fonte pode pedir a taxation ordinaire ultérieure (TOU) para incluir deduções como o 3a. O pedido é definitivo: faça a conta antes, de preferência com um profissional.'],touPrepare:['Guarde os comprovantes para avaliar a TOU','Se você paga imposto na fonte, reúna desde já certificado de salário, atestado 3a e despesas. Eles serão necessários para decidir sobre a TOU até 31/03.'],touMandatory:['Prepare a declaração completa, obrigatória no seu caso','Com renda bruta acima de CHF 120.000 sujeita à fonte, a declaração completa é obrigatória. Reúna os documentos e, se possível, conte com um profissional.'],declaration:['Prepare sua declaração de impostos','Reúna certificado de salário, atestados 3a, extratos bancários e despesas. Confira o prazo indicado no envio oficial do cantão.'],sourceStopped:['Confira se o imposto na fonte parou','Com permis C ou passaporte suíço, o imposto na fonte termina no mês seguinte à mudança e passa a valer a declaração normal. Veja no holerite se o desconto parou.'],checkSourceTax:['Descubra se você paga imposto na fonte','Olhe seu holerite: se houver um desconto “impôt à la source”, você paga imposto na fonte. Isso muda os prazos que valem para você.'],avs:['Autônomo: confira sua AVS','Quem trabalha por conta própria paga as próprias contribuições AVS à caixa de compensação. Confira a inscrição e os pagamentos antecipados (acomptes) do ano.'],budget:['Organize seu orçamento do mês','Anote quanto entra e quanto sai. Isso ajuda nas outras decisões.']},
fr:{lamalCompare:['Comparez votre LAMal pour 2027','Les primes changent chaque année. Comparez sur Priminfo, le comparateur officiel, et décidez sereinement. Pour changer d’assurance de base, la résiliation doit parvenir à l’assureur au plus tard le 30.11 ; l’OFSP recommande de l’envoyer d’ici le 15.11.'],lamalSubsidy:['Vérifiez votre droit au subside','Dans le canton de Vaud, les personnes aux revenus modestes peuvent recevoir une aide pour leurs primes. Le droit commence le 1er jour du 2e mois suivant la demande ; l’agence d’assurances sociales de votre région aide à la remplir.'],pillar3aHas:['Vérifiez votre prévoyance 3a d’ici le 31.12','Seul le montant crédité au 31.12 compte pour l’année. Les banques demandent souvent le versement quelques jours avant. Voyez ce qu’il reste dans le simulateur 3a.'],pillar3aNo:['Le 3a est-il utile pour vous ?','Le 3a est une épargne retraite qui peut réduire le revenu imposable. Avant d’ouvrir un compte, comparez frais et conditions. Les versements 2026 comptent s’ils sont crédités au plus tard le 31.12.'],touDecide:['Décidez d’ici le 31.03 si vous voulez la déclaration complète (TOU)','Si vous êtes imposé à la source, vous pouvez demander une taxation ordinaire ultérieure (TOU) pour faire valoir des déductions comme le 3a. La demande est irrévocable : faites le calcul avant, idéalement avec un professionnel.'],touPrepare:['Gardez vos justificatifs pour évaluer la TOU','Si vous êtes imposé à la source, réunissez dès maintenant le certificat de salaire, l’attestation 3a et vos frais. Ils serviront à décider de la TOU avant le 31.03.'],touMandatory:['Préparez la déclaration complète, obligatoire dans votre cas','Avec un revenu brut soumis à la source supérieur à CHF 120 000, la déclaration complète est obligatoire. Réunissez vos documents et, si possible, faites-vous accompagner.'],declaration:['Préparez votre déclaration d’impôt','Réunissez certificat de salaire, attestations 3a, relevés bancaires et frais. Vérifiez le délai indiqué dans l’envoi officiel du canton.'],sourceStopped:['Vérifiez la fin de l’impôt à la source','Avec un permis C ou la nationalité suisse, l’impôt à la source prend fin le mois suivant le changement et la taxation ordinaire s’applique. Vérifiez sur votre fiche de salaire que la retenue a cessé.'],checkSourceTax:['Êtes-vous imposé à la source ?','Regardez votre fiche de salaire : une retenue « impôt à la source » signifie une imposition à la source. Les délais qui vous concernent en dépendent.'],avs:['Indépendant : vérifiez votre AVS','En activité indépendante, vous versez vous-même vos cotisations AVS à la caisse de compensation. Vérifiez votre affiliation et les acomptes de l’année.'],budget:['Organisez votre budget du mois','Notez ce qui entre et ce qui sort. Cela éclaire les autres décisions.']}};
const CORE=['permit','work','sourceTax'],REFINE_DEFAULT={highIncome:'unknown',household:'single',pillar3a:'unknown'};
const complete=p=>!!p&&QUESTIONS.every(([id,o])=>CORE.includes(id)?o.includes(p[id]):(p[id]==null||p[id]===''||o.includes(p[id])));
const sourceTaxed=p=>p.sourceTax==='yes'?true:p.sourceTax==='no'?false:(p.permit==='L'||p.permit==='B');
function nextActions(profile,now=today()){
  const a=ACT[lang],y=now.getFullYear(),m=now.getMonth()+1,list=[];
  const add=(id,pr,dl,src,go)=>list.push({id,pr,title:a[id][0],text:a[id][1],dl,src,go});
  const p=complete(profile)?profile:null;
  const settled=p&&(p.permit==='C'||p.permit==='CH');
  const st=p?sourceTaxed(p)&&!(settled&&p.sourceTax!=='yes'):false;
  const mand=st&&p.highIncome==='yes';
  const indep=p&&(p.work==='independent'||p.work==='both');
  if(m>=10&&m<=11){add('lamalCompare',1,iso(y,11,30),SRC.priminfo,'money:savings');add('lamalSubsidy',p&&p.household==='couple'?2:3,null,SRC.subsidy,'money:savings');}
  if(m>=9)add(p&&p.pillar3a==='yes'?'pillar3aHas':'pillar3aNo',m===12?1:4,iso(y,12,31),SRC.pillar3a,'money:p3');
  if(settled&&p.sourceTax==='yes')add('sourceStopped',2,null,SRC.sourceTax,'docs:payslip');
  if(m<=3){if(mand)add('touMandatory',1,null,SRC.sourceTax,'help:decl');else if(st)add('touDecide',1,iso(y,3,31),SRC.sourceTax,'help:decl');else if(p)add('declaration',1,null,SRC.declaration,'help:decl');}
  else if(m>=10&&st&&!mand)add('touPrepare',5,iso(y+1,3,31),SRC.sourceTax,'docs');
  if(p&&p.sourceTax==='unknown'&&p.permit==='other')add('checkSourceTax',2,null,SRC.sourceTax,'docs:payslip');
  if(indep)add('avs',3,null,SRC.avs,'money:biz');
  add('budget',9,null,null,'money:budget');
  return list.sort((x,z)=>x.pr-z.pr).slice(0,3);
}

/* ---------- Cálculos ---------- */
const CATS=['catHousing','catHealth','catTransport','catFood','catKids','catTax','catInsurance','catCredit','catLeisure','catSend','catOther'];
const monthly=r=>r.freq==='annual'?num(r.amount)/12:num(r.amount);
function totals(){const b=monthlyBudget(H(),todayISO().slice(0,7));return {inc:fromC(b.income),out:fromC(b.expenses),res:fromC(b.provisions),bal:fromC(b.balance)};}
function annuity(P,apr,n){const r=apr/100/12;if(n<=0)return 0;return r===0?P/n:P*r/(1-Math.pow(1+r,-n));}
function cap3a(){const p=S.pillar;if(p.hasLpp==='yes')return 7258;return Math.min(36288,Math.max(0,num(p.income))*0.2);}

/* ---------- Deadlines ---------- */
function deadlines(){
  const now=today(),y=now.getFullYear(),list=[];
  const add=(date,label,kind,src)=>{const d=daysTo(date);if(d>=-30&&d<=200)list.push({date,label,kind,src,d});};
  const p=complete(S.profile)?S.profile:null;
  for(const yy of [y,y+1]){
    add(iso(yy,11,15),t('dlLamalRec'),'gen',SRC.ofsp);add(iso(yy,11,30),t('dlLamal'),'gen',SRC.ofsp);add(iso(yy,12,31),t('dlFranchise'),'gen',SRC.ofsp);add(iso(yy,12,31),t('dl3a'),'gen',SRC.pillar3a);
    if(!p||sourceTaxed(p))add(iso(yy,3,31),t('dlTou'),'gen',SRC.sourceTax);
  }
  for(const r of S.receipts)if(r.status==='unpaid'&&r.due)add(r.due,`${t('dlBill')}: ${r.supplier} · ${chf(r.amount)}`,'bill');
  for(const r of S.reminders)add(r.date,r.label,'mine');
  for(const e of projection(H(),todayISO(),60).events.filter(x=>x.amount<0))add(e.date,`${e.label} · ${chfc(-e.amount)}`,'bill');
  return list.sort((a,b)=>a.date.localeCompare(b.date));
}

/* ---------- Navegação ---------- */
const ICON={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',docs:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',deadlines:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',life:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01"/>'};
const TABS=[['home','navHome'],['money','navBudget'],['docs','navScanner'],['life','navSolutions'],['profile','navProfile']];
const NAVOF={deadlines:'money',help:'life'};
let route={tab:'home',sub:null},docFilter='all',debtStage='reminder',pendingDelete=null,product='credit';
function svg(n){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;}
function renderNav(){const html=TABS.map(([id,k])=>`<button class="navbtn" data-tab="${id}" ${(NAVOF[route.tab]||route.tab)===id?'aria-current="page"':''}>${svg(id)}<span>${t(k)}</span></button>`).join('');document.getElementById('sidenav').innerHTML=html;document.getElementById('tabbar').innerHTML=html;}
function go(target){const [tab,sub]=String(target).split(':');route={tab,sub:sub||null};try{history.replaceState(null,'','#'+tab);}catch(e){}render();window.scrollTo({top:0});}
function seg(items,current,attr){return `<div class="seg" role="group">${items.map(([id,k])=>`<button type="button" data-${attr}="${id}" aria-pressed="${current===id}">${t(k)}</button>`).join('')}</div>`;}
let toastTimer;function toast(msg){const n=document.getElementById('notice');n.textContent=msg;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,3200);}

/* ---------- Telas ---------- */
function viewHome(){
  const p=complete(S.profile)?S.profile:null,editing=route.sub==='edit'||!p,tt=totals(),dls=deadlines().filter(d=>d.d>=0),nx=dls[0];
  const qf=([id,opts])=>`<label class="field"><span>${t(QLABEL[id])}</span><select id="q-${id}" name="${id}" ${CORE.includes(id)?'required':''}><option value="">${t('choose')}</option>${opts.map(o=>`<option value="${o}" ${p&&p[id]===o&&!(p._d&&p._d.includes(id))?'selected':''}>${t(o)}</option>`).join('')}</select></label>`;
  const q=QUESTIONS.filter(([id])=>CORE.includes(id)).map(qf).join('')+`<details class="wide"><summary style="cursor:pointer;font-weight:700">${t('refineTitle')}</summary><p class="muted small" style="margin:8px 0">${t('refineHelp')}</p><div class="fields">${QUESTIONS.filter(([id])=>!CORE.includes(id)).map(qf).join('')}</div></details>`;
  const acts=nextActions(p).map(a=>`<li>${photo(ACTIMG[a.id]||'budget','athumb')}<strong>${esc(a.title)}</strong><p class="muted">${esc(a.text)}</p><div class="meta">${a.dl?`<span class="due">${t('deadline')}: ${fmtDate(a.dl)}</span>`:''}${a.src?`<a href="${a.src}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a>`:''}<button type="button" class="link" data-go="${a.go}">${t(ALABEL[a.id]||'openInApp')}</button></div></li>`).join('');
  const nextTxt=nx?`${fmtDate(nx.date)}<small class="muted small" style="display:block;font-size:.8rem;font-weight:400">${esc(nx.label)}</small>`:t('none');
  return `<section class="hero"><div class="pic"><img src="${IMG('hero')}" alt="${esc(ALT[lang].hero)}" fetchpriority="high" decoding="async"></div>
    <div class="copy"><p class="label">${t('heroLabel')}</p><h1>${t('heroTitle')}</h1><p style="color:#63D5BF;font-weight:700">${t('audience')}</p><p>${t('heroText')}</p>
    <p style="font-weight:700">${t('ctaFree')}</p><div class="btns"><button class="btn" data-go="home:onboard">${H().onboarding.step!=='welcome'?t('resumeOnboard'):t('startOnboard')}</button></div></div>
    <span class="credit">${t('illustrative')}</span></section>
  <div class="btns">${S.example?`<span class="tag warn">${t('exampleOn')}</span><button class="btn ghost small" data-act="clearExample">${t('clearExample')}</button>`:`<button class="btn ghost small" data-act="example">${t('loadExample')}</button>`}</div>
  <div class="grid3">
    <div class="stat"><span class="muted small">${t('stBalance')}</span><strong class="${tt.bal<0?'neg':'pos'}">${chf(tt.bal)}</strong></div>
    <div class="stat"><span class="muted small">${t('stSpend')}</span><strong>${chf(tt.out)}</strong></div>
    <div class="stat"><span class="muted small">${t('stNext')}</span><strong style="font-size:1.1rem">${nextTxt}</strong></div>
  </div>
  ${editing?`<section class="panel" id="profile"><div class="profile-split"><div style="display:grid;gap:14px;min-width:0"><p class="label">${t('profLabel')}</p><h2>${t('profTitle')}</h2><p class="muted">${t('profIntro')}</p></div>${photo('profile')}</div>
    <form id="profileForm"><div class="fields">${q}</div><div class="btns"><button class="btn" type="submit">${t('seeActions')}</button></div></form></section>`:''}
  <section class="panel hl" id="actions"><p class="label">${t('actLabel')}</p><h2>${t('actTitle')}</h2><ol class="actions">${acts}</ol>
    <p class="muted small">${t('actNote')}</p>${p&&!editing?`<div><button class="btn ghost small" data-go="home:edit">${t('editProfile')}</button></div>`:''}</section>
  <section style="display:grid;gap:12px"><p class="label">${t('storiesLabel')}</p><h2>${t('storiesTitle')}</h2>
    <div class="stories">${STORIES[lang].map(([k,a,b,g])=>`<button type="button" class="story" data-go="${g}">${photo(k)}<span class="txt"><strong>${esc(a)}</strong><span>${esc(b)}</span></span></button>`).join('')}</div>
    <p class="muted small">${t('illustrative')}</p></section>`;
}

function rowsHtml(kind){const arr=S.budget[kind];if(!arr.length)return `<div class="empty">${t('noBudget')}</div>`;
  return `<div class="row rowhead"><span>${t('description')}</span><span>${kind==='expenses'?t('category'):''}</span><span>${t('amount')}</span><span>${t('frequency')}</span><span></span></div>`+arr.map(r=>`<div class="row" data-kind="${kind}" data-id="${r.id}">
    <input class="label-in" aria-label="${t('description')}" placeholder="${t('description')}" data-f="label" value="${esc(r.label)}" maxlength="80">
    ${kind==='expenses'?`<select aria-label="${t('category')}" data-f="category">${CATS.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${t(c)}</option>`).join('')}</select>`:'<span></span>'}
    <input aria-label="${t('amount')}" placeholder="${t('amount')}" data-f="amount" inputmode="decimal" value="${esc(r.amount)}" class="num">
    <select aria-label="${t('frequency')}" data-f="freq">${['monthly','annual','once'].map(f=>`<option value="${f}" ${r.freq===f?'selected':''}>${t(f)}</option>`).join('')}</select>
    <button type="button" class="iconbtn" aria-label="${t('remove')}" data-act="rmRow">×</button></div>`).join('');}
function totalsHtml(){const tt=totals();return `<div class="totals" id="totals"><div><span>${t('totIn')}</span><strong>${chf(tt.inc)}</strong></div><div><span>${t('totOut')}</span><strong>${chf(tt.out)}</strong></div><div class="muted small"><span>${t('totReserve')}</span><span>${chf(tt.res)}</span></div><div class="big"><span>${t('totBal')}</span><span style="color:var(${tt.bal<0?'--bad':'--good'})">${chf(tt.bal)}</span></div></div>`;}
function viewMoney(){
  const sub=route.sub||'budget';let body='';
  if(sub==='budget'){const ep=engine().p;body=`<p class="muted">${t('budgetIntro')}</p>
    <section class="panel"><h2>${t('incomes')}</h2><div class="rows">${incRows(false)||`<div class="empty">${t('noBudget')}</div>`}</div><div><button class="btn ghost small" data-act="hhAddInc">+ ${t('addIncome')}</button></div></section>
    <section class="panel"><h2>${t('expenses')}</h2><div class="rows">${expRows()}</div><div><button class="btn ghost small" data-act="hhAddExp">+ ${t('addExpense')}</button></div></section>
    ${hhTotals()}<section class="panel">${sparkline(ep)}</section>
    <div class="btns"><button class="btn ghost small" data-act="csvBudget">${t('exportCsv')}</button><button class="btn ghost small" data-act="copyBudget">${t('copyCsv')}</button></div>`;}
  if(sub==='savings'){const bb=engine().b;const TIP={housing:'tipHousing',lamal:'tipHealth',transport:'tipTransport',food:'tipFood',childcare:'tipKids',tax:'tipTax',insurance:'tipInsurance',credit:'tipCredit',leasing:'tipCredit',leisure:'tipLeisure',telecom:'tipLeisure',remittance:'tipSend'};const top=Object.entries(bb.byCategory).sort((a,b)=>b[1]-a[1]).slice(0,5);
    body=`<p class="muted">${t('savingsIntro')}</p>`+(top.length?`<section class="panel">${top.map(([c,v])=>{const pc=bb.expenses?Math.round(v/bb.expenses*100):0;return `<div style="display:grid;gap:6px"><div class="btns" style="justify-content:space-between"><strong>${esc(tt('cat',c))}</strong><span class="num">${chfc(v)} · ${pc}% ${t('ofTotal')}</span></div><div class="bar"><i style="width:${pc}%"></i></div><p class="muted small">${t(TIP[c]||'tipOther')}</p></div>`;}).join('')}</section>`:`<div class="empty">${t('noBudget')}</div>`)+recsHtml(engine().r)+
    savingsExtras()+`<section class="panel"><p class="small"><a href="${SRC.priminfo}" target="_blank" rel="noopener noreferrer">Priminfo ↗</a> · <a href="${SRC.subsidy}" target="_blank" rel="noopener noreferrer">${lang==='fr'?'Subside LAMal, Vaud ↗':'Subsídio LAMal, Vaud ↗'}</a></p></section>`;}
  if(sub==='deadlines')return viewDeadlines();
  if(sub==='send')body=viewSend();
  if(sub==='biz')body=viewBiz();
  if(sub==='install'){
    const f=S.install||{principal:30000,down:3000,rate:5.9,months:48,residual:12000,premium:1200,fees:0};
    const P=Math.max(0,num(f.principal)-num(f.down)),n=Math.max(0,Math.round(num(f.months)));let pay=0,total=0;
    if(product==='credit'){pay=annuity(P,num(f.rate),n);total=pay*n+num(f.fees);}
    else if(product==='leasing'){const r=num(f.rate)/100/12,res=num(f.residual);pay=n?(r===0?(P-res)/n:(P-res/Math.pow(1+r,n))*r/(1-Math.pow(1+r,-n))):0;total=pay*n+num(f.fees);}
    else{pay=num(f.premium)/12;total=num(f.premium)*(n/12)+num(f.fees);}
    const cost=product==='insurance'?null:total+(product==='leasing'?num(f.residual):0)-P;
    const fld=(k,lab,hid)=>hid?'':`<label class="field"><span>${t(lab)}</span><input id="in-${k}" data-in="${k}" inputmode="decimal" class="num" value="${esc(f[k])}"></label>`;
    body=`<p class="muted">${t('installIntro')}</p><p class="tag warn" style="justify-self:start">${t('installDefaults')}</p>${seg([['credit','pCredit'],['leasing','pLeasing'],['insurance','pInsurance']],product,'product')}
    <section class="panel"><div class="fields">${fld('principal','principal',product==='insurance')}${fld('down','down',product==='insurance')}${fld('rate','rate',product==='insurance')}${fld('months','months')}${fld('residual','residual',product!=='leasing')}${fld('premium','premium',product!=='insurance')}${fld('fees','fees')}</div></section>
    <div class="totals"><div class="big" style="border:0;padding:0"><span>${t('monthlyPay')}</span><span>${chf(pay)}</span></div><div><span>${t('totalPaid')}</span><span>${chf(total)}</span></div>${cost!=null?`<div><span>${t('totalCost')}</span><span>${chf(cost)}</span></div>`:''}</div>
    <div><button class="btn ghost small" data-act="installToBudget" data-pay="${pay.toFixed(2)}">${t('addToBudget')}</button></div>`;}
  if(sub==='p3'){const c=cap3a(),left=Math.max(0,c-num(S.pillar.paid)),ml=12-today().getMonth();
    body=`<p class="muted">${t('p3Intro')}</p><section class="panel"><div class="fields">
      <label class="field"><span>${t('hasLpp')}</span><select id="p3-lpp" data-p3="hasLpp"><option value="yes" ${S.pillar.hasLpp==='yes'?'selected':''}>${t('yes')}</option><option value="no" ${S.pillar.hasLpp==='no'?'selected':''}>${t('no')}</option></select></label>
      <label class="field"><span>${t('paid3a')}</span><input id="p3-paid" data-p3="paid" inputmode="decimal" class="num" value="${esc(S.pillar.paid)}"></label>
      ${S.pillar.hasLpp==='no'?`<label class="field wide"><span>${t('income3a')}</span><input id="p3-income" data-p3="income" inputmode="decimal" class="num" value="${esc(S.pillar.income)}"><small>${t('income3aHelp')}</small></label>`:''}
    </div></section>
    <div class="totals"><div><span>${t('cap3a')}</span><strong>${chf(c)}</strong></div><div class="big"><span>${t('left3a')}</span><span>${chf(left)}</span></div><div class="muted small"><span>${t('perMonth')}</span><span>${chf(left/Math.max(1,ml))}</span></div></div>
    <div class="bar" aria-hidden="true"><i style="width:${c?Math.min(100,num(S.pillar.paid)/c*100):0}%"></i></div>
    <p class="muted small">${t('p3Note')} <a href="${SRC.pillar3a}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a></p>`;}
  const mk={budget:'budget',savings:'lamal',install:'conquest',p3:'p3a',send:'debts',biz:'budget'}[sub];
  return `${pagehead(mk,t('moneyTitle'))}${seg([['budget','segBudget'],['deadlines','deadlinesSub'],['savings','segSavings'],['send','segSend'],['install','segInstall'],['p3','seg3a'],['biz','segBiz']],sub,'sub')}${body}`;
}

function viewDocs(){
  const list=S.receipts.filter(r=>docFilter==='all'||(docFilter==='unpaid'&&r.status==='unpaid')||(docFilter==='tax'&&r.tax)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const items=list.map(r=>`<div class="item">${r.photo?`<img class="thumb" src="${r.photo}" alt="">`:`<div class="thumb">${t(r.kind)}</div>`}
    <div style="min-width:0"><strong>${esc(r.supplier)}</strong><div class="muted small num">${chf(r.amount)} · ${fmtDate(r.date)}</div><div>${`<span class="tag">${t(r.kind)}</span>`}${r.status==='unpaid'?`<span class="tag warn">${t('unpaid')}${r.due?' · '+fmtDate(r.due):''}</span>`:`<span class="tag">${t('paid')}</span>`}${r.tax?`<span class="tag">${t('filterTax')}</span>`:''}</div></div>
    <div class="btns">${pendingDelete===r.id?`<button class="btn danger small" data-act="delDoc" data-id="${r.id}">${t('confirmDelete')}</button>`:`<button class="iconbtn" aria-label="${t('remove')}" data-act="askDel" data-id="${r.id}">×</button>`}</div></div>`).join('');
  const dsub=route.sub||'receipts';if(dsub==='payslip')return `${pagehead('budget',t('docsTitle'),t('psTitle'))}${seg([['receipts','segComprov'],['payslip','segPayslip']],dsub,'sub')}${viewPayslip()}`;
  return `${pagehead('receipts',t('docsTitle'),t('docsIntro'))}${seg([['receipts','segComprov'],['payslip','segPayslip']],dsub,'sub')}
  <details class="panel" ${S.receipts.length?'':'open'}><summary style="cursor:pointer"><h2 style="display:inline">${t('newDoc')}</h2></summary><form id="docForm" style="margin-top:14px"><div class="fields">
    <label class="field wide"><span>${t('photo')}</span><input id="d-photo" name="photo" type="file" accept="image/jpeg,image/png"><small>${t('photoHelp')}</small></label>
    <label class="field"><span>${t('kind')}</span><select id="d-kind" name="kind">${['invoice','receipt','payslip'].map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></label>
    <label class="field"><span>${t('supplier')} *</span><input id="d-supplier" name="supplier" required maxlength="80"></label>
    <label class="field"><span>${t('amount')} *</span><input id="d-amount" name="amount" required inputmode="decimal" class="num"></label>
    <label class="field"><span>${t('date')} *</span><input id="d-date" name="date" type="date" required value="${iso(today().getFullYear(),today().getMonth()+1,today().getDate())}"></label>
    <label class="field"><span>${t('category')}</span><select id="d-category" name="category">${CATS.map(c=>`<option value="${c}">${t(c)}</option>`).join('')}</select></label>
    <label class="field"><span>${t('status')}</span><select id="d-status" name="status"><option value="paid">${t('paid')}</option><option value="unpaid">${t('unpaid')}</option></select></label>
    <label class="field"><span>${t('dueDate')}</span><input id="d-due" name="due" type="date"></label>
    <label class="check wide"><input id="d-tax" name="tax" type="checkbox"><span>${t('taxFolder')}<br><small class="muted">${t('taxFolderHelp')}</small></span></label>
  </div><div class="btns"><button class="btn" type="submit">${t('saveDoc')}</button></div></form></details>
  ${seg([['all','filterAll'],['unpaid','filterUnpaid'],['tax','filterTax']],docFilter,'filter')}
  <div class="list">${items||`<div class="empty withimg">${photo('empty')}<p>${t('noDocs')}</p></div>`}</div>
  ${S.receipts.length?`<div class="btns"><button class="btn ghost small" data-act="csvDocs">${t('exportCsv')}</button><button class="btn ghost small" data-act="copyDocs">${t('copyCsv')}</button></div>`:''}`;
}

function viewDeadlines(){
  const dl=deadlines().map(d=>{const cls=d.d<0?'late':d.d<=14?'soon':'';const when=d.d===0?t('todayW'):d.d<0?t('lateW'):t('inDays',{n:d.d});
    return `<div class="tl ${cls}"><span class="d">${fmtDate(d.date)}</span><div style="min-width:0"><strong style="font-weight:600">${esc(d.label)}</strong>${d.src?` <a class="small" href="${d.src}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a>`:''}${d.kind==='mine'?` <span class="tag">${t('dlYour')}</span>`:''}</div><span class="small muted num">${when}</span></div>`;}).join('');
  return `${pagehead('deadlines',t('deadlinesTitle'),t('deadlinesIntro'))}<div><button class="btn ghost small" data-act="ics">${t('ics')}</button></div><div class="timeline">${dl||`<div class="empty">${t('noDeadlines')}</div>`}</div>
  <section class="panel"><h2>${t('reminder')}</h2><form id="remForm"><div class="fields"><label class="field"><span>${t('remLabel')}</span><input id="r-label" name="label" required maxlength="120"></label><label class="field"><span>${t('remDate')}</span><input id="r-date" name="date" type="date" required></label></div><div class="btns"><button class="btn" type="submit">${t('addReminder')}</button></div></form></section>`;
}

function viewHelp(){
  const sub=route.sub||'glossary';let body='';if(!['glossary','debts','decl','experts','privacy'].includes(sub)){route.tab='life';return viewLife();}
  if(sub==='glossary')body=`<p class="muted">${t('glossIntro')}</p><section class="panel"><dl class="gloss">${GLOSS[lang].map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></section>`;
  if(sub==='debts')body=`<p class="muted">${t('debtsIntro')}</p><section class="panel"><label class="field"><span>${t('stage')}</span><select id="debtStage" data-debt="1">${[['reminder','sReminder'],['poursuite','sPoursuite'],['saisie','sSaisie'],['faillite','sFaillite']].map(([v,k])=>`<option value="${v}" ${debtStage===v?'selected':''}>${t(k)}</option>`).join('')}</select></label>
    <ul style="margin:0;padding-left:20px;display:grid;gap:8px">${DEBTS[lang][debtStage].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <p class="small"><a href="${debtStage==='reminder'?SRC.plan:SRC.debtor}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a> · <a href="${SRC.help}" target="_blank" rel="noopener noreferrer">${t('freeHelp')}</a></p></section>`;
  if(sub==='decl')body=`<p class="muted">${t('declIntro')}</p><section class="panel">${['d1','d2','d3','d4','d5','d6','d7','d8'].map(k=>`<label class="check"><input type="checkbox" id="c-${k}" data-check="${k}" ${S.checklist[k]?'checked':''}><span>${t(k)}</span></label>`).join('')}<p class="small"><a href="${SRC.declaration}" target="_blank" rel="noopener noreferrer">${t('declOfficial')}</a></p></section>`;
  if(sub==='experts')body=`<p class="muted">${t('expertsIntro')}</p><section class="panel"><form id="leadForm"><div class="fields"><label class="field"><span>${t('name')}</span><input id="l-name" name="name" required maxlength="80" autocomplete="name"></label><label class="field"><span>${t('area')}</span><select id="l-area" name="area">${['aFiduciary','aLamal','a3a','aLegal','aDebt'].map(a=>`<option value="${a}">${t(a)}</option>`).join('')}</select></label>
    <label class="check wide"><input id="l-consent" name="consent" type="checkbox" required><span>${t('leadConsent')}</span></label></div><div class="btns"><button class="btn" type="submit">${t('sendLead')}</button></div></form></section>
    ${S.leads.length?`<section class="panel"><h3>${t('yourLeads')}</h3>${S.leads.map(l=>`<div class="btns" style="justify-content:space-between"><span>${t(l.area)} · ${fmtDate(l.date)}</span><span class="tag warn">${t('pending')}</span></div>`).join('')}</section>`:''}`;
  if(sub==='privacy')body=`<section class="panel"><p>${t('privIntro')}</p><div class="btns"><button class="btn ghost" data-act="json">${t('downloadJson')}</button>${pendingDelete==='ALL'?`<button class="btn danger" data-act="wipe">${t('confirmDeleteAll')}</button>`:`<button class="btn danger" data-act="askWipe">${t('deleteAll')}</button>`}</div></section>`;
  const hk={glossary:'experts',debts:'debts',decl:'tou',experts:'experts',privacy:'empty'}[sub];
  return `${pagehead(hk,t('solutionsTitle'),t('solutionsSub'))}${seg(LIFESEG,sub,'sub')}${body}`;
}

/* ---------- v3: vida na Suíça, holerite, cartas, câmbio, envio, juros, LAMal, negócio ---------- */
Object.assign(T.pt,{
audience:'Para quem trabalha e empreende na Suíça.',refineTitle:'Refinar (opcional)',refineHelp:'Mais 3 respostas deixam as ações mais precisas. Se não souber, pode pular.',
navLife:'Vida na Suíça',
aCompare:'Comparar LAMal',aSubsidy:'Ver o subsídio',a3a:'Ver meu 3a',aDecl:'Preparar a declaração',aDocs:'Guardar comprovantes',aPayslip:'Conferir meu holerite',aBiz:'Abrir Meu negócio',aBudget:'Abrir orçamento',
ics:'Adicionar ao calendário do celular',icsDone:'Arquivo de calendário criado. Abra-o para importar os prazos.',
exampleAdded:'Exemplo fictício adicionado. Seus dados não foram alterados.',exampleRemoved:'Exemplo removido. Seus próprios dados continuam aqui.',
installDefaults:'Valores de exemplo. Troque pelos da sua proposta.',
segSend:'Enviar dinheiro',segBiz:'Meu negócio',segComprov:'Comprovantes',segPayslip:'Holerite',
lifeTitle:'Vida na Suíça',lifeSub:'Os grandes momentos, um passo de cada vez.',segArrive:'Chegar',segLetters:'Entender uma carta',segRetire:'Aposentadoria',segLeave:'Saída definitiva',
guideNote:'Orientação geral com fontes oficiais. Os prazos exatos estão nos documentos que você recebe; em caso de dúvida, fale com o serviço indicado.',done:'feito',
psTitle:'Conferir meu holerite',psIntro:'Digite os valores do seu holerite. O app confere as contribuições AVS/AI/APG e desemprego e explica cada desconto. Ele não diz se o seu salário está certo: em caso de dúvida, pergunte ao RH ou ao sindicato.',
psMonth:'Mês',psGross:'Salário bruto (CHF)',psAvs:'AVS/AI/APG (CHF)',psAc:'Seguro-desemprego AC (CHF)',psLpp:'Previdência LPP (CHF)',psLaa:'Seguro acidente não profissional LAA (CHF)',psIjm:'Seguro perda de ganho doença IJM (CHF)',psSource:'Imposto na fonte (CHF)',psOther:'Outros descontos (CHF)',psNet:'Salário líquido (CHF)',
psCheck:'Conferir',psSave:'Salvar e usar no orçamento',psSaved:'Holerite salvo e salário líquido atualizado no orçamento.',
psOk:'Confere com a taxa de 2026',psDiff:'Diferente do esperado: vale perguntar ao RH',psExpected:'esperado',psSum:'Soma dos descontos',psNetCalc:'Bruto menos descontos',psNetOk:'O líquido confere com a soma dos descontos.',psNetDiff:'O líquido não bate com bruto menos descontos. Pode haver itens que não foram digitados (horas extras, 13º, abonos).',
psExplAvs:'AVS/AI/APG: 5,3% do salário bruto para o empregado em 2026 (o empregador paga outros 5,3%).',psExplAc:'Desemprego (AC): 1,1% até CHF 148.200 por ano; acima disso, não há desconto.',psExplLpp:'LPP: varia com a idade e o plano da caixa de pensão. Confira no certificado anual da caixa.',psExplLaa:'LAA não profissional: cobre acidentes fora do trabalho para quem trabalha 8 horas ou mais por semana. A taxa depende do empregador.',psExplIjm:'IJM: seguro de perda de salário por doença. Não é obrigatório; depende do contrato ou da convenção coletiva.',psExplSource:'Imposto na fonte: para quem tem permis L ou B (e alguns outros casos). A taxa depende do barema e da situação familiar.',
psHistory:'Holerites salvos',psNone:'Nenhum holerite salvo ainda.',
lettersIntro:'Escolha o tipo de carta para ver, em português, o que ela costuma pedir. Ou cole o texto da carta para o app procurar o tipo e as datas.',letterType:'Tipo de carta',pasteLabel:'Cole aqui o texto da carta (em francês)',pasteBtn:'Analisar o texto',pasteNone:'Não reconheci o tipo de carta. Escolha na lista acima ou leve a carta a um serviço de ajuda.',pasteFound:'Parece ser',datesFound:'Datas encontradas no texto',noDates:'Nenhuma data encontrada.',remindThis:'Criar lembrete',reminderAdded:'Lembrete criado em Prazos.',lettersWarn:'O app não substitui a leitura da carta. Confira sempre a data e o prazo no documento original.',
lWhat:'O que é',lDeadline:'Prazo comum',lDo:'O que fazer',
sendTitle:'Enviar dinheiro para casa',sendIntro:'Veja quanto chega do outro lado. Compare até 3 ofertas com a taxa de câmbio de referência; o custo escondido no câmbio também aparece.',
ratesTitle:'Câmbio do franco hoje',ratesSource:'Taxas de referência do mercado, atualizadas uma vez por dia.',ratesLoading:'Carregando taxas…',ratesFail:'Não foi possível carregar as taxas agora. Verifique a conexão.',ratesCached:'Últimas taxas salvas',
amountChf:'Valor a enviar (CHF)',country:'Moeda de destino',offer:'Oferta',provider:'Serviço',feeChf:'Taxa cobrada (CHF)',rateOffered:'Câmbio oferecido (1 CHF =)',received:'Chega lá',hiddenCost:'Custo total (taxa + margem no câmbio)',best:'Maior valor recebido',
partnerSoon:'Em breve: enviar pelo app com uma plataforma autorizada. A transferência acontecerá na plataforma parceira, que pode remunerar o PrivéFinances pela indicação.',
rentTitle:'Aluguel e taxa de referência',rentText:'A taxa de referência hipotecária está em 1,25% desde 02/09/2025, confirmada em 01/09/2026. Próxima publicação: 01/12/2026. Se o seu contrato de aluguel foi calculado com uma taxa mais alta, você pode pedir uma redução ao proprietário.',snbText:'Taxa básica do Banco Nacional Suíço (BNS): 0%, mantida em 24/09/2026.',
lamalCalcTitle:'LAMal: qual franquia sai mais barata para você?',lamalCalcIntro:'Pegue no Priminfo o prêmio mensal de duas franquias e estime seus gastos médicos do ano. Vale para adultos.',premiumLow:'Prêmio mensal com franquia de CHF 300',premiumHigh:'Prêmio mensal com franquia de CHF 2.500',expectedCosts:'Gastos médicos estimados no ano (CHF)',costLow:'Custo anual com franquia 300',costHigh:'Custo anual com franquia 2.500',cheaper:'Sai mais barata',lamalCalcNote:'Cálculo: 12 prêmios + franquia + 10% de participação até CHF 700. Para o ano seguinte, baixar a franquia exige aviso até 30/11; aumentar, até 31/12.',
bizTitle:'Meu negócio',bizIntro:'Para quem é independente ou tem uma pequena empresa: acompanhe o faturamento, o limite da TVA e quanto reservar.',revenueYtd:'Faturamento do ano até agora (CHF)',revenueForecast:'Faturamento previsto no ano (CHF)',bizExpenses:'Despesas do negócio no ano (CHF)',reserveAvs:'Reserva para AVS (%)',reserveTax:'Reserva para impostos (%)',
tvaLimit:'Limite de TVA: CHF 100.000 por ano',tvaNear:'Perto do limite: veja se precisa se inscrever na TVA.',tvaOver:'Acima de CHF 100.000: a inscrição na TVA é obrigatória.',tvaOk:'Abaixo do limite da TVA.',profit:'Lucro estimado',monthlyReserve:'Reservar por mês',bizNote:'Estimativa simples. As contribuições AVS de independente são calculadas pela caixa de compensação sobre o lucro; os percentuais aqui são escolhas suas.'
});
Object.assign(T.fr,{
audience:'Pour celles et ceux qui travaillent et entreprennent en Suisse.',refineTitle:'Préciser (facultatif)',refineHelp:'3 réponses de plus rendent les actions plus précises. Vous pouvez passer si vous ne savez pas.',
navLife:'Vie en Suisse',
aCompare:'Comparer la LAMal',aSubsidy:'Voir le subside',a3a:'Voir mon 3a',aDecl:'Préparer la déclaration',aDocs:'Garder mes justificatifs',aPayslip:'Vérifier ma fiche de salaire',aBiz:'Ouvrir Mon activité',aBudget:'Ouvrir le budget',
ics:'Ajouter au calendrier du téléphone',icsDone:'Fichier de calendrier créé. Ouvrez-le pour importer les délais.',
exampleAdded:'Exemple fictif ajouté. Vos données n’ont pas été modifiées.',exampleRemoved:'Exemple retiré. Vos propres données sont toujours là.',
installDefaults:'Montants d’exemple. Remplacez-les par ceux de votre offre.',
segSend:'Envoyer de l’argent',segBiz:'Mon activité',segComprov:'Justificatifs',segPayslip:'Fiche de salaire',
lifeTitle:'Vie en Suisse',lifeSub:'Les grandes étapes, une à une.',segArrive:'Arriver',segLetters:'Comprendre une lettre',segRetire:'Retraite',segLeave:'Départ définitif',
guideNote:'Orientation générale avec sources officielles. Les délais exacts figurent dans les documents que vous recevez ; en cas de doute, adressez-vous au service indiqué.',done:'fait',
psTitle:'Vérifier ma fiche de salaire',psIntro:'Saisissez les montants de votre fiche de salaire. L’app vérifie les cotisations AVS/AI/APG et chômage et explique chaque retenue. Elle ne dit pas si votre salaire est correct : en cas de doute, demandez aux RH ou au syndicat.',
psMonth:'Mois',psGross:'Salaire brut (CHF)',psAvs:'AVS/AI/APG (CHF)',psAc:'Assurance chômage AC (CHF)',psLpp:'Prévoyance LPP (CHF)',psLaa:'Assurance accidents non professionnels LAA (CHF)',psIjm:'Perte de gain maladie IJM (CHF)',psSource:'Impôt à la source (CHF)',psOther:'Autres retenues (CHF)',psNet:'Salaire net (CHF)',
psCheck:'Vérifier',psSave:'Enregistrer et utiliser dans le budget',psSaved:'Fiche enregistrée et salaire net mis à jour dans le budget.',
psOk:'Conforme au taux 2026',psDiff:'Différent de l’attendu : demandez aux RH',psExpected:'attendu',psSum:'Total des retenues',psNetCalc:'Brut moins retenues',psNetOk:'Le net correspond au brut moins les retenues.',psNetDiff:'Le net ne correspond pas au brut moins les retenues. Certains éléments n’ont peut-être pas été saisis (heures supplémentaires, 13e, allocations).',
psExplAvs:'AVS/AI/APG : 5,3 % du salaire brut pour l’employé en 2026 (l’employeur paie aussi 5,3 %).',psExplAc:'Chômage (AC) : 1,1 % jusqu’à CHF 148 200 par an ; aucune retenue au-delà.',psExplLpp:'LPP : varie selon l’âge et le plan de la caisse de pension. Vérifiez le certificat annuel de la caisse.',psExplLaa:'LAA non professionnelle : couvre les accidents hors travail dès 8 heures par semaine. Le taux dépend de l’employeur.',psExplIjm:'IJM : assurance perte de gain maladie. Non obligatoire ; dépend du contrat ou de la convention collective.',psExplSource:'Impôt à la source : pour les permis L ou B (et certains autres cas). Le taux dépend du barème et de la situation familiale.',
psHistory:'Fiches enregistrées',psNone:'Aucune fiche enregistrée.',
lettersIntro:'Choisissez le type de lettre pour voir ce qu’elle demande habituellement, en termes simples. Ou collez le texte pour que l’app repère le type et les dates.',letterType:'Type de lettre',pasteLabel:'Collez ici le texte de la lettre',pasteBtn:'Analyser le texte',pasteNone:'Type de lettre non reconnu. Choisissez dans la liste ou montrez la lettre à un service d’aide.',pasteFound:'Il s’agit probablement de',datesFound:'Dates trouvées dans le texte',noDates:'Aucune date trouvée.',remindThis:'Créer un rappel',reminderAdded:'Rappel créé dans Délais.',lettersWarn:'L’app ne remplace pas la lecture de la lettre. Vérifiez toujours la date et le délai sur le document original.',
lWhat:'De quoi s’agit-il',lDeadline:'Délai habituel',lDo:'Que faire',
sendTitle:'Envoyer de l’argent au pays',sendIntro:'Voyez combien arrive de l’autre côté. Comparez jusqu’à 3 offres avec le taux de change de référence ; le coût caché dans le change apparaît aussi.',
ratesTitle:'Le franc aujourd’hui',ratesSource:'Taux de référence du marché, mis à jour une fois par jour.',ratesLoading:'Chargement des taux…',ratesFail:'Impossible de charger les taux. Vérifiez la connexion.',ratesCached:'Derniers taux enregistrés',
amountChf:'Montant à envoyer (CHF)',country:'Devise de destination',offer:'Offre',provider:'Service',feeChf:'Frais (CHF)',rateOffered:'Change proposé (1 CHF =)',received:'Montant reçu',hiddenCost:'Coût total (frais + marge sur le change)',best:'Montant reçu le plus élevé',
partnerSoon:'Bientôt : envoyer depuis l’app avec une plateforme autorisée. Le transfert se fera sur la plateforme partenaire, qui peut rémunérer PrivéFinances pour la recommandation.',
rentTitle:'Loyer et taux de référence',rentText:'Le taux hypothécaire de référence est de 1,25 % depuis le 02.09.2025, confirmé le 01.09.2026. Prochaine publication : 01.12.2026. Si votre loyer a été fixé sur un taux plus élevé, vous pouvez demander une baisse au bailleur.',snbText:'Taux directeur de la Banque nationale suisse (BNS) : 0 %, maintenu le 24.09.2026.',
lamalCalcTitle:'LAMal : quelle franchise vous coûte le moins ?',lamalCalcIntro:'Relevez sur Priminfo la prime mensuelle de deux franchises et estimez vos frais médicaux de l’année. Valable pour les adultes.',premiumLow:'Prime mensuelle avec franchise de CHF 300',premiumHigh:'Prime mensuelle avec franchise de CHF 2 500',expectedCosts:'Frais médicaux estimés sur l’année (CHF)',costLow:'Coût annuel avec franchise 300',costHigh:'Coût annuel avec franchise 2 500',cheaper:'La moins chère',lamalCalcNote:'Calcul : 12 primes + franchise + 10 % de quote-part jusqu’à CHF 700. Pour l’année suivante, baisser la franchise exige un avis avant le 30.11 ; l’augmenter, avant le 31.12.',
bizTitle:'Mon activité',bizIntro:'Pour les indépendants et petites entreprises : suivez le chiffre d’affaires, le seuil de TVA et ce qu’il faut mettre de côté.',revenueYtd:'Chiffre d’affaires de l’année à ce jour (CHF)',revenueForecast:'Chiffre d’affaires prévu sur l’année (CHF)',bizExpenses:'Charges de l’activité sur l’année (CHF)',reserveAvs:'Réserve AVS (%)',reserveTax:'Réserve impôts (%)',
tvaLimit:'Seuil de TVA : CHF 100 000 par an',tvaNear:'Proche du seuil : vérifiez si vous devez vous inscrire à la TVA.',tvaOver:'Au-delà de CHF 100 000 : l’inscription à la TVA est obligatoire.',tvaOk:'En dessous du seuil de TVA.',profit:'Bénéfice estimé',monthlyReserve:'À mettre de côté par mois',bizNote:'Estimation simple. Les cotisations AVS des indépendants sont calculées par la caisse de compensation sur le bénéfice ; les pourcentages ici sont vos choix.'
});

const SRC2={arrive:'https://www.ch.ch/fr/demenagement-en-suisse/',lamalArrive:'https://www.ch.ch/fr/assurance-maladie/',license:'https://www.ch.ch/fr/vehicules-et-circulation/permis-de-conduire/permis-de-conduire-etranger/',spop:'https://www.vd.ch/population/population-etrangere',avsRetire:'https://www.ahv-iv.ch/fr/Assurances-sociales/Assurance-vieillesse-et-survivants-AVS',avsAccount:'https://www.ahv-iv.ch/fr/Contact/Commande-dun-extrait-de-compte',leave:'https://www.ch.ch/fr/quitter-la-suisse/',lppLeave:'https://www.sfbvg.ch/fr/',tva:'https://www.estv.admin.ch/estv/fr/home/mehrwertsteuer/mwst-steuerpflicht.html',bwo:'https://www.bwo.admin.ch/fr/taux-de-reference',snb:'https://www.snb.ch/fr/',rates:'https://www.exchangerate-api.com',payslip:'https://www.ahv-iv.ch/fr/Assurances-sociales/Cotisations',ofspLamal:'https://www.priminfo.admin.ch/fr',tenant:'https://www.asloca.ch/'};

const GUIDES={
arrive:{pt:[['Anuncie sua chegada na comuna','No Contrôle des habitants da sua comuna, nos primeiros dias. O prazo exato está no site da comuna.',SRC2.arrive],['Contrate a LAMal em até 3 meses','O seguro de saúde é obrigatório. Contratando dentro de 3 meses, a cobertura vale desde a chegada.',SRC2.lamalArrive],['Guarde o número AVS','Ele aparece no cartão do seguro de saúde e nos holerites. É o número que registra suas contribuições para a aposentadoria.',SRC2.payslip],['Abra uma conta bancária ou postal','O salário é pago em conta suíça. Leve passaporte, permis e comprovante de endereço.',null],['Confira o imposto na fonte no holerite','Com permis L ou B, o imposto costuma ser descontado do salário. Se valer para você, a decisão sobre a TOU vai até 31/03.',SRC.sourceTax],['Anote a validade do seu permis','Peça a renovação antes do vencimento, no serviço indicado pelo cantão.',SRC2.spop],['Troque a carteira de motorista em até 12 meses','A carteira estrangeira vale 12 meses após a chegada.',SRC2.license],['Faça um seguro de responsabilidade civil','Muitos proprietários pedem. Ele cobre danos que você causa a outras pessoas.',null]],
fr:[['Annoncez votre arrivée à la commune','Au contrôle des habitants de votre commune, dans les premiers jours. Le délai exact figure sur le site de la commune.',SRC2.arrive],['Assurez-vous à la LAMal dans les 3 mois','L’assurance-maladie est obligatoire. Conclue dans les 3 mois, elle couvre dès l’arrivée.',SRC2.lamalArrive],['Gardez votre numéro AVS','Il figure sur la carte d’assurance-maladie et les fiches de salaire. C’est le numéro qui enregistre vos cotisations de retraite.',SRC2.payslip],['Ouvrez un compte bancaire ou postal','Le salaire est versé sur un compte suisse. Prenez passeport, permis et justificatif de domicile.',null],['Vérifiez l’impôt à la source sur la fiche de salaire','Avec un permis L ou B, l’impôt est souvent retenu sur le salaire. Le cas échéant, la décision sur la TOU se prend avant le 31.03.',SRC.sourceTax],['Notez la validité de votre permis','Demandez le renouvellement avant l’échéance, auprès du service indiqué par le canton.',SRC2.spop],['Échangez votre permis de conduire dans les 12 mois','Le permis étranger est valable 12 mois après l’arrivée.',SRC2.license],['Prenez une assurance responsabilité civile','Beaucoup de bailleurs la demandent. Elle couvre les dommages causés à autrui.',null]]},
retire:{pt:[['Peça o extrato da sua conta AVS','É gratuito. Mostra os anos de contribuição e eventuais lacunas, que às vezes ainda podem ser completadas.',SRC2.avsAccount],['Conheça sua idade de referência','65 anos. Para mulheres nascidas entre 1961 e 1963 há uma transição gradual.',SRC2.avsRetire],['Peça a renda AVS com antecedência','O pedido costuma ser feito alguns meses antes da aposentadoria, na caixa de compensação.',SRC2.avsRetire],['LPP: renda vitalícia ou capital?','A escolha costuma ter prazo de aviso no regulamento da sua caixa de pensão. Leia antes de decidir.',null],['Planeje a retirada do 3a','O 3a pode ser retirado a partir de alguns anos antes da idade de referência. Retiradas em anos diferentes podem reduzir o imposto.',SRC.pillar3a],['Vai morar fora na aposentadoria?','A renda AVS pode ser paga no exterior; as regras dependem do país. Confirme com a caixa antes de mudar.',SRC2.avsRetire]],
fr:[['Demandez l’extrait de votre compte AVS','C’est gratuit. Il montre les années de cotisation et les éventuelles lacunes, parfois encore comblables.',SRC2.avsAccount],['Connaissez votre âge de référence','65 ans. Pour les femmes nées entre 1961 et 1963, une transition progressive s’applique.',SRC2.avsRetire],['Demandez la rente AVS à l’avance','La demande se fait en général quelques mois avant la retraite, auprès de la caisse de compensation.',SRC2.avsRetire],['LPP : rente ou capital ?','Le choix a souvent un délai d’annonce fixé par le règlement de votre caisse de pension. Lisez-le avant de décider.',null],['Planifiez le retrait du 3a','Le 3a peut être retiré quelques années avant l’âge de référence. Échelonner les retraits peut réduire l’impôt.',SRC.pillar3a],['Vous partez vivre à l’étranger ?','La rente AVS peut être versée à l’étranger ; les règles dépendent du pays. Vérifiez auprès de la caisse avant de partir.',SRC2.avsRetire]]},
leave:{pt:[['Dê baixa na comuna','Anuncie a saída no Contrôle des habitants antes de partir e guarde o atestado de partida.',SRC2.leave],['Encerre a LAMal','O seguro termina com a saída da Suíça. A seguradora pede o atestado de partida.',SRC2.lamalArrive],['LPP: veja se pode sacar o capital','Quem deixa a Suíça definitivamente pode, em certos casos, sacar a previdência. Para países da UE/AELE, em geral só a parte extraobrigatória.',SRC2.lppLeave],['3a: saque ao sair definitivamente','A saída definitiva permite retirar o 3a. Sobre o capital há imposto na fonte, às vezes recuperável conforme a convenção do país.',SRC.pillar3a],['AVS: o que acontece com suas contribuições','Conforme o país e a convenção de seguridade social, elas podem contar para uma renda futura ou ser reembolsadas. Peça o extrato antes de partir.',SRC2.avsAccount],['Aluguel, caução e contas','Respeite o prazo de rescisão do contrato, peça a devolução da caução e deixe um endereço para correspondência.',SRC2.tenant]],
fr:[['Annoncez votre départ à la commune','Annoncez le départ au contrôle des habitants avant de partir et gardez l’attestation de départ.',SRC2.leave],['Résiliez la LAMal','L’assurance prend fin avec le départ de Suisse. L’assureur demande l’attestation de départ.',SRC2.lamalArrive],['LPP : vérifiez si vous pouvez retirer le capital','En quittant définitivement la Suisse, la prévoyance peut parfois être versée. Pour l’UE/AELE, en général seulement la part surobligatoire.',SRC2.lppLeave],['3a : retrait au départ définitif','Le départ définitif permet de retirer le 3a. Le capital est soumis à l’impôt à la source, parfois récupérable selon la convention du pays.',SRC.pillar3a],['AVS : ce que deviennent vos cotisations','Selon le pays et la convention de sécurité sociale, elles peuvent compter pour une rente future ou être remboursées. Demandez l’extrait avant de partir.',SRC2.avsAccount],['Loyer, garantie et comptes','Respectez le délai de résiliation du bail, demandez la restitution de la garantie et laissez une adresse de correspondance.',SRC2.tenant]]}};

const LETTERS={keys:['taxation','acomptes','rappel','commandement','ordonnance','loyer','lamalprime','decompte','avsindep','permis'],
kw:{taxation:['décision de taxation','avis de taxation','bordereau de taxation'],acomptes:['acompte','acomptes provisionnels','tranche'],rappel:['rappel','sommation','mise en demeure'],commandement:['commandement de payer','office des poursuites','poursuite'],ordonnance:['ordonnance pénale','amende','contravention'],loyer:['hausse de loyer','formule officielle','résiliation du bail'],lamalprime:['nouvelle prime','primes 2027','police d’assurance','police d\'assurance'],decompte:['décompte de prestations','participation aux coûts','quote-part'],avsindep:['cotisations personnelles','acomptes de cotisations','caisse de compensation'],permis:['renouvellement','autorisation de séjour','titre de séjour','permis de séjour']},
pt:{taxation:['Decisão de taxação (impostos)','O cálculo final do seu imposto do ano, feito pelo cantão.','Contestação (réclamation) em geral em 30 dias, contados da notificação.','Confira renda e deduções. Se algo estiver errado, faça a réclamation por escrito dentro do prazo indicado na carta.'],acomptes:['Parcelas de imposto (acomptes)','Pagamentos provisórios do imposto do ano, divididos em parcelas.','As datas de cada parcela estão na carta.','Pague nas datas ou peça ajuste se a sua renda mudou bastante. Atrasos podem gerar juros.'],rappel:['Lembrete ou cobrança (rappel, sommation)','Aviso de que uma conta não foi paga.','Um novo prazo curto, indicado na carta.','Pague ou entre em contato com quem enviou para combinar um plano. Se não concordar com a dívida, diga por escrito.'],commandement:['Commandement de payer (poursuite)','Cobrança oficial pelo office des poursuites.','Opposition em até 10 dias da notificação, se você contesta a dívida.','Vale agir logo: existe apoio gratuito em Vaud. Veja Ajuda > Dívidas.'],ordonnance:['Multa ou ordonnance pénale','Decisão de multa por uma infração.','Opposition em geral em 10 dias, se você não concorda.','Pague se concordar. Se não, faça a opposition por escrito dentro do prazo.'],loyer:['Aumento de aluguel ou rescisão','Aviso do proprietário sobre o contrato de aluguel, em formulário oficial.','Contestação de aumento em geral em 30 dias.','Confira o motivo e a taxa de referência. Associações de inquilinos podem ajudar.'],lamalprime:['Novo prêmio da LAMal','Aviso do novo valor do seguro de saúde para o próximo ano.','Para trocar de seguradora, a carta de rescisão deve chegar à seguradora até 30/11.','Compare no Priminfo e veja se tem direito ao subsídio.'],decompte:['Extrato de prestações (LAMal)','Mostra o que o seguro pagou e quanto fica com você (franquia e participação).','O prazo de pagamento está na fatura.','Confira se os tratamentos estão corretos. Guarde para a declaração de impostos.'],avsindep:['Contribuições AVS de independente','Cobrança das suas contribuições AVS/AI/APG como independente.','As datas das parcelas estão na carta.','Pague as parcelas. Se o seu lucro mudou, peça o ajuste à caixa de compensação.'],permis:['Renovação do permis','Aviso ou formulário para renovar a autorização de residência.','Antes do vencimento; o prazo exato está na carta.','Reúna os documentos pedidos e envie dentro do prazo ao serviço indicado.']},
fr:{taxation:['Décision de taxation','Le calcul final de votre impôt de l’année.','Réclamation en général dans les 30 jours dès la notification.','Vérifiez revenus et déductions. En cas d’erreur, réclamez par écrit dans le délai indiqué.'],acomptes:['Acomptes d’impôt','Paiements provisoires de l’impôt de l’année, en tranches.','Les dates figurent sur la lettre.','Payez aux échéances ou demandez une adaptation si votre revenu a beaucoup changé. Un retard peut coûter des intérêts.'],rappel:['Rappel ou sommation','Avis qu’une facture n’a pas été payée.','Nouveau délai court, indiqué sur la lettre.','Payez ou contactez l’expéditeur pour convenir d’un plan. Si vous contestez la dette, dites-le par écrit.'],commandement:['Commandement de payer','Recouvrement officiel par l’office des poursuites.','Opposition dans les 10 jours dès la notification, si vous contestez la dette.','Mieux vaut agir vite : une aide gratuite existe dans le canton. Voir Aide > Dettes.'],ordonnance:['Amende ou ordonnance pénale','Décision d’amende pour une infraction.','Opposition en général dans les 10 jours si vous contestez.','Payez si vous êtes d’accord. Sinon, faites opposition par écrit dans le délai.'],loyer:['Hausse de loyer ou résiliation','Avis du bailleur sur le bail, sur formule officielle.','Contestation d’une hausse en général dans les 30 jours.','Vérifiez le motif et le taux de référence. Les associations de locataires peuvent vous aider.'],lamalprime:['Nouvelle prime LAMal','Avis du nouveau montant de l’assurance-maladie pour l’an prochain.','Pour changer d’assureur, la lettre doit arriver au plus tard le 30.11.','Comparez sur Priminfo et vérifiez votre droit au subside.'],decompte:['Décompte de prestations LAMal','Ce que l’assurance a payé et ce qui reste à votre charge (franchise et quote-part).','Le délai de paiement figure sur la facture.','Vérifiez les traitements. Gardez-le pour la déclaration d’impôt.'],avsindep:['Cotisations AVS d’indépendant','Facture de vos cotisations AVS/AI/APG d’indépendant.','Les échéances figurent sur la lettre.','Payez les acomptes. Si votre bénéfice a changé, demandez une adaptation à la caisse.'],permis:['Renouvellement du permis','Avis ou formulaire pour renouveler l’autorisation de séjour.','Avant l’échéance ; le délai exact figure sur la lettre.','Réunissez les documents demandés et envoyez-les dans le délai au service indiqué.']}};
function detectLetter(text){const s=text.toLowerCase();let best=null,score=0;for(const k of LETTERS.keys){const n=LETTERS.kw[k].filter(w=>s.includes(w)).length;if(n>score){score=n;best=k;}}const dates=[...new Set([...text.matchAll(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{4}|\d{2})\b/g)].map(m=>{const y=m[3].length===2?'20'+m[3]:m[3];return iso(Number(y),Number(m[2]),Number(m[1]));}).filter(d=>!Number.isNaN(Date.parse(d))))];return {type:best,dates};}

let letterType='commandement',letterResult=null,rates=null,ratesState='idle';
const CUR=[['BRL','Brasil (BRL)'],['EUR','Portugal / zona euro (EUR)'],['CVE','Cabo Verde (CVE)'],['AOA','Angola (AOA)'],['MZN','Moçambique (MZN)'],['USD','Dólar (USD)']];
async function loadRates(){if(ratesState==='loading')return;ratesState='loading';try{const r=await fetch('https://open.er-api.com/v6/latest/CHF');const j=await r.json();if(j.result!=='success')throw 0;rates={date:(j.time_last_update_utc||'').slice(5,16),r:j.rates};S.rates=rates;save();ratesState='ok';}catch(e){rates=S.rates||null;ratesState='fail';}if(route.tab==='money'&&route.sub==='send')render();}
function payslipCheck(p){const g=num(p.gross),avsExp=Math.round(g*0.053*100)/100,acExp=Math.round(Math.min(g,148200/12)*0.011*100)/100;const ded=['avs','ac','lpp','laa','ijm','source','other'].reduce((s,k)=>s+num(p[k]),0);return {avsExp,acExp,avsOk:Math.abs(num(p.avs)-avsExp)<=Math.max(1,avsExp*0.02),acOk:Math.abs(num(p.ac)-acExp)<=Math.max(1,acExp*0.03),ded,netCalc:g-ded,netOk:Math.abs(g-ded-num(p.net))<=1};}
function franchiseCost(prem,fr,costs){const pay=Math.min(costs,fr),rest=Math.max(0,costs-fr);return prem*12+pay+Math.min(rest*0.1,700);}
function inp(id,lab,val,extra=''){return `<label class="field"><span>${t(lab)}</span><input id="${id}" data-v="${id}" inputmode="decimal" class="num" value="${esc(val??'')}" ${extra}></label>`;}

const LIFESEG=[['arrive','segArrive'],['letters','segLetters'],['retire','segRetire'],['leave','segLeave'],['glossary','segGlossary'],['debts','segDebts'],['decl','segDecl'],['experts','segExperts']];
function viewLife(){
  const sub=route.sub||'arrive';let body='';
  if(['arrive','retire','leave'].includes(sub)){const g=GUIDES[sub][lang],st=S.guides[sub]||{};const n=g.filter((_,i)=>st[i]).length;
    body=`<section class="panel"><div class="btns" style="justify-content:space-between"><strong>${n}/${g.length} ${t('done')}</strong></div><div class="bar"><i style="width:${Math.round(n/g.length*100)}%"></i></div>
    ${g.map(([a,b,src],i)=>`<label class="check" style="align-items:flex-start"><input type="checkbox" id="g-${sub}-${i}" data-guide="${sub}" data-i="${i}" ${st[i]?'checked':''}><span><strong>${esc(a)}</strong><br><span class="muted small">${esc(b)}</span>${src?` <a class="small" href="${src}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a>`:''}</span></label>`).join('')}
    <p class="muted small">${t('guideNote')}</p></section>`;}
  if(sub==='letters'){const L=LETTERS[lang],cur=L[letterType];
    body=`<p class="muted">${t('lettersIntro')}</p><section class="panel"><label class="field"><span>${t('letterType')}</span><select id="letterType" data-letter="1">${LETTERS.keys.map(k=>`<option value="${k}" ${k===letterType?'selected':''}>${esc(L[k][0])}</option>`).join('')}</select></label>
      <div style="display:grid;gap:8px"><p><strong>${t('lWhat')}:</strong> ${esc(cur[1])}</p><p><strong>${t('lDeadline')}:</strong> ${esc(cur[2])}</p><p><strong>${t('lDo')}:</strong> ${esc(cur[3])}</p></div></section>
    <section class="panel"><form id="letterForm"><label class="field"><span>${t('pasteLabel')}</span><textarea id="letterText" name="text" rows="5" maxlength="8000"></textarea></label><div class="btns"><button class="btn" type="submit">${t('pasteBtn')}</button></div></form>
      ${letterResult?`<div style="display:grid;gap:8px">${letterResult.type?`<p><strong>${t('pasteFound')}:</strong> ${esc(L[letterResult.type][0])}</p>`:`<p class="muted">${t('pasteNone')}</p>`}<p><strong>${t('datesFound')}:</strong></p>${letterResult.dates.length?letterResult.dates.map(d=>`<div class="btns"><span class="num">${fmtDate(d)}</span><button class="btn ghost small" data-act="remindLetter" data-date="${d}">${t('remindThis')}</button></div>`).join(''):`<p class="muted small">${t('noDates')}</p>`}</div>`:''}
      <p class="muted small">${t('lettersWarn')}</p></section>`;}
  if(['glossary','debts','decl','experts'].includes(sub)){route.tab='help';return viewHelp();}
  const hk={arrive:'profile',letters:'tou',retire:'p3a',leave:'conquest'}[sub];
  return `${pagehead(hk,t('solutionsTitle'),t('solutionsSub'))}${seg(LIFESEG,sub,'sub')}${body}`;
}

function viewPayslip(){const p=S.payslipDraft||{month:new Date().toISOString().slice(0,7)};const c=payslipCheck(p),has=num(p.gross)>0;
  const line=(k,ok,exp)=>has?`<span class="tag ${ok?'':'warn'}">${ok?t('psOk'):t('psDiff')} · ${t('psExpected')} ${chf(exp)}</span>`:'';
  return `<p class="muted">${t('psIntro')}</p><section class="panel"><div class="fields">
    <label class="field"><span>${t('psMonth')}</span><input id="ps-month" data-ps="month" type="month" value="${esc(p.month||'')}"></label>
    ${['gross','avs','ac','lpp','laa','ijm','source','other','net'].map(k=>`<label class="field"><span>${t('ps'+k[0].toUpperCase()+k.slice(1))}</span><input id="ps-${k}" data-ps="${k}" inputmode="decimal" class="num" value="${esc(p[k]??'')}">${k==='avs'?line(k,c.avsOk,c.avsExp):k==='ac'?line(k,c.acOk,c.acExp):''}</label>`).join('')}
  </div>
  ${has?`<div class="totals"><div><span>${t('psSum')}</span><span>${chf(c.ded)}</span></div><div><span>${t('psNetCalc')}</span><span>${chf(c.netCalc)}</span></div><p class="small ${c.netOk?'':'muted'}">${num(p.net)?(c.netOk?t('psNetOk'):t('psNetDiff')):''}</p></div>`:''}
  <div class="btns"><button class="btn" data-act="savePayslip" ${has&&num(p.net)>0?'':'disabled'}>${t('psSave')}</button></div></section>
  <section class="panel"><h3>${lang==='fr'?'Ce que signifie chaque retenue':'O que é cada desconto'}</h3><ul style="margin:0;padding-left:20px;display:grid;gap:6px" class="small">${['psExplAvs','psExplAc','psExplLpp','psExplLaa','psExplIjm','psExplSource'].map(k=>`<li>${t(k)}</li>`).join('')}</ul><p class="small"><a href="${SRC2.payslip}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a></p></section>
  <section class="panel"><h3>${t('psHistory')}</h3>${S.payslips.length?S.payslips.slice().reverse().map(x=>`<div class="btns" style="justify-content:space-between"><span class="num">${esc(x.month)} · ${chf(x.net)}</span><span class="tag ${payslipCheck(x).avsOk&&payslipCheck(x).acOk?'':'warn'}">${payslipCheck(x).avsOk&&payslipCheck(x).acOk?t('psOk'):t('psDiff')}</span></div>`).join(''):`<p class="muted small">${t('psNone')}</p>`}</section>`;}

function viewSend(){if(!rates&&ratesState==='idle'){rates=S.rates||null;loadRates();}
  const s=S.remit||{amount:500,cur:'BRL',offers:[{name:'',fee:'',rate:''},{name:'',fee:'',rate:''},{name:'',fee:'',rate:''}]};const mid=rates&&rates.r?rates.r[s.cur]:null,amt=num(s.amount);
  const offers=s.offers.map((o,i)=>{const rate=num(o.rate),fee=num(o.fee);const rec=rate?(amt-fee)*rate:null;const cost=rec!=null&&mid?amt-rec/mid:null;return {i,o,rec,cost};});
  const bestI=offers.filter(x=>x.rec).sort((a,b)=>b.rec-a.rec)[0]?.i;
  const fmt=(v,c)=>new Intl.NumberFormat(lang==='fr'?'fr-CH':'pt-BR',{style:'currency',currency:c,maximumFractionDigits:2}).format(v);
  return `<p class="muted">${t('sendIntro')}</p>
  <section class="panel"><h2>${t('ratesTitle')}</h2>${rates&&rates.r?`<div class="grid3">${CUR.map(([c,l])=>`<div class="stat"><span class="muted small">${l}</span><strong style="font-size:1.1rem">1 CHF = ${rates.r[c]?.toLocaleString(lang==='fr'?'fr-CH':'pt-BR',{maximumFractionDigits:c==='AOA'||c==='CVE'||c==='MZN'?1:4})} ${c}</strong></div>`).join('')}</div><p class="muted small">${ratesState==='fail'?t('ratesCached')+' · ':''}${t('ratesSource')} ${esc(rates.date||'')} · <a href="${SRC2.rates}" target="_blank" rel="noopener noreferrer">Rates by ExchangeRate-API</a></p>`:`<p class="muted">${ratesState==='fail'?t('ratesFail'):t('ratesLoading')}</p>`}</section>
  <section class="panel"><div class="fields">${inp('rm-amount','amountChf',s.amount)}<label class="field"><span>${t('country')}</span><select id="rm-cur" data-v="rm-cur">${CUR.map(([c,l])=>`<option value="${c}" ${s.cur===c?'selected':''}>${l}</option>`).join('')}</select></label></div>
  ${offers.map(({i,o,rec,cost})=>`<div class="panel" style="padding:14px;gap:10px;${i===bestI?'border-color:var(--accent)':''}"><strong>${t('offer')} ${i+1}${i===bestI?` · <span class="tag">${t('best')}</span>`:''}</strong><div class="fields"><label class="field"><span>${t('provider')}</span><input id="rm-name-${i}" data-off="${i}" data-k="name" value="${esc(o.name)}" maxlength="40"></label>${inp('rm-fee-'+i,'feeChf',o.fee,`data-off="${i}" data-k="fee"`).replace(`data-v="rm-fee-${i}" `,'')}${inp('rm-rate-'+i,'rateOffered',o.rate,`data-off="${i}" data-k="rate"`).replace(`data-v="rm-rate-${i}" `,'')}</div>${rec!=null?`<div class="totals"><div class="big" style="border:0;padding:0"><span>${t('received')}</span><span>${fmt(rec,s.cur)}</span></div>${cost!=null?`<div><span>${t('hiddenCost')}</span><span>${chf(cost)}</span></div>`:''}</div>`:''}</div>`).join('')}
  <p class="muted small">${t('partnerSoon')}</p></section>`;}

function viewBiz(){const b=S.biz||{ytd:'',forecast:'',expenses:'',avs:10,tax:10};const ytd=num(b.ytd),fc=num(b.forecast)||ytd,pr=Math.max(0,fc-num(b.expenses)),res=pr*(num(b.avs)+num(b.tax))/100/12,pc=Math.min(100,Math.round(Math.max(ytd,fc)/100000*100));
  const st=Math.max(ytd,fc)>=100000?['tvaOver','bad']:Math.max(ytd,fc)>=80000?['tvaNear','warn']:['tvaOk',''];
  return `<p class="muted">${t('bizIntro')}</p><section class="panel"><div class="fields">${inp('bz-ytd','revenueYtd',b.ytd)}${inp('bz-forecast','revenueForecast',b.forecast)}${inp('bz-expenses','bizExpenses',b.expenses)}${inp('bz-avs','reserveAvs',b.avs)}${inp('bz-tax','reserveTax',b.tax)}</div></section>
  <section class="panel"><strong>${t('tvaLimit')}</strong><div class="bar"><i style="width:${pc}%;${st[1]==='bad'?'background:var(--bad)':st[1]==='warn'?'background:var(--warn)':''}"></i></div><span class="tag ${st[1]}">${t(st[0])}</span> <a class="small" href="${SRC2.tva}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a></section>
  <div class="totals"><div><span>${t('profit')}</span><span>${chf(pr)}</span></div><div class="big"><span>${t('monthlyReserve')}</span><span>${chf(res)}</span></div></div><p class="muted small">${t('bizNote')}</p>`;}

function savingsExtras(){const l=S.lamalCalc||{low:'',high:'',costs:''};const cl=franchiseCost(num(l.low),300,num(l.costs)),ch=franchiseCost(num(l.high),2500,num(l.costs)),ready=num(l.low)>0&&num(l.high)>0;
  return `<section class="panel"><h2>${t('lamalCalcTitle')}</h2><p class="muted small">${t('lamalCalcIntro')} <a href="${SRC2.ofspLamal}" target="_blank" rel="noopener noreferrer">Priminfo ↗</a></p><div class="fields">${inp('lc-low','premiumLow',l.low)}${inp('lc-high','premiumHigh',l.high)}${inp('lc-costs','expectedCosts',l.costs)}</div>
    ${ready?`<div class="totals"><div><span>${t('costLow')}</span><span>${chf(cl)} ${cl<=ch?`<span class="tag">${t('cheaper')}</span>`:''}</span></div><div><span>${t('costHigh')}</span><span>${chf(ch)} ${ch<cl?`<span class="tag">${t('cheaper')}</span>`:''}</span></div></div>`:''}<p class="muted small">${t('lamalCalcNote')}</p></section>
  <section class="panel"><h2>${t('rentTitle')}</h2><p>${t('rentText')}</p><p class="muted">${t('snbText')}</p><p class="small"><a href="${SRC2.bwo}" target="_blank" rel="noopener noreferrer">${t('officialSource')}</a> · <a href="${SRC2.tenant}" target="_blank" rel="noopener noreferrer">ASLOCA ↗</a></p></section>`;}

function icsExport(){const esc2=s=>String(s).replace(/[,;\\]/g,m=>'\\'+m);const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PriveFinances//PT','CALSCALE:GREGORIAN'];for(const d of deadlines().filter(x=>x.d>=0)){const dt=d.date.replace(/-/g,'');lines.push('BEGIN:VEVENT','UID:'+dt+'-'+Math.abs([...d.label].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,0))+'@privefinances','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART;VALUE=DATE:'+dt,'SUMMARY:'+esc2(d.label),'BEGIN:VALARM','TRIGGER:-P3D','ACTION:DISPLAY','DESCRIPTION:'+esc2(d.label),'END:VALARM','END:VEVENT');}lines.push('END:VCALENDAR');download('privefinances-prazos.ics',lines.join('\r\n'),'text/calendar');toast(t('icsDone'));}

/* ---------- v4: agregado familiar, onboarding em 7 etapas, dashboard e sincronização com a conta ---------- */
Object.assign(T.pt,{
navBudget:'Orçamento',navScanner:'Scanner',navSolutions:'Soluções',navProfile:'Perfil',
ctaFree:'Descubra gratuitamente para onde seu dinheiro está indo e como melhorar seu orçamento.',startOnboard:'Começar agora',resumeOnboard:'Continuar de onde parei',
obStep:'Etapa {n} de 7',obNext:'Continuar',obBack:'Voltar',obSkip:'Pular por agora',obFinish:'Ir para o meu painel',
ob1Title:'Faça seu dinheiro render melhor na Suíça.',ob1Text:'Em poucos minutos você vê quanto entra, quanto sai, o que vence nos próximos 30 dias e onde dá para economizar. Escolha o idioma para começar.',ob1Points:'Saldo do mês e dos próximos 30 dias|Contas e prazos antes de vencerem|Ideias de economia com fonte, sem promessas',
ob2Title:'Seu perfil',ob2Text:'Só o necessário para mostrar regras e prazos certos. Hoje o app cobre o cantão de Vaud.',commune:'Comuna onde mora',work:'Situação profissional',wEmployee:'Assalariado(a)',wIndependent:'Independente',wBoth:'Os dois',wUnemployed:'Sem trabalho no momento',wRetired:'Aposentado(a)',
ob3Title:'Seus rendimentos',ob3Text:'O salário líquido (o que cai na conta) é a base do orçamento. Se tiver o holerite, use os valores dele.',netSalary:'Salário líquido por mês (CHF)',payDay:'Dia em que recebe',has13:'Recebo 13º salário',incomeConfirmed:'Valor confirmado (já recebi este valor)',extraIncomes:'Outras rendas (abonos, extras, aluguel de quarto…)',
ob4Title:'Sua família',ob4Text:'Quem entra neste orçamento.',adults:'Adultos no orçamento',dependents:'Filhos ou dependentes',otherContrib:'Outras contribuições recebidas por mês (CHF)',
ob5Title:'Suas despesas',ob5Text:'Comece pelas principais. Contas trimestrais ou anuais também entram: o app separa uma reserva por mês.',quickAdd:'Adicionar rapidamente',
ob6Title:'Seu diagnóstico',ob6Text:'Com base no que você informou. É uma estimativa, não o saldo do banco.',
ob7Title:'Seu plano de economia',ob7Text:'Quanto você quer guardar por mês? O app compara com o que sobra e sugere 3 ações.',goalMonthly:'Meta por mês (CHF)',goalLabel:'Para quê? (opcional)',
openingBalance:'Saldo na conta hoje (CHF, opcional)',openingHelp:'Com o saldo de hoje, o app calcula o menor saldo dos próximos 30 dias.',
dashAvailable:'Disponível no mês',dashAvailableHelp:'Entradas menos saídas previstas (estimativa)',dashToPay:'A pagar em 30 dias',dashLowest:'Menor saldo previsto',dashLowestHelp:'nos próximos 30 dias',dashNextPay:'Próximo salário',dashConfirmed:'Saldo confirmado',dashEstimated:'Partindo de CHF 0: informe o saldo de hoje para uma projeção real.',
upcoming:'Próximos vencimentos',noUpcoming:'Nada a pagar nos próximos 30 dias.',alerts:'Alertas',noAlerts:'Nenhum alerta agora.',recs:'Recomendações para você',recState:{suggested:'Sugerida',in_review:'Em análise',done:'Feita',discarded:'Descartada'},markReview:'Vou analisar',markDone:'Já fiz',markDiscard:'Não se aplica',
quick:'Ações rápidas',qScan:'Digitalizar fatura',qBudget:'Meu orçamento',qSave:'Economizar',qTax:'Meus impostos',qGuide:'Guia Suisse',qBiz:'Meu negócio',
goalTitle:'Meta de economia',goalOk:'Cabe no seu orçamento.',goalGap:'Faltam {gap} por mês. Sugestão: começar com {sug}.',noGoal:'Sem meta definida.',
risk:{monthly_deficit:'As saídas do mês passam as entradas.',negative_balance_30d:'O saldo pode ficar negativo em {date}.',low_buffer_30d:'O saldo fica baixo em {date}.',housing_over_third:'A moradia leva {share}% da renda.',income_mostly_estimated:'A maior parte da renda ainda é estimada.'},
rec:{user_found_cheaper_option:'Você encontrou uma opção mais barata para “{label}”.',lamal_premium_can_be_compared:'Compare a LAMal para 2027.',subsidy_may_apply:'Veja se você tem direito ao subsídio da LAMal.',housing_over_third:'Confira a taxa de referência no seu contrato de aluguel.',negative_balance_30d:'Evite o saldo negativo previsto para {date}.',largest_flexible_expense:'Revise o maior gasto flexível: {cat}.'},
next:{review_contract:'Rever o contrato e as condições',compare_on_priminfo:'Comparar no Priminfo até 30/11',check_subsidy_conditions:'Ver as condições oficiais',check_reference_rate_in_lease:'Ver a taxa no contrato',move_flexible_expenses_or_contact_budget_service:'Adiar gastos flexíveis ou falar com um serviço de orçamento',review_subscriptions_and_habits:'Rever assinaturas e hábitos'},
current:'Hoje',potential:'Economia possível',unknownSaving:'a confirmar',source:'Fonte',
freq:{monthly:'Por mês',quarterly:'Por trimestre',semiannual:'Por semestre',annual:'Por ano',oneoff:'Só uma vez'},dayLbl:'Dia',anchorLbl:'1º mês',monthLbl:'Mês',statusLbl:'Situação',confirmedS:'Confirmado',estimatedS:'Estimado',typeLbl:'Tipo',
itype:{salary:'Salário',extra:'Renda extra',allowance:'Abono',benefit:'Benefício',family:'Ajuda da família'},
cat:{housing:'Moradia',lamal:'LAMal (saúde)',food:'Alimentação',transport:'Transporte',telecom:'Telefone e internet',energy:'Energia',insurance:'Outros seguros',credit:'Crédito',leasing:'Leasing',tax:'Impostos',education:'Educação',childcare:'Creche',remittance:'Envio à família',leisure:'Lazer',other:'Outros'},
essentialT:'Essenciais',flexibleT:'Flexíveis',provisionsT:'Reservas para contas não mensais',confirmedIncT:'Renda confirmada',estimatedIncT:'Renda estimada',
proj30:'Saldo dia a dia, próximos 30 dias',syncOn:'Conta conectada: salvo no servidor, cifrado.',syncOff:'Modo de teste: salvo só neste aparelho.',syncFail:'Não foi possível salvar na conta. Os dados ficaram neste aparelho.',
profileTitle:'Perfil',editOnboard:'Refazer o diagnóstico',langLbl:'Idioma',planTitle:'Seu plano',planFree:'Essencial (gratuito)',planInfo:'Planos pagos (Privé Plus e Business) ainda não estão disponíveis. Nenhuma cobrança é feita.',
scannerTitle:'Scanner',solutionsTitle:'Soluções',solutionsSub:'Guias, ajuda e especialistas, um passo de cada vez.',deadlinesSub:'Vencimentos'
});
Object.assign(T.fr,{
navBudget:'Budget',navScanner:'Scanner',navSolutions:'Solutions',navProfile:'Profil',
ctaFree:'Découvrez gratuitement où va votre argent et comment améliorer votre budget.',startOnboard:'Commencer',resumeOnboard:'Reprendre où je me suis arrêté',
obStep:'Étape {n} sur 7',obNext:'Continuer',obBack:'Retour',obSkip:'Passer pour l’instant',obFinish:'Aller à mon tableau de bord',
ob1Title:'Faites mieux travailler votre argent en Suisse.',ob1Text:'En quelques minutes, voyez ce qui entre, ce qui sort, ce qui arrive à échéance dans les 30 prochains jours et où économiser. Choisissez la langue pour commencer.',ob1Points:'Solde du mois et des 30 prochains jours|Factures et délais avant l’échéance|Pistes d’économie avec source, sans promesse',
ob2Title:'Votre profil',ob2Text:'Seulement le nécessaire pour afficher les bonnes règles et délais. L’app couvre aujourd’hui le canton de Vaud.',commune:'Commune de domicile',work:'Situation professionnelle',wEmployee:'Salarié(e)',wIndependent:'Indépendant(e)',wBoth:'Les deux',wUnemployed:'Sans emploi actuellement',wRetired:'Retraité(e)',
ob3Title:'Vos revenus',ob3Text:'Le salaire net (ce qui arrive sur le compte) est la base du budget. Si vous avez la fiche de salaire, utilisez ses montants.',netSalary:'Salaire net par mois (CHF)',payDay:'Jour de paie',has13:'Je reçois un 13e salaire',incomeConfirmed:'Montant confirmé (déjà reçu)',extraIncomes:'Autres revenus (allocations, extras, sous-location…)',
ob4Title:'Votre ménage',ob4Text:'Qui fait partie de ce budget.',adults:'Adultes dans le budget',dependents:'Enfants ou personnes à charge',otherContrib:'Autres contributions reçues par mois (CHF)',
ob5Title:'Vos dépenses',ob5Text:'Commencez par les principales. Les factures trimestrielles ou annuelles comptent aussi : l’app met de côté une réserve par mois.',quickAdd:'Ajout rapide',
ob6Title:'Votre diagnostic',ob6Text:'Selon ce que vous avez saisi. C’est une estimation, pas le solde bancaire.',
ob7Title:'Votre plan d’épargne',ob7Text:'Combien voulez-vous mettre de côté par mois ? L’app compare avec ce qui reste et propose 3 actions.',goalMonthly:'Objectif par mois (CHF)',goalLabel:'Pour quoi ? (facultatif)',
openingBalance:'Solde du compte aujourd’hui (CHF, facultatif)',openingHelp:'Avec le solde du jour, l’app calcule le solde le plus bas des 30 prochains jours.',
dashAvailable:'Disponible ce mois',dashAvailableHelp:'Entrées moins sorties prévues (estimation)',dashToPay:'À payer sur 30 jours',dashLowest:'Solde le plus bas prévu',dashLowestHelp:'sur les 30 prochains jours',dashNextPay:'Prochain salaire',dashConfirmed:'Solde confirmé',dashEstimated:'Départ à CHF 0 : saisissez le solde du jour pour une projection réelle.',
upcoming:'Prochaines échéances',noUpcoming:'Rien à payer dans les 30 prochains jours.',alerts:'Alertes',noAlerts:'Aucune alerte pour le moment.',recs:'Recommandations pour vous',recState:{suggested:'Suggérée',in_review:'En cours',done:'Faite',discarded:'Écartée'},markReview:'Je regarde',markDone:'C’est fait',markDiscard:'Ne s’applique pas',
quick:'Actions rapides',qScan:'Scanner une facture',qBudget:'Mon budget',qSave:'Économiser',qTax:'Mes impôts',qGuide:'Guide Suisse',qBiz:'Mon activité',
goalTitle:'Objectif d’épargne',goalOk:'Compatible avec votre budget.',goalGap:'Il manque {gap} par mois. Suggestion : commencer par {sug}.',noGoal:'Aucun objectif défini.',
risk:{monthly_deficit:'Les sorties du mois dépassent les entrées.',negative_balance_30d:'Le solde pourrait devenir négatif le {date}.',low_buffer_30d:'Le solde devient bas le {date}.',housing_over_third:'Le logement représente {share} % du revenu.',income_mostly_estimated:'La plus grande partie du revenu est encore estimée.'},
rec:{user_found_cheaper_option:'Vous avez trouvé une option moins chère pour « {label} ».',lamal_premium_can_be_compared:'Comparez la LAMal pour 2027.',subsidy_may_apply:'Vérifiez votre droit au subside LAMal.',housing_over_third:'Vérifiez le taux de référence de votre bail.',negative_balance_30d:'Évitez le solde négatif prévu le {date}.',largest_flexible_expense:'Revoyez la plus grosse dépense flexible : {cat}.'},
next:{review_contract:'Revoir le contrat et les conditions',compare_on_priminfo:'Comparer sur Priminfo avant le 30.11',check_subsidy_conditions:'Voir les conditions officielles',check_reference_rate_in_lease:'Voir le taux dans le bail',move_flexible_expenses_or_contact_budget_service:'Reporter des dépenses flexibles ou contacter un service budget',review_subscriptions_and_habits:'Revoir abonnements et habitudes'},
current:'Aujourd’hui',potential:'Économie possible',unknownSaving:'à confirmer',source:'Source',
freq:{monthly:'Par mois',quarterly:'Par trimestre',semiannual:'Par semestre',annual:'Par an',oneoff:'Une fois'},dayLbl:'Jour',anchorLbl:'1er mois',monthLbl:'Mois',statusLbl:'État',confirmedS:'Confirmé',estimatedS:'Estimé',typeLbl:'Type',
itype:{salary:'Salaire',extra:'Revenu extra',allowance:'Allocation',benefit:'Prestation',family:'Aide familiale'},
cat:{housing:'Logement',lamal:'LAMal (santé)',food:'Alimentation',transport:'Transports',telecom:'Téléphone et internet',energy:'Énergie',insurance:'Autres assurances',credit:'Crédit',leasing:'Leasing',tax:'Impôts',education:'Formation',childcare:'Crèche',remittance:'Envois à la famille',leisure:'Loisirs',other:'Autres'},
essentialT:'Essentielles',flexibleT:'Flexibles',provisionsT:'Réserves pour factures non mensuelles',confirmedIncT:'Revenu confirmé',estimatedIncT:'Revenu estimé',
proj30:'Solde jour par jour, 30 prochains jours',syncOn:'Compte connecté : enregistré sur le serveur, chiffré.',syncOff:'Mode test : enregistré sur cet appareil uniquement.',syncFail:'Enregistrement sur le compte impossible. Les données restent sur cet appareil.',
profileTitle:'Profil',editOnboard:'Refaire le diagnostic',langLbl:'Langue',planTitle:'Votre formule',planFree:'Essentiel (gratuit)',planInfo:'Les formules payantes (Privé Plus et Business) ne sont pas encore disponibles. Aucun paiement n’est demandé.',
scannerTitle:'Scanner',solutionsTitle:'Solutions',solutionsSub:'Guides, aide et spécialistes, étape par étape.',deadlinesSub:'Échéances'
});
const tt=(k,sub,v)=>{let s=((T[lang][k]||T.pt[k])||{})[sub]??sub;if(v)for(const [a,b] of Object.entries(v))s=String(s).replace('{'+a+'}',b);return s;};
const cents=v=>Math.round(num(v)*100);
const fromC=v=>(Number(v)||0)/100;
const chfc=v=>chf(fromC(v));
const todayISO=()=>{const d=today();return iso(d.getFullYear(),d.getMonth()+1,d.getDate());};

/* ----- modelo do agregado (mesmo formato validado pelo servidor) ----- */
const blankHH=()=>({version:2,lang,onboarding:{step:'welcome',completed:false},profile:{canton:'VD',commune:'',work:null,permit:null,sourceTax:null},family:{adults:1,dependents:0,otherContributions:0},openingBalance:null,incomes:[],expenses:[],goal:null,recommendationStates:{}});
function migrateBudget(){ // orçamento antigo (CHF, freq monthly/annual/once) → agregado v2
  const h=blankHH(),m=todayISO().slice(0,7),map={catHousing:'housing',catHealth:'lamal',catTransport:'transport',catFood:'food',catKids:'childcare',catTax:'tax',catInsurance:'insurance',catCredit:'credit',catLeisure:'leisure',catSend:'remittance',catOther:'other'};
  const f=r=>r.freq==='annual'?{frequency:'annual',anchorMonth:12}:r.freq==='once'?{frequency:'oneoff',month:m}:{frequency:'monthly'};
  for(const r of S.budget?.income||[])if(num(r.amount)>0)h.incomes.push({id:r.id,label:r.label||'—',type:r.salary?'salary':'extra',amount:cents(r.amount),day:25,status:'estimated',...f(r),ex:r.ex});
  for(const r of S.budget?.expenses||[])if(num(r.amount)>0)h.expenses.push({id:r.id,label:r.label||'—',category:map[r.category]||'other',amount:cents(r.amount),day:1,status:'estimated',...f(r),ex:r.ex});
  if(h.incomes.length||h.expenses.length)h.onboarding={step:'diagnosis',completed:false};
  return h;
}
if(!S.household)S.household=migrateBudget();
const H=()=>S.household;

/* ----- conta conectada: o servidor guarda o agregado cifrado; sem conta, fica no aparelho ----- */
let remote=false,syncState='off',saveTimer=null;
async function api(path,opt={}){const r=await fetch('/api'+path,{credentials:'same-origin',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const ct=r.headers.get('content-type')||'';if(!ct.includes('json'))throw new Error('no_api');const j=await r.json();if(!r.ok)throw new Error(j.error||'error');return j;}
const clean=h=>JSON.parse(JSON.stringify({...h,incomes:h.incomes.map(({ex,...r})=>r),expenses:h.expenses.map(({ex,...r})=>r)}));
async function connect(){try{await api('/me');remote=true;syncState='on';const r=await api('/household');if(r.household){const local=H();S.household={...r.household,incomes:r.household.incomes,expenses:r.household.expenses};if(!r.household.onboarding.completed&&local.onboarding.completed)S.household.onboarding=local.onboarding;}save();render();}catch(e){remote=false;syncState='off';}}
function saveHH(){H().lang=lang;save();if(!remote)return;clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await api('/household',{method:'PUT',body:JSON.stringify(clean(H()))});syncState='on';}catch(e){syncState='fail';toast(t('syncFail'));}},700);}

/* ----- cálculos com o motor compartilhado ----- */
function engine(){const h=H(),d=todayISO();return {b:monthlyBudget(h,d.slice(0,7)),p:projection(h,d,30),dg:diagnosis(h,d),g:goalCheck(h,d.slice(0,7)),r:recommendations(h,d)};}

/* ----- onboarding em 7 etapas ----- */
const STEPS=['welcome','profile','income','family','expenses','diagnosis','plan'];
const QUICK=[['housing','monthly',1],['lamal','monthly',1],['food','monthly',null],['transport','monthly',1],['telecom','monthly',15],['energy','quarterly',30],['insurance','annual',1],['tax','monthly',28],['leasing','monthly',5],['remittance','monthly',null]];
function obNav(i){return `<div class="btns" style="justify-content:space-between">${i>0?`<button class="btn ghost" data-ob="${STEPS[i-1]}">${t('obBack')}</button>`:'<span></span>'}<button class="btn" data-ob="${i<6?STEPS[i+1]:'finish'}">${i<6?t('obNext'):t('obFinish')}</button></div>`;}
function salaryRow(){return H().incomes.find(r=>r.type==='salary');}
function viewOnboard(){
  const h=H(),i=Math.max(0,STEPS.indexOf(h.onboarding.step)),bar=`<div class="bar" aria-label="${t('obStep',{n:i+1})}"><i style="width:${Math.round((i+1)/7*100)}%"></i></div><p class="label">${t('obStep',{n:i+1})}</p>`;
  let body='';
  if(i===0)body=`<div class="profile-split"><div style="display:grid;gap:14px"><h1>${t('ob1Title')}</h1><p class="muted">${t('ob1Text')}</p><ul style="margin:0;padding-left:20px;display:grid;gap:6px">${t('ob1Points').split('|').map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <div class="seg">${[['pt','Português'],['fr','Français']].map(([l,n])=>`<button type="button" data-setlang="${l}" aria-pressed="${lang===l}">${n}</button>`).join('')}</div></div>${photo('hero')}</div>`;
  if(i===1)body=`<h2>${t('ob2Title')}</h2><p class="muted">${t('ob2Text')}</p><div class="fields">
    <label class="field"><span>${t('commune')}</span><input id="ob-commune" data-hp="commune" value="${esc(h.profile.commune)}" maxlength="80" placeholder="Lausanne, Renens…"></label>
    <label class="field"><span>${t('work')}</span><select id="ob-work" data-hp="work"><option value="">${t('choose')}</option>${[['employee','wEmployee'],['independent','wIndependent'],['both','wBoth'],['unemployed','wUnemployed'],['retired','wRetired']].map(([v,k])=>`<option value="${v}" ${h.profile.work===v?'selected':''}>${t(k)}</option>`).join('')}</select></label>
    <label class="field"><span>${t('qPermit')}</span><select id="ob-permit" data-hp="permit"><option value="">${t('choose')}</option>${['L','B','C','CH','other'].map(v=>`<option value="${v}" ${h.profile.permit===v?'selected':''}>${t(v)}</option>`).join('')}</select></label>
    <label class="field"><span>${t('qSourceTax')}</span><select id="ob-st" data-hp="sourceTax"><option value="">${t('choose')}</option>${['yes','no','unknown'].map(v=>`<option value="${v}" ${h.profile.sourceTax===v?'selected':''}>${t(v)}</option>`).join('')}</select></label></div>`;
  if(i===2){const s=salaryRow()||{};body=`<h2>${t('ob3Title')}</h2><p class="muted">${t('ob3Text')}</p><div class="fields">
    <label class="field"><span>${t('netSalary')}</span><input id="ob-net" data-sal="amount" inputmode="decimal" class="num" value="${s.amount?fromC(s.amount):''}"></label>
    <label class="field"><span>${t('payDay')}</span><input id="ob-payday" data-sal="day" type="number" min="1" max="31" value="${s.day||25}"></label>
    <label class="check"><input type="checkbox" id="ob-13" data-sal="thirteenth" ${s.thirteenth?'checked':''}><span>${t('has13')}</span></label>
    <label class="check"><input type="checkbox" id="ob-conf" data-sal="status" ${s.status==='confirmed'?'checked':''}><span>${t('incomeConfirmed')}</span></label>
    <label class="field wide"><span>${t('openingBalance')}</span><input id="ob-open" data-open="1" inputmode="decimal" class="num" value="${h.openingBalance?fromC(h.openingBalance.amount):''}"><small>${t('openingHelp')}</small></label></div>
    <p class="label">${t('extraIncomes')}</p><div class="rows">${incRows(true)}</div><div><button class="btn ghost small" data-act="hhAddInc">+ ${t('addIncome')}</button></div>`;}
  if(i===3)body=`<h2>${t('ob4Title')}</h2><p class="muted">${t('ob4Text')}</p><div class="fields">
    <label class="field"><span>${t('adults')}</span><input id="ob-adults" data-fam="adults" type="number" min="1" max="6" value="${h.family.adults}"></label>
    <label class="field"><span>${t('dependents')}</span><input id="ob-deps" data-fam="dependents" type="number" min="0" max="12" value="${h.family.dependents}"></label>
    <label class="field wide"><span>${t('otherContrib')}</span><input id="ob-contrib" data-fam="otherContributions" inputmode="decimal" class="num" value="${h.family.otherContributions?fromC(h.family.otherContributions):''}"></label></div>`;
  if(i===4)body=`<h2>${t('ob5Title')}</h2><p class="muted">${t('ob5Text')}</p><p class="label">${t('quickAdd')}</p><div class="seg">${QUICK.map(([c])=>`<button type="button" data-quick="${c}">+ ${esc(tt('cat',c))}</button>`).join('')}</div><div class="rows">${expRows()}</div><div><button class="btn ghost small" data-act="hhAddExp">+ ${t('addExpense')}</button></div>${hhTotals()}`;
  if(i===5)body=`<h2>${t('ob6Title')}</h2><p class="muted">${t('ob6Text')}</p>${diagCards()}${alertsHtml()}`;
  if(i===6){const e=engine();body=`<h2>${t('ob7Title')}</h2><p class="muted">${t('ob7Text')}</p><div class="fields">
    <label class="field"><span>${t('goalMonthly')}</span><input id="ob-goal" data-goal="monthly" inputmode="decimal" class="num" value="${h.goal?.monthly?fromC(h.goal.monthly):''}"></label>
    <label class="field"><span>${t('goalLabel')}</span><input id="ob-goal-l" data-goal="label" maxlength="80" value="${esc(h.goal?.label||'')}"></label></div>${goalHtml(e.g)}${recsHtml(e.r)}`;}
  return `<section class="panel">${bar}${body}${obNav(i)}</section><p class="muted small">${remote?t('syncOn'):t('syncOff')}</p>`;
}

/* ----- linhas editáveis ----- */
const FREQ=['monthly','quarterly','semiannual','annual','oneoff'];
function freqExtra(r,kind){if(r.frequency==='oneoff')return `<input aria-label="${t('monthLbl')}" type="month" data-${kind}="month" value="${esc(r.month||todayISO().slice(0,7))}">`;if(r.frequency!=='monthly')return `<select aria-label="${t('anchorLbl')}" data-${kind}="anchorMonth">${[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`<option value="${m}" ${(r.anchorMonth||1)===m?'selected':''}>${t('anchorLbl')}: ${m}</option>`).join('')}</select>`;return '<span></span>';}
function incRows(skipSalary){const arr=H().incomes.filter(r=>!(skipSalary&&r.type==='salary'));if(!arr.length)return '';return arr.map(r=>`<div class="row hrow" data-id="${r.id}" data-k="inc">
  <input class="label-in" aria-label="${t('description')}" placeholder="${t('description')}" data-inc="label" value="${esc(r.label)}" maxlength="120">
  <select aria-label="${t('typeLbl')}" data-inc="type">${['salary','extra','allowance','benefit','family'].map(x=>`<option value="${x}" ${r.type===x?'selected':''}>${esc(tt('itype',x))}</option>`).join('')}</select>
  <input aria-label="${t('amount')}" placeholder="CHF" data-inc="amount" inputmode="decimal" class="num" value="${r.amount?fromC(r.amount):''}">
  <select aria-label="${t('frequency')}" data-inc="frequency">${FREQ.map(f=>`<option value="${f}" ${r.frequency===f?'selected':''}>${esc(tt('freq',f))}</option>`).join('')}</select>
  ${freqExtra(r,'inc')}
  <input aria-label="${t('dayLbl')}" title="${t('dayLbl')}" type="number" min="1" max="31" data-inc="day" value="${r.day||25}">
  <select aria-label="${t('statusLbl')}" data-inc="status"><option value="estimated" ${r.status!=='confirmed'?'selected':''}>${t('estimatedS')}</option><option value="confirmed" ${r.status==='confirmed'?'selected':''}>${t('confirmedS')}</option></select>
  <button type="button" class="iconbtn" aria-label="${t('remove')}" data-act="hhRm">×</button></div>`).join('');}
function expRows(){const arr=H().expenses;if(!arr.length)return `<div class="empty">${t('noBudget')}</div>`;return arr.map(r=>`<div class="row hrow" data-id="${r.id}" data-k="exp">
  <input class="label-in" aria-label="${t('description')}" placeholder="${t('description')}" data-exp="label" value="${esc(r.label)}" maxlength="120">
  <select aria-label="${t('category')}" data-exp="category">${EXPENSE_CATEGORIES.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${esc(tt('cat',c))}</option>`).join('')}</select>
  <input aria-label="${t('amount')}" placeholder="CHF" data-exp="amount" inputmode="decimal" class="num" value="${r.amount?fromC(r.amount):''}">
  <select aria-label="${t('frequency')}" data-exp="frequency">${FREQ.map(f=>`<option value="${f}" ${r.frequency===f?'selected':''}>${esc(tt('freq',f))}</option>`).join('')}</select>
  ${freqExtra(r,'exp')}
  <input aria-label="${t('dayLbl')}" title="${t('dayLbl')}" type="number" min="1" max="31" data-exp="day" value="${r.day||1}">
  <span></span>
  <button type="button" class="iconbtn" aria-label="${t('remove')}" data-act="hhRm">×</button></div>`).join('');}
function hhTotals(){const {b,p}=engine();return `<div class="totals" id="totals"><div><span>${t('confirmedIncT')}</span><strong>${chfc(b.incomeConfirmed)}</strong></div><div><span>${t('estimatedIncT')}</span><strong>${chfc(b.incomeEstimated)}</strong></div>
  <div><span>${t('essentialT')}</span><span>${chfc(b.essential)}</span></div><div><span>${t('flexibleT')}</span><span>${chfc(b.flexible)}</span></div><div class="muted small"><span>${t('provisionsT')}</span><span>${chfc(b.provisions)}</span></div>
  <div class="big"><span>${t('totBal')}</span><span style="color:var(${b.balance<0?'--bad':'--good'})">${chfc(b.balance)}</span></div>
  <div class="muted small"><span>${t('dashLowest')} ${t('dashLowestHelp')}</span><span style="color:var(${p.negative?'--bad':'--ink'})">${chfc(p.minBalance)} · ${fmtDate(p.minDate)}</span></div></div>`;}
function sparkline(p){const vals=p.daily.map(d=>d.balance),min=Math.min(0,...vals),max=Math.max(1,...vals),w=600,hgt=90,x=i=>i/(vals.length-1||1)*w,y=v=>hgt-((v-min)/(max-min||1))*hgt;const pts=vals.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');const zero=y(0).toFixed(1);const mi=vals.indexOf(Math.min(...vals));
  return `<figure style="margin:0"><figcaption class="muted small">${t('proj30')}</figcaption><svg viewBox="0 0 ${w} ${hgt+10}" role="img" aria-label="${t('proj30')}" style="width:100%;height:auto"><line x1="0" x2="${w}" y1="${zero}" y2="${zero}" stroke="var(--line)" stroke-dasharray="4 4"/><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${pts}"/><circle cx="${x(mi)}" cy="${y(vals[mi])}" r="5" fill="${vals[mi]<0?'var(--bad)':'var(--accent)'}"/></svg></figure>`;}

/* ----- blocos do painel ----- */
function diagCards(){const {b,p}=engine();return `<div class="grid3">
  <div class="stat"><span class="muted small">${t('dashAvailable')}</span><strong class="${b.balance<0?'neg':'pos'}">${chfc(b.balance)}</strong><span class="muted small">${t('dashAvailableHelp')}</span></div>
  <div class="stat"><span class="muted small">${t('dashToPay')}</span><strong>${chfc(p.outgoing)}</strong><span class="muted small">${p.nextPayments.length} · ${p.nextPayments[0]?fmtDate(p.nextPayments[0].date):'—'}</span></div>
  <div class="stat"><span class="muted small">${t('dashLowest')}</span><strong class="${p.negative?'neg':''}">${chfc(p.minBalance)}</strong><span class="muted small">${fmtDate(p.minDate)} · ${p.openingConfirmed?t('dashConfirmed'):t('dashEstimated')}</span></div></div>`;}
function alertsHtml(){const {dg}=engine();return `<section class="panel"><h3>${t('alerts')}</h3>${dg.risks.length?dg.risks.map(r=>`<div class="banner" style="${r.severity==='critical'?'background:var(--bad-bg)':r.severity==='info'?'background:var(--soft)':''}"><span>${r.severity==='critical'?'●':'○'}</span><span>${esc(tt('risk',r.id,{date:fmtDate(r.date),share:r.share}))}</span></div>`).join(''):`<p class="muted">${t('noAlerts')}</p>`}</section>`;}
function goalHtml(g){if(!g.goal)return `<p class="muted">${t('noGoal')}</p>`;return `<div class="totals"><div><span>${t('goalTitle')}</span><strong>${chfc(g.goal)}</strong></div><div class="small"><span>${g.feasible?t('goalOk'):t('goalGap',{gap:chfc(g.gap),sug:chfc(g.suggested)})}</span></div></div>`;}
function recsHtml(list){if(!list.length)return '';return `<section class="panel"><h3>${t('recs')}</h3><ol class="actions">${list.map(r=>`<li><strong>${esc(tt('rec',r.problem,{label:r.label||'',date:fmtDate(r.date),cat:tt('cat',r.category||'other')}))}</strong>
  <div class="meta small"><span>${t('current')}: <b class="num">${chfc(Math.abs(r.current||0))}</b></span><span>${t('potential')}: <b class="num">${r.potentialMonthly!=null?chfc(r.potentialMonthly)+'/'+(lang==='fr'?'mois':'mês'):t('unknownSaving')}</b></span><span class="tag">${esc(tt('recState',r.state))}</span></div>
  <p class="muted small">→ ${esc(tt('next',r.nextAction))}${r.source?` · <a href="${r.source}" target="_blank" rel="noopener noreferrer">${t('source')} ↗</a>`:''}</p>
  <div class="btns"><button class="btn ghost small" data-rec="${r.id}" data-state="in_review">${t('markReview')}</button><button class="btn ghost small" data-rec="${r.id}" data-state="done">${t('markDone')}</button><button class="link" data-rec="${r.id}" data-state="discarded">${t('markDiscard')}</button></div></li>`).join('')}</ol></section>`;}
function viewDashboard(){const e=engine(),h=H();
  const up=e.p.nextPayments.map(x=>`<div class="tl ${daysTo(x.date)<=3?'soon':''}"><span class="d">${fmtDate(x.date)}</span><span style="min-width:0">${esc(x.label)}</span><span class="num">${chfc(-x.amount)}</span></div>`).join('');
  const quick=[['qScan','docs'],['qBudget','money:budget'],['qSave','money:savings'],['qTax','life:letters'],['qGuide','life'],['qBiz','money:biz']];
  return `<header class="pagehead"><img src="${IMG('hero')}" alt="${esc(ALT[lang].hero)}" decoding="async"><div><p class="label" style="color:#63D5BF">${t('heroLabel')}</p><h1>${chfc(e.b.balance)}</h1><p>${t('dashAvailable')} · ${e.p.nextIncome?`${t('dashNextPay')}: ${fmtDate(e.p.nextIncome.date)} (${chfc(e.p.nextIncome.amount)})`:''}</p></div></header>
  ${diagCards()}
  <section class="panel">${sparkline(e.p)}</section>
  <div class="grid2"><section class="panel"><h3>${t('upcoming')}</h3><div class="timeline">${up||`<p class="muted">${t('noUpcoming')}</p>`}</div></section>${alertsHtml()}</div>
  <section class="panel"><h3>${t('goalTitle')}</h3>${goalHtml(e.g)}</section>
  ${recsHtml(e.r)}
  <section class="panel"><h3>${t('quick')}</h3><div class="grid3">${quick.map(([k,g])=>`<button class="btn ghost" data-go="${g}">${t(k)}</button>`).join('')}</div></section>
  <section style="display:grid;gap:12px"><p class="label">${t('storiesLabel')}</p><div class="stories">${STORIES[lang].map(([k,a,b,g])=>`<button type="button" class="story" data-go="${g}">${photo(k)}<span class="txt"><strong>${esc(a)}</strong><span>${esc(b)}</span></span></button>`).join('')}</div></section>
  <p class="muted small">${remote?t('syncOn'):t('syncOff')} · ${t('illustrative')}</p>`;}
function viewProfile(){const h=H();return `${pagehead('profile',t('profileTitle'))}
  <section class="panel"><div class="fields"><label class="field"><span>${t('langLbl')}</span><select id="pf-lang" data-setlang-select="1"><option value="pt" ${lang==='pt'?'selected':''}>Português</option><option value="fr" ${lang==='fr'?'selected':''}>Français</option></select></label>
  <div class="field"><span>${t('commune')}</span><strong>${esc(h.profile.commune||'—')}</strong></div></div><div><button class="btn ghost" data-act="redoOnboard">${t('editOnboard')}</button></div><p class="muted small">${remote?t('syncOn'):t('syncOff')}</p></section>
  <section class="panel"><h3>${t('segPrivacy')}</h3><p class="muted">${remote?'':t('privIntro')}</p><div class="btns"><button class="btn ghost" data-act="json">${t('downloadJson')}</button>${pendingDelete==='ALL'?`<button class="btn danger" data-act="wipe">${t('confirmDeleteAll')}</button>`:`<button class="btn danger" data-act="askWipe">${t('deleteAll')}</button>`}</div></section>
  <section class="panel"><h3>${t('planTitle')}</h3><p><strong>${t('planFree')}</strong></p><p class="muted small">${t('planInfo')}</p></section>`;}

function render(){
  document.documentElement.lang=lang;document.getElementById('lang').value=lang;
  document.getElementById('testPill').textContent=remote?t('testPillSync'):t('testPill');document.getElementById('footTest').textContent=t('footTest');document.getElementById('footIndep').textContent=t('footIndep');
  renderNav();
  const home=()=>H().onboarding.completed&&route.sub!=='onboard'?viewDashboard():route.sub==='onboard'?viewOnboard():viewHome();
  const v={home,money:viewMoney,docs:viewDocs,life:viewLife,deadlines:viewDeadlines,help:viewHelp,profile:viewProfile}[route.tab]||home;
  const el=document.getElementById('view');el.innerHTML=v();el.classList.remove('view');void el.offsetWidth;el.classList.add('view');
}

/* ---------- Exportação ---------- */
function csv(rows){return '﻿'+rows.map(r=>r.map(c=>{const s=String(c??'');return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(';')).join('\r\n');}
function budgetRows(){return [[t('description'),t('category'),t('amount'),t('frequency'),t('dayLbl'),t('statusLbl')],...H().incomes.map(r=>[r.label,tt('itype',r.type),fromC(r.amount).toFixed(2),tt('freq',r.frequency),r.day,r.status]),...H().expenses.map(r=>[r.label,tt('cat',r.category),fromC(r.amount).toFixed(2),tt('freq',r.frequency),r.day,r.status])];}
function docRows(){return [[t('date'),t('supplier'),t('kind'),t('category'),t('amount'),t('status'),t('dueDate'),t('filterTax')],...S.receipts.map(r=>[r.date,r.supplier,t(r.kind),t(r.category),num(r.amount).toFixed(2),t(r.status),r.due||'',r.tax?t('yes'):t('no')])];}
function download(name,content,type){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}catch(e){toast(t('copyFail'));}}
async function copy(text){try{await navigator.clipboard.writeText(text);toast(t('copied'));}catch(e){toast(t('copyFail'));}}

/* ---------- Imagem: reduz a foto antes de guardar ---------- */
function shrink(file){return new Promise((res,rej)=>{if(!file)return res(null);if(!/^image\/(jpeg|png)$/.test(file.type))return rej(new Error('type'));const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const k=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',0.6));};img.onerror=()=>rej(new Error('img'));img.src=fr.result;};fr.onerror=()=>rej(new Error('read'));fr.readAsDataURL(file);});}

/* ---------- Exemplo fictício ---------- */
function loadExample(){const y=today().getFullYear(),m=today().getMonth()+1,fr=lang==='fr';
  const inc=[{id:uid(),label:fr?'Salaire net':'Salário líquido',type:'salary',amount:500000,frequency:'monthly',day:25,status:'confirmed',thirteenth:true},{id:uid(),label:fr?'Ménages le samedi':'Faxinas aos sábados',type:'extra',amount:30000,frequency:'monthly',day:28,status:'estimated'}];
  const exp=[[fr?'Loyer':'Aluguel','housing',165000,'monthly',1],['LAMal','lamal',42000,'monthly',1],[fr?'Abonnement transports':'Passe de transporte','transport',8500,'monthly',5],[fr?'Courses':'Supermercado','food',70000,'monthly',10],[fr?'Acomptes d’impôt':'Parcelas de imposto','tax',90000,'quarterly',28,2],[fr?'RC ménage':'Seguro RC doméstico','insurance',18000,'annual',15,11],[fr?'Envoi à la famille':'Envio à família','remittance',25000,'monthly',26],['Streaming','leisure',9500,'monthly',12]].map(([label,category,amount,frequency,day,anchorMonth])=>({id:uid(),label,category,amount,frequency,day,anchorMonth:anchorMonth||null,status:'estimated',ex:true}));
  const EXR=[{id:uid(),kind:'invoice',supplier:'Assura (exemple)',amount:420,date:iso(y,m,1),category:'catHealth',status:'unpaid',due:iso(y,m,28),tax:false,photo:null},{id:uid(),kind:'receipt',supplier:'Pharmacie (exemple)',amount:64.5,date:iso(y,m,5),category:'catHealth',status:'paid',due:'',tax:true,photo:null}];
  for(const r of inc)H().incomes.push({...r,ex:true});for(const r of exp)H().expenses.push(r);for(const r of EXR)S.receipts.push({...r,ex:true});
  if(!H().openingBalance)H().openingBalance={amount:120000,confirmed:false,date:todayISO(),ex:true};
  S.example=true;saveHH();toast(t('exampleAdded'));render();}

/* ---------- Eventos ---------- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){go(b.dataset.tab);return;}
  if(b.dataset.scroll&&route.tab==='home'&&!b.dataset.go){document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b.dataset.go){const sc=b.dataset.scroll;go(b.dataset.go);if(sc)setTimeout(()=>document.getElementById(sc)?.scrollIntoView({behavior:'smooth',block:'start'}),60);return;}
  if(b.dataset.sub){route.sub=b.dataset.sub;pendingDelete=null;render();return;}
  if(b.dataset.filter){docFilter=b.dataset.filter;render();return;}
  if(b.dataset.product){product=b.dataset.product;render();return;}
  if(b.dataset.ob){const n=b.dataset.ob;if(n==='finish'){H().onboarding={step:'plan',completed:true};saveHH();go('home');return;}H().onboarding.step=n;saveHH();render();window.scrollTo({top:0});return;}
  if(b.dataset.setlang){lang=b.dataset.setlang;S.lang=lang;saveHH();render();return;}
  if(b.dataset.quick){const q=QUICK.find(x=>x[0]===b.dataset.quick);H().expenses.push({id:uid(),label:tt('cat',q[0]),category:q[0],amount:0,frequency:q[1],day:q[2]||1,anchorMonth:q[1]==='monthly'?null:1,status:'estimated'});saveHH();render();const rows=document.querySelectorAll('.hrow[data-k="exp"] input[data-exp="amount"]');rows[rows.length-1]?.focus();return;}
  if(b.dataset.rec){const id=b.dataset.rec,st=b.dataset.state;H().recommendationStates[id]=st;save();if(remote){try{await api('/household/recommendation',{method:'POST',body:JSON.stringify({id,state:st})});}catch(x){saveHH();}}render();return;}
  const a=b.dataset.act;if(!a)return;
  if(a==='hhAddInc'||a==='hhAddExp'){const inc=a==='hhAddInc';(inc?H().incomes:H().expenses).push(inc?{id:uid(),label:'',type:H().incomes.some(r=>r.type==='salary')?'extra':'salary',amount:0,frequency:'monthly',day:25,status:'estimated'}:{id:uid(),label:'',category:'other',amount:0,frequency:'monthly',day:1,status:'estimated'});saveHH();render();const rows=document.querySelectorAll(`.hrow[data-k="${inc?'inc':'exp'}"] input.label-in`);rows[rows.length-1]?.focus();return;}
  if(a==='hhRm'){const r=b.closest('.hrow'),k=r.dataset.k==='inc'?'incomes':'expenses';H()[k]=H()[k].filter(x=>x.id!==r.dataset.id);saveHH();render();return;}
  if(a==='redoOnboard'){H().onboarding={step:'welcome',completed:false};saveHH();go('home:onboard');return;}
  if(a==='example')loadExample();
  if(a==='clearExample'){H().incomes=H().incomes.filter(r=>!r.ex);H().expenses=H().expenses.filter(r=>!r.ex);if(H().openingBalance?.ex)H().openingBalance=null;S.receipts=S.receipts.filter(r=>!r.ex);S.example=false;saveHH();toast(t('exampleRemoved'));render();}
  if(a==='addIncome'||a==='addExpense'){const k=a==='addIncome'?'income':'expenses';S.budget[k].push({id:uid(),label:'',category:'catOther',amount:'',freq:'monthly'});save();render();const rows=document.querySelectorAll(`.row[data-kind="${k}"] input[data-f="label"]`);rows[rows.length-1]?.focus();}
  if(a==='rmRow'){const r=b.closest('.row');S.budget[r.dataset.kind]=S.budget[r.dataset.kind].filter(x=>x.id!==r.dataset.id);save();render();}
  if(a==='installToBudget'){H().expenses.push({id:uid(),label:t(product==='credit'?'pCredit':product==='leasing'?'pLeasing':'pInsurance'),category:product==='insurance'?'insurance':product==='leasing'?'leasing':'credit',amount:cents(b.dataset.pay),frequency:'monthly',day:1,status:'estimated'});saveHH();toast(t('added'));}
  if(a==='askDel'){pendingDelete=b.dataset.id;render();}
  if(a==='delDoc'){S.receipts=S.receipts.filter(r=>r.id!==b.dataset.id);pendingDelete=null;save();toast(t('deleted'));render();}
  if(a==='csvBudget')download('privefinances-orcamento.csv',csv(budgetRows()),'text/csv;charset=utf-8');
  if(a==='copyBudget')copy(csv(budgetRows()).slice(1));
  if(a==='csvDocs')download('privefinances-comprovantes.csv',csv(docRows()),'text/csv;charset=utf-8');
  if(a==='copyDocs')copy(csv(docRows()).slice(1));
  if(a==='json'){let data=S;if(remote){try{data={account:await api('/export'),device:S};}catch(x){}}download('privefinances-dados.json',JSON.stringify(data,null,2),'application/json');}
  if(a==='ics')icsExport();
  if(a==='remindLetter'){S.reminders.push({id:uid(),label:(LETTERS[lang][letterResult?.type||letterType]||[''])[0]||t('reminder'),date:b.dataset.date});save();toast(t('reminderAdded'));}
  if(a==='savePayslip'){const d=S.payslipDraft;if(!d)return;S.payslips.push({...d});const sal=salaryRow();if(sal){sal.amount=cents(d.net);sal.status='confirmed';}else H().incomes.unshift({id:uid(),label:lang==='fr'?'Salaire net':'Salário líquido',type:'salary',amount:cents(d.net),frequency:'monthly',day:25,status:'confirmed'});saveHH();toast(t('psSaved'));render();}
  if(a==='askWipe'){pendingDelete='ALL';render();}
  if(a==='wipe'){if(remote){try{await api('/account',{method:'DELETE',body:JSON.stringify({confirm:'DELETE'})});}catch(x){toast(x.message);return;}}try{localStorage.removeItem(KEY);}catch(e){}S=blank();S.lang=lang;S.household=blankHH();pendingDelete=null;toast(t('allDeleted'));go('home');}
});
document.addEventListener('input',e=>{
  const el=e.target;
  const hr=el.closest&&el.closest('.hrow');
  if(hr&&(el.dataset.inc||el.dataset.exp)){const k=hr.dataset.k==='inc'?'incomes':'expenses',f=el.dataset.inc||el.dataset.exp,row=H()[k].find(x=>x.id===hr.dataset.id);if(row){if(f==='amount')row.amount=cents(el.value);else if(f==='day'||f==='anchorMonth')row[f]=Math.min(f==='day'?31:12,Math.max(1,parseInt(el.value)||1));else row[f]=el.value;saveHH();if(el.tagName!=='SELECT'){const tot=document.getElementById('totals');if(tot)tot.outerHTML=hhTotals();}}return;}
  if(el.dataset.hp){H().profile[el.dataset.hp]=el.dataset.hp==='commune'?el.value:(el.value||null);saveHH();return;}
  if(el.dataset.fam){H().family[el.dataset.fam]=el.dataset.fam==='otherContributions'?cents(el.value):Math.max(0,parseInt(el.value)||0);saveHH();return;}
  if(el.dataset.goal){H().goal=H().goal||{monthly:0,label:''};H().goal[el.dataset.goal]=el.dataset.goal==='monthly'?cents(el.value):el.value;saveHH();return;}
  if(el.dataset.open){H().openingBalance=el.value.trim()===''?null:{amount:cents(el.value),confirmed:true,date:todayISO()};saveHH();return;}
  if(el.dataset.sal&&el.type!=='checkbox'){let s=salaryRow();if(!s){s={id:uid(),label:lang==='fr'?'Salaire net':'Salário líquido',type:'salary',amount:0,frequency:'monthly',day:25,status:'estimated'};H().incomes.unshift(s);}if(el.dataset.sal==='amount')s.amount=cents(el.value);else s.day=Math.min(31,Math.max(1,parseInt(el.value)||25));saveHH();return;}
  const r=el.closest&&el.closest('.row');
  if(r&&el.dataset.f){const item=S.budget[r.dataset.kind].find(x=>x.id===r.dataset.id);if(item){item[el.dataset.f]=el.value;save();const tot=document.getElementById('totals');if(tot)tot.outerHTML=totalsHtml();}return;}
  if(el.dataset.in){S.install=Object.assign({principal:30000,down:3000,rate:5.9,months:48,residual:12000,premium:1200,fees:0},S.install||{});S.install[el.dataset.in]=el.value;save();clearTimeout(window._it);window._it=setTimeout(()=>{const id=el.id,pos=el.selectionStart;render();const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}},450);return;}
  const rr=()=>{clearTimeout(window._gt);window._gt=setTimeout(()=>{const id=el.id,pos=el.selectionStart;render();const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}},500);};
  if(el.dataset.ps){S.payslipDraft=Object.assign({month:new Date().toISOString().slice(0,7)},S.payslipDraft||{});S.payslipDraft[el.dataset.ps]=el.value;save();rr();return;}
  if(el.dataset.off){S.remit=S.remit||{amount:500,cur:'BRL',offers:[{name:'',fee:'',rate:''},{name:'',fee:'',rate:''},{name:'',fee:'',rate:''}]};S.remit.offers[+el.dataset.off][el.dataset.k]=el.value;save();rr();return;}
  if(el.dataset.v){const v=el.dataset.v;if(v==='rm-amount'){S.remit=S.remit||{amount:500,cur:'BRL',offers:[{name:'',fee:'',rate:''},{name:'',fee:'',rate:''},{name:'',fee:'',rate:''}]};S.remit.amount=el.value;}
    else if(v.startsWith('bz-')){S.biz=S.biz||{ytd:'',forecast:'',expenses:'',avs:10,tax:10};S.biz[v.slice(3)]=el.value;}
    else if(v.startsWith('lc-')){S.lamalCalc=S.lamalCalc||{low:'',high:'',costs:''};S.lamalCalc[v.slice(3)]=el.value;}
    else return;save();rr();return;}
  if(el.dataset.p3==='paid'||el.dataset.p3==='income'){S.pillar[el.dataset.p3]=el.value;save();clearTimeout(window._pt);window._pt=setTimeout(()=>{const id=el.id,pos=el.selectionStart;render();const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}},450);}
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='lang'||el.dataset.setlangSelect){lang=el.value;S.lang=lang;saveHH();render();return;}
  if(el.closest&&el.closest('.hrow')&&el.tagName==='SELECT'){render();return;}
  if(el.dataset.sal&&el.type==='checkbox'){let s=salaryRow();if(!s){s={id:uid(),label:lang==='fr'?'Salaire net':'Salário líquido',type:'salary',amount:0,frequency:'monthly',day:25,status:'estimated'};H().incomes.unshift(s);}if(el.dataset.sal==='thirteenth')s.thirteenth=el.checked;else s.status=el.checked?'confirmed':'estimated';saveHH();return;}
  if(el.dataset.p3==='hasLpp'){S.pillar.hasLpp=el.value;save();render();return;}
  if(el.dataset.debt){debtStage=el.value;render();return;}
  if(el.dataset.letter){letterType=el.value;render();return;}
  if(el.dataset.guide){S.guides[el.dataset.guide]=S.guides[el.dataset.guide]||{};S.guides[el.dataset.guide][el.dataset.i]=el.checked;save();render();return;}
  if(el.id==='rm-cur'){S.remit=S.remit||{amount:500,cur:'BRL',offers:[{name:'',fee:'',rate:''},{name:'',fee:'',rate:''},{name:'',fee:'',rate:''}]};S.remit.cur=el.value;save();render();return;}
  if(el.dataset.ps==='month'){return;}
  if(el.dataset.check){S.checklist[el.dataset.check]=el.checked;save();return;}
});
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target,fd=new FormData(f);
  if(f.id==='profileForm'){const p=Object.fromEntries(QUESTIONS.map(([id])=>[id,fd.get(id)]));p._d=[];for(const [k,v] of Object.entries(REFINE_DEFAULT))if(!p[k]){p[k]=v;p._d.push(k);}if(!complete(p)){toast(t('chooseAll'));return;}S.profile=p;save();toast(t('profileSaved'));route.sub=null;render();document.getElementById('actions')?.scrollIntoView({behavior:'smooth',block:'start'});}
  if(f.id==='docForm'){const supplier=String(fd.get('supplier')||'').trim(),amount=num(fd.get('amount')),date=fd.get('date');if(!supplier||!date||!(amount>0)){toast(t('required'));return;}
    let photo=null;try{photo=await shrink(fd.get('photo')&&fd.get('photo').size?fd.get('photo'):null);}catch(x){toast(t('photoHelp'));return;}
    S.receipts.push({id:uid(),kind:fd.get('kind'),supplier,amount,date,category:fd.get('category'),status:fd.get('status'),due:fd.get('due')||'',tax:fd.get('tax')==='on',photo});if(save())toast(t('saved'));render();}
  if(f.id==='letterForm'){letterResult=detectLetter(String(fd.get('text')||''));if(letterResult.type)letterType=letterResult.type;render();return;}
  if(f.id==='remForm'){const label=String(fd.get('label')||'').trim(),date=fd.get('date');if(!label||!date){toast(t('required'));return;}S.reminders.push({id:uid(),label,date});save();toast(t('saved'));render();}
  if(f.id==='leadForm'){if(!fd.get('consent')){toast(t('required'));return;}if(remote){const V={aFiduciary:'fiduciary',aLamal:'lamal',a3a:'pillar3a',aLegal:'legal'};const vert=V[fd.get('area')];if(vert){try{const me=await api('/me');await api('/leads',{method:'POST',body:JSON.stringify({name:String(fd.get('name')).trim(),vertical:vert,consent:true,privacyVersion:me.privacyVersion})});}catch(x){toast(x.message);return;}}}S.leads.push({id:uid(),name:String(fd.get('name')).trim(),area:fd.get('area'),date:iso(today().getFullYear(),today().getMonth()+1,today().getDate())});save();toast(t('leadSaved'));render();}
});

/* ---------- Início ---------- */
const startTab=(location.hash||'').slice(1);if(TABS.some(([id])=>id===startTab))route.tab=startTab;
render();connect();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
