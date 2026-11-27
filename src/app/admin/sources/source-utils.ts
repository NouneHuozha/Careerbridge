import {
  SOURCE_PREVIEW_AS_OF,
  type SourceAuthorityCategory,
  type SourcePreviewRecord,
} from "./source-preview-data";

export type SourceAuthorityFilter = "all" | SourceAuthorityCategory;
export type SourceStatusFilter = "all" | "active" | "inactive" | "needs_check";
export type SourceLastCheckedFilter = "all" | "7d" | "30d" | "overdue" | "not_checked";
export type SourceSortKey = "last_checked_desc" | "last_checked_asc" | "name_asc";
export type SourceMaintenanceIssue =
  | "due"
  | "failed"
  | "changed"
  | "inactive";

export type SourceDirectoryFilters = {
  query: string;
  authority: SourceAuthorityFilter;
  issuingOrganisation: string;
  status: SourceStatusFilter;
  lastChecked: SourceLastCheckedFilter;
};

export type SourceDirectoryCounts = {
  total: number;
  official: number;
  needsChecking: number;
};

const checkDueAfterDays = 30;

function daysSince(date: string, asOfDate: string) {
  return Math.floor(
    (Date.parse(`${asOfDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
      86_400_000,
  );
}

export function getSourceMaintenanceIssues(
  source: SourcePreviewRecord,
  asOfDate = SOURCE_PREVIEW_AS_OF,
): SourceMaintenanceIssue[] {
  const issues: SourceMaintenanceIssue[] = [];

  if (source.status === "inactive") issues.push("inactive");
  if (source.attempts[0]?.outcome === "failed") issues.push("failed");
  if (source.attempts[0]?.outcome === "changes_detected") issues.push("changed");

  const isDue =
    source.status === "active" &&
    (!source.lastCheckedAt ||
      daysSince(source.lastCheckedAt, asOfDate) > checkDueAfterDays);
  if (isDue) issues.push("due");

  return issues;
}

export function getSourceDirectoryCounts(
  sources: readonly SourcePreviewRecord[],
  asOfDate = SOURCE_PREVIEW_AS_OF,
): SourceDirectoryCounts {
  return {
    total: sources.length,
    official: sources.filter((source) => source.isOfficial).length,
    needsChecking: sources.filter(
      (source) =>
        source.status === "active" &&
        getSourceMaintenanceIssues(source, asOfDate).some(
          (issue) => issue !== "inactive",
        ),
    ).length,
  };
}

function matchesLastChecked(
  source: SourcePreviewRecord,
  filter: SourceLastCheckedFilter,
  asOfDate: string,
) {
  if (filter === "all") return true;
  if (filter === "not_checked") return source.lastCheckedAt === null;
  if (!source.lastCheckedAt) return false;

  const ageInDays = daysSince(source.lastCheckedAt, asOfDate);
  if (filter === "7d") return ageInDays >= 0 && ageInDays <= 7;
  if (filter === "30d") return ageInDays >= 0 && ageInDays <= 30;
  return ageInDays > checkDueAfterDays;
}

export function filterSourceDirectory(
  sources: readonly SourcePreviewRecord[],
  filters: SourceDirectoryFilters,
  asOfDate = SOURCE_PREVIEW_AS_OF,
  sortBy: SourceSortKey = "last_checked_desc",
): SourcePreviewRecord[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return sources
    .filter((source) => {
      const matchesQuery =
        query.length === 0 ||
        [source.name, source.url, new URL(source.url).hostname, source.issuingOrganisation]
          .some((value) => value.toLocaleLowerCase().includes(query));
      const matchesAuthority =
        filters.authority === "all" ||
        (filters.authority === "official"
          ? source.isOfficial
          : source.authorityCategory === filters.authority);
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "needs_check"
          ? source.status === "active" &&
            getSourceMaintenanceIssues(source, asOfDate).some(
              (issue) => issue !== "inactive",
            )
          : source.status === filters.status);

      return (
        matchesQuery &&
        matchesAuthority &&
        (filters.issuingOrganisation === "all" ||
          source.issuingOrganisation === filters.issuingOrganisation) &&
        matchesStatus &&
        matchesLastChecked(source, filters.lastChecked, asOfDate)
      );
    })
    .sort((left, right) => {
      if (sortBy === "name_asc") return left.name.localeCompare(right.name);
      if (!left.lastCheckedAt) return 1;
      if (!right.lastCheckedAt) return -1;
      return sortBy === "last_checked_asc"
        ? left.lastCheckedAt.localeCompare(right.lastCheckedAt)
        : right.lastCheckedAt.localeCompare(left.lastCheckedAt);
    });
}

export function getSourceMaintenanceCounts(
  sources: readonly SourcePreviewRecord[],
  asOfDate = SOURCE_PREVIEW_AS_OF,
) {
  return sources.reduce(
    (counts, source) => {
      for (const issue of getSourceMaintenanceIssues(source, asOfDate)) {
        counts[issue] += 1;
      }
      return counts;
    },
    { due: 0, failed: 0, changed: 0, inactive: 0 },
  );
}
