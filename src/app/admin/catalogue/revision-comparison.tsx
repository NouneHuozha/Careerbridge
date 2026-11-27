"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, GitCompareArrows, Info } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "../admin-ui";
import type {
  CatalogueCategoryDefinition,
  CataloguePreviewDetail,
} from "./catalogue-preview-data";
import type { CatalogueListingRecord } from "./listing-utils";

function RevisionSelect({
  label,
  revisions,
  value,
  onChange,
}: {
  label: string;
  revisions: CataloguePreviewDetail["revisions"];
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#71817d]">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-semibold text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
      >
        {revisions.map((revision) => (
          <option key={revision.number} value={revision.number}>
            Revision {revision.number} · {revision.status}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RevisionComparison({
  category,
  record,
  detail,
}: {
  category: CatalogueCategoryDefinition;
  record: CatalogueListingRecord;
  detail: CataloguePreviewDetail;
}) {
  const recordHref = `/admin/catalogue/${category.slug}/${record.id}`;
  const orderedRevisions = useMemo(
    () => [...detail.revisions].sort((left, right) => right.number - left.number),
    [detail.revisions],
  );
  const initialNewer =
    orderedRevisions.find((revision) => revision.current) ?? orderedRevisions[0];
  const initialOlder = orderedRevisions.find(
    (revision) => revision.number !== initialNewer?.number,
  );
  const [olderNumber, setOlderNumber] = useState(initialOlder?.number);
  const [newerNumber, setNewerNumber] = useState(initialNewer?.number);
  const olderRevision = orderedRevisions.find((revision) => revision.number === olderNumber);
  const newerRevision = orderedRevisions.find((revision) => revision.number === newerNumber);
  const canCompare =
    orderedRevisions.length > 1 &&
    olderRevision !== undefined &&
    newerRevision !== undefined &&
    olderRevision.number !== newerRevision.number;
  const isBcaComparison = record.id === "CB-COURSE-001";

  function changeOlder(value: number) {
    setOlderNumber(value);
    if (value === newerNumber) {
      const alternative = orderedRevisions.find((revision) => revision.number !== value);
      setNewerNumber(alternative ? alternative.number : value);
    }
  }

  function changeNewer(value: number) {
    setNewerNumber(value);
    if (value === olderNumber) {
      const alternative = orderedRevisions.find((revision) => revision.number !== value);
      setOlderNumber(alternative ? alternative.number : value);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow={`Catalogue / ${category.label} / ${record.aliases[0] ?? record.id}`}
          title="Compare revisions"
          description={record.title}
        />
        <Link
          href={`${recordHref}?tab=revisions`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#377b78] hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          <ArrowLeftRight aria-hidden="true" className="size-4" />
          Revision history
        </Link>
      </div>

      <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <RevisionSelect
            label="Older revision"
            revisions={orderedRevisions}
            value={olderNumber}
            onChange={changeOlder}
          />
          <span className="hidden pb-3 text-[#9aa9a5] md:block" aria-hidden="true">
            <GitCompareArrows className="size-5" />
          </span>
          <RevisionSelect
            label="Newer revision"
            revisions={orderedRevisions}
            value={newerNumber}
            onChange={changeNewer}
          />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-[#d4e0ea] bg-[#f2f6f9] p-3 text-xs leading-5 text-[#496b85]">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          This comparison uses sample revisions and is not connected to persisted catalogue history.
        </p>
      </section>

      {!canCompare ? (
        <AdminEmptyState
          title="Two different revisions are required"
          description="This sample record does not include two distinct revisions to compare."
          icon={GitCompareArrows}
        />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2">
            {[olderRevision, newerRevision].map((revision, index) => (
              <article key={revision.number} className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#71817d]">
                      {index === 0 ? "Older revision" : "Newer revision"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[#17364a]">
                      Revision {revision.number}
                    </h2>
                  </div>
                  <AdminStatusBadge tone={revision.current ? "accent" : "muted"}>
                    {revision.status}
                  </AdminStatusBadge>
                </div>
                <p className="mt-3 text-sm leading-5 text-[#657976]">{revision.note}</p>
                <time dateTime={revision.date} className="mt-3 block text-xs text-[#71817d]">
                  {revision.date}
                </time>
              </article>
            ))}
          </section>

          {isBcaComparison ? (
            <section className="overflow-hidden rounded-xl border border-[#dce5e0] bg-white">
              <div className="border-b border-[#e7ede9] p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-[#17364a]">Changes</h2>
                <p className="mt-1 text-sm text-[#657976]">
                  Changed values and evidence associations are shown separately.
                </p>
              </div>
              <div className="divide-y divide-[#edf1ee]">
                <article className="grid gap-3 p-4 sm:grid-cols-[minmax(10rem,0.5fr)_1fr] sm:p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#71817d]">
                    Programme duration
                  </h3>
                  <div>
                    <p className="text-sm text-[#657976]">
                      <span className="line-through decoration-[#a34c3f]/60">Three years</span>
                      <span aria-hidden="true" className="mx-2 text-[#9aa9a5]">→</span>
                      <span className="font-semibold text-[#17364a]">Four years</span>
                    </p>
                    <AdminStatusBadge tone="muted">Changed</AdminStatusBadge>
                  </div>
                </article>
                <article className="grid gap-3 p-4 sm:grid-cols-[minmax(10rem,0.5fr)_1fr] sm:p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#71817d]">
                    Programme name
                  </h3>
                  <p className="text-sm font-medium text-[#405a5e]">No change</p>
                </article>
                <article className="grid gap-3 p-4 sm:grid-cols-[minmax(10rem,0.5fr)_1fr] sm:p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#71817d]">
                    Source evidence
                  </h3>
                  <p className="text-sm font-medium text-[#405a5e]">One source association added</p>
                </article>
              </div>
            </section>
          ) : (
            <AdminEmptyState
              title="Field-level changes are not included"
              description="This sample has revision metadata, but no earlier field values or source associations to compare."
              icon={GitCompareArrows}
            />
          )}

          <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold text-[#17364a]">Revision information</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                ["Created by", "Not connected"],
                ["Reviewed by", "Not connected"],
                ["Publication date", newerRevision?.date ?? "Unavailable"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-[#71817d]">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-[#405a5e]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
