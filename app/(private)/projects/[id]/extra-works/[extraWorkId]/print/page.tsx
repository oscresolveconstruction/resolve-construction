import { notFound, redirect } from 'next/navigation';
import { requireActiveUser } from '../../../../../../lib/require-active-user';
import { getPayrollPool } from '../../../../../../lib/payroll-db';
export const dynamic='force-dynamic';
export default async function ExtraWorkPrint({params}:{params:Promise<{id:string;extraWorkId:string}>}) {
 await requireActiveUser();const p=await params;const projectId=Number(p.id),extraId=Number(p.extraWorkId);
 if(!Number.isSafeInteger(projectId)||projectId<=0||!Number.isSafeInteger(extraId)||extraId<=0)notFound();
 const e=(await getPayrollPool().query('SELECT e.id,d.id AS document_id FROM "ExtraWork" e LEFT JOIN commercial_document d ON d.extra_work_id=e.id WHERE e.id=$1 AND e."projectId"=$2',[extraId,projectId])).rows[0];
 if(!e)notFound();
 redirect(e.document_id?`/api/documents/${e.document_id}/pdf`:`/projects/${projectId}/extra-works`);
}
