"use client";
import {useActionState,useState} from 'react';
import Link from 'next/link';
import {reallocateLabourAction} from '@/app/actions/reallocate-labour';

type Entry={id:number;projectId:number;date:string;worker:string;project:string;hours:string;amount:string;currency:string;updatedAt:string};
export default function AllocationForm({requestId,entries,projects}:{requestId:string;entries:Entry[];projects:{id:number;name:string}[]}){
 const [selected,setSelected]=useState<Record<number,string>>({});
 const [filter,setFilter]=useState('');
 const [projectId,setProjectId]=useState('');
 const [review,setReview]=useState(false);
 const [state,action,pending]=useActionState(reallocateLabourAction,{error:''});
 const chosen=entries.filter(e=>selected[e.id]!==undefined);
 const visible=review?chosen:entries.filter(e=>`${e.date} ${e.worker} ${e.project}`.toLowerCase().includes(filter.toLowerCase()));
 const invalid=chosen.some(e=>!/^\d+(?:\.\d{1,2})?$/.test(selected[e.id])||Number(selected[e.id])<=0||Number(selected[e.id])>Number(e.hours)||e.projectId===Number(projectId));
 return <main className="p-8 max-w-6xl mx-auto">
  <Link href="/labour" className="text-orange-600">← Back to Daily Labour</Link>
  <h1 className="text-3xl font-bold mt-4">Move hours between projects</h1>
  <p className="my-4 text-gray-600">Move all or part of an existing entry. Total hours and recorded costs stay the same, including closed payrolls. Worker and date stay the same.</p>
  <form action={action} className="space-y-4">
   <input type="hidden" name="requestId" value={requestId}/>
   <input type="hidden" name="entries" value={JSON.stringify(chosen.map(e=>({id:e.id,hours:selected[e.id],expectedUpdatedAt:e.updatedAt})))}/>
   <label className="block">Destination project<select name="projectId" aria-label="Destination project" required value={projectId} onChange={e=>{setProjectId(e.target.value);setReview(false);}} disabled={pending} className="block border rounded p-2 w-full"><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   {!review&&<label className="block">Find entries<input aria-label="Find entries" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Worker, project or YYYY-MM-DD" className="block border rounded p-2 w-full"/></label>}
   <p>{chosen.length} entries selected · {chosen.reduce((s,e)=>s+(Number(selected[e.id])||0),0).toFixed(2)} hours to move</p>
   {state.error&&<p role="alert" className="text-red-700">{state.error}</p>}
   {invalid&&<p role="alert">Choose positive hours up to the original hours and a different project.</p>}
   <div className="overflow-auto max-h-[60vh] border rounded"><table className="w-full text-left"><thead><tr>{['Select','Date','Worker','Current project','Recorded hours','Recorded cost','Hours to move'].map(t=><th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{visible.map(e=><tr key={e.id} className="border-t" data-entry-id={e.id}>
    <td className="p-2"><input type="checkbox" aria-label={`Select entry ${e.id}`} checked={selected[e.id]!==undefined} disabled={pending||review} onChange={ev=>setSelected(old=>{const next={...old};if(ev.target.checked)next[e.id]=e.hours;else delete next[e.id];return next;})}/></td>
    <td className="p-2">{e.date}</td><td className="p-2">{e.worker}</td><td className="p-2">{e.project}</td><td className="p-2">{e.hours}</td><td className="p-2">{e.currency} {Number(e.amount).toFixed(2)}</td>
    <td className="p-2"><input aria-label={`Hours to move for entry ${e.id}`} type="number" min="0.01" max={e.hours} step="0.01" disabled={pending||review||selected[e.id]===undefined} value={selected[e.id]??''} onChange={ev=>setSelected(old=>({...old,[e.id]:ev.target.value}))} className="border rounded p-2 w-24"/></td>
   </tr>)}</tbody></table></div>
   {review?<div className="flex gap-4"><button type="button" disabled={pending} onClick={()=>setReview(false)} className="border rounded px-4 py-2">Back</button><button disabled={pending||invalid||!chosen.length||!projectId} className="bg-orange-500 text-white rounded px-4 py-2">{pending?'Saving…':'Confirm move'}</button></div>:<button type="button" disabled={invalid||!chosen.length||chosen.length>100||!projectId} onClick={()=>setReview(true)} className="bg-orange-500 text-white rounded px-4 py-2">Review move</button>}
  </form>
 </main>;
}
