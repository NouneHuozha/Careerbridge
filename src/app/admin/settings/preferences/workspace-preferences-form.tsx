"use client";

import { useState, type FormEvent } from "react";
import { AdminPageHeader } from "../../admin-ui";
import {
  ADMIN_DATE_FORMAT_OPTIONS,
  ADMIN_RECORDS_PER_PAGE_OPTIONS,
  type AdminWorkspacePreferences,
} from "../../workspace-preferences";
import { useAdminWorkspacePreferences } from "../../workspace-preferences-provider";

export function WorkspacePreferencesForm() {
  const {
    preferences,
    isLoaded,
    storageError,
    savePreferences,
  } = useAdminWorkspacePreferences();
  const [changes, setChanges] = useState<Partial<AdminWorkspacePreferences>>({});
  const [message, setMessage] = useState("");
  const draft = { ...preferences, ...changes };

  function updateDraft<Key extends keyof AdminWorkspacePreferences>(
    key: Key,
    value: AdminWorkspacePreferences[Key],
  ) {
    setChanges((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = savePreferences(draft);
    if (result.ok) {
      setChanges({});
      setMessage("Preferences saved in this browser.");
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <AdminPageHeader
        eyebrow="Settings / Workspace Preferences"
        title="Workspace Preferences"
        description="Personal settings that affect how you use the Admin interface."
      />

      <form
        onSubmit={save}
        className="rounded-xl border border-[#dce5e0] bg-white p-5 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-6"
      >
        <div className="border-b border-[#edf1ee] pb-5">
          <h2 className="text-base font-semibold text-[#17364a]">Workspace Preferences</h2>
          <p className="mt-1 text-sm leading-5 text-[#657976]">
            Choose the defaults used by Admin lists, dates and tables.
          </p>
        </div>

        {storageError && (
          <p role="alert" className="mt-5 rounded-lg border border-[#eadfbd] bg-[#fbf6e8] px-3 py-2.5 text-sm leading-5 text-[#715b2e]">
            {storageError}
          </p>
        )}

        <div className="space-y-5 py-5">
          <div>
            <label htmlFor="records-per-page" className="block text-sm font-semibold text-[#17364a]">
              Default records per page
            </label>
            <p id="records-per-page-hint" className="mt-1 text-xs leading-5 text-[#657976]">
              Number of records shown in catalogue and other tables.
            </p>
            <select
              id="records-per-page"
              aria-describedby="records-per-page-hint"
              value={draft.recordsPerPage}
              disabled={!isLoaded}
              onChange={(event) => {
                const value = ADMIN_RECORDS_PER_PAGE_OPTIONS.find(
                  (size) => size === Number(event.currentTarget.value),
                );
                if (value) updateDraft("recordsPerPage", value);
              }}
              className="mt-2 min-h-11 w-full rounded-lg border border-[#d4dfd9] bg-white px-3 text-sm text-[#17364a] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20 disabled:bg-[#f7f9f7] disabled:text-[#71817d]"
            >
              {ADMIN_RECORDS_PER_PAGE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} records</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-format" className="block text-sm font-semibold text-[#17364a]">
              Date display
            </label>
            <p id="date-format-hint" className="mt-1 text-xs leading-5 text-[#657976]">
              How dates appear throughout the Admin panel.
            </p>
            <select
              id="date-format"
              aria-describedby="date-format-hint"
              value={draft.dateFormat}
              disabled={!isLoaded}
              onChange={(event) => {
                const value = ADMIN_DATE_FORMAT_OPTIONS.find(
                  (format) => format === event.currentTarget.value,
                );
                if (value) updateDraft("dateFormat", value);
              }}
              className="mt-2 min-h-11 w-full rounded-lg border border-[#d4dfd9] bg-white px-3 text-sm text-[#17364a] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20 disabled:bg-[#f7f9f7] disabled:text-[#71817d]"
            >
              {ADMIN_DATE_FORMAT_OPTIONS.map((format) => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-[#17364a]">Table density</legend>
            <p className="mt-1 text-xs leading-5 text-[#657976]">
              Choose how much information appears in each row.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["compact", "comfortable"] as const).map((density) => (
                <label
                  key={density}
                  className={`flex min-h-[4.25rem] cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#377b78] ${
                    draft.tableDensity === density
                      ? "border-[#4c8980] bg-[#f5faf7]"
                      : "border-[#dce5e0] bg-white hover:bg-[#f8faf8]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="table-density"
                      value={density}
                      checked={draft.tableDensity === density}
                      disabled={!isLoaded}
                      onChange={() => updateDraft("tableDensity", density)}
                      className="size-4 accent-[#286c60]"
                    />
                    <span className="text-sm font-semibold capitalize text-[#17364a]">{density}</span>
                  </span>
                  {draft.tableDensity === density && (
                    <span className="rounded-full bg-[#e6f4eb] px-2 py-1 text-[11px] font-semibold text-[#286c60]">
                      Selected
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4">
          <p role={message && !message.startsWith("Preferences saved") ? "alert" : "status"} aria-live="polite" className={message.startsWith("Preferences saved") ? "text-sm text-[#286c60]" : "text-sm text-[#8b5147]"}>
            {message}
          </p>
          <button
            type="submit"
            disabled={!isLoaded}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save preferences
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#71817d]">
          These preferences are stored only in this browser and are not synced across devices.
        </p>
      </form>
    </div>
  );
}
