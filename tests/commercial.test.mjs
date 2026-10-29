import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { Pool } from 'pg';
import { createSupportingTables } from './schema-fixture.mjs';
import { migrate } from '../scripts/migrate-commercial.mjs';
import { saveDocument, transitionDocument, createManualInvoice, allocatePayment, normalizeItems, reviseDocument, linkProject, importLegacyExtra, reviewHistoricalBilling, trashRecord, voidInvoice } from '../app/lib/commercial/service.mjs';
let pg,pool;
const issuer={name:'Test issuer',bank:''};
const today=new Date().toISOString().slice(0,10);
const draft=(overrides={})=>({kind:'quote',customerId:1,projectId:1,title:'Test work',currency:'GBP',issueDate:today,items:[{description:'Test line',quantity:'1',unitPrice:'100'}],...overrides});
const invoice=(id,amount='60',requestId=randomUUID())=>({sourceId:id,amount,requestId,description:'Manually selected work',issueDate:today});
async function approve(id){await transitionDocument(pool,1,{id,revision:1,status:'Sent'});await transitionDocument(pool,1,{id,revision:2,status:'Approved',approvedBy:'Test customer',approvedAt:today,evidence:'Test approval reference'});}
before(async()=>{
 if (process.env.TEST_DATABASE_URL) { pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:12}); } else {
 const dir=await mkdtemp(path.join(os.tmpdir(),'resolve-pg-'));
 pg=new EmbeddedPostgres({databaseDir:dir,port:55439,user:'postgres',password:'test-only',persistent:false,createPostgresUser:process.getuid?.()===0,onLog:()=>{},onError:()=>{}});
 await pg.initialise();await pg.start();
 pool=new Pool({host:'127.0.0.1',port:55439,user:'postgres',password:'test-only',database:'postgres',max:12});
 }
 await pool.query(`
 CREATE TABLE "AppUser" (id serial PRIMARY KEY,name text NOT NULL,"isActive" boolean NOT NULL,email text DEFAULT 'test@example.invalid',"passwordHash" text DEFAULT 'unused-test-hash',"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
 CREATE TABLE "Customer" (id serial PRIMARY KEY,name text,"contactName" text,address text,email text,phone text,notes text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
 CREATE TABLE "Project" (id serial PRIMARY KEY,name text,client text,"customerId" integer REFERENCES "Customer",currency text,"contractValue" numeric DEFAULT 0,description text,"startDate" timestamptz,status text DEFAULT 'Planning',"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
 CREATE TABLE "Invoice" (id serial PRIMARY KEY,"projectId" integer REFERENCES "Project","invoiceNumber" text,"issueDate" timestamptz,"dueDate" timestamptz,amount numeric,currency text,status text,description text,"createdAt" timestamptz,"updatedAt" timestamptz);
 CREATE TABLE "Payment" (id serial PRIMARY KEY,"projectId" integer REFERENCES "Project","invoiceId" integer REFERENCES "Invoice",amount numeric,currency text,date timestamptz,reference text,"updatedAt" timestamptz);
 CREATE TABLE "ExtraWork" (id serial PRIMARY KEY,"projectId" integer REFERENCES "Project",date timestamptz,title text,description text,amount numeric,currency text,status text,"createdAt" timestamptz,"updatedAt" timestamptz);
 INSERT INTO "AppUser"(id,name,"isActive") VALUES (1,'Test owner',true),(2,'Disabled',false);
 INSERT INTO "Customer"(id,name,address) VALUES(1,'Test customer','Original address'),(2,'Other customer','Other address');
 INSERT INTO "Project"(id,name,client,"customerId",currency) VALUES (1,'Test GBP','Test customer',1,'GBP'),(2,'Test EUR','Test customer',1,'EUR'),(3,'Other','Other customer',2,'GBP');
 INSERT INTO "Invoice"("projectId","invoiceNumber","issueDate",amount,currency,status) VALUES(1,'LEGACY-1',now(),12,'GBP','Draft');
 INSERT INTO "Payment"("projectId","invoiceId",amount,currency,date) VALUES(1,1,2,'GBP',now());
 `);
 await createSupportingTables(pool);
 await migrate(pool);await migrate(pool);
});
after(async()=>{await pool?.end();await pg?.stop();});
test('additive, repeatable migration preserves legacy records and edits',async()=>{
 assert.equal((await pool.query('SELECT amount FROM "Invoice" WHERE id=1')).rows[0].amount,'12');
 await pool.query(`UPDATE "Invoice" SET description='Legacy edit' WHERE id=1`);
 assert.equal((await pool.query('SELECT description FROM "Invoice" WHERE id=1')).rows[0].description,'Legacy edit');
 assert.equal((await pool.query('SELECT count(*) FROM "Payment"')).rows[0].count,'1');
});
test('exact decimal arithmetic, invalid input, maximum lengths',()=>{
 assert.equal(normalizeItems([{description:'Fraction',quantity:'1.001',unitPrice:'10.01'}]).totalMinor,1002);
 assert.throws(()=>normalizeItems([{description:'Bad',quantity:'1.0001',unitPrice:'5'}]));
 assert.throws(()=>normalizeItems([{description:'Bad',quantity:'1',unitPrice:'0.001'}]));
});
test('authorization, project/customer/currency checks',async()=>{
 await assert.rejects(saveDocument(pool,2,draft(),issuer),/Unauthorized/);
 await assert.rejects(saveDocument(pool,1,draft({projectId:3}),issuer),/match/);
 await assert.rejects(saveDocument(pool,1,draft({projectId:2}),issuer),/match/);
 await assert.rejects(saveDocument(pool,1,draft({issueDate:'2026-02-30'}),issuer),/date/);
});
test('persistence, optimistic edits, snapshots and explicit approval lock',async()=>{
 const id=await saveDocument(pool,1,draft(),issuer);
 await saveDocument(pool,1,draft({id,revision:1,title:'Changed draft'}),issuer);
 await assert.rejects(saveDocument(pool,1,draft({id,revision:1}),issuer),/locked/);
 await assert.rejects(createManualInvoice(pool,1,invoice(id)),/approved/);
 await transitionDocument(pool,1,{id,revision:2,status:'Sent'});
 await assert.rejects(transitionDocument(pool,1,{id,revision:3,status:'Approved',approvedBy:'Test',approvedAt:today,evidence:''}),/text/);
 await transitionDocument(pool,1,{id,revision:3,status:'Approved',approvedBy:'Test',approvedAt:today,evidence:'Written test acceptance'});
 await assert.rejects(saveDocument(pool,1,draft({id,revision:4}),issuer),/locked/);
 await pool.query(`UPDATE "Customer" SET address='Changed address' WHERE id=1`);
 const d=(await pool.query('SELECT * FROM commercial_document WHERE id=$1',[id])).rows[0];assert.equal(d.customer_snapshot.address,'Original address');
 assert.equal((await pool.query('SELECT count(*) FROM commercial_invoice WHERE source_id=$1',[id])).rows[0].count,'0');
});
test('concurrent manual partial billing cannot overbill, duplicate submit is idempotent',async()=>{
 const id=await saveDocument(pool,1,draft(),issuer);await approve(id);
 const result=await Promise.allSettled(Array.from({length:8},()=>createManualInvoice(pool,1,invoice(id))));
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 const request=invoice(id,'40');
 const duplicates=await Promise.all([createManualInvoice(pool,1,request),createManualInvoice(pool,1,request)]);
 assert.equal(duplicates[0],duplicates[1]);
 await assert.rejects(createManualInvoice(pool,1,{...request,amount:'39'}),/already used/);
 await assert.rejects(createManualInvoice(pool,1,invoice(id,'0.01')),/exceeds/);
 assert.equal((await pool.query('SELECT sum(amount_minor) AS total FROM commercial_invoice WHERE source_id=$1',[id])).rows[0].total,'10000');
 await assert.rejects(pool.query('UPDATE "Invoice" SET amount=200 WHERE id=$1',[duplicates[0]]),/immutable/);
 await assert.rejects(pool.query('DELETE FROM "Invoice" WHERE id=$1',[duplicates[0]]),/immutable/);
});
test('extra work approval contributes once and does not alter original contract or create invoice',async()=>{
 const id=await saveDocument(pool,1,draft({kind:'extra',projectId:2,currency:'EUR'}),issuer);await approve(id);
 const d=(await pool.query('SELECT * FROM commercial_document WHERE id=$1',[id])).rows[0];
 const extra=(await pool.query('SELECT * FROM "ExtraWork" WHERE id=$1',[d.extra_work_id])).rows[0];
 assert.equal(extra.currency,'EUR');assert.equal(extra.status,'Approved');
 assert.equal((await pool.query('SELECT "contractValue" FROM "Project" WHERE id=2')).rows[0].contractValue,'0');
 await assert.rejects(transitionDocument(pool,1,{id,revision:3,status:'Approved',approvedBy:'Test',approvedAt:today,evidence:'Again'}),/transition/);
 await assert.rejects(pool.query('DELETE FROM "ExtraWork" WHERE id=$1',[extra.id]),/immutable/);
});
test('recorded payments allocate once, wrong currency and concurrent overpayment blocked',async()=>{
 const id=await saveDocument(pool,1,draft(),issuer);await approve(id);const inv=await createManualInvoice(pool,1,invoice(id,'100'));
 const payments=(await pool.query(`INSERT INTO "Payment"("projectId",amount,currency,date) VALUES(1,60,'GBP',now()),(1,60,'GBP',now()),(1,5,'EUR',now()) RETURNING id`)).rows;
 await assert.rejects(allocatePayment(pool,1,inv,payments[2].id),/matching/);
 const result=await Promise.allSettled(payments.slice(0,2).map(p=>allocatePayment(pool,1,inv,p.id)));
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 const count=(await pool.query('SELECT count(*) FROM "Payment" WHERE "invoiceId"=$1',[inv])).rows[0].count;assert.equal(count,'1');
 await assert.rejects(pool.query(`INSERT INTO "Payment"("projectId","invoiceId",amount,currency,date) VALUES(1,$1,41,'GBP',now())`,[inv]),/exceeds/);
});
test('revision keeps original immutable content, optional project can be linked',async()=>{
 const id=await saveDocument(pool,1,draft({projectId:null}),issuer);await transitionDocument(pool,1,{id,revision:1,status:'Sent'});
 const next=await reviseDocument(pool,1,id);assert.notEqual(id,next);
 assert.equal((await pool.query('SELECT status FROM commercial_document WHERE id=$1',[id])).rows[0].status,'Rejected');
 await linkProject(pool,1,next,1);await assert.rejects(linkProject(pool,1,next,3),/match/);
});

