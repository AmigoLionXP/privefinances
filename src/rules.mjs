import {fiscalModel} from './fiscal-model.mjs';
import {amount,fail,date} from './validation.mjs';
export function gate(r,year,now=new Date()) {
 if(!r||r.taxYear!==year||r.canton!=='VD')return 'missing_rules';
 if(r.status!=='approved'||!r.review?.reviewer||!r.review?.reference||!r.review?.approvedAt)return 'professional_review_required';
 if(!r.review?.validUntil||date(r.review.validUntil)<now.toISOString().slice(0,10))return 'rules_expired';
 if(!r.sources?.length)return 'missing_sources';
 return null;
}
export function pillarCapacity(p,r){
 if(!p.hasEligibleEarnedIncome)return 0;
 const rule=r.pillar3a;if(!rule)return null;
 return p.hasPension?rule.withPensionCap:Math.min(Math.floor(p.annualIncome*rule.withoutPensionBps/10000),rule.withoutPensionCap);
}
export function classifyReceipts(receipts,r,p){
 const totals={}, decisions=[];
 for(const row of receipts){const v=row.data;if(!row.confirmed){decisions.push({id:row.id,status:'awaiting_confirmation',deduction:0});continue;}
 if(Number(v.date.slice(0,4))!==p.taxYear){decisions.push({id:row.id,status:'different_tax_year',deduction:0});continue;}
 const rule=r.deductions?.find(x=>x.category===v.category);
 if(!rule||rule.mode!=='automatic'){decisions.push({id:row.id,status:'professional_review_required',deduction:0});continue;}
 const previous=totals[rule.id]||0;
 const threshold=rule.incomeThresholdBps?Math.ceil(p.annualIncome*rule.incomeThresholdBps/10000):0;
 const next=Math.min(Math.max(0,previous+v.amount-threshold),rule.cap??Number.MAX_SAFE_INTEGER);
 // Recompute threshold against cumulative gross; never subtract it once per invoice.
 totals[rule.id]=previous+v.amount;
 decisions.push({id:row.id,status:'eligible_estimate',ruleId:rule.id,deduction:Math.max(0,next-Math.min(Math.max(0,previous-threshold),rule.cap??Number.MAX_SAFE_INTEGER))});
 }
 return {deduction:decisions.reduce((a,x)=>a+x.deduction,0),decisions};
}
export function progressiveTax(base,bands){amount(base);if(!Array.isArray(bands)||!bands.length||bands[0].from!==0)fail('invalid_tariff');let total=0;
 for(let i=0;i<bands.length;i++){const b=bands[i];amount(b.from);amount(b.rateBps,'rate',10000);if(i&&b.from<=bands[i-1].from)fail('invalid_tariff');const end=bands[i+1]?.from??base;total+=Math.max(0,Math.min(base,end)-b.from)*b.rateBps/10000;}return Math.round(total);}
export function financial(p){const monthlyAvailable=p.monthlyIncome-p.monthlyExpenses-p.lamalMonthly-p.leasingMonthly;const rate=p.loanAprBps/10000/12;let creditMonthly=0;if(p.loanPrincipal&&p.loanMonths)creditMonthly=Math.round(rate?p.loanPrincipal*rate/(1-Math.pow(1+rate,-p.loanMonths)):p.loanPrincipal/p.loanMonths);
 return {monthlyAvailable,creditMonthly,creditTotal:creditMonthly*p.loanMonths,afterCredit:monthlyAvailable-creditMonthly,lamalAnnual:p.lamalMonthly*12,leasingAnnual:p.leasingMonthly*12,offers:false};}
export function simulate(p,receipts,r,now=new Date()){
 const reason=gate(r,p.taxYear,now);const base={financial:financial(p),tax:{status:'blocked',reason,total:null},pillar3a:{status:reason?'blocked':'estimate',capacity:reason?null:pillarCapacity(p,r),remaining:reason?null:Math.max(0,(pillarCapacity(p,r)??0)-p.pillar3aPaid)},rules:r?{id:r.id,version:r.version,taxYear:r.taxYear,status:r.status,sources:r.sources,review:r.review}:null};
 if(reason)return base;
 const classified=classifyReceipts(receipts,r,p);base.receipts=classified;
 base.tax=fiscalModel(p,r,classified,progressiveTax);return base;
}
export function deadlines(r,p,now=new Date()){if(gate(r,p.taxYear,now))return [];return (r.deadlines||[]).filter(x=>x.taxStatus===p.taxStatus).map(x=>({...x,expired:x.date<now.toISOString().slice(0,10)}));}
