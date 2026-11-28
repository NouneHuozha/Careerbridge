import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  GitCompareArrows,
  GraduationCap,
  History,
  Link2,
  Pencil,
} from "lucide-react";
import type {
  AdminFieldDetail,
  AdminFieldRevision,
} from "../../../../db/admin-fields";
import type { FieldContent } from "../../../../db/fields";
import { AdminDate } from "../../admin-date";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../../admin-ui";
import { FieldLifecycleActions } from "./field-lifecycle-actions";
import { FieldStatusBadge, fieldVerificationLabels } from "./field-ui";

const fieldContentSections = [
  { key: "introduction", label: "Introduction" },
  { key: "broadlyInvolves", label: "Broadly involves" },
  { key: "activitiesAndWorkAreas", label: "Activities and work areas" },
  { key: "learningAndSubjectConnections", label: "Learning and subject connections" },
  { key: "courseFamiliesToExplore", label: "Course families to explore" },
  { key: "furtherExploration", label: "Further exploration" },
] as const satisfies readonly { key: keyof FieldContent; label: string }[];

function safeHttpsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function revisionCompareHref(from: string, to: string) {
  const params = new URLSearchParams({ compareFrom: from, compareTo: to });
  return `?${params.toString()}#revision-comparison`;
}

function comparisonRows(from: AdminFieldRevision, to: AdminFieldRevision) {
  return [
    { label: "Title", before: from.title, after: to.title },
    { label: "Summary", before: from.summary, after: to.summary },
    { label: "Description", before: from.description, after: to.description },
    ...fieldContentSections.map(({ key, label }) => ({
      label,
      before: from.content[key],
      after: to.content[key],
    })),
  ];
}

function ContentValue({ value }: { value: string | null | undefined }) {
  return value ? (
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#405a5e]">{value}</p>
  ) : (
    <p className="text-sm italic text-[#879590]">Not recorded</p>
  );
}

