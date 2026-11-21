// Pure export rows: user-entered labels remain unchanged; system labels follow the UI language.
export function budgetExportRows(p,locale='pt'){
 const fr=locale==='fr',t=(pt,f)=>fr?f:pt;
 const monthly=r=>r.frequency==='annual'?Math.round(r.amount/12):r.frequency==='oneoff'?(r.period===p.month?r.amount:0):r.amount;
 const frequency={monthly:t('Mensal','Mensuel'),annual:t('Anual','Annuel'),oneoff:t('Pontual','Ponctuel')};
 const categories={housing:t('Moradia','Logement'),lamal:'LAMal',insurance:t('Outros seguros','Autres assurances'),pension:'Prévoyance / 3a',tax:t('Reserva para impostos','Provision fiscale'),food:t('Alimentação','Alimentation'),transport:t('Transporte','Transport'),leasing:'Leasing',credit:t('Crédito','Crédit'),debt:t('Outras dívidas','Autres dettes'),family:t('Família / remessas','Famille / transferts'),other:t('Outros','Autres')};
 const rows=[[t('PrivéFinances — orçamento detalhado','PrivéFinances — budget détaillé'),p.month],[t('Salário líquido mensal CHF','Salaire net mensuel CHF'),p.salary.netMonthly/100],[t('Tipo','Type'),t('Descrição','Description'),t('Valor original CHF','Montant initial CHF'),t('Frequência','Fréquence'),t('Mês pontual','Mois ponctuel'),t('Equivalente mensal CHF','Équivalent mensuel CHF'),t('Categoria','Catégorie'),t('Fornecedor','Fournisseur')]];
 for(const kind of ['incomes','expenses'])for(const r of p[kind])rows.push([kind==='incomes'?t('Renda extra','Revenu supplémentaire'):t('Despesa','Charge'),r.label,r.amount/100,frequency[r.frequency],r.period||'',monthly(r)/100,categories[r.category]||'',r.provider||'']);
 const income=p.salary.netMonthly+p.incomes.reduce((s,r)=>s+monthly(r),0),expenses=p.expenses.reduce((s,r)=>s+monthly(r),0);
 rows.push([],[t('Entradas mensais CHF','Revenus mensuels CHF'),income/100],[t('Saídas mensais CHF','Charges mensuelles CHF'),expenses/100],[t('Saldo mensal CHF','Solde mensuel CHF'),(income-expenses)/100]);return rows;
}
