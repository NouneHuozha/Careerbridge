"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ACCOUNT_CACHE_MARKER_KEY,
  ACCOUNT_SYNC_EVENT,
  clearAccountMutationQueue,
  clearGuestDataCache,
  clearPersonalDataCache,
  clearPendingSave,
  flushAccountMutations,
  getAccountCacheUserId,
  hasPendingAccountMutations,
  hydrateAccountCache,
  lockPersonalData,
  migrateLegacyPersonalDataToSession,
  preserveGuestDataCache,
  readPendingSave,
  readPersonalDataCache,
  restoreGuestDataCache,
  setAccountMode,
} from "./account-data-sync";
import { authUserFromValue } from "./auth-types";
import type { AuthUser } from "./auth-types";
import { activityOptions } from "./discover/activity-options";
import { emptyPersonalData, isPersonalDataSnapshot } from "./personal-data-validation";
import type { PersonalDataSnapshot } from "./personal-data-types";

type AccountStatus = "loading" | "guest" | "authenticated" | "unavailable";
type GuestMigrationChoice = {
  data: PersonalDataSnapshot | null;
  unreadable: boolean;
};

type MigrationChoice = GuestMigrationChoice & {
  accountData: PersonalDataSnapshot;
};

type AccountContextValue = {
  status: AccountStatus;
  user: AuthUser | null;
  error: string | null;
  syncError: string | null;
  retrySync: () => void;
  flushChanges: () => Promise<boolean>;
  refresh: () => Promise<void>;
  signOut: () => Promise<boolean>;
  finishAccountDeletion: () => Promise<boolean>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function accountError(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

function stageLabel(stage: PersonalDataSnapshot["educationStage"]) {
  if (stage === "class-10") return "Class 10";
  if (stage === "class-12") return "Class 12";
  return "Not set";
}

function activityLabels(data: PersonalDataSnapshot) {
  const ids = data.discoveryAnswers?.activityIds ?? [];
  if (ids.length === 0) return "None selected";
  return ids
    .map((id) => activityOptions.find((activity) => activity.id === id)?.label ?? id)
    .join(", ");
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, userId: clerkUserId } = useAuth();
  const { signOut: clerkSignOut } = useClerk();
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [migration, setMigration] = useState<MigrationChoice | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const accountData = useRef<PersonalDataSnapshot>(emptyPersonalData());
  const requestId = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const statusRef = useRef<AccountStatus>(status);
  const [prevClerkUserId, setPrevClerkUserId] = useState<string | null | undefined>(undefined);

  const isTransitioning =
    clerkLoaded && prevClerkUserId !== undefined && prevClerkUserId !== clerkUserId;
  if (clerkLoaded && prevClerkUserId !== clerkUserId) {
    setPrevClerkUserId(clerkUserId);
    if (prevClerkUserId !== undefined) {
      lockPersonalData();
      if (status !== "loading") setStatus("loading");
      if (user !== null) setUser(null);
      if (error !== null) setError(null);
      if (syncError !== null) setSyncError(null);
      if (migration !== null) setMigration(null);
    }
  }

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const startedStatus = statusRef.current;
    if (startedStatus === "loading") lockPersonalData();
    let authenticatedSession = false;
    try {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      if (!sessionResponse.ok) {
        let responseBody: unknown = null;
        try {
          responseBody = await sessionResponse.json();
        } catch {
          responseBody = null;
        }
        throw new Error(accountError(responseBody, "Account services are unavailable."));
      }
      const sessionResult: unknown = await sessionResponse.json();
      if (!isRecord(sessionResult) || !("user" in sessionResult)) {
        throw new Error("The account session response couldn't be validated.");
      }
      const sessionUser =
        sessionResult.user === null ? null : authUserFromValue(sessionResult.user);
      authenticatedSession = sessionUser !== null;
      if (sessionResult.user !== null && !sessionUser) {
        throw new Error("The account session response couldn't be validated.");
      }
      if (currentRequest !== requestId.current) return;

      const existingCacheUserId = getAccountCacheUserId();
      if (!sessionUser) {
        if (existingCacheUserId !== null) restoreGuestDataCache();
        else setAccountMode(false);
        setUser(null);
        setStatus("guest");
        setError(null);
        setMigration(null);
        accountData.current = emptyPersonalData();
        return;
      }

      let guestChoice: GuestMigrationChoice | null = null;
      if (existingCacheUserId === null) {
        migrateLegacyPersonalDataToSession();
        const cached = readPersonalDataCache();
        if (cached.hasContent || cached.unreadable) {
          guestChoice = { data: cached.data, unreadable: cached.unreadable };
          if (cached.data && cached.hasContent) preserveGuestDataCache(cached.data);
        }
      }

      if (existingCacheUserId !== sessionUser.id || startedStatus !== "authenticated") {
        lockPersonalData();
        setUser(null);
        setStatus("loading");
        setError(null);
        setMigration(null);
        accountData.current = emptyPersonalData();
      }

      let flushedBeforeGet = false;
      if (existingCacheUserId === sessionUser.id && hasPendingAccountMutations(sessionUser.id)) {
        setAccountMode(true, sessionUser.id);
        await flushAccountMutations(sessionUser.id);
        flushedBeforeGet = true;
      }

      const dataResponse = await fetch("/api/account/data", { cache: "no-store" });
      if (!dataResponse.ok) {
        let responseBody: unknown = null;
        try {
          responseBody = await dataResponse.json();
        } catch {
          responseBody = null;
        }
        throw new Error(accountError(responseBody, "Your account data couldn't be loaded."));
      }
      const dataResult: unknown = await dataResponse.json();
      if (!isRecord(dataResult) || !isPersonalDataSnapshot(dataResult.data)) {
        throw new Error("Your account data couldn't be validated. It has not been changed.");
      }
      if (currentRequest !== requestId.current) return;

      const accountSnapshot = dataResult.data;
      const stillHasPending = hasPendingAccountMutations(sessionUser.id);

      if (stillHasPending && existingCacheUserId === sessionUser.id) {
        const cached = readPersonalDataCache();
        accountData.current = cached.data ?? accountSnapshot;
        window.sessionStorage.setItem(
          ACCOUNT_CACHE_MARKER_KEY,
          JSON.stringify({ userId: sessionUser.id }),
        );
        setAccountMode(true, sessionUser.id);
        if (flushedBeforeGet) {
          setSyncError("We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.");
        } else {
          void (async () => {
            const ok = await flushAccountMutations(sessionUser.id);
            if (!ok && hasPendingAccountMutations(sessionUser.id)) {
              setSyncError("We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.");
            }
          })();
        }
      } else {
        accountData.current = accountSnapshot;
        hydrateAccountCache(accountSnapshot, sessionUser.id, !guestChoice?.unreadable);
        setAccountMode(true, sessionUser.id);
        if (stillHasPending) {
          void (async () => {
            const ok = await flushAccountMutations(sessionUser.id);
            if (!ok && hasPendingAccountMutations(sessionUser.id)) {
              setSyncError("We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.");
            }
          })();
        }
      }

      setUser(sessionUser);
      setStatus("authenticated");
      setError(null);
      setMigration((current) =>
        current ?? (guestChoice ? { ...guestChoice, accountData: accountSnapshot } : null),
      );

      const pending = readPendingSave();
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (pending && pending.returnPath === currentPath) {
        const response = await fetch("/api/account/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "saved.add",
            item: pending.item,
            expectedUserId: sessionUser.id,
          }),
        });
        if (!response.ok) {
          let responseBody: unknown = null;
          try {
            responseBody = await response.json();
          } catch {
            responseBody = null;
          }
          setSyncError(accountError(responseBody, "Your item wasn't saved to your account. Retry the save from this page."));
          return;
        }
        const result: unknown = await response.json();
        if (!isRecord(result) || !isPersonalDataSnapshot(result.data)) {
          setSyncError("The save completed, but the account response couldn't be validated. Reload this page before continuing.");
          return;
        }
        if (currentRequest !== requestId.current) return;
        accountData.current = result.data;
        hydrateAccountCache(result.data, sessionUser.id);
        clearPendingSave();
        setSyncError(null);
      }
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      if (
        authenticatedSession ||
        getAccountCacheUserId() !== null ||
        startedStatus !== "guest"
      ) {
        lockPersonalData();
      } else {
        setAccountMode(false);
      }
      setUser(null);
      setStatus("unavailable");
      setError(loadError instanceof Error ? loadError.message : "Account services are unavailable.");
      setMigration(null);
    }
  }, []);

  useEffect(() => {
    if (!clerkLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [clerkLoaded, clerkUserId, refresh]);

  useEffect(() => {
    function syncErrorChanged(event: Event) {
      const detail = (event as CustomEvent<{ message: string | null }>).detail;
      setSyncError(detail?.message ?? null);
    }
    window.addEventListener(ACCOUNT_SYNC_EVENT, syncErrorChanged);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const channel = "BroadcastChannel" in window
      ? new BroadcastChannel("careerbridge-auth-state")
      : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        if (event.data === "signed-out") {
          try {
            if (getAccountCacheUserId() !== null) restoreGuestDataCache();
            else setAccountMode(false);
          } catch {
            lockPersonalData();
          }
          setUser(null);
          setStatus("guest");
          setMigration(null);
          accountData.current = emptyPersonalData();
        }
      };
    }
    return () => {
      window.removeEventListener(ACCOUNT_SYNC_EVENT, syncErrorChanged);
      window.removeEventListener("focus", onFocus);
      channel?.close();
    };
  }, [refresh]);


  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (migration && !dialog.open) dialog.showModal();
    else if (!migration && dialog.open) dialog.close();
  }, [migration]);

  const retrySync = useCallback(() => {
    setSyncError(null);
    void (async () => {
      const success = await flushAccountMutations();
      if (success) {
        await refresh();
      }
    })();
  }, [refresh]);

  const signOut = useCallback(async () => {
    requestId.current += 1;
    await flushAccountMutations();
    try {
      await clerkSignOut();
    } catch {
      return false;
    }

    function broadcastSignOut() {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("careerbridge-auth-state");
        channel.postMessage("signed-out");
        channel.close();
      }
    }

    try {
      try {
        restoreGuestDataCache();
      } catch {
        lockPersonalData();
        setStatus("unavailable");
        setError("You are signed out, but this tab couldn't clear its account data. Close this tab and reopen CareerBridge.");
        setUser(null);
        broadcastSignOut();
        return true;
      }
      setUser(null);
      setStatus("guest");
      setError(null);
      setMigration(null);
      setSyncError(null);
      accountData.current = emptyPersonalData();
      broadcastSignOut();
      return true;
    } catch {
      return false;
    }
  }, [clerkSignOut]);

  const finishAccountDeletion = useCallback(async () => {
    const deletingUserId = user?.id;
    let cleared = true;
    try {
      await clerkSignOut();
    } catch {
      cleared = false;
    }

    try {
      if (deletingUserId) {
        clearAccountMutationQueue(deletingUserId);
      }
      clearGuestDataCache();
      clearPersonalDataCache();
    } catch {
      lockPersonalData();
      cleared = false;
    }

    setUser(null);
    setMigration(null);
    setSyncError(null);
    accountData.current = emptyPersonalData();
    setStatus(cleared ? "guest" : "unavailable");
    setError(cleared ? null : "Your CareerBridge account was deleted, but this tab couldn't clear its session. Close all CareerBridge tabs.");
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("careerbridge-auth-state");
      channel.postMessage("signed-out");
      channel.close();
    }
    return cleared;
  }, [clerkSignOut, user?.id]);

  async function chooseMigration(keep: boolean) {
    if (!migration || !user || migrationBusy) return;
    setMigrationBusy(true);
    setMigrationError("");
    try {
      let nextData = accountData.current;
      if (keep) {
        if (!migration.data) {
          setMigrationError("The temporary data could not be validated, so it wasn't transferred.");
          return;
        }
        const response = await fetch("/api/account/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "migration.keep",
            data: migration.data,
            expectedUserId: user.id,
          }),
        });
        const result: unknown = await response.json();
        if (!response.ok || !isRecord(result) || !isPersonalDataSnapshot(result.data)) {
          setMigrationError(accountError(result, "Your exploration wasn't transferred. Your account data is unchanged."));
          return;
        }
        nextData = result.data;
      }
      accountData.current = nextData;
      hydrateAccountCache(nextData, user.id, !migration.unreadable);
      setMigration(null);
    } catch {
      setMigrationError("Your exploration couldn't be updated. Nothing was transferred; please try again.");
    } finally {
      setMigrationBusy(false);
    }
  }

  const value = useMemo<AccountContextValue>(() => ({
    status: isTransitioning ? "loading" : status,
    user: isTransitioning ? null : user,
    error,
    syncError,
    retrySync,
    flushChanges: flushAccountMutations,
    refresh: async () => {
      await refresh();
    },
    signOut,
    finishAccountDeletion,
  }), [error, finishAccountDeletion, isTransitioning, refresh, retrySync, signOut, status, syncError, user]);

  return (
    <AccountContext.Provider value={value}>
      {children}
      {syncError && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6d5aa] bg-[#fff9e9] px-4 py-3 text-sm text-[#604c20] shadow-[0_12px_35px_rgba(27,65,52,0.18)]"
        >
          <span>{syncError}</span>
          <button
            type="button"
            onClick={retrySync}
            className="min-h-9 rounded-full bg-[#145543] px-4 text-xs font-semibold text-white hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Retry
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby="guest-transfer-title"
        aria-describedby="guest-transfer-description"
        onCancel={(event) => event.preventDefault()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-[#dce7df] bg-white p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.3)] backdrop:bg-[#102d26]/50 backdrop:backdrop-blur-sm"
      >
        {migration && (
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#52715f]">
              Your choice
            </p>
            <h2 id="guest-transfer-title" className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
              Keep your current exploration?
            </h2>
            <p id="guest-transfer-description" className="mt-3 text-sm leading-6 text-[#59665e]">
              Add this tab&apos;s saved items and history to your account. Guest Discover values fill only fields your account has not saved; existing account values stay. Your guest choices remain separate in this tab and return when you sign out.
            </p>
            {migration.data ? (
              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f3f7f3] p-4 text-sm">
                <div>
                  <dt className="text-xs text-[#718078]">Saved items</dt>
                  <dd className="mt-1 font-semibold">{migration.data.savedItems.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#718078]">Explored pages</dt>
                  <dd className="mt-1 font-semibold">{migration.data.history.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#718078]">Guided Explorer</dt>
                  <dd className="mt-1 font-semibold">{migration.data.counsellingSession ? "Progress available" : "Not started"}</dd>
                </div>
              </dl>
            ) : (
              <p role="status" className="mt-4 rounded-xl bg-[#fff8e8] p-3 text-sm leading-5 text-[#604c20]">
                Some temporary information could not be read. It has not been transferred.
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {migration.data && (
                <section aria-label="Guest Discover information" className="rounded-2xl border border-[#dce7df] bg-[#fbfaf6] p-4">
                  <h3 className="text-sm font-semibold">This tab</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-[#718078]">Study stage</dt>
                      <dd className="font-medium">{stageLabel(migration.data.educationStage)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#718078]">Activities</dt>
                      <dd className="font-medium">{activityLabels(migration.data)}</dd>
                    </div>
                  </dl>
                </section>
              )}
              <section aria-label="Account Discover information" className="rounded-2xl border border-[#dce7df] bg-[#fbfaf6] p-4">
                <h3 className="text-sm font-semibold">Your account</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-[#718078]">Study stage</dt>
                    <dd className="font-medium">{stageLabel(migration.accountData.educationStage)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#718078]">Activities</dt>
                    <dd className="font-medium">{activityLabels(migration.accountData)}</dd>
                  </div>
                </dl>
              </section>
            </div>
            {migrationError && (
              <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] p-3 text-sm leading-5 text-[#8b3529]">
                {migrationError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={migrationBusy}
                onClick={() => void chooseMigration(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dce7df] px-5 text-sm font-semibold text-[#52645a] hover:bg-[#f4f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:opacity-60"
              >
                Don&apos;t transfer this session
              </button>
              {migration.data && (
                <button
                  type="button"
                  disabled={migrationBusy}
                  onClick={() => void chooseMigration(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:opacity-60"
                >
                  {migrationBusy ? "Updating account…" : "Keep my exploration"}
                </button>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#718078]">
              You can review or delete account data later. See the{" "}
              <a href="/privacy" className="font-semibold text-[#145543] underline underline-offset-2">
                Privacy Notice
              </a>
              .
            </p>
          </div>
        )}
      </dialog>
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccount must be used within AccountProvider.");
  return context;
}
