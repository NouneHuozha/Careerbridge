import {
  class10StudyPath,
  class12StudyPath,
  type StudyCategory,
} from "./study-path-data";

export type StudyOptionKind = "stream" | "course-area";

type CheckPrompt = {
  label: string;
  prompt: string;
};

export type IllustrativeStudyExample = {
  name: string;
  summary: string;
};

export type StudyOptionDetail = {
  kind: StudyOptionKind;
  category: StudyCategory;
  parentHref: string;
  parentLabel: string;
  contextLabel: string;
  pageEyebrow: string;
  whatItMeansTitle: string;
  examplesTitle: string;
  examplesNote: string;
  examples: IllustrativeStudyExample[];
  collegeListRouteSlug?: string;
  collegeListHref?: string;
  catalogueTitle: string;
  catalogueBody: string;
  checkTitle: string;
  checkIntro: string;
  checkPrompts: CheckPrompt[];
  officialContact: string;
};

const class10Prompts: CheckPrompt[] = [
  {
    label: "Subjects",
    prompt: "Which subjects and combinations does my school actually offer?",
  },
  {
    label: "Current information",
    prompt: "Where can I check the current official subject list for my school or board?",
  },
  {
    label: "Next study options",
    prompt: "What further-study options connect to the subjects I am considering?",
  },
];

const class12Prompts: CheckPrompt[] = [
  {
    label: "Entry",
    prompt: "What are the current entry requirements for this exact course?",
  },
  {
    label: "Course details",
    prompt: "What duration and qualification does the official course information state?",
  },
  {
    label: "Provider",
    prompt: "Who provides this course, and where is its official course page?",
  },
];

// General hard-coded examples make the pages explorable before the catalogue backend exists.
// They are deliberately separate from verified local listings and must never imply availability.
const class10Examples: Record<string, IllustrativeStudyExample[]> = {
  science: [
    {
      name: "Technology and computing",
      summary:
        "A broad area to research around digital systems, devices, and technical problem-solving.",
    },
    {
      name: "Health and life sciences",
      summary:
        "An example area for exploring living systems, health, and wellbeing-related study.",
    },
    {
      name: "Environment and natural sciences",
      summary:
        "A broad theme for researching nature, the environment, and scientific study.",
    },
  ],
  arts: [
    {
      name: "Education and communication",
      summary:
        "An example area for looking into teaching, language, and communication-related study.",
    },
    {
      name: "Society and public life",
      summary:
        "A broad theme for exploring communities, culture, and how societies work.",
    },
    {
      name: "Creative and cultural fields",
      summary:
        "An example area for researching visual, written, performance, or cultural work.",
    },
  ],
  commerce: [
    {
      name: "Accounting and finance",
      summary:
        "A broad area for exploring records, budgets, financial information, and money management.",
    },
    {
      name: "Business and management",
      summary:
        "An example theme for researching how organisations plan and operate.",
    },
    {
      name: "Entrepreneurship",
      summary:
        "A broad area for learning how people develop and manage a business or project.",
    },
  ],
  vocational: [
    {
      name: "Technical and repair skills",
      summary:
        "An example area for researching practical learning related to making or maintaining things.",
    },
    {
      name: "Construction and applied trades",
      summary:
        "A broad theme for exploring hands-on work with spaces, materials, and equipment.",
    },
    {
      name: "Food, hospitality, and services",
      summary:
        "An example area for researching practical service skills; actual programmes depend on providers.",
    },
  ],
};

