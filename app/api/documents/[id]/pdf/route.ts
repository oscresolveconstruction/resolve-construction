import { requireActiveUser } from '../../../../lib/require-active-user';
import { getPayrollPool } from '../../../../lib/payroll-db';
import { renderDocumentPdf } from '../../../../lib/commercial/pdf.mjs';
import { issuerSnapshot } from '../../../../lib/commercial/issuer';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 await requireActiveUser();const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)return new Response('Not found',{status:404});
 const pool=getPayrollPool();const invoice=new URL(request.url).searchParams.get('kind')==='invoice';let data;
 if(invoice){
  const i=(await pool.query(`SELECT i.*,ci.customer_snapshot,ci.issuer_snapshot,ci.terms,d.number AS source_number,c.name AS client,c.address,c.email,c.phone,p.client AS project_client FROM "Invoice" i JOIN "Project" p ON p.id=i."projectId" LEFT JOIN "Customer" c ON c.id=p."customerId" LEFT JOIN commercial_invoice ci ON ci.invoice_id=i.id LEFT JOIN commercial_document d ON d.id=ci.source_id WHERE i.id=$1`,[id])).rows[0];
  if(!i)return new Response('Not found',{status:404});
  const paid=(await pool.query('SELECT COALESCE(sum(amount),0) AS amount FROM "Payment" WHERE "invoiceId"=$1 AND currency=$2',[id,i.currency])).rows[0].amount;
  data={type:'INVOICE',number:i.invoiceNumber,date:i.issueDate.toISOString().slice(0,10),status:i.status,currency:i.currency,customer:i.customer_snapshot||{name:i.client||i.project_client,address:i.address,email:i.email},issuer:i.issuer_snapshot||issuerSnapshot(),terms:i.terms||'',notes:i.source_number?'':'Historical invoice: customer details reflect current records.',items:[{description:i.description||'Work as agreed',quantity:'1',unitPriceMinor:Math.round(Number(i.amount)*100),amountMinor:Math.round(Number(i.amount)*100)}],totalMinor:Math.round(Number(i.amount)*100),paidMinor:Math.round(Number(paid)*100),dueDate:i.dueDate?.toISOString().slice(0,10),source:i.source_number||''};
 } else {
  const d=(await pool.query('SELECT *,issue_date::text AS day,valid_until::text AS validity FROM commercial_document WHERE id=$1',[id])).rows[0];if(!d)return new Response('Not found',{status:404});
  data={type:d.kind==='extra'?'EXTRA WORK':'ESTIMATE',number:d.number,date:d.day,status:d.status,currency:d.currency,title:d.title,validUntil:d.validity,customer:d.customer_snapshot,issuer:d.issuer_snapshot,items:d.items,totalMinor:Number(d.total_minor),terms:d.terms,notes:d.notes};
 }
 const pdf=await renderDocumentPdf(data);
 return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${String(data.number).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf"`,'Cache-Control':'private, no-store'}});
}
