# Corporate PDF branding

The PDF header follows the company header image supplied on 29 October 2026:
logo at left, company contact details in the middle, and document type, number,
date and total at right, under an orange rule. It is shared by Estimates,
Extra Works and Invoices, including their Preview and Share PDF files.

The previously supplied `resolve-logo-web.jpg` is bundled unchanged as
`assets/branding/resolve-logo.jpg`. The supplied contact details are in
`app/lib/commercial/branding.mjs`. New issuer snapshots use those defaults;
optional `INVOICE_COMPANY_NAME`, `INVOICE_COMPANY_ADDRESS`,
`INVOICE_COMPANY_POSTAL_CODE`, `INVOICE_COMPANY_EMAIL` and
`INVOICE_COMPANY_PHONE` environment settings override them.

Existing nonempty issuer snapshot fields remain authoritative. Only missing
contact fields for Resolve Construction Ltd are filled for display; no stored
approved/issued document is rewritten. The number, date, total and currency
come from each actual document. GBP is not relabelled GIP for visual similarity.
Logo and embedded Unicode fonts are included in Next.js output tracing.

Bank details are independent of branding. They appear only in snapshots created
with `INVOICE_BANK_DETAILS_VERIFIED=true` and supplied account-name, account-number,
sort-code, IBAN and SWIFT environment settings. No bank values are bundled in code.
Payment terms are saved manually per document; there is no automatic percentage
billing or invoice generation.
