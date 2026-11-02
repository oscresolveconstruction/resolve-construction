export class ProjectRemovalError extends Error {}

// Called inside the deletion transaction, with the Project row locked FOR UPDATE.
// Issued document protections stay in force; a tombstone retains their parent FK.
export async function retireProtectedProject(client, actor, project) {
 const protectedRows=await client.query(`SELECT 1 FROM commercial_document WHERE project_id=$1
 UNION ALL SELECT 1 FROM "Invoice" WHERE "projectId"=$1 AND status='Void' LIMIT 1`,[project.id]);
 if(!protectedRows.rowCount)return false;
 if(!(await client.query('SELECT id FROM "AppUser" WHERE id=$1 AND "isActive"=true FOR SHARE',[actor])).rowCount)throw new ProjectRemovalError('Unauthorized. Please sign in.');
 const invoices=(await client.query('SELECT status FROM "Invoice" WHERE "projectId"=$1 FOR UPDATE',[project.id])).rows;
 if(invoices.some(i=>i.status!=='Void'))throw new ProjectRemovalError('Cancel active invoices before deleting this project.');
 if((await client.query('SELECT 1 FROM "Payment" WHERE "projectId"=$1 LIMIT 1',[project.id])).rowCount)throw new ProjectRemovalError('This project has recorded payments. Review them before deleting it.');
 if((await client.query('SELECT 1 FROM "Labour" WHERE "projectId"=$1 LIMIT 1',[project.id])).rowCount)throw new ProjectRemovalError('This project has labour records. Review their payroll allocation before deleting it.');
 if((await client.query('SELECT 1 FROM "ExtraWork" WHERE "projectId"=$1 LIMIT 1',[project.id])).rowCount)throw new ProjectRemovalError('This project has extra works. Review them before deleting it.');
 await client.query(`INSERT INTO project_removal(project_id,actor_id,project_snapshot,expense_count,expense_amount)
 SELECT p.id,$2,to_jsonb(p),(SELECT count(*) FROM "Expense" WHERE "projectId"=p.id),
 (SELECT COALESCE(sum(amount),0) FROM "Expense" WHERE "projectId"=p.id AND currency=p.currency)
 FROM "Project" p WHERE p.id=$1 ON CONFLICT(project_id) DO NOTHING`,[project.id,actor]);
 await client.query(`INSERT INTO commercial_trash(kind,record_id,deleted_by,reason)
 SELECT 'document',id,$2,'Project removed' FROM commercial_document WHERE project_id=$1
 ON CONFLICT(kind,record_id) DO NOTHING`,[project.id,actor]);
 await client.query(`INSERT INTO commercial_trash(kind,record_id,deleted_by,reason)
 SELECT 'invoice',id,$2,'Project removed' FROM "Invoice" WHERE "projectId"=$1
 ON CONFLICT(kind,record_id) DO NOTHING`,[project.id,actor]);
 await client.query('DELETE FROM "Expense" WHERE "projectId"=$1',[project.id]);
 await client.query('DELETE FROM "ProjectPhoto" WHERE "projectId"=$1',[project.id]);
 await client.query(`UPDATE "Project" SET status='Deleted' WHERE id=$1`,[project.id]);
 return true;
}
