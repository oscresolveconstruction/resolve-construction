import {pennies,moneyProduct,convertedMoney,projectFinancials,sumMoney} from './calculations.mjs';
const day=v=>new Date(v).toISOString().slice(0,10);
export function inspectLedger({projects=[],customers=[],expenses=[],labour=[],payments=[],invoices=[],extras=[],sources=[],links=[],voids=[],workers=[],payrolls=[]}){
 const findings=[];
 const flag=(severity,code,kind,ids)=>findings.push({severity,code,kind,ids});
 const map=rows=>new Map(rows.map(r=>[r.id,r]));
 const pMap=map(projects),iMap=map(invoices),sMap=map(sources),eMap=map(extras),wMap=map(workers),customerIds=new Set(customers.map(c=>c.id));
 const cancelled=new Set(voids.map(v=>v.invoice_id));
 for(const p of projects)if(p.customerId!=null&&!customerIds.has(p.customerId))flag('error','missing_customer','project',[p.id]);
 for(const [kind,rows] of [['expense',expenses],['labour',labour],['payment',payments],['invoice',invoices],['extra',extras]]){
  for(const row of rows){
   const project=row.projectId==null?null:pMap.get(row.projectId);
   if(row.projectId!=null&&!project)flag('error','missing_project',kind,[row.id]);
   if(['expense','labour'].includes(kind)&&convertedMoney(row.amount,row.currency,project?.currency||'GBP',row.exchangeRate)===null)flag('warning','missing_conversion',kind,[row.id]);
   if(kind==='labour'&&!wMap.has(row.workerId))flag('error','missing_worker',kind,[row.id]);
   if(['invoice','extra','payment'].includes(kind)&&project&&row.currency!==project.currency)flag('warning','project_currency_mismatch',kind,[row.id]);
  }
 }
 for(const payment of payments){
  if(payment.invoiceId==null)continue;
  const invoice=iMap.get(payment.invoiceId);
  if(!invoice)flag('error','missing_invoice','payment',[payment.id]);
  else if(invoice.projectId!==payment.projectId||invoice.currency!==payment.currency)flag('error','invoice_payment_mismatch','payment',[payment.id]);
  if(invoice?.status==='Void')flag('error','payment_on_cancelled_invoice','payment',[payment.id]);
 }
 for(const invoice of invoices){
  const paid=payments.filter(p=>p.invoiceId===invoice.id&&p.currency===invoice.currency);
  if(pennies(sumMoney(paid.map(p=>p.amount)))>pennies(invoice.amount))flag('error','invoice_overpaid','invoice',[invoice.id]);
  if((invoice.status==='Void')!==cancelled.has(invoice.id))flag('warning','cancellation_history_mismatch','invoice',[invoice.id]);
 }
 for(const link of links){
  const source=sMap.get(link.source_id),invoice=iMap.get(link.invoice_id);
  if(!source||!invoice){flag('error','missing_billing_link','billing',[link.invoice_id,link.source_id]);continue;}
  if(invoice.projectId!==source.project_id||invoice.currency!==source.currency||pennies(invoice.amount)!==Number(link.amount_minor))flag('error','billing_link_mismatch','invoice',[invoice.id]);
 }
 for(const source of sources){
  if(!customerIds.has(source.customer_id))flag('error','missing_customer','document',[source.id]);
  const project=pMap.get(source.project_id);
  if(source.project_id && (!project||project.customerId!==source.customer_id||project.currency!==source.currency))flag('error','source_project_mismatch','document',[source.id]);
  const items=source.items||[];
  if(items.reduce((sum,i)=>sum+Number(i.amountMinor),0)!==Number(source.total_minor))flag('error','source_line_sum_mismatch','document',[source.id]);
  for(const item of items)if(pennies(moneyProduct(item.quantity,Number(item.unitPriceMinor)/100))!==Number(item.amountMinor))flag('error','source_line_calculation_mismatch','document',[source.id]);
  const billed=links.filter(l=>l.source_id===source.id&&iMap.get(l.invoice_id)?.status!=='Void').reduce((sum,l)=>sum+Number(l.amount_minor),0);
  if(billed+Number(source.previous_billed_minor||0)>Number(source.total_minor))flag('error','source_overbilled','document',[source.id]);
  if(source.extra_work_id){const extra=eMap.get(source.extra_work_id);if(!extra||extra.projectId!==source.project_id||extra.currency!==source.currency||pennies(extra.amount)!==Number(source.total_minor))flag('error','extra_link_mismatch','document',[source.id]);}
  if(source.status==='Approved'&&source.kind==='quote'&&project&&pennies(project.contractValue)!==Number(source.total_minor))flag('warning','approved_quote_contract_differs','document',[source.id]);
 }
 function repeated(rows,key,kind,code,severity='warning'){
  const groups=new Map();for(const row of rows){const k=key(row);if(k==null)continue;groups.set(k,[...(groups.get(k)||[]),row.id]);}
  for(const ids of groups.values())if(ids.length>1)flag(severity,code,kind,ids);
 }
 repeated(invoices,i=>i.invoiceNumber?.trim().toUpperCase(),'invoice','duplicate_invoice_number','error');
 repeated(sources,s=>s.extra_work_id||null,'document','duplicate_extra_link','error');
 repeated(payments,p=>JSON.stringify([p.projectId,day(p.date),p.currency,pennies(p.amount),p.reference?.trim()||'',p.paymentMethod||'']),'payment','possible_duplicate');
 repeated(expenses,e=>JSON.stringify([e.projectId,day(e.date),e.currency,pennies(e.amount),e.supplier?.trim().toLowerCase(),e.description||'']),'expense','possible_duplicate');
 repeated(labour,l=>JSON.stringify([l.workerId,l.projectId,day(l.date),String(l.hours),l.currency,pennies(l.amount)]),'labour','possible_duplicate');
 repeated(payrolls,p=>`${p.workerId}:${p.month}`,'payroll','duplicate_worker_month','error');
 for(const payroll of payrolls){
  if(!wMap.has(payroll.workerId))flag('error','missing_worker','payroll',[payroll.id]);
  if(payroll.status==='Closed'){
   const entries=labour.filter(l=>l.workerId===payroll.workerId&&day(l.date).slice(0,7)===payroll.month);
   if(entries.some(l=>l.currency!=='GBP')||pennies(sumMoney(entries.map(l=>l.amount)))!==pennies(sumMoney([payroll.grossPay,payroll.employerSocialInsurance])))flag('error','closed_payroll_allocation_mismatch','payroll',[payroll.id]);
  }
 }
 for(const entry of labour){
  const closed=payrolls.some(p=>p.workerId===entry.workerId&&p.month===day(entry.date).slice(0,7)&&p.status==='Closed');
  if(!closed&&pennies(entry.amount)!==pennies(moneyProduct(entry.hours,entry.hourlyRate)))flag('warning','provisional_labour_rounding_difference','labour',[entry.id]);
 }
 const summaries=projects.map(p=>({projectId:p.id,currency:p.currency,...projectFinancials(p,{expenses,labour,payments,extras,invoices})}));
 return {checkedAt:new Date().toISOString(),counts:{projects:projects.length,expenses:expenses.length,labour:labour.length,payments:payments.length,invoices:invoices.length,extras:extras.length,sources:sources.length,payrolls:payrolls.length},errors:findings.filter(f=>f.severity==='error').length,warnings:findings.filter(f=>f.severity==='warning').length,findings,projects:summaries};
}
export async function auditFinancialRecords(pool){
 const c=await pool.connect();
 try {
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const data={};
  const queries={
   customers:'SELECT id FROM "Customer"',
   projects:'SELECT id,"customerId",currency,"contractValue" FROM "Project"',
   expenses:'SELECT id,"projectId",date,amount,currency,"exchangeRate",supplier,description FROM "Expense"',
   labour:'SELECT id,"projectId","workerId",date,hours,"hourlyRate",amount,currency,"exchangeRate" FROM "Labour"',
   payments:'SELECT id,"projectId","invoiceId",date,amount,currency,reference,"paymentMethod" FROM "Payment"',
   invoices:'SELECT id,"projectId","invoiceNumber",amount,currency,status FROM "Invoice"',
   extras:'SELECT id,"projectId",amount,currency,status FROM "ExtraWork"',
   sources:'SELECT id,kind,customer_id,project_id,extra_work_id,currency,status,items,total_minor,previous_billed_minor FROM commercial_document',
   links:'SELECT invoice_id,source_id,amount_minor FROM commercial_invoice',
   voids:'SELECT invoice_id FROM commercial_invoice_void',
   workers:'SELECT id FROM "Worker"',
   payrolls:'SELECT id,"workerId",month,status,"grossPay","employerSocialInsurance" FROM "MonthlyPayroll"'
  };
  for(const [key,query] of Object.entries(queries))data[key]=(await c.query(query)).rows;
  const report=inspectLedger(data);await c.query('COMMIT');return report;
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
