# Financial reconciliation review

## Calculation rules checked

- Project value is the original saved contract plus approved extra works in that
  project's currency. Estimates and invoices are not added to that value again.
- Cash received is the Payment ledger. Allocating a recorded payment to an invoice
  changes its association, not cash received. General expenses remain company-only.
- Invoiced totals exclude Void invoices. An active invoice in Trash still counts.
  Cancelling an unpaid invoice releases its approved source allowance exactly once.
- Labour costs come from Labour.amount once. Closing payroll replaces provisional
  labour costs using the existing payroll distribution. Reopening restores provisional
  amounts. Reports do not add MonthlyPayroll totals to Labour costs a second time.
  Recorded salary/employer insurance formulas have not been changed; no employer
  tax is inferred or automatically added.
- Money and stored-rate conversions round each movement to pennies using decimal
  arithmetic, then sum pennies. Missing rates are not guessed or inverted. Project
  pages use the project's currency, while company reports explicitly report GBP.

## Defects corrected

Project detail previously assumed GBP for contracts, payments and all cost conversions,
while project expense/labour subpages used project currency. Company Finances lifetime
profit omitted approved extras. Project invoice remaining value omitted approved extras.
Dashboard outstanding previously allowed one project's excess receipts to offset another
project's outstanding amount. Fractional-penny expense input could be stored as zero.
Daily labour decimal multiplication could differ from PostgreSQL rounding on reopening.

New payment, expense and daily labour submissions carry a request UUID. A transaction
and request lock return the previously created IDs on retry, reject changed payloads,
and prevent concurrent duplicate writes. Submit buttons are disabled while pending.
The original approved-document invoice request UUID protection remains in place.
Migration 004 adds the request journal and protects project customer/currency identity
once financial records exist. It changes no historical amounts or relationships.

## Reconciliation evidence and limits

Pure calculation fixtures reconcile a GBP contract of 1,000, approved extras of 100,
project expenses of 100, labour of 200, overheads of 25, receipts of 300, an active
invoice of 500 and a cancelled invoice of 400. Project value is 1,100, project costs
300, company costs 325, company estimated profit 775, source/project remaining billing
600 and outstanding project receipts 800. A second fixture covers EUR conversion.

Browser coverage records actual expenses, overheads, payments and daily labour via
forms. It allocates an existing receipt, closes/reopens/recloses payroll to 300.01,
and checks project costs 400.01, profit 699.99 and unchanged receipts of 300.
Other existing tests cover source approvals, revisions, historical reconciliation,
manual partial invoices, cancellations and payment/billing races.

`GET /api/financial-audit` requires an active signed-in owner. It takes a consistent
REPEATABLE READ, READ ONLY snapshot and returns counts, project totals and findings
identified by record ID. It does not return contact details, bank data, document
snapshots or attachment contents. It checks foreign links, currencies, source line
sums, billing caps, cancellation/payment conflicts, payroll allocations, duplicate
invoice numbers and possible duplicate ledger rows. Possible duplicates and contract
versus approved-quote differences require review; nothing is deleted or silently
corrected. Matching values alone are not proof of duplicate business transactions.

Code/fixture verification is not proof that live historical records are reconciled.
The live report must be read through an authorized signed-in session before making
that claim. Production financial records are not used as disposable test data.
