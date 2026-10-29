'use server';
import { revalidatePath } from 'next/cache';
import { requireActiveUser } from '../lib/require-active-user';
import { getPayrollPool } from '../lib/payroll-db';
import { issuerSnapshot } from '../lib/commercial/issuer';
import { saveDocument, transitionDocument, linkProject, createManualInvoice, allocatePayment, reviseDocument, importLegacyExtra, reviewHistoricalBilling, trashRecord, voidInvoice } from '../lib/commercial/service.mjs';
export async function commercialAction(form: FormData) {
 const owner = await requireActiveUser();
 const input = Object.fromEntries(form.entries());
 try {
  const pool = getPayrollPool();
  if(!['trash','restore','save','import-extra','void'].includes(String(input.operation)) || (input.operation==='save' && input.id)) {
   const kind=input.operation==='allocate'?'invoice':'document';
   const recordId=input.operation==='allocate'?input.invoiceId:input.operation==='invoice'?input.sourceId:input.id;
   if(recordId && (await pool.query('SELECT 1 FROM commercial_trash WHERE kind=$1 AND record_id=$2',[kind,recordId])).rowCount)throw new Error('Restore this document from Trash before continuing.');
  }
  let id;
  switch(input.operation) {
   case 'void': await voidInvoice(pool,owner.id,input);revalidatePath('/','layout');return {url:`/invoices/${input.invoiceId}`,error:''};
   case 'trash': case 'restore': {
    await trashRecord(pool,owner.id,input);revalidatePath('/','layout');
    return {url:input.kind==='invoice'?'/invoices':'/quotes',error:''};
   }
   case 'review-history': id=await reviewHistoricalBilling(pool,owner.id,input); break;
   case 'import-extra': id=await importLegacyExtra(pool,owner.id,input,issuerSnapshot()); break;
   case 'save': id = await saveDocument(pool,owner.id,{...input,items:JSON.parse(String(input.items))},issuerSnapshot()); break;
   case 'transition': id = await transitionDocument(pool,owner.id,input); break;
   case 'link': await linkProject(pool,owner.id,input.id,input.projectId); id=Number(input.id); break;
   case 'revise': id=await reviseDocument(pool,owner.id,input.id); break;
   case 'invoice': {
    const invoiceId = await createManualInvoice(pool,owner.id,input);
    revalidatePath('/', 'layout');
    return {url:`/invoices/${invoiceId}`,error:''};
   }
   case 'allocate': await allocatePayment(pool,owner.id,input.invoiceId,input.paymentId); revalidatePath('/', 'layout'); return {url:`/invoices/${input.invoiceId}`,error:''};
   default: throw new Error('Unknown operation');
  }
  revalidatePath('/', 'layout');
  return {url:`/quotes/${id}`,error:''};
 } catch(error) {
  // Do not expose database constraints, queries, or secrets in server errors.
  if (error && typeof error==='object' && 'code' in error) return {url:'',error:'The record could not be saved. Reload and check the document and amounts.'};
  return {url:'',error:error instanceof Error ? error.message : 'Unable to save'};
 }
}
