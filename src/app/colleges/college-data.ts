import {
  class10StudyPath,
  class12StudyPath,
  type StudyCategory,
} from "../discover/study-path-data";

export type CollegeSource = {
  label: string;
  url: string;
  note: string;
  checkedOn: string;
};

export type CollegeProgramme = {
  name: string;
  subjects?: string[];
  sourceLabel: string;
};

export type CollegeRecord = {
  code: string;
  name: string;
  type: string;
  district: string;
  address: string;
  routeSlugs: string[];
  programmeCycle: string;
  programmes: CollegeProgramme[];
  admissionNote: string;
  feesNote: string;
  hostelSummary: string;
  hostelNote: string;
  phones: string[];
  email: string;
  officialWebsite: string;
  sources: CollegeSource[];
};

export type CollegeRouteOption = {
  slug: string;
  label: string;
  stageLabel: string;
  parentHref: string;
  parentLabel: string;
};

const checkedOn = "31 October 2026";
const higherEducationDirectory =
  "https://highereducation.nagaland.gov.in/government-colleges/";

function toCollegeRoute(
  category: StudyCategory,
  stageLabel: string,
  parentHref: string,
  parentLabel: string,
): CollegeRouteOption {
  return {
    slug: category.slug,
    label: category.name,
    stageLabel,
    parentHref,
    parentLabel,
  };
}

export const collegeRouteOptions: CollegeRouteOption[] = [
  ...class10StudyPath.categories.map((category) =>
    toCollegeRoute(
      category,
      "After Class 10",
      `${class10StudyPath.detailBasePath}/${category.slug}`,
      class10StudyPath.breadcrumb,
    ),
  ),
  ...class12StudyPath.categories.map((category) =>
    toCollegeRoute(
      category,
      "After Class 12",
      `${class12StudyPath.detailBasePath}/${category.slug}`,
      class12StudyPath.breadcrumb,
    ),
  ),
];

export function getCollegeRouteOption(slug: string): CollegeRouteOption | null {
  return collegeRouteOptions.find((route) => route.slug === slug) ?? null;
}

export const collegeRecords: CollegeRecord[] = [
  {
    code: "fazl-ali-college",
    name: "Fazl Ali College",
    type: "Government college",
    district: "Mokokchung",
    address: "Mokokchung – 798601, Nagaland",
    routeSlugs: ["university-degree"],
    programmeCycle: "2026 undergraduate programme page",
    programmes: [
      {
        name: "Arts undergraduate programme",
        subjects: [
          "AO",
          "Economics",
          "Education",
          "English",
          "Functional English",
          "Geography",
          "History",
          "Philosophy",
          "Political Science",
          "Sociology",
        ],
        sourceLabel: "2026 Arts programme list",
      },
      {
        name: "Science undergraduate programme",
        subjects: [
          "Botany",
          "Chemistry",
          "Computer Science",
          "Environmental Science",
          "Geography",
          "Mathematics",
          "Physics",
          "Zoology",
        ],
        sourceLabel: "2026 Science programme list",
      },
    ],
    admissionNote:
      "Not verified for the next intake. The linked 2026 admission dates have passed; check the college’s official site for the next cycle.",
    feesNote: "Not currently verified — check the college prospectus.",
    hostelSummary: "Listed for 2026; current availability not verified",
    hostelNote:
      "The official 2026 page lists hostel accommodation for boys and girls. Current availability, conditions, and costs are not verified.",
    phones: ["8837091896", "8974165646"],
    email: "principal@fac.ac.in",
    officialWebsite: "https://fac.ac.in/",
    sources: [
      {
        label: "Fazl Ali College — Admission 2026 programme page",
        url: "https://fac.ac.in/admission-2026/",
        note:
          "Lists the 2026 undergraduate Arts and Science programme subjects, contact information, address, and hostel facility. Its admission dates are for the past 2026 cycle.",
        checkedOn,
      },
      {
        label: "Nagaland Higher Education Department — Government Colleges",
        url: higherEducationDirectory,
        note: "Lists Fazl Ali College under Government Colleges and identifies Mokokchung.",
        checkedOn,
      },
    ],
  },
  {
    code: "dimapur-government-college",
    name: "Dimapur Government College",
    type: "Government college",
    district: "Dimapur",
    address: "Oriental Colony, Dimapur, Nagaland 797112",
    routeSlugs: ["university-degree"],
    programmeCycle: "2026 admission announcement",
    programmes: [
      {
        name: "Bachelor of Arts (B.A.)",
        subjects: [
          "Economics",
          "Education",
          "English",
          "History",
          "Philosophy",
          "Political Science",
          "Psychology",
          "Sociology",
        ],
        sourceLabel: "2026 Arts major courses",
      },
      {
        name: "Bachelor of Commerce (B.Com.)",
        sourceLabel: "2026 undergraduate programme list",
      },
      {
        name: "Bachelor of Science (B.Sc.)",
        subjects: ["Mathematics", "Physics"],
        sourceLabel: "2026 Science major courses",
      },
    ],
    admissionNote:
      "Not verified for the next intake. The linked 2026 admission dates have passed; check the college’s official site for the next cycle.",
    feesNote: "Not currently verified — check the college prospectus.",
    hostelSummary: "Not verified",
    hostelNote:
      "Hostel availability and facilities are not verified by the linked sources.",
    phones: ["03862 248291 / 286783"],
    email: "dimapur.govtcollege@gmail.com",
    officialWebsite: "https://dimapurgovtcollege.in/",
    sources: [
      {
        label: "Dimapur Government College — Admission Announcement 2026",
        url: "https://dimapurgovtcollege.in/admission-announcement-2026/",
        note:
          "Lists the 2026 B.A., B.Com., and B.Sc. programmes, major courses, address, and official contact. Its admission dates and eligibility details apply to the past 2026 cycle.",
        checkedOn,
      },
      {
        label: "Nagaland Higher Education Department — Government Colleges",
        url: higherEducationDirectory,
        note: "Lists Dimapur Government College under Government Colleges and identifies Dimapur.",
        checkedOn,
      },
    ],
  },
];

export function getCollegeByCode(code: string): CollegeRecord | null {
  return collegeRecords.find((college) => college.code === code) ?? null;
}

export function getCollegesForRoute(routeSlug: string): CollegeRecord[] {
  return collegeRecords.filter((college) =>
    college.routeSlugs.includes(routeSlug),
  );
}

export function getCollegeRouteLabels(college: CollegeRecord): string[] {
  return college.routeSlugs.flatMap((slug) => {
    const route = getCollegeRouteOption(slug);
    return route ? [`${route.label} · ${route.stageLabel}`] : [];
  });
}
