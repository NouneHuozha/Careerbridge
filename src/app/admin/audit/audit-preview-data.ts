import type {
  AdminAuditAction,
  AdminAuditKind,
} from "../../../db/schema/catalog";
import type { CatalogueCategorySlug } from "../catalogue/catalogue-preview-data";

export type AuditPreviewEvent = {
  id: string;
  createdAt: string;
  actorName: string;
  action: AdminAuditAction;
  kind: AdminAuditKind;
  itemId: string;
  itemTitle: string;
  recordSubtitle: string;
  categorySlug: CatalogueCategorySlug;
  revisionId: string;
  revisionNumber: number;
};

export type AuditPreviewEventWithLinks = AuditPreviewEvent & {
  recordHref: string;
  revisionHref: string;
};

export const auditActionLabels: Record<AdminAuditAction, string> = {
  submit: "Submitted",
  "associate-source": "Source linked",
  review: "Reviewed",
  approve: "Approved",
  reject: "Rejected",
  publish: "Published",
};

export const auditActionVerbs: Record<AdminAuditAction, string> = {
  submit: "Submit",
  "associate-source": "Associate source",
  review: "Review",
  approve: "Approve",
  reject: "Reject",
  publish: "Publish",
};

export const auditEventTitles: Record<AdminAuditAction, string> = {
  submit: "Submission event",
  "associate-source": "Source association event",
  review: "Review event",
  approve: "Approval event",
  reject: "Rejection event",
  publish: "Publication event",
};

export const auditActivityTitles: Record<AdminAuditAction, string> = {
  submit: "Revision submitted",
  "associate-source": "Source associated with revision",
  review: "Revision reviewed",
  approve: "Revision approved",
  reject: "Revision rejected",
  publish: "Revision published",
};

export const auditKindLabels: Record<AdminAuditKind, string> = {
  exam: "Examination",
  scholarship: "Scholarship",
  institution: "Institution",
  campus: "Campus",
  course_offering: "Course offering",
  pathway: "Pathway",
};

export const auditPreviewEvents = ([
  {
    id: "preview-event-001",
    createdAt: "2026-11-27T14:20:00+05:30",
    actorName: "Admin",
    action: "publish",
    kind: "institution",
    itemId: "CB-INST-001",
    itemTitle: "Assam Down Town University",
    recordSubtitle: "Institution · Assam",
    categorySlug: "institutions",
    revisionId: "PREVIEW-REVISION-INST-003",
    revisionNumber: 3,
  },
  {
    id: "preview-event-002",
    createdAt: "2026-11-27T11:30:00+05:30",
    actorName: "Admin",
    action: "publish",
    kind: "course_offering",
    itemId: "CB-OFFER-001",
    itemTitle: "BCA — Assam Down Town University",
    recordSubtitle: "Course offering",
    categorySlug: "course-offerings",
    revisionId: "PREVIEW-REVISION-OFFER-002",
    revisionNumber: 2,
  },
  {
    id: "preview-event-003",
    createdAt: "2026-11-27T10:20:00+05:30",
    actorName: "Admin",
    action: "approve",
    kind: "course_offering",
    itemId: "CB-OFFER-001",
    itemTitle: "BCA — Assam Down Town University",
    recordSubtitle: "Course offering",
    categorySlug: "course-offerings",
    revisionId: "PREVIEW-REVISION-OFFER-002",
    revisionNumber: 2,
  },
  {
    id: "preview-event-004",
    createdAt: "2026-11-26T16:05:00+05:30",
    actorName: "Catalogue Reviewer",
    action: "review",
    kind: "exam",
    itemId: "CB-EXAM-003",
    itemTitle: "National Eligibility cum Entrance Test (NEET)",
    recordSubtitle: "Examination · National",
    categorySlug: "examinations",
    revisionId: "PREVIEW-REVISION-EXAM-001",
    revisionNumber: 1,
  },
  {
    id: "preview-event-005",
    createdAt: "2026-11-26T14:30:00+05:30",
    actorName: "Admin",
    action: "submit",
    kind: "course_offering",
    itemId: "CB-OFFER-001",
    itemTitle: "BCA — Assam Down Town University",
    recordSubtitle: "Course offering",
    categorySlug: "course-offerings",
    revisionId: "PREVIEW-REVISION-OFFER-002",
    revisionNumber: 2,
  },
  {
    id: "preview-event-006",
    createdAt: "2026-11-26T12:10:00+05:30",
    actorName: "Admin",
    action: "submit",
    kind: "exam",
    itemId: "CB-EXAM-003",
    itemTitle: "National Eligibility cum Entrance Test (NEET)",
    recordSubtitle: "Examination · National",
    categorySlug: "examinations",
    revisionId: "PREVIEW-REVISION-EXAM-001",
    revisionNumber: 1,
  },
] satisfies AuditPreviewEvent[]).map((event) => ({
  ...event,
  recordHref: `/admin/catalogue/${event.categorySlug}/${event.itemId}`,
  revisionHref: `/admin/catalogue/${event.categorySlug}/${event.itemId}?tab=revisions`,
}));

export function getAuditPreviewEventById(eventId: string) {
  return auditPreviewEvents.find((event) => event.id === eventId);
}

export function getAuditPreviewEventsForRecord(
  categorySlug: string,
  itemId: string,
) {
  return auditPreviewEvents.filter(
    (event) => event.categorySlug === categorySlug && event.itemId === itemId,
  );
}
