import { Pool } from "pg";

let pool: Pool | undefined;
let identityLockPool: Pool | undefined;

const idleTimeoutMillis = 30_000;

function configurePoolLifecycle(postgresPool: Pool) {
  postgresPool.on("error", (error) => {
    console.error("[careerbridge-next] PostgreSQL pool idle connection error", error);
  });
  return postgresPool;
}

function parseDatabaseUrl(value: string | undefined, variable: string) {
  if (!value) {
    throw new Error(`${variable} is required for Clerk identity locking.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variable} must be a valid PostgreSQL URL.`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${variable} must be a valid PostgreSQL URL.`);
  }
  return url;
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Authentication is unavailable because DATABASE_URL is not configured.");
  }
  pool ??= configurePoolLifecycle(new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    max: 5,
  }));
  return pool;
}

export function getIdentityLockPool() {
  const pooledUrl = parseDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
  const directUrl = parseDatabaseUrl(process.env.DATABASE_URL_UNPOOLED, "DATABASE_URL_UNPOOLED");
  const expectedHost = pooledUrl.hostname.replace(/-pooler(?=\.|$)/i, "");

  if (
    /-pooler(?:\.|$)/i.test(directUrl.hostname) ||
    directUrl.hostname !== expectedHost ||
    directUrl.port !== pooledUrl.port ||
    directUrl.username !== pooledUrl.username ||
    directUrl.pathname !== pooledUrl.pathname
  ) {
    throw new Error("DATABASE_URL_UNPOOLED must target the same database as DATABASE_URL without using a pooler.");
  }

  identityLockPool ??= configurePoolLifecycle(new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    max: 5,
  }));
  return identityLockPool;
}
