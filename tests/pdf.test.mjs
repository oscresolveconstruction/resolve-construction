import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderDocumentPdf} from '../app/lib/commercial/pdf.mjs';
test('long corporate PDF paginates without footer-only blank pages',async()=>{
 const pdf=await renderDocumentPdf({type:'INVOICE',number:'TEST-PDF',date:'2026-10-28',status:'Test fixture',currency:'EUR',issuer:{name:'Test issuer',bank:''},customer:{name:'Test customer',address:'Test address'},items:Array.from({length:36},(_,i)=>({description:`Test line ${i+1}: interior work with a long description.\nSecond line with accented characters: reparación.`,quantity:'1.5',unitPriceMinor:10000,amountMinor:15000})),totalMinor:540000,paidMinor:100000,terms:'Manually entered terms.',notes:'TEST ONLY'});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,3);
});
