import type { CatalogItemType } from "../../../db/schema/catalog";
import type { CatalogueListingFilter, CatalogueListingRecord } from "./listing-utils";
import { coursePreviewFilters, coursePreviewRecords } from "./courses/preview-data";

export type CatalogueCategorySlug =
  | "courses"
  | "institutions"
  | "campuses"
  | "course-offerings"
  | "pathways"
  | "examinations"
  | "scholarships";

export type CatalogueEditorField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "multiselect" | "url";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
};

export type CataloguePreviewSource = {
  name: string;
  publisher: string;
  authority: string;
  url: string;
  sourceType: string;
  checkedAt: string;
  claimKeys: string[];
};

export type CataloguePreviewClaim = {
  key: string;
  label: string;
  value: string;
  status: "verified" | "pending_review" | "disputed" | "unavailable";
  sourceName?: string;
  evidence?: string;
  checkedAt?: string;
};

export type CataloguePreviewRevision = {
  number: number;
  status: string;
  date: string;
  note: string;
  current?: boolean;
};

export type CataloguePreviewRelationship = {
  label: string;
  title: string;
  itemType: CatalogItemType;
  href: string;
  context: string;
};

export type CataloguePreviewDetail = {
  description: string;
  sources: CataloguePreviewSource[];
  claims: CataloguePreviewClaim[];
  revisions: CataloguePreviewRevision[];
  relationships: CataloguePreviewRelationship[];
};

export type CatalogueCategoryDefinition = {
  slug: CatalogueCategorySlug;
  itemType: Exclude<CatalogItemType, "field">;
  label: string;
  singularLabel: string;
  description: string;
  records: CatalogueListingRecord[];
  filters: CatalogueListingFilter[];
  editorFields: CatalogueEditorField[];
};

const publicationOptions = [
  { label: "Draft", value: "draft" },
  { label: "In review", value: "in_review" },
  { label: "Approved", value: "approved" },
  { label: "Published", value: "published" },
  { label: "Rejected", value: "rejected" },
  { label: "Archived", value: "archived" },
];

const verificationOptions = [
  { label: "Verified", value: "verified" },
  { label: "Pending review", value: "pending_review" },
  { label: "Partially verified", value: "partially_verified" },
  { label: "Not reviewed", value: "unverified" },
  { label: "Not collected", value: "not_collected" },
  { label: "Unavailable", value: "unavailable" },
  { label: "Disputed", value: "disputed" },
  { label: "Stale", value: "stale" },
  { label: "Expired", value: "expired" },
];

function filtersWith(...specific: CatalogueListingFilter[]): CatalogueListingFilter[] {
  return [
    { key: "publicationStatus", label: "Publication", options: publicationOptions },
    { key: "verificationStatus", label: "Verification", options: verificationOptions },
    ...specific,
  ];
}

function selectField(
  key: string,
  label: string,
  options: string[],
  required = true,
): CatalogueEditorField {
  return { key, label, type: "select", options, required };
}

const institutionOptions = ["Assam Down Town University", "Gauhati University"];
const courseOptions = ["Bachelor of Computer Application", "Bachelor of Science", "Bachelor of Commerce"];
const campusOptions = ["Panikhaiti Campus", "Jalukbari Campus"];

