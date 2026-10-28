import { redirect } from 'next/navigation';
import { requireActiveUser } from '../../../../../../lib/require-active-user';
import { db } from '../../../../../../../src/prisma/db';
import { notFound } from 'next/navigation';
export default async function PrintPage({params}:{params:Promise<{id:string;invoiceId:string}>}) {
 await requireActiveUser(); const p=await params; const invoice=await db.orm.public.Invoice.first({id:Number(p.invoiceId)});
 if(!invoice||invoice.projectId!==Number(p.id))notFound();
 redirect(`/api/documents/${invoice.id}/pdf?kind=invoice`);
}
