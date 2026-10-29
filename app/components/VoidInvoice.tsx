'use client';
import {useState} from 'react';
import CommercialForm from './CommercialForm';
export default function VoidInvoice({id,hasPayments}:{id:number;hasPayments:boolean}) {
 const [open,setOpen]=useState(false);
 return <section className="space-y-3 rounded-xl border border-red-300 bg-white p-4"><button type="button" disabled={hasPayments} onClick={()=>setOpen(!open)} className="min-h-11 rounded border border-red-700 px-4 text-red-700 disabled:opacity-50">Cancel invoice</button>{hasPayments?<p>Resolve all allocated payments before cancelling this invoice.</p>:open&&<CommercialForm button="Confirm cancellation"><input type="hidden" name="operation" value="void"/><input type="hidden" name="invoiceId" value={id}/><p>Cancellation is permanent. The invoice number and original document are retained. Its billed amount is released so you can manually issue a corrected invoice.</p><label className="block">Cancellation reason<textarea name="reason" required maxLength={1000} className="block w-full rounded border p-2"/></label><label className="block"><input type="checkbox" name="confirm" value="yes" required/> I confirm cancellation of this invoice.</label></CommercialForm>}</section>;
}
