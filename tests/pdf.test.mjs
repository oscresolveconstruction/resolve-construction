import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {renderDocumentPdf} from '../app/lib/commercial/pdf.mjs';
import {companyBranding,headerIssuer} from '../app/lib/commercial/branding.mjs';
async function textPages(buffer) {
 const task=getDocument({data:new Uint8Array(buffer)});
 try {const pdf=await task.promise;const pages=[];for(let i=1;i<=pdf.numPages;i++)pages.push((await (await pdf.getPage(i)).getTextContent()).items.map(item=>item.str).join(' '));return pages;}
 finally {await task.destroy();}
}
test('long corporate PDF paginates without footer-only blank pages',async()=>{
 const pdf=await renderDocumentPdf({type:'INVOICE',number:'TEST-PDF',date:'2026-10-28',status:'Test fixture',currency:'EUR',issuer:{name:'Test issuer',bank:''},customer:{name:'Test customer',address:'Test address'},items:Array.from({length:36},(_,i)=>({description:`Test line ${i+1}: interior work with a long description.\nSecond line with accented characters: reparación.`,quantity:'1.5',unitPriceMinor:10000,amountMinor:15000})),totalMinor:540000,paidMinor:100000,terms:'Manually entered terms.',notes:'TEST ONLY'});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 const pages=await textPages(pdf);
 assert.equal(pages.length,4); // Larger reference header; notes continue on page 4.
 for(const page of pages)assert.match(page,/Test line|NOTES/);
 assert.match(pages[3],/TEST ONLY/);
 for(let i=1;i<=36;i++)assert.match(pages.join(' '),new RegExp(`Test line ${i}:`));
});
test('reference header embeds logo and uses actual document metadata for each document kind',async()=>{
 for(const type of ['ESTIMATE','EXTRA WORK','INVOICE']){
  const pdf=await renderDocumentPdf({type,number:'TEST-123',date:'2026-10-26',status:'Approved',currency:'GBP',issuer:{name:companyBranding.name,address:'',phone:'',email:'',bank:''},customer:{name:'Test customer'},items:[{description:'Test line',quantity:'1',unitPriceMinor:420000,amountMinor:420000}],totalMinor:420000});
  const [text]=await textPages(pdf);
  for(const value of [type,'TEST-123','26 Oct 2026','GBP £4,200.00',...Object.values(companyBranding)])assert.ok(text.includes(value),value);
  assert.match(pdf.toString('latin1'),/\/Subtype \/Image/);
  assert.doesNotMatch(text,/BANK DETAILS|GIP/);
 }
});
test('branding fills missing contact fields without rewriting historical issuer or bank data',()=>{
 const old=Object.freeze({name:companyBranding.name,address:'Historical address',phone:'Historical phone',email:'',bank:'Verified historical bank text'});
 const result=headerIssuer(old);
 assert.equal(result.address,old.address);assert.equal(result.phone,old.phone);assert.equal(result.bank,old.bank);
 assert.equal(result.email,companyBranding.email);assert.equal(old.email,'');
 assert.deepEqual(headerIssuer({name:'Another issuer',address:'Other address'}),{name:'Another issuer',address:'Other address'});
});