export const catalogueCategoryDefinitions: CatalogueCategoryDefinition[] = [
  {
    slug: "courses",
    itemType: "course",
    label: "Courses",
    singularLabel: "Course",
    description: "Browse qualifications, fields and entry stages.",
    records: coursePreviewRecords,
    filters: coursePreviewFilters,
    editorFields: [
      selectField("field", "Field", ["Computer science", "Science", "Business"]),
      selectField("qualification", "Qualification", [
        "Higher secondary",
        "Degree",
        "Diploma",
        "Certificate",
        "Vocational",
        "Professional",
        "Skill training",
      ]),
      {
        key: "stages",
        label: "Entry stages",
        type: "multiselect",
        options: ["class-10", "class-12"],
        helpText: "Choose the supported entry stages.",
      },
      {
        key: "entryAfterClass10",
        label: "Entry after Class 10",
        type: "textarea",
      },
      {
        key: "entryAfterClass12",
        label: "Entry after Class 12",
        type: "textarea",
      },
    ],
  },
  {
    slug: "institutions",
    itemType: "institution",
    label: "Institutions",
    singularLabel: "Institution",
    description: "Browse institutions and their classification.",
    records: [
      {
        id: "CB-INST-001",
        title: "Assam Down Town University",
        aliases: ["adtu"],
        details: [
          { label: "Type", value: "University" },
          { label: "Ownership", value: "Private" },
        ],
        updatedAt: "2026-11-25T00:00:00.000Z",
        publicationStatus: "published",
        verificationStatus: "verified",
        filterValues: {
          institutionType: "University",
          ownership: "Private",
          publicationStatus: "published",
          verificationStatus: "verified",
        },
        summary: "A private university preview record.",
        description: "Institution details shown here are illustrative preview content.",
        currentRevision: 3,
        formValues: {
          title: "Assam Down Town University",
          summary: "A private university preview record.",
          description: "Institution details shown here are illustrative preview content.",
          slug: "assam-down-town-university",
          initials: "ADTU",
          institutionType: "University",
          ownership: "Private",
        },
      },
      {
        id: "CB-INST-002",
        title: "Gauhati University",
        aliases: ["gu"],
        details: [
          { label: "Type", value: "University" },
          { label: "Ownership", value: "Public" },
        ],
        updatedAt: "2026-11-22T00:00:00.000Z",
        publicationStatus: "draft",
        verificationStatus: "unverified",
        filterValues: {
          institutionType: "University",
          ownership: "Public",
          publicationStatus: "draft",
          verificationStatus: "unverified",
        },
        currentRevision: 1,
        formValues: {
          title: "Gauhati University",
          slug: "gauhati-university",
          initials: "GU",
          institutionType: "University",
          ownership: "Public",
        },
      },
    ],
    filters: filtersWith(
      {
        key: "institutionType",
        label: "Institution type",
        options: [
          { label: "College", value: "College" },
          { label: "University", value: "University" },
          { label: "Institute", value: "Institute" },
          { label: "School", value: "School" },
          { label: "Training centre", value: "Training centre" },
        ],
      },
      {
        key: "ownership",
        label: "Ownership",
        options: ["Government", "Private", "Public"].map((value) => ({ label: value, value })),
      },
    ),
    editorFields: [
      { key: "slug", label: "Stable slug", type: "text", required: true },
      { key: "initials", label: "Initials", type: "text", required: true },
      selectField("institutionType", "Institution type", [
        "College",
        "University",
        "Institute",
        "School",
        "Training centre",
      ]),
      {
        key: "ownership",
        label: "Ownership",
        type: "select",
        options: ["Government", "Private", "Public"],
      },
    ],
  },
  {
    slug: "campuses",
    itemType: "campus",
    label: "Campuses",
    singularLabel: "Campus",
    description: "Browse campus locations and their parent institutions.",
    records: [
      {
        id: "CB-CAMPUS-001",
        title: "Panikhaiti Campus",
        aliases: ["adtu-panikhaiti"],
        details: [
          { label: "Institution", value: "Assam Down Town University" },
          { label: "State", value: "Assam" },
        ],
        updatedAt: "2026-11-25T00:00:00.000Z",
        publicationStatus: "published",
        verificationStatus: "verified",
        filterValues: {
          institution: "Assam Down Town University",
          state: "Assam",
          publicationStatus: "published",
          verificationStatus: "verified",
        },
        description: "Campus details shown here are illustrative preview content.",
        currentRevision: 2,
        formValues: {
          title: "Panikhaiti Campus",
          description: "Campus details shown here are illustrative preview content.",
          institution: "Assam Down Town University",
          state: "Assam",
        },
      },
      {
        id: "CB-CAMPUS-002",
        title: "Jalukbari Campus",
        aliases: ["gu-jalukbari"],
        details: [
          { label: "Institution", value: "Gauhati University" },
          { label: "State", value: "Assam" },
        ],
        updatedAt: "2026-11-23T00:00:00.000Z",
        publicationStatus: "draft",
        verificationStatus: "unverified",
        filterValues: {
          institution: "Gauhati University",
          state: "Assam",
          publicationStatus: "draft",
          verificationStatus: "unverified",
        },
        currentRevision: 1,
        formValues: {
          title: "Jalukbari Campus",
          institution: "Gauhati University",
          state: "Assam",
        },
      },
    ],
    filters: filtersWith(
      {
        key: "institution",
        label: "Parent institution",
        options: institutionOptions.map((value) => ({ label: value, value })),
      },
      {
        key: "state",
        label: "State",
        options: [{ label: "Assam", value: "Assam" }],
      },
    ),
    editorFields: [
      selectField("institution", "Parent institution", institutionOptions),
      selectField("state", "State", ["Assam"], false),
    ],
  },
  {
    slug: "course-offerings",
    itemType: "course_offering",
    label: "Course Offerings",
    singularLabel: "Course offering",
    description: "Browse courses delivered by a specific campus.",
    records: [
      {
        id: "CB-OFFER-001",
        title: "BCA — Assam Down Town University",
        aliases: ["adtu-bca"],
        details: [
          { label: "Course", value: "Bachelor of Computer Application" },
          { label: "Institution", value: "Assam Down Town University" },
          { label: "Campus", value: "Panikhaiti Campus" },
        ],
        updatedAt: "2026-11-25T00:00:00.000Z",
        publicationStatus: "published",
        verificationStatus: "pending_review",
        filterValues: {
          course: "Bachelor of Computer Application",
          institution: "Assam Down Town University",
          campus: "Panikhaiti Campus",
          publicationStatus: "published",
          verificationStatus: "pending_review",
        },
        description: "Offering details shown here are illustrative preview content.",
        currentRevision: 2,
        formValues: {
          title: "BCA — Assam Down Town University",
          description: "Offering details shown here are illustrative preview content.",
          course: "Bachelor of Computer Application",
          campus: "Panikhaiti Campus",
          slug: "adtu-bca",
        },
      },
      {
        id: "CB-OFFER-002",
        title: "BSc — Gauhati University",
        aliases: ["gu-bsc"],
        details: [
          { label: "Course", value: "Bachelor of Science" },
          { label: "Institution", value: "Gauhati University" },
          { label: "Campus", value: "Jalukbari Campus" },
        ],
        updatedAt: "2026-11-21T00:00:00.000Z",
        publicationStatus: "in_review",
        verificationStatus: "pending_review",
        filterValues: {
          course: "Bachelor of Science",
          institution: "Gauhati University",
          campus: "Jalukbari Campus",
          publicationStatus: "in_review",
          verificationStatus: "pending_review",
        },
        currentRevision: 2,
        formValues: {
          title: "BSc — Gauhati University",
          course: "Bachelor of Science",
          campus: "Jalukbari Campus",
          slug: "gu-bsc",
        },
      },
      {
        id: "CB-OFFER-003",
        title: "BCA offering — Assam Down Town University",
        aliases: ["adtu-bca-review"],
        details: [
          { label: "Course", value: "Bachelor of Computer Application" },
          { label: "Institution", value: "Assam Down Town University" },
          { label: "Campus", value: "Panikhaiti Campus" },
        ],
        updatedAt: "2026-11-26T00:00:00.000Z",
        publicationStatus: "in_review",
        verificationStatus: "pending_review",
        filterValues: {
          course: "Bachelor of Computer Application",
          institution: "Assam Down Town University",
          campus: "Panikhaiti Campus",
          publicationStatus: "in_review",
          verificationStatus: "pending_review",
        },
        description: "Course offering details shown here are illustrative preview content.",
        currentRevision: 1,
        formValues: {
          title: "BCA offering — Assam Down Town University",
          description: "Course offering details shown here are illustrative preview content.",
          course: "Bachelor of Computer Application",
          campus: "Panikhaiti Campus",
          slug: "adtu-bca-review",
        },
      },
    ],
    filters: filtersWith(
      {
        key: "course",
        label: "Course",
        options: courseOptions.map((value) => ({ label: value, value })),
      },
      {
        key: "institution",
        label: "Institution",
        options: institutionOptions.map((value) => ({ label: value, value })),
      },
      {
        key: "campus",
        label: "Campus",
        options: campusOptions.map((value) => ({ label: value, value })),
      },
    ),
    editorFields: [
      selectField("course", "Course", courseOptions),
      selectField("campus", "Campus", campusOptions),
      { key: "slug", label: "Offering slug", type: "text", required: true },
    ],
  },
  {
    slug: "pathways",
    itemType: "pathway",
    label: "Pathways",
    singularLabel: "Pathway",
    description: "Browse education stages and progression categories.",
    records: [
      {
        id: "CB-PATH-001",
        title: "Class 12 Science to undergraduate science",
        aliases: ["science-undergraduate"],
        details: [
          { label: "Stage", value: "Class 12" },
          { label: "Category", value: "Science" },
          { label: "Progression", value: "Undergraduate science programmes" },
        ],
        updatedAt: "2026-11-25T00:00:00.000Z",
        publicationStatus: "in_review",
        verificationStatus: "pending_review",
        filterValues: {
          stage: "class-12",
          category: "Science",
          publicationStatus: "in_review",
          verificationStatus: "pending_review",
        },
        description: "Pathway details shown here are illustrative preview content.",
        currentRevision: 2,
        formValues: {
          title: "Class 12 Science to undergraduate science",
          description: "Pathway details shown here are illustrative preview content.",
          stage: "class-12",
          courseStage: "class-12",
          catalogueGroup: "Undergraduate",
          category: "Science",
        },
      },
      {
        id: "CB-PATH-002",
        title: "Class 10 to diploma programmes",
        aliases: ["class-10-diploma"],
        details: [
          { label: "Stage", value: "Class 10" },
          { label: "Category", value: "Diploma" },
          { label: "Progression", value: "Diploma programmes" },
        ],
        updatedAt: "2026-11-20T00:00:00.000Z",
        publicationStatus: "draft",
        verificationStatus: "unverified",
        filterValues: {
          stage: "class-10",
          category: "Diploma",
          publicationStatus: "draft",
          verificationStatus: "unverified",
        },
        currentRevision: 1,
        formValues: {
          title: "Class 10 to diploma programmes",
          stage: "class-10",
          courseStage: "class-10",
          catalogueGroup: "Diploma",
          category: "Diploma",
        },
      },
    ],
    filters: filtersWith(
      {
        key: "stage",
        label: "Education stage",
        options: [
          { label: "Class 10", value: "class-10" },
          { label: "Class 12", value: "class-12" },
        ],
      },
      {
        key: "category",
        label: "Pathway category",
        options: ["Science", "Diploma"].map((value) => ({ label: value, value })),
      },
    ),
    editorFields: [
      selectField("stage", "Starting stage", ["class-10", "class-12"]),
      selectField("courseStage", "Course stage", ["class-10", "class-12"]),
      { key: "catalogueGroup", label: "Catalogue group", type: "text", required: true },
      { key: "category", label: "Pathway category", type: "text", required: true },
    ],
  },
  {
    slug: "examinations",
    itemType: "examination",
    label: "Examinations",
    singularLabel: "Examination",
    description: "Browse examination levels and conducting authorities.",
    records: [
      {
        id: "CB-EXAM-001",
        title: "Assam CEE",
        aliases: ["assam-cee"],
        details: [
          { label: "Level", value: "State" },
          { label: "Authority", value: "Assam Science and Technology University" },
        ],
        updatedAt: "2026-11-25T00:00:00.000Z",
        publicationStatus: "published",
        verificationStatus: "verified",
        filterValues: {
          level: "state",
          authority: "Assam Science and Technology University",
          publicationStatus: "published",
          verificationStatus: "verified",
        },
        description: "Examination details shown here are illustrative preview content.",
        currentRevision: 3,
        formValues: {
          title: "Assam CEE",
          description: "Examination details shown here are illustrative preview content.",
          level: "state",
          purpose: "Engineering admission",
          authority: "Assam Science and Technology University",
          officialUrl: "https://example.org/examinations/assam-cee",
        },
      },
      {
        id: "CB-EXAM-002",
        title: "CUET Undergraduate",
        aliases: ["cuet-ug"],
        details: [
          { label: "Level", value: "National" },
          { label: "Authority", value: "National Testing Agency" },
        ],
        updatedAt: "2026-11-22T00:00:00.000Z",
        publicationStatus: "draft",
        verificationStatus: "unverified",
        filterValues: {
          level: "national",
          authority: "National Testing Agency",
          publicationStatus: "draft",
          verificationStatus: "unverified",
        },
        currentRevision: 1,
        formValues: {
          title: "CUET Undergraduate",
          level: "national",
          purpose: "Undergraduate admission",
          authority: "National Testing Agency",
          officialUrl: "https://example.org/examinations/cuet-ug",
        },
      },
      {
        id: "CB-EXAM-003",
        title: "National Eligibility cum Entrance Test (NEET)",
        aliases: ["neet"],
        details: [
          { label: "Level", value: "National" },
          { label: "Authority", value: "Sample authority for UI preview" },
        ],
        updatedAt: "2026-11-27T00:00:00.000Z",
        publicationStatus: "in_review",
        verificationStatus: "pending_review",
        filterValues: {
          level: "national",
          authority: "Sample authority for UI preview",
          publicationStatus: "in_review",
          verificationStatus: "pending_review",
        },
        description: "Examination details shown here are illustrative preview content.",
        currentRevision: 1,
        formValues: {
          title: "National Eligibility cum Entrance Test (NEET)",
          description: "Examination details shown here are illustrative preview content.",
          level: "national",
          purpose: "Illustrative examination purpose.",
          authority: "Sample authority for UI preview",
          officialUrl: "https://example.org/examinations/neet",
        },
      },
    ],
    filters: filtersWith(
      {
        key: "level",
        label: "Exam level",
        options: [
          { label: "National", value: "national" },
          { label: "State", value: "state" },
          { label: "Institution", value: "institution" },
        ],
      },
      {
        key: "authority",
        label: "Conducting body",
        options: [
          "Assam Science and Technology University",
          "National Testing Agency",
          "Sample authority for UI preview",
        ].map((value) => ({ label: value, value })),
      },
    ),
    editorFields: [
      selectField("level", "Exam level", ["national", "state", "institution"]),
      { key: "purpose", label: "Purpose", type: "textarea", required: true },
      { key: "authority", label: "Conducting authority", type: "text", required: true },
      { key: "stages", label: "Eligible stages (one per line)", type: "textarea" },
      { key: "programmes", label: "Programmes (one per line)", type: "textarea" },
      { key: "regions", label: "Regions (one per line)", type: "textarea" },
      { key: "fields", label: "Fields (one per line)", type: "textarea" },
      { key: "officialUrl", label: "Official URL", type: "url" },
    ],
  },
  {
    slug: "scholarships",
    itemType: "scholarship",
    label: "Scholarships",
    singularLabel: "Scholarship",
    description: "Browse providers, eligibility groups and support status.",
    records: [
      {
        id: "CB-SCHOLARSHIP-001",
        title: "Undergraduate merit support",
        aliases: ["undergraduate-merit"],
        details: [
          { label: "Provider", value: "Sample provider" },
          { label: "Study level", value: "Undergraduate" },
        ],
        updatedAt: "2026-11-25T00:00:00.000Z",
        publicationStatus: "published",
        verificationStatus: "partially_verified",
        filterValues: {
          provider: "Sample provider",
          category: "Merit",
          studyLevel: "undergraduate",
          publicationStatus: "published",
          verificationStatus: "partially_verified",
        },
        description: "Scholarship details shown here are illustrative preview content.",
        currentRevision: 2,
        formValues: {
          title: "Undergraduate merit support",
          description: "Scholarship details shown here are illustrative preview content.",
          category: "Merit",
          provider: "Sample provider",
          support: "Tuition assistance",
          studyLevels: "undergraduate",
          eligibilityRegions: "Assam",
          scholarshipStatus: "unknown",
        },
      },
      {
        id: "CB-SCHOLARSHIP-002",
        title: "Higher-secondary access support",
        aliases: ["higher-secondary-support"],
        details: [
          { label: "Provider", value: "Sample provider" },
          { label: "Study level", value: "Higher secondary" },
        ],
        updatedAt: "2026-11-21T00:00:00.000Z",
        publicationStatus: "draft",
        verificationStatus: "unverified",
        filterValues: {
          provider: "Sample provider",
          category: "Access",
          studyLevel: "higher-secondary",
          publicationStatus: "draft",
          verificationStatus: "unverified",
        },
        currentRevision: 1,
        formValues: {
          title: "Higher-secondary access support",
          provider: "Sample provider",
          category: "Access",
          support: "Education assistance",
          studyLevels: "higher-secondary",
          eligibilityRegions: "all",
          scholarshipStatus: "unknown",
        },
      },
    ],
    filters: filtersWith(
      {
        key: "provider",
        label: "Provider",
        options: [{ label: "Sample provider", value: "Sample provider" }],
      },
      {
        key: "category",
        label: "Eligibility category",
        options: ["Merit", "Access"].map((value) => ({ label: value, value })),
      },
      {
        key: "studyLevel",
        label: "Study level",
        options: [
          { label: "Higher secondary", value: "higher-secondary" },
          { label: "Undergraduate", value: "undergraduate" },
        ],
      },
    ),
    editorFields: [
      { key: "category", label: "Category", type: "text", required: true },
      { key: "provider", label: "Provider", type: "text", required: true },
      { key: "support", label: "Support provided", type: "textarea", required: true },
      {
        key: "studyLevels",
        label: "Study levels",
        type: "multiselect",
        options: [
          "school",
          "higher-secondary",
          "diploma-iti",
          "undergraduate",
          "postgraduate",
          "research-other",
        ],
      },
      selectField("eligibilityRegions", "Eligibility regions", ["all", "Assam"]),
      selectField("scholarshipStatus", "Scholarship status", ["open", "upcoming", "closed", "unknown"]),
      { key: "officialUrl", label: "Official URL", type: "url" },
    ],
  },
];

