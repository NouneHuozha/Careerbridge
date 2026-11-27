import "server-only";
import {
  AccountDeletionPendingError,
  AccountIdentityConflictError,
  AccountProvisioningRequiredError,
  AuthenticationRequiredError,
  getCurrentUser,
} from "./auth-server";
import { getPool } from "../db/pool";

export class AdminAuthenticationRequiredError extends Error {}
export class AdminAccessDeniedError extends Error {}
export class AdminAccessUnavailableError extends Error {}

export type AdminActor = { id: number };

export async function requireAdmin(): Promise<AdminActor> {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      throw new AdminAuthenticationRequiredError();
    }
    if (
      error instanceof AccountDeletionPendingError ||
      error instanceof AccountIdentityConflictError ||
      error instanceof AccountProvisioningRequiredError
    ) {
      throw new AdminAccessDeniedError();
    }
    throw error;
  }

  if (!user) throw new AdminAuthenticationRequiredError();

  let authorization;
  try {
    authorization = await getPool().query(
      `SELECT id FROM public.users
        WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL`,
      [user.id],
    );
  } catch {
    throw new AdminAccessUnavailableError();
  }
  if (authorization.rowCount !== 1) throw new AdminAccessDeniedError();

  return { id: user.id };
}
