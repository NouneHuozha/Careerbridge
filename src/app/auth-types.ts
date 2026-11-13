export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
};

export function authUserFromValue(value: unknown): AuthUser | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "number" ||
    !Number.isInteger(record.id) ||
    record.id < 1 ||
    typeof record.email !== "string" ||
    record.email.length > 191 ||
    (record.name !== null && typeof record.name !== "string")
  ) {
    return null;
  }
  return {
    id: record.id,
    email: record.email,
    name: record.name,
  };
}
