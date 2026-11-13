import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import type { AuthUser } from "./auth-types";
import {
  emptyPersonalData,
  isPersonalDataSnapshot,
} from "./personal-data-validation";
import type {
  PersonalDataMutation,
  PersonalDataSnapshot,
} from "./personal-data-types";

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
      const result = await getPool().query<{
        users: string | null;
        sessions: string | null;
        accountData: string | null;
      }>(
        `SELECT to_regclass('public.users') AS users,
                to_regclass('public.auth_sessions') AS sessions,
                to_regclass('public.account_data') AS "accountData"`,
      );
      if (!result.rows[0]?.users || !result.rows[0]?.sessions || !result.rows[0]?.accountData) {
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

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  privacyAccepted: boolean;
  ageAttestation: string;
}) {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  if (!isValidEmail(email)) return { ok: false as const, error: "Please enter a valid email address." };
  if (input.password.length < 8 || input.password.length > 128) {
    return { ok: false as const, error: "Use a password between 8 and 128 characters." };
  }
  if (!fullName || fullName.length > 120) {
    return { ok: false as const, error: "Please enter a name of 1 to 120 characters." };
  }
  if (!input.privacyAccepted) {
    return { ok: false as const, error: "Please review and accept the Privacy Notice to create an account." };
  }
  if (input.ageAttestation !== "adult" && input.ageAttestation !== "minor-guardian") {
    return { ok: false as const, error: "Please confirm the age and guardian information." };
  }

  await ensureSchema();
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await getPool().query<{ id: number; email: string; full_name: string | null }>(
      `INSERT INTO users (
         email, full_name, password_hash, auth_provider,
         privacy_notice_version, privacy_notice_accepted_at, age_attestation, age_attested_at
       )
       VALUES ($1, $2, $3, 'local', 'careerbridge-privacy-v1', NOW(), $4, NOW())
       RETURNING id, email, full_name`,
      [email, fullName, passwordHash, input.ageAttestation],
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

function personalDataKey(item: { type: string; id: string; context?: { courseId?: string } }) {
  return item.type === "institution-offering"
    ? `${item.type}:${item.id}:${item.context?.courseId ?? ""}`
    : `${item.type}:${item.id}`;
}

function mergePersonalData(
  current: PersonalDataSnapshot,
  incoming: PersonalDataSnapshot,
): PersonalDataSnapshot {
  const saved = new Map(current.savedItems.map((item) => [personalDataKey(item), item]));
  for (const item of incoming.savedItems) {
    const key = personalDataKey(item);
    const existing = saved.get(key);
    if (!existing || item.savedAt > existing.savedAt) saved.set(key, item);
  }

  const history = new Map(current.history.map((item) => [personalDataKey(item), item]));
  for (const item of incoming.history) {
    const key = personalDataKey(item);
    const existing = history.get(key);
    history.set(key, existing
      ? {
          ...existing,
          lastVisitedAt: Math.max(existing.lastVisitedAt, item.lastVisitedAt),
          visitCount: Math.max(existing.visitCount, item.visitCount),
        }
      : item);
  }

  return {
    savedItems: [...saved.values()],
    history: [...history.values()],
    educationStage: incoming.educationStage ?? current.educationStage,
    counsellingSession: incoming.counsellingSession ?? current.counsellingSession,
    discoveryAnswers: incoming.discoveryAnswers ?? current.discoveryAnswers,
  };
}

function applyPersonalDataMutation(
  current: PersonalDataSnapshot,
  mutation: PersonalDataMutation,
): PersonalDataSnapshot {
  switch (mutation.type) {
    case "saved.add": {
      const key = personalDataKey(mutation.item);
      const index = current.savedItems.findIndex((item) => personalDataKey(item) === key);
      const items = [...current.savedItems];
      if (index === -1) items.push(mutation.item);
      else if (mutation.item.savedAt > items[index].savedAt) items[index] = mutation.item;
      return { ...current, savedItems: items };
    }
    case "saved.remove": {
      const key = personalDataKey(mutation.item);
      return {
        ...current,
        savedItems: current.savedItems.filter((item) => personalDataKey(item) !== key),
      };
    }
    case "history.record": {
      const key = personalDataKey(mutation.item);
      const existing = current.history.find((item) => personalDataKey(item) === key);
      if (existing && mutation.item.lastVisitedAt <= existing.lastVisitedAt) return current;
      const item = {
        ...mutation.item,
        visitCount: existing ? existing.visitCount + 1 : 1,
      };
      return {
        ...current,
        history: [
          ...current.history.filter((entry) => personalDataKey(entry) !== key),
          item,
        ],
      };
    }
    case "history.remove": {
      const key = personalDataKey(mutation.item);
      return {
        ...current,
        history: current.history.filter((item) => personalDataKey(item) !== key),
      };
    }
    case "history.restore": {
      const key = personalDataKey(mutation.item);
      return current.history.some((item) => personalDataKey(item) === key)
        ? current
        : { ...current, history: [...current.history, mutation.item] };
    }
    case "history.clear":
      return { ...current, history: [] };
    case "progress.educationStage":
      return { ...current, educationStage: mutation.value };
    case "progress.counsellingSession":
      return { ...current, counsellingSession: mutation.value };
    case "progress.discoveryAnswers":
      return { ...current, discoveryAnswers: mutation.value };
    case "migration.keep":
      return mergePersonalData(current, mutation.data);
  }
}

export async function getAccountData(userId: number): Promise<PersonalDataSnapshot> {
  await ensureSchema();
  const result = await getPool().query<{ data: unknown }>(
    "SELECT data FROM account_data WHERE user_id = $1",
    [userId],
  );
  const data = result.rows[0]?.data ?? emptyPersonalData();
  if (!isPersonalDataSnapshot(data)) {
    throw new Error("Stored account data is invalid and requires support.");
  }
  return data;
}

export async function updateAccountData(
  userId: number,
  mutation: PersonalDataMutation,
): Promise<PersonalDataSnapshot> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO account_data (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [userId],
    );
    const result = await client.query<{ data: unknown }>(
      "SELECT data FROM account_data WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    const current = result.rows[0]?.data;
    if (!isPersonalDataSnapshot(current)) {
      throw new Error("Stored account data is invalid and requires support.");
    }
    const next = applyPersonalDataMutation(current, mutation);
    await client.query(
      "UPDATE account_data SET data = $2::jsonb, updated_at = NOW() WHERE user_id = $1",
      [userId, JSON.stringify(next)],
    );
    await client.query("COMMIT");
    return next;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAccount(userId: number, password: string) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (!result.rows[0] || !(await verifyPassword(password, result.rows[0].password_hash))) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export const authSessionCookie = SESSION_COOKIE;