const bcaSources: CataloguePreviewSource[] = [
  {
    name: "Official programme page",
    publisher: "Sample university publisher",
    authority: "Sample university authority",
    url: "https://example.org/programmes/bca",
    sourceType: "official_public_web_page",
    checkedAt: "2026-11-20",
    claimKeys: ["course.title", "course.duration"],
  },
];

const bcaClaims: CataloguePreviewClaim[] = [
  {
    key: "course.title",
    label: "Programme name",
    value: "Bachelor of Computer Application",
    status: "verified",
    sourceName: "Official programme page",
    evidence: "Programme title shown on the sample source page.",
    checkedAt: "2026-11-20",
  },
  {
    key: "course.duration",
    label: "Programme duration",
    value: "Four years",
    status: "pending_review",
    sourceName: "Official programme page",
    evidence: "Duration text is present in the sample source excerpt.",
    checkedAt: "2026-11-20",
  },
  {
    key: "course.eligibility",
    label: "Eligibility",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "course.fees",
    label: "Fees",
    value: "Unavailable",
    status: "unavailable",
  },
];

const bscClaims: CataloguePreviewClaim[] = [
  {
    key: "course.title",
    label: "Programme name",
    value: "Bachelor of Science",
    status: "verified",
    sourceName: "Official programme page",
    evidence: "Programme title shown on the sample source page.",
    checkedAt: "2026-11-20",
  },
  {
    key: "course.duration",
    label: "Programme duration",
    value: "Three years",
    status: "pending_review",
    sourceName: "Official programme page",
    evidence: "Duration text is present in the sample source excerpt.",
    checkedAt: "2026-11-20",
  },
  {
    key: "course.eligibility",
    label: "Eligibility",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "course.fees",
    label: "Fees",
    value: "Unavailable",
    status: "unavailable",
  },
];

