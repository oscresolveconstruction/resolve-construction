import {requireActiveUser} from '../../lib/require-active-user';
import {getPayrollPool} from '../../lib/payroll-db';
import {auditFinancialRecords} from '../../lib/finance/audit.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 await requireActiveUser();
 return Response.json(await auditFinancialRecords(getPayrollPool()),{headers:{'Cache-Control':'private, no-store'}});
}