const class12Examples: Record<string, IllustrativeStudyExample[]> = {
  diploma: [
    {
      name: "Engineering and technology diplomas",
      summary:
        "An illustrative course type; programme names and availability depend on the provider.",
    },
    {
      name: "Applied-science diplomas",
      summary:
        "A broad example for researching practical science-focused study.",
    },
    {
      name: "Design and production diplomas",
      summary:
        "An example course type for exploring applied design or production study.",
    },
  ],
  "university-degree": [
    {
      name: "Science and technology degrees",
      summary:
        "A broad example of undergraduate study areas at colleges or universities.",
    },
    {
      name: "Arts, humanities, and social-science degrees",
      summary:
        "An illustrative group of academic areas; exact degree offerings vary by institution.",
    },
    {
      name: "Business and commerce degrees",
      summary:
        "A broad example for researching academic study related to business and commerce.",
    },
  ],
  "skill-training": [
    {
      name: "Digital and IT skills",
      summary:
        "An illustrative training area; course content and recognition vary by provider.",
    },
    {
      name: "Technical and repair skills",
      summary:
        "A broad example for researching practical technical training.",
    },
    {
      name: "Office, service, and creative skills",
      summary:
        "An example group of learning areas, not a list of verified programmes.",
    },
  ],
  "professional-study": [
    {
      name: "Accounting and finance qualifications",
      summary:
        "An example area to research; the relevant qualifications and requirements vary.",
    },
    {
      name: "Law-related study",
      summary:
        "A broad example for researching legal study and professional routes.",
    },
    {
      name: "Health and technical professional study",
      summary:
        "An illustrative group of study areas; official entry rules must be checked for each programme.",
    },
  ],
};

export function getStudyOptionDetail(
  kind: StudyOptionKind,
  slug: string,
): StudyOptionDetail | null {
  const isStream = kind === "stream";
  const path = isStream ? class10StudyPath : class12StudyPath;
  const category = path.categories.find((item) => item.slug === slug);

  if (!category) return null;

  return isStream
    ? {
        kind,
        category,
        parentHref: "/discover/streams",
        parentLabel: "Class 10 streams",
        contextLabel: "Class 10 · stream guide",
        pageEyebrow: "A field guide to one broad study stream",
        whatItMeansTitle: "What this stream describes",
        examplesTitle: "Areas you could research next",
        examplesNote:
          "Illustrative examples — not verified local listings. These general ideas are not a list of subjects or programmes offered by a particular school, board, or provider.",
        examples: class10Examples[slug],
        catalogueTitle: "No verified local listings are shown for this stream yet",
        catalogueBody:
          "CareerBridge does not currently publish verified local subject or further-study listings for this stream. That does not mean options do not exist. Ask your school or board for its current official information before relying on a particular subject combination.",
        checkTitle: "Questions to take to your school or board",
        checkIntro:
          "Use these as prompts while checking official information. They are not requirements or advice about what you qualify for.",
        checkPrompts: class10Prompts,
        officialContact: "your school or board",
      }
    : {
        kind,
        category,
        parentHref: "/discover/courses",
        parentLabel: "Class 12 course areas",
        contextLabel: "Class 12 · course-area guide",
        pageEyebrow: "A course-area guide, not an admission decision",
        whatItMeansTitle: "What this area describes",
        examplesTitle: "Illustrative course types to research",
        examplesNote:
          category.slug === "university-degree"
            ? "These broad degree-area examples are illustrative, not specific course listings. The separate College List below contains a small set of source-checked 2026 institutional programme records."
            : "Illustrative examples — not verified local listings. Course names, availability, entry rules, duration, recognition, and institutions have not been verified for these examples.",
        examples: class12Examples[slug],
        collegeListRouteSlug: category.slug,
        collegeListHref: `/colleges?route=${category.slug}`,
        catalogueTitle:
          category.slug === "university-degree"
            ? "Two colleges have published undergraduate programme records"
            : "No verified local courses are listed in this area yet",
        catalogueBody:
          category.slug === "university-degree"
            ? "Fazl Ali College and Dimapur Government College have source-checked programme information published for 2026. These records do not confirm future availability, next-cycle admissions, fees, or eligibility."
            : "CareerBridge does not currently publish verified course or institution listings for this area. That does not mean courses are unavailable. Entry requirements, duration, and providers vary by course; check current official information before relying on any detail.",
        checkTitle: "Details to verify with the official provider",
        checkIntro:
          "These details depend on the exact course and institution. This page does not confirm any of them for a specific option.",
        checkPrompts: class12Prompts,
        officialContact: "the course provider or institution",
      };
}