const neetSources: CataloguePreviewSource[] = [
  {
    name: "Official examination website · sample source",
    publisher: "Sample publisher",
    authority: "Illustrative source only",
    url: "https://example.org/examinations/neet",
    sourceType: "official_public_web_page",
    checkedAt: "2026-11-27",
    claimKeys: ["exam.name", "exam.authority", "exam.level"],
  },
];

const neetClaims: CataloguePreviewClaim[] = [
  {
    key: "exam.name",
    label: "Examination name",
    value: "National Eligibility cum Entrance Test (NEET)",
    status: "verified",
    sourceName: neetSources[0].name,
    evidence: "The sample source identifies the examination by this name.",
    checkedAt: "2026-11-27",
  },
  {
    key: "exam.authority",
    label: "Conducting authority",
    value: "Sample authority for UI preview",
    status: "verified",
    sourceName: neetSources[0].name,
    evidence: "The sample source names the authority for this preview record.",
    checkedAt: "2026-11-27",
  },
  {
    key: "exam.level",
    label: "Examination level",
    value: "National",
    status: "verified",
    sourceName: neetSources[0].name,
    evidence: "The sample source classifies the examination as national.",
    checkedAt: "2026-11-27",
  },
  {
    key: "exam.eligibility",
    label: "Eligibility criteria",
    value: "Eligibility information entered in this revision.",
    status: "pending_review",
  },
  {
    key: "exam.application_fee",
    label: "Application fee",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "exam.application_window",
    label: "Application window",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "exam.pattern",
    label: "Examination pattern",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "exam.languages",
    label: "Question paper languages",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "exam.admit_card",
    label: "Admit card schedule",
    value: "Unavailable",
    status: "unavailable",
  },
  {
    key: "exam.result",
    label: "Result date",
    value: "Unavailable",
    status: "unavailable",
  },
];

