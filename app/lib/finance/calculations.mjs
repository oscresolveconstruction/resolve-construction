// Decimal arithmetic: round each recorded/converted movement once, then sum pennies.
function fraction(value) {
 const raw=String(value).trim();
 const match=/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(raw);
 if(!match)throw new Error('Invalid decimal amount');
 const exp=Number(match[4]||0),scale=(match[3]||'').length-exp;
 if(Math.abs(scale)>24)throw new Error('Decimal precision out of range');
 let n=BigInt(match[2]+(match[3]||''))*(match[1]?-1n:1n),d=1n;
 if(scale>=0)d=10n**BigInt(scale);else n*=10n**BigInt(-scale);
 return {n,d};
}
function rounded(n,d) {return n<0n?-((-n+d/2n)/d):(n+d/2n)/d;}
function safe(n) {const result=Number(n);if(!Number.isSafeInteger(result))throw new Error('Amount exceeds supported precision');return result;}
export function pennies(value){const {n,d}=fraction(value);return safe(rounded(n*100n,d));}
export function moneyProduct(amount,rate){const a=fraction(amount),b=fraction(rate);return safe(rounded(a.n*b.n*100n,a.d*b.d))/100;}
export function sumMoney(values){return safe(values.reduce((sum,v)=>sum+BigInt(pennies(v)),0n))/100;}
export function differenceMoney(a,b){return safe(BigInt(pennies(a))-BigInt(pennies(b)))/100;}
export function convertedMoney(amount,currency,targetCurrency,rate){
 if(currency===targetCurrency)return pennies(amount)/100;
 if(!['GBP','EUR'].includes(currency)||!['GBP','EUR'].includes(targetCurrency)||rate==null||!Number.isFinite(Number(rate))||Number(rate)<=0)return null;
 return moneyProduct(amount,rate);
}
// A saved rate targets the project currency, or GBP for company overheads.
// It must never be silently inverted or treated as an unrelated GBP rate.
export function companyCostGBP(entry,projectCurrency){
 if(entry.currency==='GBP')return pennies(entry.amount)/100;
 return projectCurrency==='GBP'?convertedMoney(entry.amount,entry.currency,'GBP',entry.exchangeRate):null;
}
/**
 * @typedef {{projectId:number|null,amount:string|number,currency:string,exchangeRate?:string|number|null,status?:string}} Movement
 * @param {{id:number,contractValue:string|number,currency:string}} project
 * @param {{expenses?:Movement[],labour?:Movement[],payments?:Movement[],extras?:Movement[],invoices?:Movement[]}} data
 */
export function projectFinancials(project,{expenses=[],labour=[],payments=[],extras=[],invoices=[]}={}){
 const approved=extras.filter(e=>e.projectId===project.id&&e.status==='Approved');
 const projectPayments=payments.filter(p=>p.projectId===project.id);
 const includedExtras=approved.filter(e=>e.currency===project.currency);
 const samePayments=projectPayments.filter(p=>p.currency===project.currency);
 const costs=[...expenses,...labour].filter(e=>e.projectId===project.id).map(e=>convertedMoney(e.amount,e.currency,project.currency,e.exchangeRate));
 const expenseCosts=expenses.filter(e=>e.projectId===project.id).map(e=>convertedMoney(e.amount,e.currency,project.currency,e.exchangeRate));
 const labourCosts=labour.filter(e=>e.projectId===project.id).map(e=>convertedMoney(e.amount,e.currency,project.currency,e.exchangeRate));
 const extraValue=sumMoney(includedExtras.map(e=>e.amount));
 const totalValue=sumMoney([project.contractValue,extraValue]);
 const received=sumMoney(samePayments.map(p=>p.amount));
 const activeInvoices=invoices.filter(i=>i.projectId===project.id&&i.currency===project.currency&&i.status!=='Void');
 const invoiced=sumMoney(activeInvoices.map(i=>i.amount));
 const cost=sumMoney(costs.filter(v=>v!==null));
 return {contract:pennies(project.contractValue)/100,extraValue,totalValue,received,invoiced,
  expenses:sumMoney(expenseCosts.filter(v=>v!==null)),labour:sumMoney(labourCosts.filter(v=>v!==null)),cost,
  outstanding:Math.max(differenceMoney(totalValue,received),0),credit:Math.max(differenceMoney(received,totalValue),0),
  remainingToInvoice:differenceMoney(totalValue,invoiced),profit:differenceMoney(totalValue,cost),
  missingRates:costs.filter(v=>v===null).length,
  unmatchedCurrencies:approved.length-includedExtras.length+projectPayments.length-samePayments.length};
}
