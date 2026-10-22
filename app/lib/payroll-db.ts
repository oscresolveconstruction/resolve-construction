
import "server-only";

import { Pool } from "pg";

const globalForPayroll = globalThis as typeof globalThis & {
  payrollPool?: Pool;
};

export function getPayrollPool(): Pool {
  if (!globalForPayroll.payrollPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is missing.");
    }

    globalForPayroll.payrollPool = new Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }

  return globalForPayroll.payrollPool;
}
