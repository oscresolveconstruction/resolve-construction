import {createHash} from 'node:crypto';
export async function recordOnce(client,{kind,requestId,actor,payload},create){
 if(!['expense','payment','labour'].includes(kind)||!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(String(requestId)))throw new Error('Reload the form before saving.');
 const owner=await client.query('SELECT id FROM "AppUser" WHERE id=$1 AND "isActive"=true FOR SHARE',[actor]);
 if(!owner.rowCount)throw new Error('Unauthorized');
 await client.query('SELECT pg_advisory_xact_lock(741241,hashtext($1))',[`${kind}:${requestId}`]);
 const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 const prior=(await client.query('SELECT * FROM financial_request WHERE kind=$1 AND request_id=$2',[kind,requestId])).rows[0];
 if(prior){if(prior.actor_id!==actor||prior.payload_hash!==hash)throw new Error('This form was already saved. Open a new form for another record.');return {ids:prior.record_ids,duplicate:true};}
 const ids=await create();
 await client.query('INSERT INTO financial_request(kind,request_id,actor_id,payload_hash,record_ids) VALUES($1,$2,$3,$4,$5)',[kind,requestId,actor,hash,JSON.stringify(ids)]);
 return {ids,duplicate:false};
}
const tables={expense:{name:'Expense',columns:['projectId','date','supplier','category','description','amount','currency','exchangeRate','receiptFileName','receiptFilePath','receiptMimeType']},payment:{name:'Payment',columns:['projectId','invoiceId','date','amount','currency','reference','description','paymentMethod','receiptFileName','receiptFilePath','receiptMimeType']}};
export async function createMovementOnce(pool,{kind,requestId,actor,data}){
 const table=tables[kind];if(!table)throw new Error('Invalid movement');
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const payload=Object.fromEntries(table.columns.filter(k=>!k.startsWith('receipt')).map(k=>[k,data[k]??null]));
  const result=await recordOnce(client,{kind,requestId,actor,payload},async()=>{
   if(data.projectId)await client.query('SELECT id FROM "Project" WHERE id=$1 FOR SHARE',[data.projectId]);
   const columns=table.columns.filter(k=>data[k]!==undefined);
   const inserted=await client.query(`INSERT INTO "${table.name}" (${columns.map(k=>`"${k}"`).join(',')},"createdAt","updatedAt") VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')},now(),now()) RETURNING id`,columns.map(k=>data[k]));
   return [inserted.rows[0].id];
  });
  await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
