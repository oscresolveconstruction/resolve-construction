import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { renderDocumentPdf } from '../../app/lib/commercial/pdf.mjs';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const today=new Date().toISOString().slice(0,10);
test.afterAll(async()=>{await pool.end();});
test('anonymous access is blocked for documents and PDFs',async({page,request})=>{
 await page.goto('/quotes');await expect(page).toHaveURL(/\/login/);
 const r=await request.get('/api/documents/1/pdf',{maxRedirects:0});expect(r.status()).toBe(401);
});
test('owner completes quote, approval, manual partial invoices, payment and PDF flows',async({page,context})=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
 await page.goto('/quotes/new');await page.getByRole('combobox',{name:'Customer',exact:true}).selectOption('1');await page.getByRole('combobox',{name:'Project (optional)',exact:true}).selectOption('1');
 await page.getByLabel('Title',{exact:true}).fill('Browser acceptance test');await page.getByLabel('Description',{exact:true}).fill('Test construction line\nSecond line');await page.getByLabel('Quantity',{exact:true}).fill('2');await page.getByLabel('Unit price').fill('50');await page.getByLabel('Payment terms (manual)').fill('As manually agreed');
 await page.getByRole('button',{name:'Save draft'}).click();await expect(page).toHaveURL(/\/quotes\/\d+$/);
 const id=Number(page.url().split('/').at(-1));await page.reload();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Browser acceptance test');
 await page.getByRole('button',{name:'Mark as sent'}).click();await expect(page.locator('main h1')).toContainText('Sent');
 await page.getByLabel('Accepted by').fill('Test customer');await page.getByLabel('Acceptance date').fill(today);await page.getByLabel('Evidence / reference').fill('Browser test acceptance');await page.getByRole('button',{name:'Record customer approval'}).click();await expect(page.locator('main h1')).toContainText('Approved');
 expect((await pool.query('SELECT count(*) FROM commercial_invoice WHERE source_id=$1',[id])).rows[0].count).toBe('0');
 await page.getByLabel('Amount (GBP)').fill('60');await page.getByLabel('Description',{exact:true}).fill('Manual progress invoice');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Issue invoice manually'}).click();await expect(page).toHaveURL(/\/invoices\/\d+$/);
 await expect(page.getByText(/Balance: 60.00/)).toBeVisible();
 const invoiceId=Number(page.url().split('/').at(-1));await page.goto(`/projects/1/invoices/${invoiceId}/edit`);await expect(page).toHaveURL(`/invoices/${invoiceId}`);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download PDF'}).click();const file=await download;expect(file.suggestedFilename()).toMatch(/\.pdf$/);expect(await file.failure()).toBeNull();
 await pool.query('INSERT INTO "Payment"("projectId",amount,currency,date,reference) VALUES(1,20,\'GBP\',now(),\'Browser payment\')');await page.reload();const option=page.locator('select[name=paymentId] option').filter({hasText:'Browser payment'});await page.getByRole('combobox',{name:'Select recorded payment',exact:true}).selectOption(await option.getAttribute('value') as string);await page.getByRole('button',{name:'Allocate existing payment'}).click();await expect(page.getByText(/Balance: 40.00/)).toBeVisible();
 await page.goto(`/quotes/${id}`);await expect(page.getByRole('heading',{name:'Remaining to invoice: GBP 40.00'})).toBeVisible();await expect(page.getByRole('button',{name:'Save draft'})).toHaveCount(0);
 await page.getByLabel('Amount (GBP)').fill('40');await page.getByLabel('Description',{exact:true}).fill('Manual final invoice');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Issue invoice manually'}).click();await expect(page).toHaveURL(/\/invoices\/\d+$/);
 await page.goto(`/quotes/${id}`);await expect(page.getByRole('heading',{name:'Remaining to invoice: GBP 0.00'})).toBeVisible();await expect(page.getByRole('button',{name:'Issue invoice manually'})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await page.goto('/invoices');await expect(page.getByRole('heading',{name:'Invoices',exact:true})).toBeVisible();
});
test('extra works preserve the original contract and approve exactly once',async({page,context})=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/quotes/new?kind=extra&projectId=2');await expect(page.getByRole('combobox',{name:'Currency',exact:true})).toHaveValue('EUR');await page.getByLabel('Title',{exact:true}).fill('Browser extra');await page.getByLabel('Description',{exact:true}).fill('Additional works');await page.getByLabel('Unit price').fill('35');await page.getByRole('button',{name:'Save draft'}).click();await expect(page).toHaveURL(/\/quotes\/\d+$/);
 const id=Number(page.url().split('/').at(-1));await page.getByRole('button',{name:'Mark as sent'}).click();await page.getByLabel('Accepted by').fill('Test customer');await page.getByLabel('Acceptance date').fill(today);await page.getByLabel('Evidence / reference').fill('Extra approval');await page.getByRole('button',{name:'Record customer approval'}).click();await expect(page.locator('main h1')).toContainText('Approved');
 expect((await pool.query('SELECT "contractValue" FROM "Project" WHERE id=2')).rows[0].contractValue).toBe('0');
 expect((await pool.query('SELECT count(*) FROM commercial_invoice WHERE source_id=$1',[id])).rows[0].count).toBe('0');
 await page.goto('/projects/2/extra-works');await expect(page.locator(`a[href="/quotes/${id}"]`).filter({hasText:'Browser extra'})).toBeVisible();
});

