type AccountDeletionActions = {
  flushChanges: () => Promise<boolean>;
  finishAccountDeletion: () => Promise<boolean>;
};

export async function deleteCareerBridgeAccount(
  account: AccountDeletionActions,
  confirmation: string,
) {
  try {
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
      return { ok: false, error: "Your account status could not be verified. Please try again." };
    }
    if (!deletionPending && !(await account.flushChanges())) {
      return { ok: false, error: "Some changes still need to sync. Retry them before deleting your account." };
    }

    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });
    if (!response.ok) {
      let result: unknown = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      return {
        ok: false,
        error:
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "We couldn't delete your account. Please try again.",
      };
    }
    if (!(await account.finishAccountDeletion())) {
      return {
        ok: false,
        error: "Your CareerBridge account was deleted, but this tab couldn't clear its session. Close all CareerBridge tabs.",
      };
    }
    return { ok: true, error: "" };
  } catch {
    return { ok: false, error: "We couldn't delete your account. Please try again." };
  }
}
