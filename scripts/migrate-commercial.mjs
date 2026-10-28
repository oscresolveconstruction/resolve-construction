import 'dotenv/config';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export async function migrate(pool) {
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(73192401)");
  await client.query('CREATE TABLE IF NOT EXISTS commercial_migration (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const sql = await readFile(new URL('../db/commercial/001.sql', import.meta.url),'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const existing = await client.query("SELECT checksum FROM commercial_migration WHERE version='001'");
  if (existing.rows.length && existing.rows[0].checksum !== checksum) throw new Error('Migration checksum mismatch');
  if (!existing.rows.length) {
   await client.query(sql);
   await client.query("INSERT INTO commercial_migration(version,checksum) VALUES ('001',$1)",[checksum]);
  }
  await client.query('COMMIT');
 } catch(e) { await client.query('ROLLBACK'); throw e; }
 finally { client.release(); }
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
 const pool = new Pool({connectionString:process.env.DATABASE_URL});
 try { await migrate(pool); console.log('Commercial migration verified/applied.'); } finally { await pool.end(); }
}
