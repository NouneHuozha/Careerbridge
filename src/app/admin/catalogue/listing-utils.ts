export type CatalogueListingRecord = {
  id: string;
  title: string;
  aliases: string[];
  details: Array<{ label: string; value: string }>;
  updatedAt: string;
  publicationStatus: string;
  verificationStatus: string;
  filterValues: Record<string, string | readonly string[]>;
  summary?: string;
  description?: string;
  currentRevision?: number;
  formValues?: Record<string, string>;
};

export type CatalogueListingFilter = {
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
};

export function filterCatalogueListingRecords(
  records: readonly CatalogueListingRecord[],
  query: string,
  filters: Record<string, string>,
  sortBy: "updated" | "name",
): CatalogueListingRecord[] {
  const search = query.trim().toLowerCase();
  return records
    .filter((record) => {
      const matchesSearch =
        search.length === 0 ||
        [record.title, record.id, ...record.aliases]
          .some((value) => value.toLowerCase().includes(search));
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const recordValue = record.filterValues[key];
        return Array.isArray(recordValue)
          ? recordValue.includes(value)
          : recordValue === value;
      });
      return matchesSearch && matchesFilters;
    })
    .sort((left, right) =>
      sortBy === "name"
        ? left.title.localeCompare(right.title)
        : right.updatedAt.localeCompare(left.updatedAt),
    );
}

export function getCatalogueListingPageCount(recordCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(recordCount / Math.max(1, pageSize)));
}

export function paginateCatalogueListingRecords<T>(
  records: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePageSize = Math.max(1, pageSize);
  const start = Math.max(0, page - 1) * safePageSize;
  return records.slice(start, start + safePageSize);
}
