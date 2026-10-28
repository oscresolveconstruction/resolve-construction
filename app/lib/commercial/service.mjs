// All writes use one transaction and recheck the active owner within it.
// AppUser accounts in this app represent owners (there is no separate role column).
export function positiveId(value) {
 const id = Number(value);
 if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid identifier');
 return id;
}
export function moneyMinor(value) {
 const text = String(value);
 if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) throw new Error('Enter a positive amount with at most two decimal places');
 const [whole, fraction=''] = text.split('.');
 const minor = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
 if (minor <= 0) throw new Error('Amount must be positive');
 return minor;
}
export function validDate(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid date');
 const d = new Date(value+'T00:00:00Z');
 if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==value) throw new Error('Invalid date');
 return value;
}
function text(value, max, required=false) {
 if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Missing or invalid text');
 return value.trim();
}
export function normalizeItems(items) {
 if (!Array.isArray(items) || items.length < 1 || items.length > 200) throw new Error('Enter 1–200 line items');
 let totalMinor = 0;
 const lines = items.map(line=> {
  const description = text(line.description,5000,true);
  const quantity = String(line.quantity);
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(quantity) || Number(quantity)<=0) throw new Error('Invalid quantity (maximum 3 decimals)');
  const unitPriceMinor = moneyMinor(line.unitPrice);
  const [whole, fraction=''] = quantity.split('.');
  const thousandths = BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'));
  const amountMinor = Number((thousandths*BigInt(unitPriceMinor)+500n)/1000n);
  totalMinor += amountMinor;
  if (amountMinor<=0 || !Number.isSafeInteger(totalMinor) || totalMinor>99999999900) throw new Error('Line total out of range');
  return {description, quantity, unitPriceMinor, amountMinor};
 });
 return {items:lines,totalMinor};
}
async function transaction(pool, actorId, fn) {
 const c = await pool.connect();
 try {
  await c.query('BEGIN');
  const user=await c.query('SELECT id FROM "AppUser" WHERE id=$1 AND "isActive"=true FOR SHARE',[positiveId(actorId)]);
  if (!user.rowCount) throw new Error('Unauthorized');
  const result=await fn(c);
  await c.query('COMMIT'); return result;
 } catch(e) { await c.query('ROLLBACK'); throw e; }
 finally {c.release();}
}
async function audit(c,id,actor,event,metadata={}) {
 await c.query('INSERT INTO commercial_audit(document_id,actor_id,event,metadata) VALUES ($1,$2,$3,$4)',[id,actor,event,JSON.stringify(metadata)]);
}
async function number(c,kind,date) {
 const sequence = {quote:'commercial_quote_number',extra:'commercial_extra_number',invoice:'commercial_invoice_number'}[kind];
 const prefix = {quote:'EST',extra:'EW',invoice:'RESINV'}[kind];
 for (;;) {
  const {rows}=await c.query(`SELECT nextval('${sequence}') AS n`);
  const candidate=`${prefix}-${date.slice(0,4)}-${String(rows[0].n).padStart(5,'0')}`;
  const found=kind==='invoice'
   ? await c.query('SELECT id FROM "Invoice" WHERE "invoiceNumber"=$1',[candidate])
   : await c.query('SELECT id FROM commercial_document WHERE number=$1',[candidate]);
  if (!found.rowCount) return candidate;
 }
}
export async function saveDocument(pool,actor,input,issuer) {
 const kind=input.kind;
 if (!['quote','extra'].includes(kind)) throw new Error('Invalid document type');
 const customerId=positiveId(input.customerId);
 const projectId=input.projectId ? positiveId(input.projectId) : null;
 if (kind==='extra'&&!projectId) throw new Error('Additional work requires a project');
 const title=text(input.title,200,true), terms=text(input.terms??'',5000), notes=text(input.notes??'',5000);
 const issueDate=validDate(input.issueDate), validUntil=input.validUntil ? validDate(input.validUntil):null;
 if (validUntil && validUntil<issueDate) throw new Error('Validity cannot precede issue date');
 if (!['GBP','EUR'].includes(input.currency)) throw new Error('Invalid currency');
 const lines=normalizeItems(input.items);
 return transaction(pool,actor,async c=> {
  const customer=(await c.query('SELECT id,name,address,email,phone,"contactName" FROM "Customer" WHERE id=$1',[customerId])).rows[0];
  if (!customer) throw new Error('Customer not found');
  if (projectId) {
   const project=(await c.query('SELECT * FROM "Project" WHERE id=$1 FOR SHARE',[projectId])).rows[0];
   if (!project || project.customerId!==customerId || project.currency!==input.currency) throw new Error('Project customer and currency must match');
  }
  const values=[kind,customerId,projectId,title,input.currency,issueDate,validUntil,JSON.stringify(lines.items),lines.totalMinor,JSON.stringify(customer),JSON.stringify(issuer),terms,notes];
  if (input.id) {
   const id=positiveId(input.id);
   const old=(await c.query('SELECT * FROM commercial_document WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if (!old || old.status!=='Draft' || old.kind!==kind || old.revision!==Number(input.revision)) throw new Error('Document changed or is locked. Reload before editing.');
   await c.query(`UPDATE commercial_document SET kind=$1,customer_id=$2,project_id=$3,title=$4,currency=$5,issue_date=$6,valid_until=$7,items=$8,total_minor=$9,customer_snapshot=$10,issuer_snapshot=$11,terms=$12,notes=$13,revision=revision+1 WHERE id=$14`,[...values,id]);
   await audit(c,id,actor,'Draft updated',{revision:old.revision+1}); return id;
  }
  const allocated=await number(c,kind,issueDate);
  const d=(await c.query(`INSERT INTO commercial_document(kind,customer_id,project_id,title,currency,issue_date,valid_until,items,total_minor,customer_snapshot,issuer_snapshot,terms,notes,number,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,[...values,allocated,actor])).rows[0];
  await audit(c,d.id,actor,'Draft created'); return d.id;
 });
}
export async function transitionDocument(pool,actor,input) {
 const id=positiveId(input.id);
 if (!['Sent','Approved','Rejected','Expired'].includes(input.status)) throw new Error('Invalid transition');
 return transaction(pool,actor,async c=> {
  const d=(await c.query('SELECT *,valid_until::text AS validity FROM commercial_document WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if (!d || d.revision!==Number(input.revision)) throw new Error('Document changed. Reload.');
  const allowed={Draft:['Sent'],Sent:['Approved','Rejected','Expired']};
  if (!allowed[d.status]?.includes(input.status)) throw new Error('Invalid status transition');
  const today=(await c.query('SELECT CURRENT_DATE::text AS day')).rows[0].day;
  if (input.status==='Sent' && d.validity && d.validity<today) throw new Error('Validity has expired');
  if (input.status==='Approved') {
   if (d.validity && d.validity<today) throw new Error('Cannot approve an expired estimate');
   const approvedBy=text(input.approvedBy,200,true), evidence=text(input.evidence,5000,true);
   const approvedAt=validDate(input.approvedAt);
   if (approvedAt>today || approvedAt<d.issue_date.toISOString().slice(0,10)) throw new Error('Invalid acceptance date');
   if (d.kind==='extra') {
    const ew=d.extra_work_id ? (await c.query(`UPDATE "ExtraWork" SET "projectId"=$1,date=$2,title=$3,description=$4,amount=$5,currency=$6,status='Approved',"updatedAt"=now() WHERE id=$7 RETURNING id`,[d.project_id,approvedAt,d.title,d.notes,(Number(d.total_minor)/100).toFixed(2),d.currency,d.extra_work_id])).rows[0] : (await c.query(`INSERT INTO "ExtraWork" ("projectId",date,title,description,amount,currency,status,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,'Approved',now(),now()) RETURNING id`,[d.project_id,approvedAt,d.title,d.notes,(Number(d.total_minor)/100).toFixed(2),d.currency])).rows[0];
    await c.query('UPDATE commercial_document SET extra_work_id=$1 WHERE id=$2',[ew.id,id]);
   }
   await c.query("UPDATE commercial_document SET status='Approved',approved_by=$1,approved_at=$2,approval_evidence=$3,revision=revision+1 WHERE id=$4",[approvedBy,approvedAt,evidence,id]);
  } else {
   if (input.status==='Expired' && (!d.validity || d.validity>=today)) throw new Error('Document has not expired');
   await c.query('UPDATE commercial_document SET status=$1,revision=revision+1 WHERE id=$2',[input.status,id]);
  }
  await audit(c,id,actor,input.status); return id;
 });
}
export async function linkProject(pool,actor,id,projectId) {
 return transaction(pool,actor,async c=> {
  const d=(await c.query('SELECT * FROM commercial_document WHERE id=$1 FOR UPDATE',[positiveId(id)])).rows[0];
  const p=(await c.query('SELECT * FROM "Project" WHERE id=$1 FOR SHARE',[positiveId(projectId)])).rows[0];
  if (!d || d.project_id || !p || p.customerId!==d.customer_id || p.currency!==d.currency) throw new Error('Project must match customer/currency and document must be unlinked');
  await c.query('UPDATE commercial_document SET project_id=$1 WHERE id=$2',[p.id,d.id]);
  await audit(c,d.id,actor,'Project linked',{projectId:p.id});
 });
}
export async function createManualInvoice(pool,actor,input) {
 const id=positiveId(input.sourceId), amount=moneyMinor(input.amount);
 const issueDate=validDate(input.issueDate), dueDate=input.dueDate ? validDate(input.dueDate):null;
 if (dueDate && dueDate<issueDate) throw new Error('Due date precedes issue date');
 const description=text(input.description,5000,true);
 if (!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(input.requestId)) throw new Error('Invalid request identifier');
 return transaction(pool,actor,async c=> {
  const d=(await c.query('SELECT * FROM commercial_document WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if (!d || d.status!=='Approved' || !d.project_id || !d.historical_reviewed) throw new Error('An approved document linked to a project is required');
  const duplicate=(await c.query('SELECT ci.*,i."issueDate",i."dueDate" FROM commercial_invoice ci JOIN "Invoice" i ON i.id=ci.invoice_id WHERE request_id=$1',[input.requestId])).rows[0];
  if (duplicate) {
   if (duplicate.source_id!==id || Number(duplicate.amount_minor)!==amount || duplicate.description!==description || duplicate.issueDate.toISOString().slice(0,10)!==issueDate || (duplicate.dueDate?.toISOString().slice(0,10)??null)!==dueDate) throw new Error('Request identifier already used for another invoice');
   return duplicate.invoice_id;
  }
  const billed=Number((await c.query('SELECT COALESCE(sum(amount_minor),0) AS amount FROM commercial_invoice WHERE source_id=$1',[id])).rows[0].amount);
  if (amount>Number(d.total_minor)-Number(d.previous_billed_minor)-billed) throw new Error('Invoice exceeds the remaining approved amount');
  const allocated=await number(c,'invoice',issueDate);
  const invoice=(await c.query(`INSERT INTO "Invoice" ("projectId","invoiceNumber","issueDate","dueDate",amount,currency,status,description,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,'Issued',$7,now(),now()) RETURNING id`,[d.project_id,allocated,issueDate,dueDate,(amount/100).toFixed(2),d.currency,description])).rows[0];
  await c.query('INSERT INTO commercial_invoice(invoice_id,source_id,amount_minor,request_id,description,customer_snapshot,issuer_snapshot,terms,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[invoice.id,id,amount,input.requestId,description,JSON.stringify(d.customer_snapshot),JSON.stringify(d.issuer_snapshot),d.terms,actor]);
  await audit(c,id,actor,'Invoice manually issued',{invoiceId:invoice.id,amountMinor:amount}); return invoice.id;
 });
}
export async function allocatePayment(pool,actor,invoiceId,paymentId) {
 return transaction(pool,actor,async c=> {
  const invoice=(await c.query('SELECT * FROM "Invoice" WHERE id=$1 FOR UPDATE',[positiveId(invoiceId)])).rows[0];
  const payment=(await c.query('SELECT * FROM "Payment" WHERE id=$1 FOR UPDATE',[positiveId(paymentId)])).rows[0];
  if (!invoice || !payment || payment.invoiceId || payment.projectId!==invoice.projectId || payment.currency!==invoice.currency) throw new Error('Select an unallocated payment with matching project and currency');
  const paid=Number((await c.query('SELECT COALESCE(sum(amount),0) AS amount FROM "Payment" WHERE "invoiceId"=$1',[invoice.id])).rows[0].amount);
  if (Math.round((paid+Number(payment.amount))*100)>Math.round(Number(invoice.amount)*100)) throw new Error('Payment exceeds remaining invoice balance');
  await c.query('UPDATE "Payment" SET "invoiceId"=$1,"updatedAt"=now() WHERE id=$2',[invoice.id,payment.id]);
  const link=(await c.query('SELECT source_id FROM commercial_invoice WHERE invoice_id=$1',[invoice.id])).rows[0];
  if (link) await audit(c,link.source_id,actor,'Payment allocated',{invoiceId:invoice.id,paymentId:payment.id});
 });
}
export async function reviseDocument(pool,actor,id) {
 return transaction(pool,actor,async c=> {
  const d=(await c.query('SELECT * FROM commercial_document WHERE id=$1 FOR UPDATE',[positiveId(id)])).rows[0];
  if (!d || !['Sent','Rejected','Expired'].includes(d.status)) throw new Error('Only unapproved sent, rejected or expired documents can be revised');
  if (d.status==='Sent') await c.query("UPDATE commercial_document SET status='Rejected',revision=revision+1 WHERE id=$1",[d.id]);
  const allocated=await number(c,d.kind,new Date().toISOString().slice(0,10));
  const next=(await c.query(`INSERT INTO commercial_document(kind,number,customer_id,project_id,title,currency,issue_date,items,total_minor,customer_snapshot,issuer_snapshot,terms,notes,created_by,previous_id) SELECT kind,$1,customer_id,project_id,title,currency,CURRENT_DATE,items,total_minor,customer_snapshot,issuer_snapshot,terms,notes,$2,id FROM commercial_document WHERE id=$3 RETURNING id`,[allocated,actor,d.id])).rows[0];
  await audit(c,d.id,actor,'New draft revision',{newId:next.id});
  await audit(c,next.id,actor,'Draft created from previous document',{previousId:d.id}); return next.id;
 });
}
export async function importLegacyExtra(pool,actor,input,issuer) {
 return transaction(pool,actor,async c=> {
  const e=(await c.query('SELECT * FROM "ExtraWork" WHERE id=$1 FOR UPDATE',[positiveId(input.extraId)])).rows[0];
  if (!e) throw new Error('Extra work not found');
  const existing=(await c.query('SELECT id FROM commercial_document WHERE extra_work_id=$1',[e.id])).rows[0];if(existing)return existing.id;
  const p=(await c.query('SELECT * FROM "Project" WHERE id=$1 FOR SHARE',[e.projectId])).rows[0];
  const customer=(await c.query('SELECT id,name,address,email,phone,"contactName" FROM "Customer" WHERE id=$1',[p.customerId])).rows[0];
  if(!customer)throw new Error('Link this project to a customer before importing');
  const approved=e.status==='Approved';
  const approvedBy=approved?text(input.approvedBy,200,true):null;
  const evidence=approved?text(input.evidence,5000,true):null;
  const approvedAt=approved?validDate(input.approvedAt):null;
  if(approvedAt&&approvedAt>new Date().toISOString().slice(0,10))throw new Error('Acceptance date cannot be in the future');
  const date=e.date.toISOString().slice(0,10), amount=moneyMinor(e.amount);
  const allocated=await number(c,'extra',date);
  const items=[{description:e.description||e.title,quantity:'1',unitPriceMinor:amount,amountMinor:amount}];
  const d=(await c.query(`INSERT INTO commercial_document(kind,number,customer_id,project_id,extra_work_id,status,title,currency,issue_date,items,total_minor,customer_snapshot,issuer_snapshot,created_by,approved_by,approved_at,approval_evidence,historical_reviewed) VALUES ('extra',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,false) RETURNING id`,[allocated,customer.id,p.id,e.id,approved?'Approved':'Draft',e.title,e.currency,date,JSON.stringify(items),amount,JSON.stringify(customer),JSON.stringify(issuer),actor,approvedBy,approvedAt,evidence])).rows[0];
  await audit(c,d.id,actor,'Historical extra work linked',{extraId:e.id});return d.id;
 });
}
export async function reviewHistoricalBilling(pool,actor,input) {
 const amount=String(input.amount)==='0'||String(input.amount)==='0.00'?0:moneyMinor(input.amount);
 const evidence=text(input.evidence,5000,true);
 return transaction(pool,actor,async c=>{
  const d=(await c.query('SELECT * FROM commercial_document WHERE id=$1 FOR UPDATE',[positiveId(input.id)])).rows[0];
  if(!d||d.historical_reviewed||!d.extra_work_id||amount>Number(d.total_minor))throw new Error('Invalid historical reconciliation');
  await c.query('UPDATE commercial_document SET historical_reviewed=true,previous_billed_minor=$1 WHERE id=$2',[amount,d.id]);
  await audit(c,d.id,actor,'Historical billing reconciled',{amountMinor:amount,evidence});return d.id;
 });
}
