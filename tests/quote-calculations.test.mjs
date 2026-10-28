import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuoteLines, calculateStages, remainingToInvoice } from "../app/lib/quote-calculations.ts";

test("sums line items in minor units", () => {
  const q = calculateQuoteLines([{ description:"Kitchen",quantity:2,unitPriceMinor:125050 },{description:"Labour",quantity:1,unitPriceMinor:9999}]);
  assert.equal(q.totalMinor,260099);
});
test("50 / 25 / 25 staged payments allocate exact total",()=>{
  const result=calculateStages(2000001,[{label:"Deposit",percentageBasisPoints:5000},{label:"Evaluation",percentageBasisPoints:2500},{label:"Completion",percentageBasisPoints:2500}]);
  assert.equal(result.reduce((a,b)=>a+b.amountMinor,0),2000001);
});
test("invalid stage split rejected",()=>assert.throws(()=>calculateStages(10000,[{label:"Deposit",percentageBasisPoints:6000}])));
test("cannot invoice more than approved",()=>assert.throws(()=>remainingToInvoice(10000,10001)));
test("remaining amount returns expected pennies",()=>assert.equal(remainingToInvoice(10000,3300),6700));
test("invalid line item rejected",()=>assert.throws(()=>calculateQuoteLines([{description:"",quantity:1,unitPriceMinor:100}])));
