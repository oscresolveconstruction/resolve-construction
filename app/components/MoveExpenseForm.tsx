"use client";
import {useActionState} from 'react';
import {moveExpenseAction} from '@/app/actions/move-expense';
export default function MoveExpenseForm({id,updatedAt,requestId,projects}:{id:number;updatedAt:string;requestId:string;projects:{id:number;name:string}[]}){
 const [state,action,pending]=useActionState(moveExpenseAction.bind(null,id,updatedAt),{error:''});
 return <form action={action} className="mt-8 space-y-4 border rounded-xl p-6 bg-white">
  <h2 className="text-lg font-bold">Move expense to another project</h2>
  <p className="text-sm text-gray-600">Keep the same expense, amount, exchange rate and receipt. Only the project changes.</p>
  <input type="hidden" name="requestId" value={requestId}/>
  <label className="block">Destination project<select aria-label="Destination project" name="destinationProjectId" required defaultValue="" className="block w-full border rounded p-3"><option value="" disabled>Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {state.error&&<p role="alert" className="text-red-700">{state.error}</p>}
  <button disabled={pending} className="bg-orange-500 text-white rounded px-5 py-2">{pending?'Moving…':'Move expense'}</button>
 </form>;
}
