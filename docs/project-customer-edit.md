# Project customer edits

Migration 006 narrows the customer guard: project expenses, unallocated receipts, labour and legacy extra works do not themselves freeze the current customer. Changing currency after any financial records still fails. Linked commercial documents or invoices keep their original customer relation and block reassignment; this includes historical legacy invoices whose PDF reads the project customer.

The update transaction locks the active owner, project and chosen customer, refreshes the project client name from the selected customer, and changes project fields only. Ledger rows are not recreated or moved. Removed projects remain protected. Both old and new customer detail views are revalidated.

Expected validation/document-lock failures appear inside the edit form without leaving the page. The pending save button prevents repeated submissions. Tests cover ledger preservation, disabled owners, unchanged currency protection, a linked document rollback, editing other fields with the same customer, and desktop/mobile form behavior. No production customer is reassigned by migration or deployment.