const offeringSources: CataloguePreviewSource[] = [
  {
    name: "Course offering page · sample source",
    publisher: "Sample institution publisher",
    authority: "Illustrative source only",
    url: "https://example.org/programmes/bca-offering",
    sourceType: "official_public_web_page",
    checkedAt: "2026-11-26",
    claimKeys: ["offering.course", "offering.campus"],
  },
];

const offeringClaims: CataloguePreviewClaim[] = [
  {
    key: "offering.course",
    label: "Course offered",
    value: "Bachelor of Computer Application",
    status: "pending_review",
    sourceName: offeringSources[0].name,
    evidence: "The sample page lists the course under this offering.",
    checkedAt: "2026-11-26",
  },
  {
    key: "offering.campus",
    label: "Campus",
    value: "Panikhaiti Campus",
    status: "pending_review",
    sourceName: offeringSources[0].name,
    evidence: "The sample page includes a campus reference that needs review.",
    checkedAt: "2026-11-26",
  },
];

const pathwayClaims: CataloguePreviewClaim[] = [
  {
    key: "pathway.starting_stage",
    label: "Starting stage",
    value: "Class 12",
    status: "pending_review",
  },
  {
    key: "pathway.progression",
    label: "Progression route",
    value: "Undergraduate science programmes",
    status: "pending_review",
  },
];

