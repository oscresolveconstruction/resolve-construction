import Link from 'next/link';
import { requireActiveUser } from '../../lib/require-active-user';
import { getPayrollPool } from '../../lib/payroll-db';
export const dynamic='force-dynamic';
export default async function InvoicesPage() {
 await requireActiveUser();
 const {rows}=await getPayrollPool().query(`SELECT i.*,p.name AS project,COALESCE((SELECT sum(amount) FROM "Payment" WHERE "invoiceId"=i.id AND currency=i.currency),0) AS paid FROM "Invoice" i JOIN "Project" p ON p.id=i."projectId" ORDER BY i.id DESC LIMIT 500`);
 return <div className="space-y-6 p-6"><h1 className="text-3xl font-bold">Invoices</h1><Link href="/quotes" className="inline-block rounded bg-orange-600 p-3 text-white">Create manually from an approved document</Link><div className="overflow-auto"><table className="w-full bg-white text-left"><thead><tr>{['Invoice','Project','Total','Paid','Balance','Status'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map(i=>{const balance=Number(i.amount)-Number(i.paid);const status=balance<=0?'Paid':Number(i.paid)>0?'Partially paid':i.dueDate&&new Date(i.dueDate)<new Date()?'Overdue':i.status;return <tr key={i.id} className="border-t"><td className="p-3"><Link className="underline" href={`/invoices/${i.id}`}>{i.invoiceNumber}</Link></td><td className="p-3">{i.project}</td><td className="p-3">{i.currency} {Number(i.amount).toFixed(2)}</td><td className="p-3">{Number(i.paid).toFixed(2)}</td><td className="p-3">{balance.toFixed(2)}</td><td className="p-3">{status}</td></tr>})}</tbody></table></div></div>;
}