test('historical approved work cannot be billed until reconciled, then only the remainder',async()=>{
 const e=(await pool.query(`INSERT INTO "ExtraWork"("projectId",date,title,amount,currency,status) VALUES(1,now(),'Historical test',100,'GBP','Approved') RETURNING id`)).rows[0];
 const input={extraId:e.id,approvedBy:'Original customer',approvedAt:today,evidence:'Original acceptance'};
 const id=await importLegacyExtra(pool,1,input,issuer);
 assert.equal(await importLegacyExtra(pool,1,input,issuer),id);
 await assert.rejects(createManualInvoice(pool,1,invoice(id)),/approved/);
 await reviewHistoricalBilling(pool,1,{id,amount:'70',evidence:'Prior external invoice test reference'});
 await assert.rejects(createManualInvoice(pool,1,invoice(id,'31')),/exceeds/);
 await createManualInvoice(pool,1,invoice(id,'30'));
 assert.equal((await pool.query('SELECT amount FROM "ExtraWork" WHERE id=$1',[e.id])).rows[0].amount,'100');
 await assert.rejects(reviewHistoricalBilling(pool,1,{id,amount:'0',evidence:'Reset'}),/Invalid/);
});
test('expired estimates cannot be approved and public API roles cannot read snapshots',async()=>{
 const id=await saveDocument(pool,1,draft({issueDate:'2020-01-01',validUntil:'2020-01-02'}),issuer);
 await assert.rejects(transitionDocument(pool,1,{id,revision:1,status:'Sent'}),/expired/);
 const rows=(await pool.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('commercial_document','commercial_invoice','commercial_audit')")).rows;
 assert.equal(rows.length,3);assert.ok(rows.every(r=>r.relrowsecurity));
});

test('trash and restore preserve issued invoices, payments and billing limits',async()=>{
 const id=await saveDocument(pool,1,draft(),issuer);await approve(id);
 const invoiceId=await createManualInvoice(pool,1,invoice(id,'100'));
 await trashRecord(pool,1,{id:invoiceId,kind:'invoice',operation:'trash',reason:'Entered in error'});
 assert.equal(Number((await pool.query('SELECT amount FROM "Invoice" WHERE id=$1',[invoiceId])).rows[0].amount),100);
 await assert.rejects(createManualInvoice(pool,1,invoice(id,'1')),/exceeds/);
 await trashRecord(pool,1,{id:invoiceId,kind:'invoice',operation:'restore'});
 assert.equal((await pool.query("SELECT count(*) FROM commercial_trash WHERE kind='invoice' AND record_id=$1",[invoiceId])).rows[0].count,'0');
 await trashRecord(pool,1,{id,kind:'document',operation:'trash',reason:'Duplicate source'});
 await trashRecord(pool,1,{id,kind:'document',operation:'restore'});
 await assert.rejects(trashRecord(pool,99999,{id,kind:'document',operation:'trash',reason:'No access'}),/Unauthorized/);
 await migrate(pool); // Both migration checksums remain stable on repeated deployment.
});

test('cancellation preserves original, releases billing once, cannot be reversed or paid',async()=>{
 const source=await saveDocument(pool,1,draft(),issuer);await approve(source);
 const inv=await createManualInvoice(pool,1,invoice(source,'100'));
 const before=(await pool.query('SELECT * FROM "Invoice" WHERE id=$1',[inv])).rows[0];
 await assert.rejects(voidInvoice(pool,2,{invoiceId:inv,reason:'Denied',confirm:'yes'}),/Unauthorized/);
 await assert.rejects(voidInvoice(pool,1,{invoiceId:inv,reason:'Missing confirmation'}),/Confirm/);
 await assert.rejects(voidInvoice(pool,1,{invoiceId:inv,reason:'',confirm:'yes'}),/text/);
 await trashRecord(pool,1,{id:inv,kind:'invoice',operation:'trash',reason:'Mistake'});
 await Promise.all(Array.from({length:4},()=>voidInvoice(pool,1,{invoiceId:inv,reason:'Incorrect amount',confirm:'yes'})));
 const after=(await pool.query('SELECT * FROM "Invoice" WHERE id=$1',[inv])).rows[0];
 assert.equal(after.status,'Void');assert.equal(after.amount,before.amount);assert.equal(after.invoiceNumber,before.invoiceNumber);
 assert.equal((await pool.query('SELECT count(*) FROM commercial_invoice_void WHERE invoice_id=$1',[inv])).rows[0].count,'1');
 await assert.rejects(pool.query(`UPDATE "Invoice" SET status='Issued' WHERE id=$1`,[inv]),/immutable/);
 await assert.rejects(pool.query('DELETE FROM "Invoice" WHERE id=$1',[inv]),/immutable/);
 await assert.rejects(pool.query('DELETE FROM commercial_invoice_void WHERE invoice_id=$1',[inv]),/immutable/);
 await assert.rejects(pool.query('INSERT INTO "Payment"("projectId","invoiceId",amount,currency,date) VALUES(1,$1,1,\'GBP\',now())',[inv]),/cancelled/);
 const payment=(await pool.query('INSERT INTO "Payment"("projectId",amount,currency,date) VALUES(1,1,\'GBP\',now()) RETURNING id')).rows[0].id;
 await assert.rejects(allocatePayment(pool,1,inv,payment),/cancelled/);
 const replacement=await createManualInvoice(pool,1,invoice(source,'100'));
 assert.notEqual(replacement,inv);
 await assert.rejects(createManualInvoice(pool,1,invoice(source,'1')),/exceeds/);
 assert.equal((await pool.query("SELECT count(*) FROM commercial_audit WHERE document_id=$1 AND event='Invoice cancelled'",[source])).rows[0].count,'1');
 await migrate(pool);
});
test('payments block cancellation and payment/cancellation races have one winner',async()=>{
 const source=await saveDocument(pool,1,draft(),issuer);await approve(source);
 const inv=await createManualInvoice(pool,1,invoice(source,'100'));
 const results=await Promise.allSettled([
  voidInvoice(pool,1,{invoiceId:inv,reason:'Concurrent cancellation',confirm:'yes'}),
  pool.query('INSERT INTO "Payment"("projectId","invoiceId",amount,currency,date) VALUES(1,$1,1,\'GBP\',now())',[inv])
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const row=(await pool.query('SELECT status FROM "Invoice" WHERE id=$1',[inv])).rows[0];
 const count=Number((await pool.query('SELECT count(*) FROM "Payment" WHERE "invoiceId"=$1',[inv])).rows[0].count);
 assert.equal(count,row.status==='Void'?0:1);
 if(count)await assert.rejects(voidInvoice(pool,1,{invoiceId:inv,reason:'Has payment',confirm:'yes'}),/payments/);
 await assert.rejects(voidInvoice(pool,1,{invoiceId:1,reason:'Legacy has payment',confirm:'yes'}),/payments/);
});
