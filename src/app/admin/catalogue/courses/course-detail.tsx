import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  GitCompareArrows,
  History,
  Link2,
  Pencil,
} from "lucide-react";
import type {
  AdminCourseDetail,
  AdminCourseOffering,
  AdminCourseRevision,
} from "../../../../db/admin-courses";
import { AdminDate } from "../../admin-date";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
} from "../../admin-ui";
import { CourseLifecycleActions } from "./course-lifecycle-actions";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "offerings", label: "Institutions & Offerings" },
  { id: "sources", label: "Sources & Evidence" },
  { id: "history", label: "Revision History" },
] as const;

type CourseTab = (typeof tabs)[number]["id"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function stageLabel(stage: string) {
  if (stage === "class-10") return "After Class 10";
  if (stage === "class-12") return "After Class 12";
  return stage;
}

function safeHttpsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function toneClass(tone: "published" | "review" | "draft" | "archived" | "muted") {
  return {
    published: "border-[#9ed9b7] bg-[#d8f6e3] text-[#17643a]",
    review: "border-[#f2c56b] bg-[#fff0c2] text-[#8b4b08]",
    draft: "border-[#9dc9f4] bg-[#e1f1ff] text-[#175b91]",
    archived: "border-[#efb2ad] bg-[#fee4e2] text-[#9b2c25]",
    muted: "border-[#d7dfdc] bg-[#eef2f0] text-[#586b65]",
  }[tone];
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "published" | "review" | "draft" | "archived" | "muted";
}) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold leading-none ${toneClass(tone)}`}>
      {children}
    </span>
  );
}

function publicationStatus(course: AdminCourseDetail) {
  if (course.publishedVersionAvailable) {
    const updateStatus = course.latestRevisionId === course.publishedRevisionId
      ? null
      : course.publicationStatus === "in_review" || course.publicationStatus === "approved"
        ? { label: "Update needs review", tone: "review" as const }
        : course.publicationStatus === "draft"
          ? { label: "Draft update", tone: "draft" as const }
          : course.publicationStatus === "rejected"
            ? { label: "Update rejected", tone: "review" as const }
            : null;
    return {
      primary: { label: "Published", tone: "published" as const },
      secondary: updateStatus,
    };
  }
  if (course.publicationStatus === "in_review" || course.publicationStatus === "approved") {
    return {
      primary: { label: "Needs review", tone: "review" as const },
      secondary: null,
    };
  }
  if (course.publicationStatus === "archived") {
    return {
      primary: { label: "Archived", tone: "archived" as const },
      secondary: null,
    };
  }
  return {
    primary: { label: "Draft", tone: "draft" as const },
    secondary: course.publicationStatus === "rejected"
      ? { label: "Rejected", tone: "review" as const }
      : null,
  };
}

function ContentValue({ value }: { value: unknown }) {
  const content = text(value);
  return content ? (
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#405a5e]">{content}</p>
  ) : (
    <p className="text-sm italic text-[#879590]">Not recorded</p>
  );
}

function DetailValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[#71817d]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[#405a5e]">{children}</dd>
    </div>
  );
}

function displayValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.filter((item) =>
      typeof item === "string" || typeof item === "number" || typeof item === "boolean",
    );
    return items.length ? items.map(String).join(", ") : null;
  }
  return null;
}

function tabHref(courseId: string, tab: CourseTab) {
  return `/admin/catalogue/courses/${encodeURIComponent(courseId)}?tab=${tab}`;
}

function revisionCompareHref(courseId: string, from: string, to: string) {
  const params = new URLSearchParams({ tab: "history", compareFrom: from, compareTo: to });
  return `/admin/catalogue/courses/${encodeURIComponent(courseId)}?${params.toString()}#revision-comparison`;
}

function learningAreas(content: Record<string, unknown>) {
  if (!Array.isArray(content.learningAreas)) return [];
  return content.learningAreas.filter((area): area is { title: string; description: string } =>
    isRecord(area) && typeof area.title === "string" && typeof area.description === "string",
  );
}

