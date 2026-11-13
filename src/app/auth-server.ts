import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import type { AuthUser } from "./auth-types";

const SESSION_COOKIE = "cb_session";
const SESSION_DAYS = 30;
const deriveKey = promisify(scrypt);

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Authentication is unavailable because DATABASE_URL is not configured.");
  }
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000,
    max: 5,
  });
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const result = await getPool().query<{ users: string | null; sessions: string | null }>(
        "SELECT to_regclass('public.users') AS users, to_regclass('public.auth_sessions') AS sessions",
      );
      if (!result.rows[0]?.users || !result.rows[0]?.sessions) {
        throw new Error("Authentication tables are missing. Apply src/app/auth-schema.sql to the configured PostgreSQL database.");
      }
    })().catch((error: unknown) => {
      schemaReady = undefined;
      throw error;
    });
  }
  await schemaReady;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return email.length <= 191 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  if (expected.length !== 64) return false;
  const candidate = await deriveKey(password, salt, expected.length) as Buffer;
  return timingSafeEqual(candidate, expected);
}

function toUser(row: { id: number; email: string; full_name: string | null }): AuthUser {
  return { id: row.id, email: row.email, name: row.full_name };
}

export async function signUp(input: { email: string; password: string; fullName: string }) {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  if (!isValidEmail(email)) return { ok: false as const, error: "Please enter a valid email address." };
  if (input.password.length < 8 || input.password.length > 128) {
    return { ok: false as const, error: "Use a password between 8 and 128 characters." };
  }
  if (!fullName || fullName.length > 120) {
    return { ok: false as const, error: "Please enter a name of 1 to 120 characters." };
  }

  await ensureSchema();
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await getPool().query<{ id: number; email: string; full_name: string | null }>(
      `INSERT INTO users (email, full_name, password_hash, auth_provider)
       VALUES ($1, $2, $3, 'local')
       RETURNING id, email, full_name`,
      [email, fullName, passwordHash],
    );
    return { ok: true as const, user: toUser(result.rows[0]) };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { ok: false as const, error: "An account with this email already exists. Try signing in." };
    }
    throw error;
  }
}

export async function signIn(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email) || input.password.length === 0 || input.password.length > 128) {
    return { ok: false as const, error: "We couldn't match that email and password." };
  }

  await ensureSchema();
  const result = await getPool().query<{
    id: number;
    email: string;
    full_name: string | null;
    password_hash: string | null;
  }>("SELECT id, email, full_name, password_hash FROM users WHERE email = $1 LIMIT 1", [email]);
  const record = result.rows[0];
  if (!record || !(await verifyPassword(input.password, record.password_hash))) {
    return { ok: false as const, error: "We couldn't match that email and password." };
  }
  return { ok: true as const, user: toUser(record) };
}

export async function createSession(userId: number) {
  await ensureSchema();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getPool().query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
  await getPool().query(
    "INSERT INTO auth_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt],
  );
  return { token, expiresAt };
}

export async function getCurrentUser(token: string | undefined) {
  if (!token) return null;
  await ensureSchema();
  const result = await getPool().query<{
    id: number;
    email: string;
    full_name: string | null;
  }>(
    `SELECT users.id, users.email, users.full_name
     FROM auth_sessions
     INNER JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.token = $1 AND auth_sessions.expires_at > NOW()
     LIMIT 1`,
    [token],
  );
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await ensureSchema();
  await getPool().query("DELETE FROM auth_sessions WHERE token = $1", [token]);
}

export const authSessionCookie = SESSION_COOKIE;
