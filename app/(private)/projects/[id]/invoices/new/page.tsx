import { redirect } from 'next/navigation';
import { requireActiveUser } from '../../../../../lib/require-active-user';
export default async function NewInvoicePage() { await requireActiveUser(); redirect('/quotes'); }
