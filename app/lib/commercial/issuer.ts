import 'server-only';
import { companyBranding } from './branding.mjs';
export function issuerSnapshot() {
 return {
  name: process.env.INVOICE_COMPANY_NAME || companyBranding.name,
  address: process.env.INVOICE_COMPANY_ADDRESS || companyBranding.address,
  email: process.env.INVOICE_COMPANY_EMAIL || companyBranding.email,
  phone: process.env.INVOICE_COMPANY_PHONE || companyBranding.phone,
  postalCode: process.env.INVOICE_COMPANY_POSTAL_CODE || companyBranding.postalCode,
  bank: process.env.INVOICE_BANK_DETAILS_VERIFIED === 'true' ? [
   ['Account name',process.env.INVOICE_BANK_ACCOUNT_NAME],
   ['Account number',process.env.INVOICE_BANK_ACCOUNT_NUMBER],
   ['Sort code',process.env.INVOICE_BANK_SORT_CODE],
   ['IBAN',process.env.INVOICE_BANK_IBAN],
   ['SWIFT',process.env.INVOICE_BANK_SWIFT],
  ].filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join('\n') : '',
 };
}
