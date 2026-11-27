"use client";

import { useAdminWorkspacePreferences } from "./workspace-preferences-provider";
import { formatAdminDate } from "./workspace-preferences";

export function AdminDate({
  value,
  includeTime = false,
  fallback = "—",
}: {
  value?: string | Date | null;
  includeTime?: boolean;
  fallback?: string;
}) {
  const { preferences } = useAdminWorkspacePreferences();
  if (!value) return <>{fallback}</>;
  return (
    <time dateTime={value instanceof Date ? value.toISOString() : value}>
      {formatAdminDate(value, preferences.dateFormat, includeTime)}
    </time>
  );
}
