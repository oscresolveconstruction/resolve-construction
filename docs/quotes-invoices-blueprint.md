# Quotes → Invoices: implementation blueprint

Status: DESIGN ONLY. Nothing in this branch changes the database, live app or Railway deployment.

## Reference and acceptance criteria
Canonical design: client-provided `RESINV0013.pdf` (2 US-Letter pages, orange #ff4d00 approx, white background, pale off-white header). Replicate the **layout**:
1. Orange top bar; logo at far left; Resolve Construction Ltd and company contact in centre; right-side INVOICE/number, DATE, DUE, BALANCE DUE.
2. BILL TO beneath header.
3. Full-width orange table heading DESCRIPTION | RATE | QTY | AMOUNT; long multiline items flow over page breaks.
4. Summary at bottom of following page when necessary: TOTAL, Payment, Bank Transfer/date, BALANCE DUE.
5. Payment terms and bank details at bottom. Quotes use ESTIMATE title, quote number, validity, total, payment schedule, but **must not claim to be an invoice**.
6. Use approved branding artwork. No fake client details or invoice numbers; keep secrets and personal data out of fixtures. PDFs should be checked at letter and A4 sizes.

## Screens
- /quotes: list/search/filter by Draft, Sent, Approved, Rejected, Expired; quick create.
- /quotes/new: select existing Customer and optional Project, enter validity, currency (GBP/EUR), line items, notes and payment schedule.
- /quotes/[id]: view, revise draft, generate preview PDF, mark Sent, capture explicit acceptance (actor/date/evidence), decline, audit history.
- /quotes/[id]/invoice: create deposit/progress/final invoice from the **approved immutable quote version**. Amount may be partial; enforce cumulative amount invoiced <= approved amount.
- /invoices: unified company list grouped/filtered by project/customer; draft/sent/partially-paid/paid/overdue.
- /invoices/[id]: invoice, PDF, payments allocated, outstanding, source quote reference.

## Form fields
Quote header: customerId, projectId(optional), quoteNumber (server allocated unique), issueDate, validUntil, currency, title/site address, notes, terms; line items: description (preserve line breaks), quantity, unitPrice integer minor units, order; payment stages (name, percentage or fixed amount; validate total).
Invoice header: invoiceNumber (server allocated unique), issueDate, dueDate or On Receipt, sourceQuoteVersionId, customer snapshot, projectId, amount, currency, terms, description, status; items and payments separate. Invoice amounts must not be mutated after sent or any payment; use adjustments/credit notes after issuance.

## Data model (proposed migration, not executed)
- Quote(id, customerId, projectId?, number unique, status, currency, issueDate, validUntil, createdBy, createdAt, updatedAt)
- QuoteVersion(id, quoteId, revision, title, clientSnapshotJson, issuerSnapshotJson, termsSnapshot, currency, subtotalMinor, createdAt, approvedAt?, approvalEvidence?, immutable)
- QuoteItem(id, quoteVersionId, position, description, quantityDecimal, unitPriceMinor, lineTotalMinor)
- QuotePaymentStage(id, quoteVersionId, position, label, shareBasisPoints, amountMinor)
- InvoiceQuoteLink(id, invoiceId unique, quoteVersionId, stageId?, billedMinor)
- InvoiceLine(id, invoiceId, quoteItemId?, position, description, quantityDecimal, unitPriceMinor, amountMinor)
- InvoiceAuditEvent(id, invoiceId, actorId, operation, createdAt, metadata)
Retain existing Invoice and Payment tables: evolve through backward-compatible migrations, never recreate or discard historical data. Concurrency-safe transactions for invoice numbering and allocation to prevent duplicate invoices/overbilling.

## Rules
- Customer can receive a quote without a project; linking to a project is optional until approval.
- Only owners can modify; all actions validate user and customer/project relation server-side.
- Draft can edit; sent revision creates a **new** immutable version; approved version is frozen.
- Conversion requires Approved and exact currency; partial invoices sum <= accepted quote total; do not count quote as revenue or payment.
- GBP/EUR preserved without implicit conversion. Worker payroll remains GBP. Do not auto-add employer tax.
- No VAT/tax assumptions; company invoice tax presentation requires owner/accountant confirmation for Gibraltar.
- Deposit, progress, final stage: invoice records money owed, payments mark actual cash received; no double count.
- PDF generated server-side from stored snapshot, stable even if Customer details later change.
- Never put company bank values in public GitHub files; store approved document footer details in secure company settings.

## Rollout
1. Extract actual brand logo and measure template visually against `RESINV0013.pdf`.
2. Implement read-only invoice PDF preview from existing Invoice without changing accounting.
3. Add quotes/schema using additive migration + tests.
4. Add accept/approve + quote-to-invoice backend with transaction tests.
5. Add independent preview environment, smoke test, then review before production deploy.

## Test cases
- Draft cannot convert; accepted version does; edits after approval blocked.
- Simultaneous invoice conversion cannot overbill or reuse invoice sequence.
- Fractional quantities and currencies round safely to cents.
- Payments cannot exceed invoice/convert amount; status and outstanding reconcile.
- Existing invoices unchanged after migration.
- Long text and multiple lines paginate without overlaps; logo, amount and footer match reference PDF.
