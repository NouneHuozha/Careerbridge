"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Database, Plus, ShieldCheck } from "lucide-react";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import { sourcePreviewRecords } from "./source-preview-data";
import { SourceDirectoryControls } from "./source-directory-controls";
import { SourceDirectoryResults } from "./source-directory-results";
import {
  filterSourceDirectory,
  getSourceDirectoryCounts,
  type SourceDirectoryFilters,
  type SourceSortKey,
} from "./source-utils";

const initialFilters: SourceDirectoryFilters = {
  query: "",
  authority: "all",
  issuingOrganisation: "all",
  status: "all",
  lastChecked: "all",
};

import { useAdminWorkspacePreferences } from "../workspace-preferences-provider";

export function SourceDirectory() {
  const { preferences } = useAdminWorkspacePreferences();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [manualRowsPerPage, setManualRowsPerPage] = useState<number | null>(null);
  const rowsPerPage = manualRowsPerPage ?? preferences.recordsPerPage;
  const [sortBy, setSortBy] = useState<SourceSortKey>("last_checked_desc");
  const counts = useMemo(
    () => getSourceDirectoryCounts(sourcePreviewRecords),
    [],
  );
  const filteredSources = useMemo(
    () => filterSourceDirectory(sourcePreviewRecords, filters, undefined, sortBy),
    [filters, sortBy],
  );
  const pageCount = Math.max(1, Math.ceil(filteredSources.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const visibleSources = filteredSources.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const firstRow = filteredSources.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const lastRow = Math.min(currentPage * rowsPerPage, filteredSources.length);
  const hasFilters =
    Boolean(filters.query.trim()) ||
    filters.authority !== "all" ||
    filters.issuingOrganisation !== "all" ||
    filters.status !== "all" ||
    filters.lastChecked !== "all";

  function updateFilters(nextFilters: SourceDirectoryFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function clearFilters() {
    updateFilters(initialFilters);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Admin / Sources"
          title="Sources Directory"
          description="Register, organize and review the sources behind catalogue information."
        />
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge tone="muted">
            <Database aria-hidden="true" className="size-3.5" />
            Preview records
          </AdminStatusBadge>
          <Link
            href="/admin/sources/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <Plus aria-hidden="true" className="size-4" />
            Register source
          </Link>
        </div>
      </div>

      <section aria-label="Source overview" className="grid gap-3 md:grid-cols-3">
        <AdminMetricCard
          label="All sources"
          value={counts.total}
          detail="Illustrative registry entries"
          icon={Database}
          accentClass="bg-[#edf3f7] text-[#496b85]"
        />
        <AdminMetricCard
          label="Official"
          value={counts.official}
          detail="Marked as official in this preview"
          icon={ShieldCheck}
          accentClass="bg-[#edf6f1] text-[#286c60]"
        />
        <AdminMetricCard
          label="Needs checking"
          value={counts.needsChecking}
          detail="Overdue, failed or changed checks"
          icon={AlertCircle}
          accentClass="bg-[#fbf6e8] text-[#80652e]"
        />
      </section>

      <AdminSectionCard
        id="source-directory"
        title="Source records"
        description="Browse registered websites and documents. All records and activity shown here are illustrative."
        action={
          <span className="hidden text-xs text-[#71817d] sm:inline">
            Sorted by latest check
          </span>
        }
      >
        <div className="space-y-4">
          <SourceDirectoryControls
            sources={sourcePreviewRecords}
            filters={filters}
            onChange={updateFilters}
          />
          {hasFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#657976]">
                {filteredSources.length} matching{" "}
                {filteredSources.length === 1 ? "source" : "sources"}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-9 rounded-md px-2 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                Clear filters
              </button>
            </div>
          )}
          <SourceDirectoryResults
            sources={visibleSources}
            totalCount={filteredSources.length}
            firstRow={firstRow}
            lastRow={lastRow}
            page={currentPage}
            pageCount={pageCount}
            rowsPerPage={rowsPerPage}
            sortBy={sortBy}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setManualRowsPerPage(value);
              setPage(1);
            }}
            onSortChange={(value) => {
              setSortBy(value);
              setPage(1);
            }}
          />
        </div>
      </AdminSectionCard>

      <p className="text-xs leading-5 text-[#71817d]">
        Preview only: no sources are fetched, and no registry, claim or catalogue data is changed.
      </p>
    </div>
  );
}
