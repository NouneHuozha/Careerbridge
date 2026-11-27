"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ADMIN_WORKSPACE_PREFERENCE_STORAGE_KEY,
  DEFAULT_ADMIN_WORKSPACE_PREFERENCES,
  parseAdminWorkspacePreferences,
  type AdminWorkspacePreferences,
} from "./workspace-preferences";

const SERVER_SNAPSHOT = "__admin_preferences_server__";
const EMPTY_SNAPSHOT = "__admin_preferences_empty__";
const STORAGE_ERROR_SNAPSHOT = "__admin_preferences_storage_error__";
const CHANGE_EVENT = "careerbridge:admin-preferences-change";

type AdminWorkspacePreferencesValue = {
  preferences: AdminWorkspacePreferences;
  isLoaded: boolean;
  storageError: string | null;
  savePreferences: (
    next: AdminWorkspacePreferences,
  ) => { ok: true } | { ok: false; error: string };
};

const defaultValue: AdminWorkspacePreferencesValue = {
  preferences: DEFAULT_ADMIN_WORKSPACE_PREFERENCES,
  isLoaded: false,
  storageError: null,
  savePreferences: () => ({
    ok: false,
    error: "Preferences could not be saved outside the Admin workspace.",
  }),
};

const AdminWorkspacePreferencesContext =
  createContext<AdminWorkspacePreferencesValue>(defaultValue);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(ADMIN_WORKSPACE_PREFERENCE_STORAGE_KEY) ??
      EMPTY_SNAPSHOT;
  } catch {
    return STORAGE_ERROR_SNAPSHOT;
  }
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function readSnapshot(snapshot: string) {
  if (
    snapshot === SERVER_SNAPSHOT ||
    snapshot === EMPTY_SNAPSHOT ||
    snapshot === STORAGE_ERROR_SNAPSHOT
  ) {
    return {
      preferences: DEFAULT_ADMIN_WORKSPACE_PREFERENCES,
      storageError: snapshot === STORAGE_ERROR_SNAPSHOT
        ? "Saved preferences could not be read. Defaults are active; check browser storage access."
        : null,
    };
  }

  try {
    return {
      preferences: parseAdminWorkspacePreferences(snapshot),
      storageError: null,
    };
  } catch {
    return {
      preferences: DEFAULT_ADMIN_WORKSPACE_PREFERENCES,
      storageError:
        "Saved preferences could not be loaded. Defaults are active; saving will replace the invalid browser value.",
    };
  }
}

export function AdminWorkspacePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { preferences, storageError } = readSnapshot(snapshot);

  function savePreferences(next: AdminWorkspacePreferences) {
    try {
      const validated = parseAdminWorkspacePreferences(JSON.stringify(next));
      window.localStorage.setItem(
        ADMIN_WORKSPACE_PREFERENCE_STORAGE_KEY,
        JSON.stringify(validated),
      );
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return { ok: true } as const;
    } catch {
      return {
        ok: false,
        error: "Preferences were not saved. Check that this browser allows local storage, then try again.",
      } as const;
    }
  }

  return (
    <AdminWorkspacePreferencesContext.Provider
      value={{
        preferences,
        isLoaded: snapshot !== SERVER_SNAPSHOT,
        storageError,
        savePreferences,
      }}
    >
      <div data-admin-density={preferences.tableDensity} className="contents">
        {children}
      </div>
    </AdminWorkspacePreferencesContext.Provider>
  );
}

export function useAdminWorkspacePreferences() {
  return useContext(AdminWorkspacePreferencesContext);
}
