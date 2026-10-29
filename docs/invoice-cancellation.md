# Invoice cancellation

`Cancel invoice` requires an explicit checkbox and a nonempty reason. It is
available on the invoice detail page, including invoices currently in Trash.
Cancellation is permanent. Original amount, number, issuer/customer snapshot,
terms and source link are retained; the invoice is marked `Void`. An immutable
cancellation record retains actor, timestamp and reason. Source-linked invoices
also append an audit event. Cancelled invoices are brought out of Trash so the
cancellation is visible.

Any allocated payment, regardless of currency or amount, blocks cancellation.
Resolve that allocation through payment records first; cancellation never deletes
or moves money. Invoice row locks serialize cancellation against payment writes;
a database trigger rejects payments to cancelled invoices, including legacy paths.
Source locks serialize cancellation against manual billing.

Cancelled source-linked invoices stop consuming the source's approved allowance.
The owner can manually issue a replacement with a new number. Repeated cancellation
is idempotent and cannot free the same amount twice. Retrying the original issue
request still returns its original (now cancelled) invoice; use a new manual issue
request to create a replacement.

Global and project lists show Cancelled with no outstanding balance. Project and
source billing totals exclude it. The retained PDF is labelled CANCELLED on every
page and has zero balance due. No invoice or financial record is deleted, and no
replacement is generated automatically. Historical invoices that have no approved
source do not acquire one through cancellation.

Migration 003 adds cancellation history and payment protections without changing
existing invoices or payments. Migrations 001 and 002 keep their original checksums.
