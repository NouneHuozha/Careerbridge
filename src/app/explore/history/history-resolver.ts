import { fieldGuideData } from "../fields/field-data";
import { courseCatalog } from "../courses/catalog/course-catalog-data";
import { institutionProfilePages } from "../institution-directory/institution-profile-data";
import type { StudyRoute } from "../../../db/pathway-types";
import type { Examination } from "../../../db/examination-types";
import type { Scholarship } from "../../../db/scholarship-types";
import { resolvedInstitutionCampusOfferings } from "../institutions/institution-data";
import type { ExplorationHistoryItem } from "../exploration-history";
import type { SavedItemType } from "../saved-items";

export type ResolvedHistoryItem = {
  item: ExplorationHistoryItem;
  category: Exclude<SavedItemType, "institution-offering">;
  label: string;
  title: string;
  description: string;
  href: string;
};

export function resolveHistoryItem(
  item: ExplorationHistoryItem,
  pathways: StudyRoute[],
  examinations: Examination[],
  scholarships: Scholarship[],
): ResolvedHistoryItem {
  if (item.type === "field") {
    const field = fieldGuideData[item.id as keyof typeof fieldGuideData];
    if (field) {
      return {
        item,
        category: "field",
        label: "Field",
        title: field.name,
        description: field.description,
        href: `/explore/fields/${field.id}${item.context?.stage ? `?stage=${encodeURIComponent(item.context.stage)}` : ""}`,
      };
    }
  }

  if (item.type === "course") {
    const course = courseCatalog.find((entry) => entry.id === item.id);
    if (course) {
      return {
        item,
        category: "course",
        label: "Course",
        title: course.name,
        description: course.description,
        href: `/explore/courses/catalog/${course.id}${item.context?.stage ? `?stage=${encodeURIComponent(item.context.stage)}` : ""}`,
      };
    }
  }

  if (item.type === "institution") {
    const institution = institutionProfilePages.find((entry) => entry.slug === item.id);
    if (institution) {
      return {
        item,
        category: "institution",
        label: "Institution",
        title: institution.name,
        description: institution.introduction ?? institution.description ?? "Institution profile and available study information.",
        href: `/explore/institution-directory/${institution.slug}`,
      };
    }
  }

  if (item.type === "institution-offering") {
    const offering = resolvedInstitutionCampusOfferings.find(
      (entry) => entry.slug === item.id && entry.courseId === item.context?.courseId,
    );
    if (offering && item.context?.courseId) {
      const courseName = courseCatalog.find(
        (entry) => entry.id === item.context?.courseId,
      )?.name ?? item.context.courseName ?? item.context.courseId;
      const params = new URLSearchParams({
        course: item.context.courseId,
        courseName,
        field: item.context.fieldId ?? "",
      });
      if (item.context.stage) params.set("stage", item.context.stage);
      return {
        item,
        category: "institution",
        label: "Course-specific institution option",
        title: offering.institution.name,
        description: `Institution listing for ${courseName}${offering.campus.name ? ` · ${offering.campus.name}` : ""}.`,
        href: `/explore/institutions/${offering.slug}?${params.toString()}`,
      };
    }
  }

  if (item.type === "pathway") {
    const route = pathways.find((entry) => entry.id === item.id);
    if (route) {
      const params = new URLSearchParams({ stage: route.stage });
      if (item.context?.fieldId) params.set("field", item.context.fieldId);
      return {
        item,
        category: "pathway",
        label: "Pathway",
        title: route.title,
        description: route.description,
        href: `/explore/pathways/${route.id}?${params.toString()}`,
      };
    }
  }

  if (item.type === "examination") {
    const examination = examinations.find((entry) => entry.id === item.id);
    if (examination) {
      const params = new URLSearchParams();
      if (item.context?.stage) params.set("stage", item.context.stage);
      if (item.context?.fieldId) params.set("field", item.context.fieldId);
      return {
        item,
        category: "examination",
        label: "Examination",
        title: examination.name,
        description: examination.purpose,
        href: `/explore/examinations/${examination.id}${params.size ? `?${params}` : ""}`,
      };
    }
  }

  if (item.type === "scholarship") {
    const scholarship = scholarships.find((entry) => entry.id === item.id);
    if (scholarship) {
      const params = new URLSearchParams();
      if (item.context?.stage) params.set("stage", item.context.stage);
      if (item.context?.fieldId) params.set("field", item.context.fieldId);
      return {
        item,
        category: "scholarship",
        label: "Scholarship",
        title: scholarship.name,
        description: scholarship.purpose,
        href: `/explore/scholarships/${scholarship.id}${params.size ? `?${params}` : ""}`,
      };
    }
  }

  return {
    item,
    category: item.type === "institution-offering" ? "institution" : item.type,
    label: item.type === "institution-offering" ? "Course-specific institution option" : item.type,
    title: "This item is no longer available",
    description: "It is no longer in the current catalogue.",
    href: "/explore/history",
  };
}
