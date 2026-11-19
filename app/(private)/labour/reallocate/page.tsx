import {randomUUID} from 'node:crypto';
import {getPayrollPool} from '@/app/lib/payroll-db';
import {getSessionUserId} from '@/app/lib/auth';
import {redirect} from 'next/navigation';
import AllocationForm from './AllocationForm';

export default async function ReallocatePage(){
 const actor=await getSessionUserId();
 if(!actor)redirect('/login');
 const pool=getPayrollPool();
 const owner=await pool.query('SELECT id FROM "AppUser" WHERE id=$1 AND "isActive"=true',[actor]);
 if(!owner.rowCount)redirect('/login');
 const [entries,projects]=await Promise.all([
  pool.query(`SELECT l.id,l."projectId",l.date,l.hours,l.amount,l.currency,l."updatedAt",w.name AS worker,p.name AS project FROM "Labour" l JOIN "Worker" w ON w.id=l."workerId" JOIN "Project" p ON p.id=l."projectId" WHERE p.status<>'Deleted' ORDER BY l.date DESC,l.id`),
  pool.query(`SELECT id,name FROM "Project" WHERE status<>'Deleted' ORDER BY name`)
 ]);
 return <AllocationForm requestId={randomUUID()} projects={projects.rows} entries={entries.rows.map(r=>({...r,date:new Date(r.date).toISOString().slice(0,10),updatedAt:new Date(r.updatedAt).toISOString(),hours:String(r.hours),amount:String(r.amount)}))}/>;
}
