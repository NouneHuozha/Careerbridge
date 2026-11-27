export const ADMIN_WORKSPACE_PREFERENCE_STORAGE_KEY =
  "careerbridge.admin.workspace-preferences.v1";

export const ADMIN_RECORDS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export const ADMIN_DATE_FORMAT_OPTIONS = [
  "DD MMM YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
] as const;

export type AdminDateFormat = (typeof ADMIN_DATE_FORMAT_OPTIONS)[number];
export type AdminTableDensity = "compact" | "comfortable";

export type AdminWorkspacePreferences = {
  recordsPerPage: (typeof ADMIN_RECORDS_PER_PAGE_OPTIONS)[number];
  dateFormat: AdminDateFormat;
  tableDensity: AdminTableDensity;
};

export const DEFAULT_ADMIN_WORKSPACE_PREFERENCES: AdminWorkspacePreferences = {
  recordsPerPage: 25,
  dateFormat: "DD MMM YYYY",
  tableDensity: "comfortable",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAdminWorkspacePreferences(
  serialized: string | null,
): AdminWorkspacePreferences {
  if (serialized === null) return DEFAULT_ADMIN_WORKSPACE_PREFERENCES;

  const value: unknown = JSON.parse(serialized);
  if (!isRecord(value)) {
    throw new Error("Stored Admin workspace preferences are invalid.");
  }

  const recordsPerPage = ADMIN_RECORDS_PER_PAGE_OPTIONS.find(
    (option) => option === value.recordsPerPage,
  );
  const dateFormat = ADMIN_DATE_FORMAT_OPTIONS.find(
    (option) => option === value.dateFormat,
  );
  if (
    !recordsPerPage ||
    !dateFormat ||
    (value.tableDensity !== "compact" && value.tableDensity !== "comfortable")
  ) {
    throw new Error("Stored Admin workspace preferences are invalid.");
  }

  return {
    recordsPerPage,
    dateFormat,
    tableDensity: value.tableDensity,
  };
}

export function formatAdminDate(
  value: string | Date,
  format: AdminDateFormat = DEFAULT_ADMIN_WORKSPACE_PREFERENCES.dateFormat,
  includeTime = false,
): string {
  const valueString = value instanceof Date ? value.toISOString() : value;
  const date = new Date(valueString);
  if (Number.isNaN(date.getTime())) throw new RangeError("Cannot format an invalid Admin date.");

  const timeZone = /^\d{4}-\d{2}-\d{2}$/.test(valueString) ? "UTC" : "Asia/Kolkata";
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: format === "YYYY-MM-DD" || format === "DD/MM/YYYY" ? "2-digit" : "short",
    year: "numeric",
    timeZone,
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  if (!day || !month || !year) throw new Error("Could not format the Admin date.");

  const formattedDate = format === "DD MMM YYYY"
    ? `${day} ${month} ${year}`
    : format === "DD/MM/YYYY"
      ? `${day}/${month}/${year}`
      : `${year}-${month}-${day}`;

  if (!includeTime) return formattedDate;

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
  return `${formattedDate}, ${time}`;
}
