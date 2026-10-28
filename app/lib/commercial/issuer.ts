import 'server-only';
export function issuerSnapshot() {
 return {
  name: process.env.INVOICE_COMPANY_NAME || 'Resolve Construction Ltd',
  address: process.env.INVOICE_COMPANY_ADDRESS || '',
  email: process.env.INVOICE_COMPANY_EMAIL || '',
  phone: process.env.INVOICE_COMPANY_PHONE || '',
  bank: process.env.INVOICE_BANK_DETAILS_VERIFIED === 'true' ? [
   ['Account name',process.env.INVOICE_BANK_ACCOUNT_NAME],
   ['Account number',process.env.INVOICE_BANK_ACCOUNT_NUMBER],
   ['Sort code',process.env.INVOICE_BANK_SORT_CODE],
   ['IBAN',process.env.INVOICE_BANK_IBAN],
   ['SWIFT',process.env.INVOICE_BANK_SWIFT],
  ].filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join('\n') : '',
 };
}
