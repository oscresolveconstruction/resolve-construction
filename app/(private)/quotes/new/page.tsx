import { db } from '../../../../src/prisma/db';
import { requireActiveUser } from '../../../lib/require-active-user';
import QuoteDraftForm from './QuoteDraftForm';
export const dynamic='force-dynamic';
export default async function NewQuotePage({searchParams}:{searchParams:Promise<{kind?:string;projectId?:string}>}) {
 await requireActiveUser();const query=await searchParams;
 const [customers,projects]=await Promise.all([db.orm.public.Customer.all(),db.orm.public.Project.all()]);
 const project=projects.find(p=>p.id===Number(query.projectId));
 return <div className="mx-auto max-w-5xl space-y-5 p-6"><h1 className="text-3xl font-bold">New document</h1><QuoteDraftForm customers={customers.map(c=>({id:c.id,name:c.name}))} projects={projects.map(p=>({id:p.id,name:p.name,customerId:p.customerId,currency:p.currency}))} initial={{terms:process.env.INVOICE_DEFAULT_PAYMENT_TERMS || undefined,kind:query.kind==='extra'?'extra':'quote',project_id:project?.id,customer_id:project?.customerId||undefined,currency:project?.currency}}/></div>;
}
