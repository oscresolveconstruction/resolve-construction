
import "server-only";

import { db } from "@/src/prisma/db";

export function labourMonth(date: string | Date): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid labour date.");
  }

  return parsed.toISOString().slice(0, 7);
}

export async function assertPayrollMonthOpen(
  workerId: number,
  date: string | Date
): Promise<void> {
  if (!Number.isSafeInteger(workerId) || workerId <= 0) {
    throw new Error("Invalid worker.");
  }

  const month = labourMonth(date);

  const payroll = await db.orm.public.MonthlyPayroll.first({
    workerId,
    month,
  });

  if (payroll?.status === "Closed") {
    throw new Error(
      `Payroll for ${month} is closed. Reopen the payroll before changing labour entries.`
    );
  }
}
