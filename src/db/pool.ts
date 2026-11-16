import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Authentication is unavailable because DATABASE_URL is not configured.");
  }
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    max: 5,
  });
  return pool;
}