export function FieldDetail({
  field,
  compareFrom,
  compareTo,
}: {
  field: AdminFieldDetail;
  compareFrom?: string;
  compareTo?: string;
}) {
  const fromRevision = field.revisions.find((revision) => revision.id === compareFrom);
  const toRevision = field.revisions.find((revision) => revision.id === compareTo);
  const validComparison =
    fromRevision && toRevision && fromRevision.id !== toRevision.id
      ? { from: fromRevision, to: toRevision }
      : null;
  const newestRevisionId = field.revisions[0]?.id;
  const fieldStatus = field.publishedVersionAvailable
    ? { label: "Published", tone: "published" as const }
    : field.publicationStatus === "in_review" || field.publicationStatus === "approved"
      ? { label: "Needs review", tone: "review" as const }
      : field.publicationStatus === "archived"
        ? { label: "Archived", tone: "archived" as const }
        : field.publicationStatus
          ? { label: "Draft", tone: "draft" as const }
          : { label: "No revision", tone: "muted" as const };
  const publishedRevision = field.revisions.find(
    (revision) => revision.id === field.publishedRevisionId,
  );
  const hasUnpublishedUpdate =
    field.publishedVersionAvailable &&
    field.latestRevisionId !== null &&
    field.latestRevisionId !== field.publishedRevisionId;
  const updateNeedsReview =
    field.publicationStatus === "in_review" || field.publicationStatus === "approved";
  const editHref = `/admin/catalogue/fields/${encodeURIComponent(field.id)}/edit`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href="/admin/catalogue/fields"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#526b72] transition-colors hover:bg-white hover:text-[#17364a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Fields
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader
          eyebrow={`Catalogue / Fields / ${field.id}`}
          title={field.title ?? "Untitled field"}
          description={field.summary ?? "No summary has been recorded for this Field."}
        />
        <div className="flex flex-wrap items-center gap-2 sm:mb-6">
          <Link
            href={editHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d7e1dc] px-4 text-sm font-semibold text-[#286c60] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit Field
          </Link>
          <FieldLifecycleActions field={field} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FieldStatusBadge tone={fieldStatus.tone}>{fieldStatus.label}</FieldStatusBadge>
        {field.publishedVersionAvailable &&
          hasUnpublishedUpdate &&
          updateNeedsReview && (
            <FieldStatusBadge tone="review">Update needs review</FieldStatusBadge>
          )}
        {field.publishedVersionAvailable &&
          hasUnpublishedUpdate &&
          (field.publicationStatus === "draft" || field.publicationStatus === "rejected") && (
            <FieldStatusBadge tone="draft">Draft update</FieldStatusBadge>
          )}
      </div>

      {field.publishedVersionAvailable ? (
        <section
          aria-labelledby="field-publication-state"
          className={`rounded-xl border p-4 sm:p-5 ${
            hasUnpublishedUpdate && updateNeedsReview
              ? "border-[#fcd34d] bg-[#fffbeb]"
              : hasUnpublishedUpdate
                ? "border-[#93c5fd] bg-[#eff6ff]"
                : "border-[#86efac] bg-[#f0fdf4]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="field-publication-state" className="font-semibold text-[#17364a]">
                {hasUnpublishedUpdate ? "Published version live" : "Published for students"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#405a5e]">
                Students currently see {publishedRevision
                  ? `“${publishedRevision.title}” (Revision ${publishedRevision.revisionNumber})`
                  : "the published version"}.
                {hasUnpublishedUpdate
                  ? updateNeedsReview
                    ? " A newer revision needs review and is not public yet."
                    : " A newer draft is not public yet."
                  : " This is the current published version."}
              </p>
            </div>
            {field.publishedAt && (
              <p className="text-xs font-medium text-[#526b72]">
                Published <AdminDate value={field.publishedAt} includeTime />
              </p>
            )}
          </div>
          {hasUnpublishedUpdate && !updateNeedsReview && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#bfdbfe] pt-3">
              <p className="text-sm leading-6 text-[#1e3a5f]">
                Edit this draft and choose <strong>Mark Ready for Review</strong>. The publish action will be available once it is ready.
              </p>
              <Link
                href={editHref}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#93c5fd] bg-white px-3 text-sm font-semibold text-[#1d4ed8] hover:bg-[#dbeafe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
              >
                Continue editing draft
              </Link>
            </div>
          )}
        </section>
      ) : field.publicationStatus === "in_review" || field.publicationStatus === "approved" ? (
        <section
          aria-labelledby="field-publication-state"
          className="rounded-xl border border-[#fcd34d] bg-[#fffbeb] p-4 sm:p-5"
        >
          <h2 id="field-publication-state" className="font-semibold text-[#78350f]">
            Needs review · Not visible to students
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#78350f]">
            This version is ready to publish. Use <strong>Publish Field</strong> above to make it visible to students.
          </p>
        </section>
      ) : field.publicationStatus === "archived" ? (
        <section
          aria-labelledby="field-publication-state"
          className="rounded-xl border border-[#fca5a5] bg-[#fef2f2] p-4 sm:p-5"
        >
          <h2 id="field-publication-state" className="font-semibold text-[#991b1b]">
            Unpublished · Archived
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#7f1d1d]">
            This Field is not visible to students. Its published version remains in the admin revision history.
          </p>
        </section>
      ) : field.publicationStatus === "draft" || field.publicationStatus === "rejected" ? (
        <section
          aria-labelledby="field-publication-state"
          className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="field-publication-state" className="font-semibold text-[#1e3a5f]">
                Draft · Not visible to students
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#1e3a5f]">
                Complete the Field, then choose <strong>Mark Ready for Review</strong> in the editor. Publish Field will appear here once it is ready.
              </p>
            </div>
            <Link
              href={editHref}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#93c5fd] bg-white px-3 text-sm font-semibold text-[#1d4ed8] hover:bg-[#dbeafe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
            >
              Continue editing
            </Link>
          </div>
        </section>
      ) : null}

      <AdminSectionCard
        id="field-overview"
        title="Overview"
        description="Current catalogue identity and latest revision details."
      >
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[#71817d]">Canonical Field ID</dt>
            <dd className="mt-1 break-all font-mono text-sm text-[#405a5e]">{field.id}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[#71817d]">Latest revision</dt>
            <dd className="mt-1 text-sm font-semibold text-[#17364a]">
              {field.revisionNumber === null ? "None" : `Revision ${field.revisionNumber}`}
            </dd>
            {field.latestRevisionId && (
              <dd className="mt-1 break-all font-mono text-xs text-[#71817d]">
                {field.latestRevisionId}
              </dd>
            )}
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[#71817d]">Last published</dt>
            <dd className="mt-1 text-sm text-[#405a5e]">
              {field.publishedAt ? <AdminDate value={field.publishedAt} includeTime /> : "Never published"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[#71817d]">Last updated</dt>
            <dd className="mt-1 text-sm text-[#405a5e]"><AdminDate value={field.updatedAt} includeTime /></dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-[#edf1ee] pt-5">
          <p className="text-xs font-medium text-[#71817d]">Description</p>
          <div className="mt-2"><ContentValue value={field.description} /></div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        id="field-content"
        title="Field content"
        description={field.publishedVersionAvailable && field.latestRevisionId !== field.publishedRevisionId
          ? "Showing the latest saved version. Students continue to see the last published version until this update is published."
          : "Information stored on the latest revision."}
      >
        {fieldContentSections.map(({ key, label }) => (
          <div key={key} className="border-b border-[#edf1ee] py-4 first:pt-0 last:border-0 last:pb-0">
            <h3 className="text-sm font-semibold text-[#17364a]">{label}</h3>
            <div className="mt-2">
              <ContentValue value={field.content[key]} />
            </div>
          </div>
        ))}
      </AdminSectionCard>

      <AdminSectionCard
        id="field-revisions"
        title="Revisions"
        description="Revision history is read from the catalogue database."
        action={
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
            {field.revisions.length} {field.revisions.length === 1 ? "revision" : "revisions"}
          </span>
        }
      >
        {field.revisions.length === 0 ? (
          <AdminEmptyState
            title="No revisions recorded"
            description="A Field revision has not been created yet."
            icon={History}
          />
        ) : (
          <ol className="divide-y divide-[#edf1ee]">
            {field.revisions.map((revision) => (
              <li key={revision.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#17364a]">
                      Revision {revision.revisionNumber} · {revision.title}
                    </h3>
                    <p className="mt-1 break-all font-mono text-xs text-[#71817d]">{revision.id}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <FieldStatusBadge
                        tone={revision.publicationStatus === "published"
                          ? "published"
                          : revision.publicationStatus === "in_review" || revision.publicationStatus === "approved"
                            ? "review"
                            : revision.publicationStatus === "archived"
                              ? "archived"
                              : "draft"}
                      >
                        {revision.publicationStatus === "published"
                          ? "Published"
                          : revision.publicationStatus === "in_review" || revision.publicationStatus === "approved"
                            ? "Needs review"
                            : revision.publicationStatus === "archived"
                              ? "Archived"
                              : "Draft"}
                      </FieldStatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-[#657976]">
                      Updated <AdminDate value={revision.updatedAt} includeTime />
                      {revision.publishedAt && (
                        <> · Published <AdminDate value={revision.publishedAt} includeTime /></>
                      )}
                    </p>
                  </div>
                  {newestRevisionId && revision.id !== newestRevisionId && (
                    <Link
                      href={revisionCompareHref(revision.id, newestRevisionId)}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[#d7e1dc] px-3 text-sm font-semibold text-[#377b78] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
                    >
                      <GitCompareArrows aria-hidden="true" className="size-4" />
                      Compare with latest
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {field.revisions.length > 1 && (
          <div id="revision-comparison" className="mt-6 border-t border-[#e7ede9] pt-5">
            <div className="flex items-start gap-3">
              <GitCompareArrows aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#377b78]" />
              <div>
                <h3 className="font-semibold text-[#17364a]">Compare revisions</h3>
                <p className="mt-1 text-sm text-[#657976]">
                  Compare the saved content of any two revisions for this Field.
                </p>
              </div>
            </div>
            <form method="get" action={`/admin/catalogue/fields/${encodeURIComponent(field.id)}`} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs font-medium text-[#526b72]">
                From revision
                <select
                  name="compareFrom"
                  defaultValue={compareFrom ?? field.revisions[1]?.id}
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                >
                  {field.revisions.map((revision) => (
                    <option key={revision.id} value={revision.id}>
                      Revision {revision.revisionNumber} · {revision.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block flex-1 text-xs font-medium text-[#526b72]">
                To revision
                <select
                  name="compareTo"
                  defaultValue={compareTo ?? field.revisions[0]?.id}
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                >
                  {field.revisions.map((revision) => (
                    <option key={revision.id} value={revision.id}>
                      Revision {revision.revisionNumber} · {revision.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
              >
                <GitCompareArrows aria-hidden="true" className="size-4" />
                Compare
              </button>
            </form>

            {validComparison && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-[#dce5e0]">
                <table className="w-full min-w-[42rem] border-collapse text-left">
                  <thead className="bg-[#f5f8f6]">
                    <tr>
                      <th scope="col" className="w-40 px-4 py-3 text-xs font-semibold text-[#526b72]">Field</th>
                      <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#526b72]">
                        Revision {validComparison.from.revisionNumber}
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#526b72]">
                        Revision {validComparison.to.revisionNumber}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1ee]">
                    {comparisonRows(validComparison.from, validComparison.to).map((row) => (
                      <tr key={row.label}>
                        <th scope="row" className="align-top px-4 py-3 text-xs font-semibold text-[#405a5e]">{row.label}</th>
                        <td className="align-top px-4 py-3"><ContentValue value={row.before} /></td>
                        <td className="align-top px-4 py-3"><ContentValue value={row.after} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        id="field-sources"
        title="Sources & evidence"
        description="Source and claim provenance associated with the latest revision."
        action={
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
            {field.sources.length} {field.sources.length === 1 ? "claim" : "claims"}
          </span>
        }
      >
        {field.sources.length === 0 ? (
          <AdminEmptyState
            title="No source evidence linked"
            description="No provenance claims are associated with the latest revision."
            icon={Link2}
          />
        ) : (
          <ul className="divide-y divide-[#edf1ee]">
            {field.sources.map((source, index) => {
              const safeUrl = safeHttpsUrl(source.url);
              return (
                <li key={`${source.id}:${source.claimKey}:${index}`} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#17364a]">{source.name}</h3>
                      {source.authority && (
                        <p className="mt-1 text-sm text-[#657976]">{source.authority}</p>
                      )}
                    </div>
                    {source.verificationStatus && (
                      <FieldStatusBadge tone={source.verificationStatus === "pending_review" ? "pending" : "muted"}>
                        {fieldVerificationLabels[source.verificationStatus]}
                      </FieldStatusBadge>
                    )}
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-[#526b72]">
                    Claim: {source.claimKey || "General source"}
                  </p>
                  {safeUrl && (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#377b78] underline decoration-[#b8d1c6] underline-offset-2 hover:text-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
                    >
                      <BookOpenText aria-hidden="true" className="size-4" />
                      Open source
                    </a>
                  )}
                  <p className="mt-2 text-xs text-[#71817d]">
                    Checked <AdminDate value={source.checkedAt} fallback="No check date recorded" />
                    {source.verifiedAt && (
                      <> · Verified <AdminDate value={source.verifiedAt} /></>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        id="field-relationships"
        title="Relationships"
        description="Course records whose latest revision references this Field."
        action={
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
            {field.courses.length} {field.courses.length === 1 ? "course" : "courses"}
          </span>
        }
      >
        {field.courses.length === 0 ? (
          <AdminEmptyState
            title="No related courses"
            description="No latest Course revisions currently reference this Field."
            icon={GraduationCap}
          />
        ) : (
          <ul className="divide-y divide-[#edf1ee]">
            {field.courses.map((course) => (
              <li key={course.catalogItemId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <h3 className="font-semibold text-[#17364a]">{course.title}</h3>
                  <p className="mt-1 font-mono text-xs text-[#71817d]">
                    {course.id ?? course.catalogItemId} · Course revision {course.revisionNumber}
                  </p>
                </div>
                <AdminStatusBadge tone="muted">
                  Uses Field revision {course.fieldRevisionNumber ?? "unknown"}
                </AdminStatusBadge>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        id="field-activity"
        title="Activity"
        description="Administrative lifecycle events for this catalogue record."
      >
        <div className="flex items-start gap-3 rounded-lg border border-[#e8ece9] bg-[#f8faf8] p-4">
          <Clock3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#71817d]" />
          <p className="text-sm leading-6 text-[#526b72]">
            Field lifecycle events are not captured by the current audit-event system. The revision
            timestamps above are the available recorded history; no activity events are inferred.
          </p>
        </div>
      </AdminSectionCard>

    </div>
  );
}
