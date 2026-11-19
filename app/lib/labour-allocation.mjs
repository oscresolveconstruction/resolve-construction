import {pennies} from './finance/calculations.mjs';
import {recordOnce} from './finance/requests.mjs';

function hundredths(value) {
 const text=String(value);
 if(!/^\d+(?:\.\d{1,2}0*)?$/.test(text))throw new Error('Hours must have at most two decimal places.');
 const units=pennies(text);
 if(units<=0||units>2400)throw new Error('Hours must be greater than zero and at most 24.');
 return units;
}
export function splitRecordedCost(hours,amount,movedHours) {
 const total=hundredths(hours),moved=hundredths(movedHours),cost=pennies(amount);
 if(moved>total||cost<0)throw new Error('Cannot move more than the recorded hours.');
 const numerator=BigInt(cost)*BigInt(moved),denominator=BigInt(total);
 const movedCost=Number((numerator*2n+denominator)/(2n*denominator));
 return {movedHours:(moved/100).toFixed(2),remainingHours:((total-moved)/100).toFixed(2),movedAmount:(movedCost/100).toFixed(2),remainingAmount:((cost-movedCost)/100).toFixed(2)};
}

/** Move existing allocations without reopening payroll or changing worker/day totals. */
export async function reallocateLabour(pool,actor,input) {
 const {requestId,projectId,entries}=input;
 if(!Number.isSafeInteger(projectId)||projectId<=0||!Array.isArray(entries)||entries.length<1||entries.length>100)throw new Error('Select a project and between 1 and 100 entries.');
 const seen=new Set();
 for(const e of entries){
  if(!Number.isSafeInteger(e.id)||e.id<=0||seen.has(e.id)||!Number.isFinite(Date.parse(e.expectedUpdatedAt)))throw new Error('Invalid or repeated entry. Reload the page.');
  seen.add(e.id);hundredths(e.hours);
 }
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const result=await recordOnce(client,{kind:'labour',requestId,actor,payload:{operation:'reallocate',projectId,entries}},async()=>{
   const target=(await client.query('SELECT id,currency,status FROM "Project" WHERE id=$1 FOR SHARE',[projectId])).rows[0];
   if(!target||target.status==='Deleted')throw new Error('Destination project is unavailable.');
   const originals=(await client.query('SELECT * FROM "Labour" WHERE id=ANY($1::int[]) ORDER BY id',[[...seen]])).rows;
   if(originals.length!==entries.length)throw new Error('An entry no longer exists. Reload the page.');
   const keys=[...new Set(originals.map(r=>`${r.workerId}:${new Date(r.date).toISOString().slice(0,7)}`))].sort();
   for(const key of keys)await client.query('SELECT pg_advisory_xact_lock(741239,hashtext($1::text))',[key]);
   const current=(await client.query('SELECT * FROM "Labour" WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[[...seen]])).rows;
   if(current.length!==entries.length)throw new Error('An entry changed. Reload the page.');
   const ids=[];
   for(const row of current){
    const e=entries.find(e=>e.id===row.id),original=originals.find(r=>r.id===row.id);
    if(row.workerId!==original.workerId||new Date(row.date).getTime()!==new Date(original.date).getTime()||new Date(row.updatedAt).getTime()!==Date.parse(e.expectedUpdatedAt))throw new Error('An entry changed. Reload the page before trying again.');
    if(row.projectId===projectId)throw new Error('An entry is already in the destination project.');
    const source=(await client.query('SELECT currency,status FROM "Project" WHERE id=$1 FOR SHARE',[row.projectId])).rows[0];
    if(!source||source.status==='Deleted'||source.currency!==row.currency||target.currency!==row.currency||row.exchangeRate!=null)throw new Error('Only allocations with matching currencies and no conversion can be moved.');
    const split=splitRecordedCost(row.hours,row.amount,e.hours);
    if(split.remainingHours==='0.00'){
     await client.query('UPDATE "Labour" SET "projectId"=$1,"updatedAt"=now() WHERE id=$2',[projectId,row.id]);
    }else{
     await client.query('UPDATE "Labour" SET hours=$1,amount=$2,"updatedAt"=now() WHERE id=$3',[split.remainingHours,split.remainingAmount,row.id]);
     const inserted=await client.query(`INSERT INTO "Labour" ("workerId","projectId",date,hours,"hourlyRate",amount,currency,"exchangeRate",description,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8,now(),now()) RETURNING id`,[row.workerId,projectId,row.date,split.movedHours,row.hourlyRate,split.movedAmount,row.currency,[row.description,`Split from labour ${row.id}; original recorded cost preserved.`].filter(Boolean).join('\n')]);
     ids.push(inserted.rows[0].id);
    }
    ids.push(row.id);
   }
   return ids;
  });
  await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
