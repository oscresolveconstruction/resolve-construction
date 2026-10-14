import "server-only";

import { createHmac } from "node:crypto";
import { Pool } from "pg";

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

const globalForPool = globalThis as typeof globalThis & {
  loginRateLimitPool?: Pool;
};

function getPool(): Pool {
  if (!globalForPool.loginRateLimitPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is missing.");
    }

    globalForPool.loginRateLimitPool = new Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }

  return globalForPool.loginRateLimitPool;
}

function getEmailKey(email: string): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`email:${email.trim().toLowerCase()}`)
    .digest("hex");
}

type AttemptRow = {
  attempts: number;
  retry_after_seconds: number;
};

export type LoginLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// Atomically count each attempt before password verification.
export async function checkLoginRateLimit(
  email: string
): Promise<LoginLimitResult> {
  const key = getEmailKey(email);

  const result = await getPool().query<AttemptRow>(
    `
    INSERT INTO public.login_rate_limits
      (key, attempts, expires_at)
    VALUES
      ($1, 1, NOW() + ($2 * INTERVAL '1 minute'))
    ON CONFLICT (key)
    DO UPDATE SET
      attempts = CASE
        WHEN login_rate_limits.expires_at <= NOW()
          THEN 1
        ELSE login_rate_limits.attempts + 1
      END,
      expires_at = CASE
        WHEN login_rate_limits.expires_at <= NOW()
          THEN NOW() + ($2 * INTERVAL '1 minute')
        ELSE login_rate_limits.expires_at
      END
    RETURNING
      attempts,
      GREATEST(
        0,
        CEIL(EXTRACT(EPOCH FROM (expires_at - NOW())))
      )::integer AS retry_after_seconds
    `,
    [key, WINDOW_MINUTES]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Unable to verify login attempt.");
  }

  return {
    allowed: row.attempts <= MAX_ATTEMPTS,
    retryAfterSeconds:
      row.attempts <= MAX_ATTEMPTS
        ? 0
        : row.retry_after_seconds,
  };
}

// Successful logins reset the account's attempt counter.
export async function clearSuccessfulLogin(
  email: string
): Promise<void> {
  await getPool().query(
    "DELETE FROM public.login_rate_limits WHERE key = $1",
    [getEmailKey(email)]
  );
}