test('mobile preview shares the actual PDF, handles cancellation and offers download fallback',async({page,context},testInfo)=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 await page.setViewportSize({width:390,height:844});
 const invoice=(await pool.query('SELECT i.id,i."invoiceNumber" FROM "Invoice" i JOIN commercial_invoice ci ON ci.invoice_id=i.id ORDER BY i.id DESC LIMIT 1')).rows[0];
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files}:{files:File[]})=>files?.[0]?.type==='application/pdf'});
  Object.defineProperty(navigator,'share',{configurable:true,value:async(data:ShareData)=>{
   const file=data.files![0];
   document.documentElement.dataset.sharedFile=JSON.stringify({name:file.name,type:file.type,size:file.size,header:(await file.text()).slice(0,5),url:data.url??null});
  }});
 });
 await page.goto(`/invoices/${invoice.id}`);
 await page.getByRole('tab',{name:'Preview',exact:true}).click();
 await expect(page.getByRole('img',{name:'PDF preview, page 1'})).toHaveAttribute('data-rendered','true',{timeout:30000});
 await expect(page.getByText('Page 1 of 1')).toBeVisible();
 await page.getByLabel('PDF zoom').selectOption('150');
 await expect(page.getByRole('img',{name:'PDF preview, page 1'})).toHaveAttribute('data-rendered','true');
 await testInfo.attach('mobile-invoice-preview',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await page.getByRole('button',{name:'Share',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.sharedFile)).toBeTruthy();
 const shared=JSON.parse(await page.evaluate(()=>document.documentElement.dataset.sharedFile!));
 expect(shared).toMatchObject({name:`${invoice.invoiceNumber}.pdf`,type:'application/pdf',header:'%PDF-',url:null});
 expect(shared.size).toBeGreaterThan(1000);
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:()=>Promise.reject(new DOMException('Cancelled','AbortError'))});});
 await page.getByRole('button',{name:'Share',exact:true}).click();
 await expect(page.getByRole('button',{name:'Share',exact:true})).toBeEnabled();
 await expect(page.getByText('Sharing could not be opened. Try again or use Download PDF.')).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{value:()=>false});});
 await page.getByRole('button',{name:'Share',exact:true}).click();
 await expect(page.getByText(/This browser cannot share PDF files/)).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download PDF'}).click();expect((await download).suggestedFilename()).toBe(`${invoice.invoiceNumber}.pdf`);
 await page.getByRole('tab',{name:'History'}).click();await expect(page.getByRole('heading',{name:'Invoice history'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('draft preview retains edits and prevents sharing an unsaved version',async({page,context})=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/quotes/new');await page.getByRole('combobox',{name:'Customer',exact:true}).selectOption('1');
 await page.getByLabel('Title',{exact:true}).fill('Preview draft');await page.getByLabel('Description',{exact:true}).fill('Preview item');await page.getByLabel('Unit price').fill('10');
 await page.getByRole('button',{name:'Save draft'}).click();await expect(page).toHaveURL(/\/quotes\/\d+$/);
 await page.getByRole('tab',{name:'Preview',exact:true}).click();
 await expect(page.getByRole('img',{name:'PDF preview, page 1'})).toHaveAttribute('data-rendered','true',{timeout:30000});
 await page.getByRole('tab',{name:'Edit',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Unsaved change');
 await page.getByRole('tab',{name:'Preview',exact:true}).click();await expect(page.getByText('Save your changes before previewing or sharing the PDF.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Share',exact:true})).toBeDisabled();
 await page.getByRole('tab',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unsaved change');
 await page.getByRole('button',{name:'Save draft'}).click();await expect(page.getByRole('button',{name:'Share',exact:true})).toBeEnabled({timeout:15000});
});


test('mobile preview renders every page of a long PDF',async({page,context})=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 const invoice=(await pool.query('SELECT id FROM "Invoice" ORDER BY id DESC LIMIT 1')).rows[0];
 const pdf=await renderDocumentPdf({type:'INVOICE',number:'TEST-MULTIPAGE',date:'2026-10-29',status:'Test fixture',currency:'GBP',issuer:{name:'Test issuer'},customer:{name:'Test customer'},items:Array.from({length:36},(_,i)=>({description:`Test line ${i+1}: construction work.\nSecond line with accented characters: reparación.`,quantity:'1.5',unitPriceMinor:10000,amountMinor:15000})),totalMinor:540000});
 await page.route(`**/api/documents/${invoice.id}/pdf?kind=invoice`,route=>route.fulfill({status:200,contentType:'application/pdf',body:pdf}));
 await page.setViewportSize({width:390,height:844});await page.goto(`/invoices/${invoice.id}`);await page.getByRole('tab',{name:'Preview',exact:true}).click();
 await expect(page.getByText('Page 1 of 3')).toBeVisible({timeout:30000});
 for(let n=1;n<=3;n++){
  await expect(page.getByRole('img',{name:`PDF preview, page ${n}`})).toHaveAttribute('data-rendered','true');
  if(n<3)await page.getByRole('button',{name:'Next PDF page'}).click();
 }
 await expect(page.getByRole('button',{name:'Next PDF page'})).toBeDisabled();
 await page.getByRole('button',{name:'Previous PDF page'}).click();await expect(page.getByRole('img',{name:'PDF preview, page 2'})).toHaveAttribute('data-rendered','true');
});


test('owner can delete and restore a mistaken estimate',async({page,context})=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/quotes/new');await page.getByRole('combobox',{name:'Customer',exact:true}).selectOption('1');
 await page.getByLabel('Title',{exact:true}).fill('Trash acceptance');await page.getByLabel('Description',{exact:true}).fill('Mistaken draft');await page.getByLabel('Unit price').fill('10');
 await page.getByRole('button',{name:'Save draft'}).click();await expect(page).toHaveURL(/\/quotes\/\d+$/);const url=page.url();const id=url.split('/').at(-1);
 await page.getByRole('button',{name:'Delete document',exact:true}).click();await page.getByLabel('Reason',{exact:true}).fill('Mistake');await page.getByLabel('I confirm moving this document to Trash.').check();await page.getByRole('button',{name:'Confirm deletion'}).click();await expect(page).toHaveURL('/quotes');
 await expect(page.locator(`a[href="/quotes/${id}"]`)).toHaveCount(0);
 await page.getByRole('link',{name:'Trash / restore deleted documents'}).click();await page.locator(`a[href="/quotes/${id}"]`).click();await expect(page.getByRole('heading',{name:'Document in Trash'})).toBeVisible();
 const pdf=await page.request.get(`/api/documents/${id}/pdf`);expect(pdf.status()).toBe(410);
 await page.getByRole('button',{name:'Restore document'}).click();await expect(page).toHaveURL('/quotes');await page.goto(url);await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Trash acceptance');
});

test('cancel mistaken invoice, retain PDF and manually issue replacement',async({page,context})=>{
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/quotes/new');await page.getByRole('combobox',{name:'Customer',exact:true}).selectOption('1');await page.getByRole('combobox',{name:'Project (optional)',exact:true}).selectOption('1');
 await page.getByLabel('Title',{exact:true}).fill('Cancellation acceptance');await page.getByLabel('Description',{exact:true}).fill('Test work');await page.getByLabel('Unit price').fill('100');await page.getByRole('button',{name:'Save draft'}).click();await expect(page).toHaveURL(/\/quotes\/\d+$/);const sourceUrl=page.url();
 await page.getByRole('button',{name:'Mark as sent'}).click();await page.getByLabel('Accepted by').fill('Test customer');await page.getByLabel('Acceptance date').fill(today);await page.getByLabel('Evidence / reference').fill('Test approval');await page.getByRole('button',{name:'Record customer approval'}).click();
 await page.getByLabel('Amount (GBP)').fill('70');await page.getByLabel('Description',{exact:true}).fill('Incorrect invoice');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Issue invoice manually'}).click();await expect(page).toHaveURL(/\/invoices\/\d+$/);const invoiceUrl=page.url();const invoiceId=invoiceUrl.split('/').at(-1);
 await page.getByRole('button',{name:'Cancel invoice',exact:true}).click();await page.getByLabel('Cancellation reason').fill('Incorrect amount');await page.getByLabel('I confirm cancellation of this invoice.').check();await page.getByRole('button',{name:'Confirm cancellation'}).click();
 await expect(page.getByRole('heading',{name:/Cancelled/})).toBeVisible();await expect(page.getByText('Incorrect amount',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Record payment',exact:true})).toHaveCount(0);
 const response=await page.request.get(`/api/documents/${invoiceId}/pdf?kind=invoice`);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toBe('application/pdf');
 await page.goto(sourceUrl);await expect(page.getByRole('heading',{name:'Remaining to invoice: GBP 100.00'})).toBeVisible();
 await page.getByLabel('Amount (GBP)').fill('100');await page.getByLabel('Description',{exact:true}).fill('Correct replacement');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Issue invoice manually'}).click();await expect(page).toHaveURL(/\/invoices\/\d+$/);expect(page.url()).not.toBe(invoiceUrl);
 const replacementId=Number(page.url().split('/').at(-1));await pool.query('INSERT INTO "Payment"("projectId","invoiceId",amount,currency,date) VALUES(1,$1,1,\'GBP\',now())',[replacementId]);await page.reload();await expect(page.getByRole('button',{name:'Cancel invoice',exact:true})).toBeDisabled();
 await page.goto('/invoices');await expect(page.locator('tr').filter({has:page.locator(`a[href="/invoices/${invoiceId}"]`)})).toContainText('Cancelled');
});

test('financial reconciliation across project, costs, receipts, invoices and payroll without double counting',async({page,context},testInfo)=>{
 test.setTimeout(90000);
 const token=await new SignJWT({userId:1}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'resolve_session',value:token,domain:'127.0.0.1',path:'/'}]);
 const projectId=testInfo.project.name==='chromium'?10001:10002;
 const workerId=projectId;
 const card=(label:string)=>page.getByText(label,{exact:true}).locator('..');
 const numeric=(s:string)=>Number(s.replace(/[^\d.-]/g,''));
 await page.goto('/company-finances');
 const before=numeric(await card('Total Project Value (contracts + approved extras)').locator('p').nth(1).innerText());
 await pool.query('INSERT INTO "Project"(id,name,client,"customerId",currency,"contractValue",status) VALUES($1,$2,\'Test customer\',1,\'GBP\',1000,\'Active\')',[projectId,`Audit project ${projectId}`]);
 await pool.query('INSERT INTO "Worker"(id,name,"hourlyRate",currency,status,"createdAt","updatedAt") VALUES($1,$2,25,\'GBP\',\'Active\',now(),now())',[workerId,`Audit worker ${workerId}`]);
 await pool.query('INSERT INTO "ExtraWork"("projectId",date,title,amount,currency,status) VALUES($1,now(),\'Audit approved extra\',100,\'GBP\',\'Approved\'),($1,now(),\'Pending extra\',50,\'GBP\',\'Pending\')',[projectId]);
 const active=(await pool.query('INSERT INTO "Invoice"("projectId","invoiceNumber","issueDate",amount,currency,status,description) VALUES($1,$2,now(),500,\'GBP\',\'Issued\',\'Audit invoice\') RETURNING id',[projectId,`AUDIT-${projectId}`])).rows[0].id;
 // Exercise real forms and the new idempotent write path.
 await page.goto(`/projects/${projectId}/expenses/new`);await page.locator('input[name=date]').fill(today);await page.locator('input[name=supplier]').fill('Audit supplier');await page.locator('select[name=category]').selectOption('Materials');await page.locator('input[name=amount]').fill('100');await page.getByRole('button',{name:'Save Expense & Receipt'}).click();await expect(page).toHaveURL(`/projects/${projectId}/expenses`);
 await page.goto('/general-expenses/new');await page.locator('input[name=supplier]').fill(`Audit overhead ${projectId}`);await page.locator('select[name=category]').selectOption('Office Rent');await page.locator('input[name=amount]').fill('25');await page.getByRole('button',{name:'Save General Expense'}).click();await expect(page).toHaveURL('/general-expenses');
 await page.goto(`/projects/${projectId}/payments/new`);await page.locator('input[name=amount]').fill('300');await page.locator('input[name=reference]').fill(`Audit receipt ${projectId}`);await page.getByRole('button',{name:'Save Payment'}).click();await expect(page).toHaveURL(`/projects/${projectId}/payments`);
 await expect(card('Payments Received')).toContainText('£300.00');await expect(card('Total Project Value')).toContainText('£1,100.00');
 await page.goto(`/invoices/${active}`);const payment=(await pool.query('SELECT id FROM "Payment" WHERE "projectId"=$1 AND reference=$2',[projectId,`Audit receipt ${projectId}`])).rows[0];await page.locator('select[name=paymentId]').selectOption(String(payment.id));await page.getByRole('button',{name:'Allocate existing payment'}).click();
 await page.goto('/labour');await page.locator('input[name=date]').fill(today);const selects=page.locator('select:visible');await selects.nth(0).selectOption(String(workerId));await selects.nth(1).selectOption(String(projectId));await page.locator('input[type=number]:visible').first().fill('8');await page.getByRole('button',{name:'Save Day'}).click();await expect.poll(async()=>Number((await pool.query('SELECT sum(amount) AS n FROM "Labour" WHERE "workerId"=$1',[workerId])).rows[0].n)).toBe(200);
 await page.goto('/monthly-payroll/new');await page.locator('select[name=workerId]').selectOption(String(workerId));await page.locator('input[name=month]').fill(today.slice(0,7));await page.locator('input[name=grossPay]').fill('300.01');await page.locator('input[name=employerSocialInsurance]').fill('0');await page.getByRole('button',{name:'Save Payroll'}).click();await expect(page).toHaveURL('/monthly-payroll');
 const payrollRow=page.locator('tr').filter({hasText:`Audit worker ${workerId}`});await payrollRow.getByRole('checkbox').check();await payrollRow.getByRole('button',{name:'Close Payroll'}).click();await expect(payrollRow.getByRole('button',{name:'Reopen Payroll'})).toBeVisible();
 const cost=async()=>Number((await pool.query('SELECT sum(amount) AS n FROM "Labour" WHERE "workerId"=$1',[workerId])).rows[0].n);
 expect(await cost()).toBe(300.01);
 await payrollRow.getByRole('checkbox').check();await payrollRow.getByRole('button',{name:'Reopen Payroll'}).click();await expect(payrollRow.getByRole('button',{name:'Close Payroll'})).toBeVisible();expect(await cost()).toBe(200);
 await payrollRow.getByRole('checkbox').check();await payrollRow.getByRole('button',{name:'Close Payroll'}).click();await expect(payrollRow.getByRole('button',{name:'Reopen Payroll'})).toBeVisible();expect(await cost()).toBe(300.01);
 await page.goto(`/projects/${projectId}`);await expect(card('Total Project Value')).toContainText('£1,100.00');await expect(card('Total Costs')).toContainText('£400.01');await expect(card('Payments Received')).toContainText('£300.00');await expect(card('Estimated Profit')).toContainText('£699.99');await expect(card('Outstanding')).toContainText('£800.00');
 await page.goto(`/projects/${projectId}/invoices`);await expect(card('Remaining to Invoice')).toContainText('600.00');
 await page.goto('/company-finances');expect(numeric(await card('Total Project Value (contracts + approved extras)').locator('p').nth(1).innerText())-before).toBe(1100);
 const report=await (await page.request.get('/api/financial-audit')).json();
 const summary=report.projects.find((p:{projectId:number})=>p.projectId===projectId);expect(summary).toMatchObject({cost:400.01,totalValue:1100,received:300,invoiced:500,outstanding:800,profit:699.99});
 expect(report.findings.filter((f:{kind:string;code:string;ids:number[]})=>f.kind==='payroll'&&f.code==='closed_payroll_allocation_mismatch'&&f.ids.includes(projectId))).toHaveLength(0);
});
