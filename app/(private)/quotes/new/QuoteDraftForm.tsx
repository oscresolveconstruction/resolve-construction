'use client';
import { useState } from 'react';
import CommercialForm from '../../../components/CommercialForm';
// Relative component import is resolved from the app route below.
type Client={id:number;name:string};
type Project={id:number;name:string;customerId:number|null;currency:string};
type Line={description:string;quantity:string;unitPrice:string};
export type Draft={id?:number;revision?:number;kind?:string;customer_id?:number;project_id?:number|null;title?:string;currency?:string;issue_date?:string;valid_until?:string|null;terms?:string;notes?:string;items?:{description:string;quantity:string;unitPriceMinor:number}[]};
export default function QuoteDraftForm({customers,projects,initial={}}:{customers:Client[];projects:Project[];initial?:Draft}) {
 const [customer,setCustomer]=useState(String(initial.customer_id||''));
 const [project,setProject]=useState(String(initial.project_id||''));
 const [kind,setKind]=useState(initial.kind||'quote');
 const [lines,setLines]=useState<Line[]>(initial.items?.map(l=>({description:l.description,quantity:String(l.quantity),unitPrice:(l.unitPriceMinor/100).toFixed(2)}))||[{description:'',quantity:'1',unitPrice:''}]);
 const input='block w-full rounded border p-2 mt-1';
 return <CommercialForm button="Save draft">
  <input type="hidden" name="operation" value="save"/><input type="hidden" name="items" value={JSON.stringify(lines)}/>
  {initial.id&&<><input type="hidden" name="id" value={initial.id}/><input type="hidden" name="revision" value={initial.revision}/></>}
  <div className="grid gap-4 sm:grid-cols-2">
   <label>Document type<select name="kind" className={input} value={kind} onChange={e=>setKind(e.target.value)}><option value="quote">Quote / Estimate</option><option value="extra">Extra Work</option></select></label>
   <label>Customer<select name="customerId" required className={input} value={customer} onChange={e=>{setCustomer(e.target.value);setProject('');}}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>Project {kind==='extra'?'(required)':'(optional)'}<select name="projectId" required={kind==='extra'} className={input} value={project} onChange={e=>setProject(e.target.value)}><option value="">Select project</option>{projects.filter(p=>p.customerId===Number(customer)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.currency}</option>)}</select></label>
   <label>Currency<select name="currency" defaultValue={initial.currency||'GBP'} className={input}><option>GBP</option><option>EUR</option></select></label>
   <label>Title<input required name="title" maxLength={200} defaultValue={initial.title} className={input}/></label>
   <label>Issue date<input required name="issueDate" type="date" defaultValue={initial.issue_date?.slice(0,10)||new Date().toISOString().slice(0,10)} className={input}/></label>
   <label>Valid until<input name="validUntil" type="date" defaultValue={initial.valid_until?.slice(0,10)||''} className={input}/></label>
  </div>
  <h2 className="text-xl font-bold">Line items</h2>
  {lines.map((l,i)=><div key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-[1fr_100px_120px_auto]">
   <label>Description<textarea required maxLength={5000} className={input} value={l.description} onChange={e=>setLines(lines.map((x,j)=>i===j?{...x,description:e.target.value}:x))}/></label>
   <label>Quantity<input required type="number" min="0.001" step="0.001" className={input} value={l.quantity} onChange={e=>setLines(lines.map((x,j)=>i===j?{...x,quantity:e.target.value}:x))}/></label>
   <label>Unit price<input required type="number" min="0.01" step="0.01" className={input} value={l.unitPrice} onChange={e=>setLines(lines.map((x,j)=>i===j?{...x,unitPrice:e.target.value}:x))}/></label>
   <button type="button" disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,j)=>j!==i))}>Remove</button>
  </div>)}
  <button type="button" className="rounded border px-4 py-2" onClick={()=>setLines([...lines,{description:'',quantity:'1',unitPrice:''}])}>Add item</button>
  <label className="block">Payment terms (manual)<textarea name="terms" maxLength={5000} defaultValue={initial.terms ?? '50% deposit.\n50% on completion.'} className={input}/></label>
  <label className="block">Notes<textarea name="notes" maxLength={5000} defaultValue={initial.notes} className={input}/></label>
  <p className="text-sm text-gray-600">Saving or approving a document never creates an invoice. You choose each invoice amount after approval.</p>
 </CommercialForm>;
}
