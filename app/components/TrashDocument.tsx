'use client';
import {useState} from 'react';
import CommercialForm from './CommercialForm';
export default function TrashDocument({id,kind,deleted=false}:{id:number;kind:'document'|'invoice';deleted?:boolean}) {
 const [open,setOpen]=useState(false);
 return <div className="rounded-xl border border-red-200 bg-white p-4">
 {deleted?<CommercialForm button="Restore document"><input type="hidden" name="operation" value="restore"/><input type="hidden" name="id" value={id}/><input type="hidden" name="kind" value={kind}/><p>This document is in the trash.</p></CommercialForm>:<><button type="button" onClick={()=>setOpen(!open)} className="min-h-11 text-red-700 underline">Delete document</button>{open&&<CommercialForm button="Confirm deletion"><input type="hidden" name="operation" value="trash"/><input type="hidden" name="id" value={id}/><input type="hidden" name="kind" value={kind}/><p>The document moves to Trash and can be restored. Issued invoice amounts, numbering and payments remain in the financial records. Use Cancel invoice to cancel an incorrect invoice and release its billed amount.</p><label className="block">Reason<textarea name="reason" required maxLength={1000} className="block w-full rounded border p-2"/></label><label className="block"><input type="checkbox" required/> I confirm moving this document to Trash.</label></CommercialForm>}</>}
 </div>;
}
