import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pennies,moneyProduct,sumMoney,convertedMoney,companyCostGBP,projectFinancials} from '../app/lib/finance/calculations.mjs';
import {inspectLedger} from '../app/lib/finance/audit.mjs';
test('money rounds half pennies once and sums exactly without floating-point drift',()=>{
 assert.equal(pennies('2.675'),268);assert.equal(moneyProduct('0.1','26.75'),2.68);
 assert.equal(sumMoney(Array(1000).fill('0.01')),10);assert.equal(sumMoney(['0.1','0.2']),0.3);
 assert.equal(convertedMoney('0.05','EUR','GBP','0.9'),0.05);
 assert.equal(convertedMoney(100,'EUR','EUR',null),100);
 assert.equal(convertedMoney(100,'EUR','GBP',null),null);
 assert.equal(companyCostGBP({amount:100,currency:'EUR',exchangeRate:1.2},'EUR'),null);
 assert.equal(companyCostGBP({amount:100,currency:'GBP',exchangeRate:1.2},'EUR'),100);
 assert.throws(()=>pennies('NaN'),/Invalid/);
});
function fixture(){return {
 customers:[{id:1}],workers:[{id:1}],projects:[{id:1,customerId:1,currency:'GBP',contractValue:'1000'}],
 expenses:[{id:1,projectId:1,amount:'100',currency:'GBP',date:'2026-10-01',supplier:'Materials'},{id:2,projectId:null,amount:'25',currency:'GBP',date:'2026-10-01',supplier:'Overhead'}],
 labour:[{id:1,projectId:1,workerId:1,hours:'8',hourlyRate:'25',amount:'200',currency:'GBP',date:'2026-10-01'}],
 payments:[{id:1,projectId:1,invoiceId:1,amount:'300',currency:'GBP',date:'2026-10-01',reference:'Test receipt'}],
 invoices:[{id:1,projectId:1,amount:'500',currency:'GBP',status:'Issued',invoiceNumber:'TEST-1'},{id:2,projectId:1,amount:'400',currency:'GBP',status:'Void',invoiceNumber:'TEST-2'}],
 extras:[{id:1,projectId:1,amount:'100',currency:'GBP',status:'Approved'},{id:2,projectId:1,amount:'50',currency:'GBP',status:'Pending'}],
 voids:[{invoice_id:2}],sources:[],links:[],payrolls:[{id:1,workerId:1,month:'2026-10',grossPay:'200',employerSocialInsurance:'0',status:'Closed'}]
};}
test('one ledger: contracts plus approved extras, costs once, receipts once, cancelled invoice excluded',()=>{
 const f=fixture(),p=f.projects[0];const s=projectFinancials(p,f);
 assert.equal(s.totalValue,1100);assert.equal(s.invoiced,500);assert.equal(s.remainingToInvoice,600);
 assert.equal(s.cost,300);assert.equal(s.profit,800);assert.equal(s.received,300);assert.equal(s.outstanding,800);
 // Overhead is a company expense, not allocated a second time to this project.
 const companyCosts=sumMoney([...f.expenses,...f.labour].map(e=>e.amount));assert.equal(companyCosts,325);
 assert.equal(s.totalValue-companyCosts,775);
 // Monthly payroll is already reflected in Labour.amount; never add it again.
 assert.equal(inspectLedger(f).errors,0);assert.equal(inspectLedger(f).warnings,0);
});
test('EUR project uses its own currency; GBP reporting never guesses missing conversion',()=>{
 const f=fixture();f.projects[0].currency='EUR';for(const row of [...f.payments,...f.extras,...f.invoices])row.currency='EUR';
 f.expenses[0].currency='GBP';f.expenses[0].exchangeRate='1.2';f.labour[0].exchangeRate='1.2';
 const s=projectFinancials(f.projects[0],f);assert.equal(s.cost,360);assert.equal(s.received,300);assert.equal(s.profit,740);
 f.expenses[0].exchangeRate=null;assert.equal(projectFinancials(f.projects[0],f).missingRates,1);
});
test('reconciliation flags suspicious duplicates, orphan links and allocation errors without removing rows',()=>{
 const f=fixture();f.payments.push({...f.payments[0],id:2});f.labour.push({...f.labour[0],id:2});
 f.payments.push({id:3,projectId:1,invoiceId:2,amount:'1',currency:'GBP',date:'2026-10-02'});
 f.sources=[{id:1,kind:'quote',customer_id:1,project_id:1,currency:'GBP',status:'Approved',items:[{quantity:'1',unitPriceMinor:100,amountMinor:100}],total_minor:'99',previous_billed_minor:0}];
 f.links=[{invoice_id:999,source_id:1,amount_minor:100}];
 const before=JSON.stringify(f),report=inspectLedger(f);assert.equal(JSON.stringify(f),before);
 for(const code of ['possible_duplicate','invoice_overpaid','closed_payroll_allocation_mismatch','payment_on_cancelled_invoice','missing_billing_link','source_line_sum_mismatch'])assert.ok(report.findings.some(i=>i.code===code),code);
});
