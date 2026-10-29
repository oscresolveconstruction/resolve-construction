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
   await client.query('SET LOCAL lock_timeout = \'10s\'');
   await client.query('LOCK TABLE "AppUser", "Customer", "Project", "Invoice", "Payment", "ExtraWork" IN SHARE ROW EXCLUSIVE MODE');
   const counts = async () => (await client.query('SELECT (SELECT count(*) FROM "Invoice") AS invoices, (SELECT count(*) FROM "Payment") AS payments, (SELECT count(*) FROM "ExtraWork") AS extras, (SELECT count(*) FROM "Project") AS projects, (SELECT count(*) FROM "Customer") AS customers')).rows[0];
   const before = await counts();
   await client.query(sql);
   if (JSON.stringify(before) !== JSON.stringify(await counts())) throw new Error('Existing row counts changed; rolling back migration');
   await client.query("INSERT INTO commercial_migration(version,checksum) VALUES ('001',$1)",[checksum]);
  }
  for(const version of ['002','003','004']) {
   const sql=await readFile(new URL(`../db/commercial/${version}.sql`,import.meta.url),'utf8');
   const checksum=createHash('sha256').update(sql).digest('hex');
   const previous=await client.query('SELECT checksum FROM commercial_migration WHERE version=$1',[version]);
   if(previous.rows.length && previous.rows[0].checksum!==checksum)throw new Error('Migration checksum mismatch');
   if(!previous.rows.length){await client.query("SET LOCAL lock_timeout = '10s'");await client.query(sql);await client.query('INSERT INTO commercial_migration(version,checksum) VALUES ($1,$2)',[version,checksum]);}
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
