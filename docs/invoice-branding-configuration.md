# Resolve Construction invoice assets and bank configuration

Reference: supplied `RESINV0013.pdf`, pages 1–2.

The company logo has been extracted from the PDF as an image asset. Add it to **private managed assets** or `public/resolve-logo.jpg` (after checking rights and approving publication), and configure `INVOICE_LOGO_URL=/resolve-logo.jpg`. The new print preview renders this configured logo. The image itself is not present in this PR yet.

For bank details, the print preview reads these Railway service environment variables (never store bank values in this public repository):
- `INVOICE_BANK_ACCOUNT_NAME`
- `INVOICE_BANK_ACCOUNT_NUMBER`
- `INVOICE_BANK_SORT_CODE`
- `INVOICE_BANK_IBAN`
- `INVOICE_BANK_SWIFT`

The reference PDF includes a bank account and staged payment terms, but **do not copy its IBAN without confirming against the bank**: the PDF text appears as `G153...` (digit 1) while an earlier estimate template uses `GI53...` (letter I). The latter passes IBAN mod-97; that is not bank/account verification. Confirm with authorised company personnel before enabling customer documents.

Payment terms in the source: 50% deposit, 25% on first evaluation, 25% on completion. The current print preview displays these as reference text; terms should eventually be stored per customer quote/invoice.

No environment values, customer data, or bank details were committed in this branch. Do not merge or deploy until the logo is uploaded, bank information approved, PDF layout tested and per-invoice configurable terms are implemented.
