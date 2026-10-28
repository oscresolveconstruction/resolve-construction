# Extra Works: customer documents and manual billing

## Existing implementation
- `app/(private)/projects/[id]/extra-works/page.tsx` already displays and creates ExtraWork rows, showing Pending/Approved/Rejected; `app/actions/extra-works.ts` persists these rows, currently only for GBP projects.
- Existing project financial calculations add **Approved** ExtraWork amounts to original contract value.
- Existing records can currently be edited/deleted even after approval; protect approved and invoiced snapshots before enabling customer-facing document issuance.

## Target workflow
1. From an existing project, click `New Extra Work`. Enter title, detailed scope, multi-line items/quantities/prices, currency matching project (GBP initially), customer, issue date and notes.
2. Save as Draft (no change to project contract value).
3. Preview or export PDF styled like supplied `RESINV0013.pdf`, but headed **EXTRA WORK / ADDITIONAL WORK QUOTATION**, with unique reference, customer, project address, descriptions and total. It is NOT a tax invoice.
4. Mark Sent, then record Approved/Rejected with approval date, actor and evidence. Freeze approved revision; editing creates a new revision and requires reapproval.
5. Approved amount increases authorised project value **once**; pending or rejected amounts do not.
6. Owner manually creates any invoice against that approved extra work, choosing amount and date, possibly in multiple installments, never automatically creating an invoice, percentage or fixed payment schedule.
7. Show remaining to invoice per approved extra work, with invoice references and payment allocation; prevent invoicing above approved remaining amount using a transaction/row lock.
8. Do not treat an invoice as a payment, nor an approved extra as additional revenue when project value already includes it. Existing Payment records remain source of cash received.

## Proposed data changes (not executed)
- Add ExtraWorkRevision immutable issued/approved document snapshot and ExtraWorkItem rows. Keep existing ExtraWork and its IDs intact.
- Add InvoiceExtraWorkAllocation(invoiceId, extraWorkRevisionId, amountMinor). Invoice creation locks relevant approved revision and allocates without double billing.
- Uniqueness: document number and allocations; status transitions validated server-side, plus audit events.
- Add internal-only company settings for branding, approved bank fields, terms and quote/extra work numbering; no hardcoded public banking information.

## Required tests
- Pending extra work does not change authorised project value; approved adds precisely once.
- Rejecting or revising an extra work after approval cannot silently rewrite an issued document.
- Two concurrent invoices cannot overbill an approved extra work.
- Extra works linked to wrong project/customer cannot be invoiced.
- GBP and EUR do not mix silently.
- Document and PDF are visually compared to RESINV0013 and print correctly across pages.

## Rollout
Build behind a development branch, additive DB migration after backup, CI + preview deployment, owner review, then production.
