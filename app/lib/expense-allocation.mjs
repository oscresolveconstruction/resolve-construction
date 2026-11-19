import {recordOnce} from './finance/requests.mjs';
export async function moveExpense(pool,actor,{id,projectId,expectedUpdatedAt,requestId}){
 if(![id,projectId].every(n=>Number.isSafeInteger(n)&&n>0)||!Number.isFinite(Date.parse(expectedUpdatedAt)))throw new Error('Invalid expense. Reload the page.');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const result=await recordOnce(client,{kind:'expense',requestId,actor,payload:{operation:'move',id,projectId,expectedUpdatedAt}},async()=>{
   const target=(await client.query('SELECT currency,status FROM "Project" WHERE id=$1 FOR SHARE',[projectId])).rows[0];
   const row=(await client.query('SELECT * FROM "Expense" WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!row||row.projectId==null||new Date(row.updatedAt).getTime()!==Date.parse(expectedUpdatedAt))throw new Error('Expense changed. Reload the page.');
   if(row.projectId===projectId)throw new Error('Expense is already in this project.');
   const source=(await client.query('SELECT currency,status FROM "Project" WHERE id=$1 FOR SHARE',[row.projectId])).rows[0];
   if(!source||!target||source.status==='Deleted'||target.status==='Deleted'||source.currency!==target.currency)throw new Error('Choose an available project with the same project currency.');
   await client.query('UPDATE "Expense" SET "projectId"=$1,"updatedAt"=now() WHERE id=$2',[projectId,id]);
   return [id];
  });
  await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
