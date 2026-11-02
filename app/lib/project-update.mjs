export class ProjectUpdateError extends Error {}

export async function updateProjectDetails(pool,actor,id,data) {
 const c=await pool.connect();
 try {
  await c.query('BEGIN');
  if(!(await c.query('SELECT id FROM "AppUser" WHERE id=$1 AND "isActive"=true FOR SHARE',[actor])).rowCount)throw new ProjectUpdateError('Please sign in again.');
  const project=(await c.query('SELECT * FROM "Project" WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!project||project.status==='Deleted')throw new ProjectUpdateError('Project not found.');
  const customer=(await c.query('SELECT id,name FROM "Customer" WHERE id=$1 FOR SHARE',[data.customerId])).rows[0];
  if(!customer)throw new ProjectUpdateError('Selected customer does not exist.');
  if(project.customerId!==customer.id&&(await c.query(`SELECT 1 FROM commercial_document WHERE project_id=$1 UNION ALL SELECT 1 FROM "Invoice" WHERE "projectId"=$1 LIMIT 1`,[id])).rowCount)throw new ProjectUpdateError('This project has linked estimates or invoices. Its customer cannot be changed here because those documents retain the original customer. Other project details can still be edited.');
  await c.query(`UPDATE "Project" SET name=$2,client=$3,"customerId"=$4,"contractValue"=$5,"startDate"=$6,status=$7,description=$8,"updatedAt"=now() WHERE id=$1`,[id,data.name,customer.name,customer.id,data.contractValue,data.startDate,data.status,data.description]);
  await c.query('COMMIT');
  return {previousCustomerId:project.customerId,customerId:customer.id};
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
