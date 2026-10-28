/** Shared, side-effect-free monetary logic for draft estimates and staged invoices.
 * All amounts are integer minor currency units to avoid floating point drift.
 * No database tables are altered by this module.
 */
export type Currency = "GBP" | "EUR";
export type QuoteItemInput = {
  description: string;
  quantity: number;
  unitPriceMinor: number;
};
export type StageInput = { label: string; percentageBasisPoints: number };
function minor(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid monetary amount");
  return value;
}
export function calculateQuoteLines(lines: QuoteItemInput[]) {
  if (!lines.length) throw new Error("At least one line item is required");
  const items = lines.map((line) => {
    if (!line.description.trim()) throw new Error("Line description required");
    if (!Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isSafeInteger(line.quantity * 1000)) {
      throw new Error("Quantity must be positive with at most 3 decimal places");
    }
    minor(line.unitPriceMinor);
    const amountMinor = Math.round(line.quantity * line.unitPriceMinor);
    minor(amountMinor);
    return { ...line, amountMinor };
  });
  const totalMinor = items.reduce((a, x) => minor(a + x.amountMinor), 0);
  return { items, totalMinor };
}
export function calculateStages(totalMinor: number, stages: StageInput[]) {
  minor(totalMinor);
  if (!stages.length || stages.some(s => !s.label.trim() ||
      !Number.isSafeInteger(s.percentageBasisPoints) ||
      s.percentageBasisPoints <= 0)) throw new Error("Invalid stages");
  if (stages.reduce((sum, s) => sum + s.percentageBasisPoints, 0) !== 10000) {
    throw new Error("Payment stages must total 100%");
  }
  let allocated = 0;
  return stages.map((stage, index) => {
    const amountMinor = index === stages.length - 1
      ? totalMinor - allocated
      : Math.round(totalMinor * stage.percentageBasisPoints / 10000);
    allocated += amountMinor;
    return { ...stage, amountMinor };
  });
}
export function remainingToInvoice(approvedQuoteMinor: number, billedMinor: number) {
  minor(approvedQuoteMinor); minor(billedMinor);
  if (billedMinor > approvedQuoteMinor) throw new Error("Invoice total exceeds quote");
  return approvedQuoteMinor - billedMinor;
}
