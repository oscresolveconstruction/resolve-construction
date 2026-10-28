'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { commercialAction } from '../actions/commercial';
export default function CommercialForm({children,button='Save'}:{children:React.ReactNode;button?:string}) {
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter();
 return <form className="space-y-3 rounded-xl border bg-white p-5" onSubmit={async e=>{
  e.preventDefault(); if(busy)return; setBusy(true); setError('');
  try {const result=await commercialAction(new FormData(e.currentTarget)); if(result.error)setError(result.error); else {router.push(result.url);router.refresh();}} catch {setError('Unable to save. Please retry.');} finally {setBusy(false);}
 }}>{children}{error&&<p role="alert" className="text-red-700">{error}</p>}<button disabled={busy} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">{busy?'Saving…':button}</button></form>;
}
