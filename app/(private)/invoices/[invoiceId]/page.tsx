import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActiveUser } from '../../../lib/require-active-user';
import { getPayrollPool } from '../../../lib/payroll-db';
import CommercialForm from '../../../components/CommercialForm';
export const dynamic='force-dynamic';
export default async function InvoicePage({params}:{params:Promise<{invoiceId:string}>}) {
 await requireActiveUser(); const id=Number((await params).invoiceId); if(!Number.isSafeInteger(id)||id<=0)notFound(); const pool=getPayrollPool();
 const i=(await pool.query('SELECT i.*,ci.source_id FROM "Invoice" i LEFT JOIN commercial_invoice ci ON ci.invoice_id=i.id WHERE i.id=$1',[id])).rows[0];if(!i)notFound();
 const payments=(await pool.query('SELECT * FROM "Payment" WHERE "invoiceId"=$1',[id])).rows;
 const available=(await pool.query('SELECT * FROM "Payment" WHERE "projectId"=$1 AND currency=$2 AND "invoiceId" IS NULL ORDER BY date',[i.projectId,i.currency])).rows;
 const paid=payments.filter(p=>p.currency===i.currency).reduce((s,p)=>s+Number(p.amount),0);
 return <div className="mx-auto max-w-4xl space-y-5 p-6"><Link href="/invoices" className="underline">← Invoices</Link><h1 className="text-3xl font-bold">{i.invoiceNumber}</h1><p className="whitespace-pre-wrap">{i.description}</p><p>Total: {i.currency} {Number(i.amount).toFixed(2)} · Paid: {paid.toFixed(2)} · Balance: {(Number(i.amount)-paid).toFixed(2)}</p><div className="flex flex-wrap gap-4"><a href={`/api/documents/${id}/pdf?kind=invoice`} className="rounded border p-3">Download PDF</a><Link href={`/projects/${i.projectId}/payments/new`} className="p-3 underline">Record payment</Link>{i.source_id?<Link href={`/quotes/${i.source_id}`} className="p-3 underline">Approved source</Link>:<Link href={`/projects/${i.projectId}/invoices/${id}`} className="p-3 underline">Legacy invoice details</Link>}</div><h2 className="text-xl font-bold">Payments allocated</h2>{payments.map(p=><p key={p.id}>{p.date.toISOString().slice(0,10)} · {p.currency} {p.amount} · {p.reference}</p>)}{!payments.length&&<p>No payments allocated.</p>}
 {available.length>0&&<CommercialForm button="Allocate existing payment"><input type="hidden" name="operation" value="allocate"/><input type="hidden" name="invoiceId" value={id}/><label>Select recorded payment<select name="paymentId" required className="block w-full rounded border p-2"><option value="">Select payment</option>{available.map(p=><option key={p.id} value={p.id}>{p.date.toISOString().slice(0,10)} · {p.amount} {p.currency} · {p.reference}</option>)}</select></label><p>This links an existing payment; it does not create another payment.</p></CommercialForm>}</div>;
}
