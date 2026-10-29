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
