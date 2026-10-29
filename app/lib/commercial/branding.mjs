// Contact details supplied in the user's header reference, 29 October 2026.
// Bank details are deliberately managed separately by verified configuration.
export const companyBranding = Object.freeze({
 name: 'Resolve Construction Ltd',
 address: 'Unit 27, block 3 Watergardens Gibraltar',
 postalCode: 'GX11 1AA',
 phone: '00 350 54 099 237',
 email: 'inforesolveconstruction@gmail.com',
});

export function headerIssuer(snapshot) {
 // Preserve populated historical fields; fill missing contact details only for
 // this company. Rendering never rewrites an approved/issued snapshot.
 if (snapshot.name !== companyBranding.name) return { ...snapshot };
 return Object.fromEntries(Object.entries({ ...companyBranding, ...snapshot }).map(([key, value]) =>
  [key, value || companyBranding[key] || value]));
}

export function headerDate(value) {
 const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
 if (!match) return value || '';
 const date = new Date(`${value}T00:00:00Z`);
 if (!Number.isFinite(date.getTime())) return value;
 return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function headerTotal(currency, minor) {
 // GBP remains GBP: branding must not relabel the accounting currency as GIP.
 return `${currency} ${new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(minor) / 100)}`;
}
