# Commercial workflow rollout

## Data and workflow

`commercial_document`, `commercial_invoice` and `commercial_audit` supplement the existing Prisma tables. They are managed through parameterized `pg` transactions, like the existing payroll transaction code. Existing Prisma contracts stay unchanged; do not run schema sync to remove these tables. Migration 001 is transactional, checksum-verified and repeatable. It locks the affected legacy tables briefly, checks their row counts before/after, adds tables/triggers and never drops or replaces existing records. RLS and revoked API grants keep snapshots out of Supabase public APIs.

Quotes and additional works: Draft -> Sent -> Approved/Rejected/Expired. Marking sent records an external action and sends nothing. Acceptance requires name/date/evidence. Only drafts can be edited (optimistic revision check). Unapproved sent/rejected/expired documents can produce a new numbered draft with history retained. Approval never creates an invoice. Approved Extra Works create/update exactly one legacy ExtraWork so project totals retain their existing meaning; the original contract value stays unchanged.

Each invoice is an explicit owner action with a manually chosen amount and description. A row lock serializes allocations; a UUID prevents retry duplicates. The total issued plus reconciled historical billing cannot exceed approval. Linked invoices cannot be changed/deleted through legacy forms. Existing payment records can be allocated once to a matching project/currency, with a locked invoice balance check. No percentages, tax or bank values are assumed.

Historical Extra Works are retained and may be linked into the document workflow. Previously approved records require original acceptance evidence. All imported work requires a manual reconciliation of amounts already invoiced (including external invoices) before new billing. This reconciliation reserves that amount without creating replacement invoices or payments.

## Configuration

Only server-side environment variables are read. Optional issuer values:
`INVOICE_COMPANY_NAME`, `INVOICE_COMPANY_ADDRESS`, `INVOICE_COMPANY_EMAIL`, `INVOICE_COMPANY_PHONE`.
Bank fields are omitted unless `INVOICE_BANK_DETAILS_VERIFIED=true` and the relevant configured `INVOICE_BANK_ACCOUNT_NAME`, `INVOICE_BANK_ACCOUNT_NUMBER`, `INVOICE_BANK_SORT_CODE`, `INVOICE_BANK_IBAN`, `INVOICE_BANK_SWIFT` exist. Never commit values. Snapshots are taken when a draft is saved and remain fixed after approval.

PDFs use an embedded Unicode font, repeated headings and page numbers. Customer/issuer snapshots and manually entered terms are used for new documents. Historical invoice PDFs explicitly identify that their customer details are current records. Visual personalization and approved logo remain subject to owner review.

## Release gate

1. `npm ci`, `npm test` against an isolated PostgreSQL via `TEST_DATABASE_URL`, `npm run lint`, `npm run typecheck`, `npm run build`.
2. Run `npx playwright test` with `DATABASE_URL` pointing only to the test fixture DB and a test SESSION_SECRET. CI uses a disposable postgres:17 service. Never run fixtures against production.
3. Review long multi-page PDFs and browser workflow reports.
4. Railway production must run `npm run migrate:commercial` as the pre-deploy command for this release. The migration must succeed before the new app starts. Preserve all existing production variables. Do not run test seeds in production.
5. Wait for terminal SUCCESS, then verify login, unauthenticated protection and authenticated read-only pages. Do not create invoices as a production smoke test.

Rollback: restore the previous application deployment, leaving the additive tables and issued financial records in place. Do not drop the migration or undo issued invoices. Triggers intentionally protect source-linked invoices from legacy mutation after rollback.
