type AccountDeletionActions = {
  flushChanges: () => Promise<boolean>;
  finishAccountDeletion: () => Promise<boolean>;
};

function errorResponse(error: string, status = 503) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}

export async function requestCareerBridgeAccountDeletion(
  account: AccountDeletionActions,
  confirmation: string,
  expectedUserId: string,
) {
  const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
  let sessionResult: unknown = null;
  try {
    sessionResult = await sessionResponse.json();
  } catch {
    sessionResult = null;
  }
  const deletionPending =
    sessionResponse.status === 409 &&
    typeof sessionResult === "object" &&
    sessionResult !== null &&
    "deletionPending" in sessionResult &&
    sessionResult.deletionPending === true;
  if (!sessionResponse.ok && !deletionPending) {
    return errorResponse("Your account status could not be verified. Please try again.", sessionResponse.status);
  }
  if (!deletionPending && !(await account.flushChanges())) {
    return errorResponse("Some changes still need to sync. Retry them before deleting your account.", 409);
  }

  return fetch("/api/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation, expectedUserId }),
  });
}

export function createCareerBridgeAccountDeletionFetcher(
  account: AccountDeletionActions,
) {
  return (confirmation: string, expectedUserId: string) =>
    requestCareerBridgeAccountDeletion(account, confirmation, expectedUserId);
}

export async function finishCareerBridgeAccountDeletion(account: AccountDeletionActions) {
  if (!(await account.finishAccountDeletion())) {
    return {
      ok: false,
      error: "Your CareerBridge account was deleted, but this tab couldn't clear its session. Close all CareerBridge tabs.",
    };
  }
  return { ok: true, error: "" };
}