function CourseOverview({ course }: { course: AdminCourseDetail }) {
  const areas = learningAreas(course.content);
  const hasProviderScopedContent =
    Boolean(text(course.content.providerDescription)) ||
    course.sources.some((source) =>
      source.category === "course_offering" || source.category === "admission_notice",
    );

  return (
    <div className="space-y-5">
      {hasProviderScopedContent && (
        <section
          aria-label="Provider-specific information notice"
          className="rounded-xl border border-[#f2c56b] bg-[#fff8e6] p-4 text-sm leading-6 text-[#74440e]"
        >
          Some stored Course content or evidence is provider-specific. It is shown as recorded; do not assume it applies to every institution offering this Course.
        </section>
      )}

      <AdminSectionCard
        id="course-overview"
        title="Overview"
        description="Information from the latest real Course revision."
      >
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue label="Canonical Course ID">
            <span className="font-mono">{course.id}</span>
          </DetailValue>
          <DetailValue label="Qualification">{course.qualification || "Not recorded"}</DetailValue>
          <DetailValue label="Related Field">
            <Link
              href={`/admin/catalogue/fields/${encodeURIComponent(course.fieldId)}`}
              className="font-semibold text-[#286c60] underline-offset-2 hover:underline"
            >
              {course.fieldTitle}
            </Link>
          </DetailValue>
          <DetailValue label="Entry stage">
            {course.stages.length ? course.stages.map(stageLabel).join(" · ") : "Not recorded"}
          </DetailValue>
          <DetailValue label="Latest revision">
            Revision {course.revisionNumber}
          </DetailValue>
          <DetailValue label="Latest revision status">
            {course.publicationStatus.replaceAll("_", " ")}
          </DetailValue>
          <DetailValue label="Verification status">
            {course.verificationStatus.replaceAll("_", " ")}
          </DetailValue>
          <DetailValue label="Last updated">
            <AdminDate value={course.updatedAt} includeTime />
          </DetailValue>
        </dl>

        <div className="mt-6 grid gap-5 border-t border-[#edf1ee] pt-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[#17364a]">Summary</h3>
            <div className="mt-2"><ContentValue value={course.summary} /></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#17364a]">Description</h3>
            <div className="mt-2"><ContentValue value={course.description} /></div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        id="course-content"
        title="Course content"
        description="Stored Course information only. Missing data is not inferred from a specific institution's offering."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[#17364a]">What students learn</h3>
            {areas.length ? (
              <ul className="mt-3 space-y-3">
                {areas.map((area, index) => (
                  <li key={`${area.title}-${index}`} className="rounded-lg border border-[#edf1ee] bg-[#fbfcfb] p-3">
                    <h4 className="text-sm font-semibold text-[#17364a]">{area.title}</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526b72]">
                      {area.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2"><ContentValue value={null} /></div>
            )}
          </div>
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-[#17364a]">Entry after Class 10</h3>
              <div className="mt-2"><ContentValue value={course.entryAfterClass10} /></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17364a]">Entry after Class 12</h3>
              <div className="mt-2"><ContentValue value={course.entryAfterClass12} /></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17364a]">Admission information</h3>
              <div className="mt-2"><ContentValue value={course.content.admission} /></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17364a]">Simple explanation</h3>
              <div className="mt-2"><ContentValue value={course.content.simpleExplanation} /></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17364a]">Learning experience</h3>
              <div className="mt-2"><ContentValue value={course.content.learningExperience} /></div>
            </div>
            {text(course.content.providerDescription) && (
              <div className="rounded-lg border border-[#f2c56b] bg-[#fff8e6] p-3">
                <h3 className="text-sm font-semibold text-[#74440e]">Provider-specific description</h3>
                <div className="mt-2 text-[#74440e]">
                  <ContentValue value={course.content.providerDescription} />
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        id="course-fields"
        title="Related Field"
        description="The Course revision's recorded Field relationship."
      >
        <Link
          href={`/admin/catalogue/fields/${encodeURIComponent(course.fieldId)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d7e1dc] bg-white px-4 text-sm font-semibold text-[#286c60] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          {course.fieldTitle}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </AdminSectionCard>
    </div>
  );
}

function offeringStatus(offering: AdminCourseOffering) {
  if (offering.publishedVersionAvailable) {
    const secondary = offering.latestRevisionId === offering.publishedRevisionId
      ? null
      : offering.publicationStatus === "in_review" || offering.publicationStatus === "approved"
        ? { label: "Update needs review", tone: "review" as const }
        : offering.publicationStatus === "draft"
          ? { label: "Draft update", tone: "draft" as const }
          : null;
    return { primary: { label: "Published", tone: "published" as const }, secondary };
  }
  if (offering.publicationStatus === "in_review" || offering.publicationStatus === "approved") {
    return { primary: { label: "Needs review", tone: "review" as const }, secondary: null };
  }
  if (offering.publicationStatus === "archived") {
    return { primary: { label: "Archived", tone: "archived" as const }, secondary: null };
  }
  return { primary: { label: "Draft", tone: "draft" as const }, secondary: null };
}

function OfferingsSection({ course }: { course: AdminCourseDetail }) {
  return (
    <AdminSectionCard
      id="course-offerings"
      title="Institutions & Offerings"
      description="Institution-specific delivery details are kept separate from general Course information."
      action={
        <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
          {course.offerings.length} {course.offerings.length === 1 ? "offering" : "offerings"}
        </span>
      }
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-[#526b72]">
          Each offering is a separate institution and campus record. Its duration, admission details, and evidence are not treated as general Course facts.
        </p>
        <div>
          <button
            type="button"
            disabled
            aria-describedby="course-offering-create-unavailable"
            className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-semibold text-[#526b72] opacity-60"
          >
            <Building2 aria-hidden="true" className="size-4" />
            Add Offering
          </button>
          <p id="course-offering-create-unavailable" className="mt-1 max-w-64 text-xs text-[#657976]">
            Offering creation and editing are not available in this workflow.
          </p>
        </div>
      </div>

      {course.offerings.length === 0 ? (
        <AdminEmptyState
          title="No real offerings recorded"
          description="This Course has no real institution offerings in the catalogue."
          icon={Building2}
        />
      ) : (
        <ul className="space-y-3">
          {course.offerings.map((offering) => {
            const status = offeringStatus(offering);
            const campusContent = isRecord(offering.campusContent) ? offering.campusContent : {};
            const institutionContent = isRecord(offering.institutionContent) ? offering.institutionContent : {};
            const location = [
              text(campusContent.locality),
              text(campusContent.city),
              text(campusContent.state) ?? offering.stateName,
            ].filter(Boolean).join(" · ");
            const duration = text(offering.details.duration);
            const institutionDetails = ["address", "phone", "email", "website"]
              .map((key) => ({ key, value: displayValue(institutionContent[key]) }))
              .filter(({ value }) => value !== null);
            const campusDetails = ["address", "phone", "email", "website"]
              .map((key) => ({ key, value: displayValue(campusContent[key]) }))
              .filter(({ value }) => value !== null);

            return (
              <li key={offering.catalogItemId} className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#17364a]">{offering.title}</h3>
                    <p className="mt-1 text-sm text-[#526b72]">
                      {offering.institutionTitle ?? "Institution not recorded"}
                      {offering.campusTitle ? ` · ${offering.campusTitle}` : ""}
                    </p>
                    {location && <p className="mt-1 text-xs text-[#657976]">{location}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge tone={status.primary.tone}>{status.primary.label}</StatusBadge>
                    {status.secondary && (
                      <StatusBadge tone={status.secondary.tone}>{status.secondary.label}</StatusBadge>
                    )}
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 border-t border-[#edf1ee] pt-4 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailValue label="Offering ID"><span className="font-mono">{offering.id}</span></DetailValue>
                  <DetailValue label="Duration">{duration ?? "Not recorded"}</DetailValue>
                  <DetailValue label="Revision">Revision {offering.revisionNumber}</DetailValue>
                  <DetailValue label="Last updated"><AdminDate value={offering.updatedAt} /></DetailValue>
                </dl>

                {(!offering.courseRevisionIsCurrentPublished ||
                  !offering.campusRevisionIsCurrentPublished ||
                  offering.institutionPublicationStatus !== "published") && (
                  <p className="mt-4 rounded-lg border border-[#f2c56b] bg-[#fff8e6] px-3 py-2 text-sm leading-5 text-[#74440e]">
                    This offering references a Course, campus, or institution version that is not the current published version. Review the relationship before treating it as current.
                  </p>
                )}

                <details className="mt-4 border-t border-[#edf1ee] pt-3">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#286c60] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]">
                    Open offering details
                  </summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#657976]">Institution & campus</h4>
                      <p className="mt-2 text-sm font-medium text-[#17364a]">
                        {offering.institutionTitle ?? "Institution not recorded"}
                      </p>
                      {offering.institutionType && (
                        <p className="mt-1 text-sm text-[#526b72]">{offering.institutionType}</p>
                      )}
                      <p className="mt-1 text-sm text-[#526b72]">{offering.campusTitle || "Campus not recorded"}</p>
                      {location && <p className="mt-1 text-sm text-[#526b72]">{location}</p>}
                      {offering.institutionId && (
                        <p className="mt-2 font-mono text-xs text-[#657976]">
                          Institution ID: {offering.institutionId}
                        </p>
                      )}
                      {institutionDetails.map(({ key, value }) => {
                        const websiteUrl = key === "website" ? safeHttpsUrl(value) : null;
                        return (
                          <p key={`institution-${key}`} className="mt-2 break-words text-sm text-[#526b72]">
                            <span className="font-medium capitalize">{key}: </span>
                            {websiteUrl ? (
                              <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-[#286c60] underline-offset-2 hover:underline">
                                {value}
                              </a>
                            ) : value}
                          </p>
                        );
                      })}
                      {campusDetails.map(({ key, value }) => {
                        const websiteUrl = key === "website" ? safeHttpsUrl(value) : null;
                        return (
                          <p key={`campus-${key}`} className="mt-2 break-words text-sm text-[#526b72]">
                            <span className="font-medium capitalize">Campus {key}: </span>
                            {websiteUrl ? (
                              <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-[#286c60] underline-offset-2 hover:underline">
                                {value}
                              </a>
                            ) : value}
                          </p>
                        );
                      })}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#657976]">Recorded offering details</h4>
                      {(offering.summary || offering.description) && (
                        <div className="mt-2 space-y-2">
                          {offering.summary && <ContentValue value={offering.summary} />}
                          {offering.description && <ContentValue value={offering.description} />}
                        </div>
                      )}
                      {Object.entries(offering.details).filter(([, value]) => displayValue(value) !== null).length ? (
                        <dl className="mt-2 space-y-2">
                          {Object.entries(offering.details)
                            .filter(([, value]) => displayValue(value) !== null)
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt className="text-xs font-medium text-[#71817d]">
                                  {key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}
                                </dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-[#405a5e]">
                                  {displayValue(value)}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      ) : (
                        <p className="mt-2 text-sm italic text-[#879590]">No additional offering details recorded.</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-[#657976]">
                        This offering references Course revision {offering.courseRevisionNumber ?? "unknown"} and campus revision {offering.campusRevisionNumber ?? "unknown"}.
                        {offering.provenanceCount > 0
                          ? ` ${offering.provenanceCount} source claim ${offering.provenanceCount === 1 ? "link is" : "links are"} attached to the offering revision.`
                          : " No source claim links are attached to the offering revision."}
                      </p>
                      {offering.sources.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {offering.sources.map((source) => {
                            const sourceUrl = safeHttpsUrl(source.url);
                            return (
                              <li key={source.id} className="rounded-lg border border-[#edf1ee] bg-[#fbfcfb] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-[#17364a]">{source.name}</span>
                                  <StatusBadge tone={source.status === "active" ? "published" : "archived"}>
                                    {source.status.replaceAll("_", " ")}
                                  </StatusBadge>
                                </div>
                                <p className="mt-1 text-xs text-[#657976]">
                                  {source.category.replaceAll("_", " ")} · {source.claims.map((claim) => claim.claimKey).join(", ")}
                                </p>
                                {sourceUrl && (
                                  <a
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-xs font-medium text-[#286c60] underline-offset-2 hover:underline"
                                  >
                                    {sourceUrl}
                                    <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
                                  </a>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </AdminSectionCard>
  );
}

function verificationTone(status: string | null) {
  if (status === "verified") return "published" as const;
  if (status === "disputed" || status === "expired" || status === "stale") return "archived" as const;
  if (status === "pending_review" || status === "partially_verified") return "review" as const;
  return "muted" as const;
}

function SourcesSection({ course }: { course: AdminCourseDetail }) {
  return (
    <AdminSectionCard
      id="course-sources"
      title="Sources & Evidence"
      description={`Source associations for the latest Course revision (Revision ${course.revisionNumber}).`}
      action={
        <button
          type="button"
          disabled
          aria-describedby="course-source-create-unavailable"
          className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-semibold text-[#526b72] opacity-60"
        >
          <Link2 aria-hidden="true" className="size-4" />
          Add Source
        </button>
      }
    >
      <p id="course-source-create-unavailable" className="-mt-2 mb-4 text-xs text-[#657976]">
        Source changes require a saved Course draft; the Course editor is not available yet.
      </p>
      <p className="mb-5 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2.5 text-sm leading-5 text-[#1e3a5f]">
        Sources attached to a Course Offering revision are shown inside that offering, not treated as general Course evidence. The records below are attached directly to this Course revision and retain their registry category and claim links.
      </p>

      {course.sources.length === 0 ? (
        <AdminEmptyState
          title="No sources linked to this revision"
          description="No source evidence is associated with the latest real Course revision."
          icon={Link2}
        />
      ) : (
        <ul className="space-y-3">
          {course.sources.map((source) => {
            const url = safeHttpsUrl(source.url);
            return (
              <li key={source.id} className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#17364a]">{source.name}</h3>
                    <p className="mt-1 text-sm text-[#526b72]">
                      {source.authority ?? "Authority not recorded"} · {source.category.replaceAll("_", " ")}
                    </p>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-[#286c60] underline-offset-2 hover:underline"
                      >
                        {url}
                        <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-2 text-sm italic text-[#879590]">No safe HTTPS source link recorded.</p>
                    )}
                  </div>
                  <StatusBadge tone={source.status === "active" ? "published" : "archived"}>
                    {source.status.replaceAll("_", " ")}
                  </StatusBadge>
                </div>

                {(source.category === "course_offering" || source.category === "admission_notice") && (
                  <p className="mt-4 rounded-lg border border-[#f2c56b] bg-[#fff8e6] px-3 py-2 text-sm leading-5 text-[#74440e]">
                    This source is attached to the Course revision, but its registry category is institution- or offering-specific. Confirm its claims apply to the Course itself before relying on them generally.
                  </p>
                )}

                <div className="mt-4 border-t border-[#edf1ee] pt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[#657976]">Supported Course claims</h4>
                  <ul className="mt-2 space-y-2">
                    {source.claims.map((claim) => (
                      <li
                        key={claim.claimKey}
                        className="flex flex-col gap-2 rounded-lg bg-[#f8faf8] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-mono text-xs text-[#405a5e]">{claim.claimKey}</span>
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={verificationTone(claim.verificationStatus)}>
                            {(claim.verificationStatus ?? "not reviewed").replaceAll("_", " ")}
                          </StatusBadge>
                          {claim.checkedAt && (
                            <span className="text-xs text-[#657976]">
                              Checked <AdminDate value={new Date(claim.checkedAt)} />
                            </span>
                          )}
                          {claim.verifiedAt && (
                            <span className="text-xs text-[#657976]">
                              Verified <AdminDate value={new Date(claim.verifiedAt)} />
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminSectionCard>
  );
}

function entryStage(revision: AdminCourseRevision) {
  return revision.stages.length ? revision.stages.map(stageLabel).join(" · ") : "Not recorded";
}

function revisionStatus(revision: AdminCourseRevision) {
  if (revision.publicationStatus === "published") return { label: "Published", tone: "published" as const };
  if (revision.publicationStatus === "approved" || revision.publicationStatus === "in_review") {
    return { label: "Needs review", tone: "review" as const };
  }
  if (revision.publicationStatus === "archived") return { label: "Archived", tone: "archived" as const };
  return { label: revision.publicationStatus === "rejected" ? "Rejected" : "Draft", tone: "draft" as const };
}

function comparisonValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function learningAreaComparison(content: Record<string, unknown>) {
  const areas = learningAreas(content);
  return areas.length
    ? areas.map((area) => `${area.title}\n${area.description}`).join("\n\n")
    : null;
}

function comparisonRows(from: AdminCourseRevision, to: AdminCourseRevision) {
  return [
    { label: "Title", before: from.title, after: to.title },
    { label: "Summary", before: from.summary, after: to.summary },
    { label: "Description", before: from.description, after: to.description },
    { label: "Qualification", before: from.qualification, after: to.qualification },
    { label: "Entry stage", before: entryStage(from), after: entryStage(to) },
    { label: "Entry after Class 10", before: from.entryAfterClass10, after: to.entryAfterClass10 },
    { label: "Entry after Class 12", before: from.entryAfterClass12, after: to.entryAfterClass12 },
    { label: "Simple explanation", before: from.content.simpleExplanation, after: to.content.simpleExplanation },
    { label: "Learning areas", before: learningAreaComparison(from.content), after: learningAreaComparison(to.content) },
    { label: "Learning experience", before: from.content.learningExperience, after: to.content.learningExperience },
    { label: "Admission information", before: from.content.admission, after: to.content.admission },
    { label: "Provider-specific description", before: from.content.providerDescription, after: to.content.providerDescription },
  ];
}

function RevisionHistory({
  course,
  compareFrom,
  compareTo,
}: {
  course: AdminCourseDetail;
  compareFrom?: string;
  compareTo?: string;
}) {
  const latest = course.revisions[0];
  const from = course.revisions.find((revision) => revision.id === compareFrom);
  const to = course.revisions.find((revision) => revision.id === compareTo);
  const comparison = from && to && from.id !== to.id ? comparisonRows(from, to) : [];

  return (
    <AdminSectionCard
      id="course-revisions"
      title="Revision History"
      description="Real Course revisions are shown in newest-first order. Demo and test revisions are excluded."
      action={
        <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
          {course.revisions.length} {course.revisions.length === 1 ? "revision" : "revisions"}
        </span>
      }
    >
      {course.revisions.length === 0 ? (
        <AdminEmptyState
          title="No real revisions recorded"
          description="A real Course revision has not been created yet."
          icon={History}
        />
      ) : (
        <ol className="divide-y divide-[#edf1ee]">
          {course.revisions.map((revision) => {
            const status = revisionStatus(revision);
            const compareHref = latest && latest.id !== revision.id
              ? revisionCompareHref(course.id, revision.id, latest.id)
              : null;
            return (
              <li key={revision.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#17364a]">Revision {revision.revisionNumber}</h3>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      {revision.id === course.publishedRevisionId && (
                        <StatusBadge tone="published">Student version</StatusBadge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#405a5e]">{revision.title}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#657976]">
                      <span>Created <AdminDate value={revision.createdAt} /></span>
                      <span aria-hidden="true">·</span>
                      <span>Updated <AdminDate value={revision.updatedAt} includeTime /></span>
                      <span aria-hidden="true">·</span>
                      <span>{revision.provenanceCount} source claim {revision.provenanceCount === 1 ? "link" : "links"}</span>
                      {revision.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Published <AdminDate value={revision.publishedAt} includeTime /></span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {compareHref && (
                      <Link
                        href={compareHref}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7e1dc] px-3 text-xs font-semibold text-[#286c60] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
                      >
                        <GitCompareArrows aria-hidden="true" className="size-3.5" />
                        Compare with latest
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {comparison.length > 0 && from && to && (
        <section
          id="revision-comparison"
          aria-labelledby="course-revision-comparison-heading"
          className="mt-6 rounded-xl border border-[#dce5e0] bg-[#f8faf8] p-4 sm:p-5"
        >
          <h3 id="course-revision-comparison-heading" className="flex items-center gap-2 font-semibold text-[#17364a]">
            <GitCompareArrows aria-hidden="true" className="size-4" />
            Revision {from.revisionNumber} compared with Revision {to.revisionNumber}
          </h3>
          <dl className="mt-4 divide-y divide-[#e3eae5]">
            {comparison.map((row) => {
              const before = comparisonValue(row.before);
              const after = comparisonValue(row.after);
              const changed = before !== after;
              return (
                <div key={row.label} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr_1fr]">
                  <dt className="text-xs font-semibold text-[#526b72]">{row.label}</dt>
                  <dd className={`whitespace-pre-wrap break-words text-sm leading-6 ${changed ? "text-[#74440e]" : "text-[#526b72]"}`}>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#71817d]">
                      Revision {from.revisionNumber}
                    </span>
                    {before}
                  </dd>
                  <dd className={`whitespace-pre-wrap break-words text-sm leading-6 ${changed ? "text-[#17643a]" : "text-[#526b72]"}`}>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#71817d]">
                      Revision {to.revisionNumber}
                    </span>
                    {after}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
    </AdminSectionCard>
  );
}

export function CourseDetail({
  course,
  tab,
  compareFrom,
  compareTo,
}: {
  course: AdminCourseDetail;
  tab: CourseTab;
  compareFrom?: string;
  compareTo?: string;
}) {
  const baseHref = `/admin/catalogue/courses/${encodeURIComponent(course.id)}`;
  const statuses = publicationStatus(course);
  const editUnavailableId = "course-editor-unavailable";
  const publishedRevision = course.revisions.find(
    (revision) => revision.id === course.publishedRevisionId,
  );
  const hasUnpublishedUpdate =
    course.publishedVersionAvailable &&
    course.latestRevisionId !== course.publishedRevisionId;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href="/admin/catalogue/courses"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#526b72] transition-colors hover:bg-white hover:text-[#17364a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Courses
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader
          eyebrow={`Catalogue / Courses / ${course.id}`}
          title={course.title}
          description={course.summary ?? "No summary has been recorded for this Course."}
        />
        <div className="mb-6 flex shrink-0 flex-col items-start gap-1">
          <button
            type="button"
            disabled
            aria-describedby={editUnavailableId}
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[#d7e1dc] bg-white px-4 text-sm font-semibold text-[#286c60] opacity-60"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit Course
          </button>
          <span id={editUnavailableId} className="text-xs text-[#657976]">
            Course editing is not available yet.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={statuses.primary.tone}>{statuses.primary.label}</StatusBadge>
        {statuses.secondary && (
          <StatusBadge tone={statuses.secondary.tone}>{statuses.secondary.label}</StatusBadge>
        )}
        <StatusBadge tone={verificationTone(course.verificationStatus)}>
          Verification: {course.verificationStatus.replaceAll("_", " ")}
        </StatusBadge>
        <CourseLifecycleActions course={course} />
      </div>

      {course.publishedVersionAvailable && (
        <section
          aria-labelledby="course-publication-state"
          className={`rounded-xl border p-4 sm:p-5 ${
            hasUnpublishedUpdate
              ? course.publicationStatus === "in_review" || course.publicationStatus === "approved"
                ? "border-[#f2c56b] bg-[#fff8e6]"
                : "border-[#9dc9f4] bg-[#eff6ff]"
              : "border-[#9ed9b7] bg-[#f0fdf4]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="course-publication-state" className="font-semibold text-[#17364a]">
                {hasUnpublishedUpdate ? "Published version remains live" : "Published for students"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#405a5e]">
                Students currently see {publishedRevision
                  ? `Revision ${publishedRevision.revisionNumber}: “${publishedRevision.title}”.`
                  : "the recorded published version."}
                {hasUnpublishedUpdate
                  ? ` The latest saved version is Revision ${course.revisionNumber}; it is not public yet.`
                  : " This is the latest saved version."}
              </p>
            </div>
            {course.publishedAt && (
              <p className="text-xs font-medium text-[#526b72]">
                Last published <AdminDate value={course.publishedAt} includeTime />
              </p>
            )}
          </div>
          {hasUnpublishedUpdate && course.publishedRevisionId && (
            <Link
              href={revisionCompareHref(course.id, course.publishedRevisionId, course.latestRevisionId)}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7e1dc] bg-white px-3 text-xs font-semibold text-[#286c60] hover:bg-[#f4f7f5]"
            >
              <GitCompareArrows aria-hidden="true" className="size-3.5" />
              Compare published and latest versions
            </Link>
          )}
        </section>
      )}

      {!course.publishedVersionAvailable && course.publicationStatus === "archived" && (
        <section className="rounded-xl border border-[#efb2ad] bg-[#fff1ef] p-4 sm:p-5">
          <h2 className="font-semibold text-[#9b2c25]">Unpublished · Archived</h2>
          <p className="mt-1 text-sm leading-6 text-[#7f302a]">
            Students cannot see this Course. Its earlier published version remains in revision history.
          </p>
        </section>
      )}

      <nav aria-label="Course detail sections" className="overflow-x-auto border-b border-[#dce5e0]">
        <div className="flex min-w-max gap-1">
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={item.id === "overview" ? baseHref : tabHref(course.id, item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#377b78] ${
                tab === item.id
                  ? "border-[#286c60] text-[#17364a]"
                  : "border-transparent text-[#657976] hover:border-[#9bbab0] hover:text-[#286c60]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {tab === "overview" && <CourseOverview course={course} />}
      {tab === "offerings" && <OfferingsSection course={course} />}
      {tab === "sources" && <SourcesSection course={course} />}
      {tab === "history" && (
        <RevisionHistory course={course} compareFrom={compareFrom} compareTo={compareTo} />
      )}
    </div>
  );
}