const scholarshipClaims: CataloguePreviewClaim[] = [
  {
    key: "scholarship.eligibility",
    label: "Eligibility",
    value: "Eligibility details require clarification.",
    status: "disputed",
  },
  {
    key: "scholarship.support",
    label: "Support provided",
    value: "Education assistance",
    status: "pending_review",
  },
];

const bcaDetail: CataloguePreviewDetail = {
  description:
    "A preview course record used to demonstrate the detail, evidence and revision-management screens.",
  sources: bcaSources,
  claims: bcaClaims,
  revisions: [
    {
      number: 3,
      status: "Published",
      date: "2026-11-25",
      note: "Latest approved publication.",
      current: true,
    },
    {
      number: 2,
      status: "Superseded",
      date: "2026-10-12",
      note: "Previous published version.",
    },
    {
      number: 1,
      status: "Superseded",
      date: "2026-09-03",
      note: "Original version.",
    },
  ],
  relationships: [
    {
      label: "Course offering",
      title: "BCA — Assam Down Town University",
      itemType: "course_offering",
      href: "/admin/catalogue/course-offerings/CB-OFFER-001",
      context: "The offering revision references this course and a campus revision.",
    },
    {
      label: "Campus",
      title: "Panikhaiti Campus",
      itemType: "campus",
      href: "/admin/catalogue/campuses/CB-CAMPUS-001",
      context: "The course offering is delivered at this campus.",
    },
    {
      label: "Institution",
      title: "Assam Down Town University",
      itemType: "institution",
      href: "/admin/catalogue/institutions/CB-INST-001",
      context: "The campus revision references this parent institution.",
    },
  ],
};

