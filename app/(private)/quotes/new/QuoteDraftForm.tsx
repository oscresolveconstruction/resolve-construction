"use client";
import { useMemo, useState } from "react";
import { calculateQuoteLines, calculateStages } from "../../../lib/quote-calculations";

type Client = { id: number; name: string };
type Project = { id: number; name: string; customerId: number | null };
type Line = { description: string; quantity: string; unitPrice: string };
const initialLine = (): Line => ({description:"", quantity:"1", unitPrice:""});
const money = (v:number, currency:"GBP"|"EUR") => new Intl.NumberFormat("en-GB",{style:"currency",currency}).format(v / 100);

export default function QuoteDraftForm({customers, projects}:{customers:Client[];projects:Project[]}) {
  const [customerId,setCustomerId] = useState("");
  const [projectId,setProjectId] = useState("");
  const [currency,setCurrency] = useState<"GBP"|"EUR">("GBP");
  const [title,setTitle] = useState("");
  const [lines,setLines] = useState<Line[]>([initialLine()]);
  const [showPreview,setShowPreview] = useState(false);
  const selectedCustomer = customers.find(c => String(c.id)===customerId);
  const eligibleProjects = projects.filter(p => p.customerId===Number(customerId));
  const total = useMemo(() => {
    try {
      const result=calculateQuoteLines(lines.map(l=>({
        description:l.description,
        quantity:Number(l.quantity),
        unitPriceMinor:Math.round(Number(l.unitPrice)*100)
      })));
      return {result,error:null as string|null};
    } catch(e) { return {result:null,error:e instanceof Error?e.message:"Invalid quote"}; }
  },[lines]);
  const stages = total.result ? calculateStages(total.result.totalMinor,[
    {label:"Deposit", percentageBasisPoints:5000},
    {label:"First evaluation",percentageBasisPoints:2500},
    {label:"Completion",percentageBasisPoints:2500}
  ]) : [];
  const update=(index:number,key:keyof Line,value:string)=>setLines(prev=>prev.map((l,i)=>i===index?{...l,[key]:value}:l));
  return <div className="mt-6 space-y-5">
    <div className="rounded-xl border bg-white p-6">
      <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Preview only — nothing entered here is saved. Do not send this draft to clients.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Customer *
          <select className="mt-1 block w-full rounded-lg border p-3" value={customerId} onChange={e=>{setCustomerId(e.target.value);setProjectId("");}}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="text-sm font-medium">Project (optional)
          <select className="mt-1 block w-full rounded-lg border p-3" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">No project yet</option>{eligibleProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>
        <label className="text-sm font-medium">Estimate title
          <input className="mt-1 block w-full rounded-lg border p-3" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Kitchen refurbishment" />
        </label>
        <label className="text-sm font-medium">Currency
          <select className="mt-1 block w-full rounded-lg border p-3" value={currency} onChange={e=>setCurrency(e.target.value as "GBP"|"EUR")}><option value="GBP">GBP (£)</option><option value="EUR">EUR (€)</option></select>
        </label>
      </div>
      <h2 className="mb-3 mt-7 text-lg font-bold">Description / Rate / QTY / Amount</h2>
      <div className="space-y-4">
        {lines.map((line,index)=><div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_105px_130px_auto]">
          <label className="text-xs text-gray-500">Description
            <textarea rows={3} className="mt-1 w-full rounded border p-2 text-sm" value={line.description} onChange={e=>update(index,"description",e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">Quantity
            <input type="number" min="0.001" step="0.001" className="mt-1 w-full rounded border p-2 text-sm" value={line.quantity} onChange={e=>update(index,"quantity",e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">Unit price
            <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2 text-sm" value={line.unitPrice} onChange={e=>update(index,"unitPrice",e.target.value)} />
          </label>
          <button type="button" disabled={lines.length===1} className="self-center text-sm text-red-700 disabled:opacity-30" onClick={()=>setLines(a=>a.filter((_,i)=>i!==index))}>Remove</button>
        </div>)}
      </div>
      <button type="button" className="mt-3 rounded-lg border px-4 py-2" onClick={()=>setLines(a=>[...a,initialLine()])}>+ Add item</button>
      {total.error ? <p role="alert" className="mt-4 text-sm text-red-700">{total.error}</p> : <p className="mt-5 text-right text-xl font-bold">Total: {money(total.result!.totalMinor,currency)}</p>}
      <button type="button" disabled={!customerId||!title.trim()||!!total.error} onClick={()=>setShowPreview(true)} className="mt-5 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-40">Preview estimate</button>
    </div>
    {showPreview && selectedCustomer && total.result && <section className="rounded-xl border bg-white p-7">
      <div className="flex items-start justify-between gap-4 border-t-8 border-orange-600 pt-4">
        <div><h2 className="text-xl font-bold">Resolve Construction Ltd</h2><p className="text-sm text-gray-500">Draft preview — not an issued document</p></div>
        <div className="text-right"><p className="text-2xl font-black text-orange-600">ESTIMATE</p><p className="text-sm">Not numbered</p></div>
      </div>
      <div className="mt-7"><p className="text-xs font-bold text-orange-600">BILL TO</p><p className="font-semibold">{selectedCustomer.name}</p><p>{title}</p></div>
      <div className="mt-7 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-orange-600 text-white"><tr><th className="p-3 text-left">DESCRIPTION</th><th className="p-3 text-right">RATE</th><th className="p-3 text-right">QTY</th><th className="p-3 text-right">AMOUNT</th></tr></thead><tbody>{total.result.items.map((l,i)=><tr className="border-b" key={i}><td className="whitespace-pre-line p-3">{l.description}</td><td className="p-3 text-right">{money(l.unitPriceMinor,currency)}</td><td className="p-3 text-right">{l.quantity}</td><td className="p-3 text-right">{money(l.amountMinor,currency)}</td></tr>)}</tbody></table></div>
      <p className="mt-6 text-right text-2xl font-bold">Total {money(total.result.totalMinor,currency)}</p>
      <h3 className="mt-7 font-bold">Suggested payment stages</h3>
      {stages.map(s=><p className="mt-1 text-sm" key={s.label}>{s.label}: {money(s.amountMinor,currency)}</p>)}
      <p className="mt-6 text-sm font-semibold text-red-700">NOT SAVED · NOT APPROVED · NOT AN INVOICE</p>
      <button type="button" className="mt-4 rounded-lg border px-4 py-2" onClick={()=>setShowPreview(false)}>Close preview</button>
    </section>}
  </div>;
}
