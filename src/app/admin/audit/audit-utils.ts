import type { AdminAuditAction, AdminAuditKind } from "../../../db/schema/catalog";
import type { AuditPreviewEventWithLinks } from "./audit-preview-data";

export type AuditEventFilters = {
  query: string;
  action: AdminAuditAction | "all";
  actor: string;
  kind: AdminAuditKind | "all";
  fromDate: string;
  toDate: string;
};

export function filterAuditEvents(
  events: readonly AuditPreviewEventWithLinks[],
  filters: AuditEventFilters,
): AuditPreviewEventWithLinks[] {
  const query = filters.query.trim().toLowerCase();

  return events
    .filter((event) => {
      const eventDate = event.createdAt.slice(0, 10);
      const matchesQuery =
        query.length === 0 ||
        [
          event.itemTitle,
          event.itemId,
          event.actorName,
          event.id,
        ].some((value) => value.toLowerCase().includes(query));

      return (
        matchesQuery &&
        (filters.action === "all" || event.action === filters.action) &&
        (filters.actor === "all" || event.actorName === filters.actor) &&
        (filters.kind === "all" || event.kind === filters.kind) &&
        (!filters.fromDate || eventDate >= filters.fromDate) &&
        (!filters.toDate || eventDate <= filters.toDate)
      );
    })
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
}

export function formatAuditDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function getAuditPageCount(eventCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(eventCount / Math.max(1, pageSize)));
}

export function paginateAuditEvents<T>(
  events: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePageSize = Math.max(1, pageSize);
  const start = Math.max(0, page - 1) * safePageSize;
  return events.slice(start, start + safePageSize);
}