export function getCatalogueCategory(
  slug: string,
): CatalogueCategoryDefinition | undefined {
  return catalogueCategoryDefinitions.find((category) => category.slug === slug);
}

export function getCataloguePreviewRecord(categorySlug: string, id: string) {
  const category = getCatalogueCategory(categorySlug);
  const record = category?.records.find((entry) => entry.id === id);
  if (!category || !record) return undefined;
  const defaultDetail: CataloguePreviewDetail = {
    description:
      record.description ?? "Record information shown here is illustrative preview content.",
    sources: [],
    claims: [],
    revisions: [
      ...(record.currentRevision && record.currentRevision > 1
        ? [
            {
              number: record.currentRevision - 1,
              status: "Superseded",
              date: record.updatedAt.slice(0, 10),
              note: "Earlier revision in the UI preview.",
            },
          ]
        : []),
      {
        number: record.currentRevision ?? 1,
        status: record.publicationStatus.replaceAll("_", " "),
        date: record.updatedAt.slice(0, 10),
        note: "Illustrative revision shown for the UI preview.",
        current: true,
      },
    ],
    relationships: [],
  };
  return {
    category,
    record,
    detail:
      id === "CB-COURSE-001"
        ? bcaDetail
        : id === "CB-COURSE-002"
          ? {
              ...defaultDetail,
              description: "Review workspace sample record. No live catalogue data is loaded.",
              claims: bscClaims,
              sources: bcaSources,
            }
          : id === "CB-EXAM-003"
            ? {
                ...defaultDetail,
                description: "NEET claim review sample. No live examination data is loaded.",
                claims: neetClaims,
                sources: neetSources,
              }
            : id === "CB-OFFER-002" || id === "CB-OFFER-003"
              ? {
                  ...defaultDetail,
                  description: "Course offering claim review sample. No live catalogue data is loaded.",
                  claims: offeringClaims,
                  sources: offeringSources,
                }
              : id === "CB-PATH-001"
                ? {
                    ...defaultDetail,
                    claims: pathwayClaims,
                  }
                : id === "CB-SCHOLARSHIP-002"
                  ? {
                      ...defaultDetail,
                      claims: scholarshipClaims,
                    }
                  : defaultDetail,
  };
}
