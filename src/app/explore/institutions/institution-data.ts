import type {
  InformationSource,
  InstitutionRecord,
  InstitutionCampusRecord,
  VerificationStatus,
} from "../institution-directory/institution-registry";
import {
  institutionRecordsById,
} from "../institution-directory/institution-registry";

export type InformationFact = {
  value: string;
  source?: InformationSource;
  verificationStatus?: VerificationStatus;
};

export type InstitutionAdmissionCycle = {
  academicYear: string;
  eligibility?: InformationFact;
  admissionProcess?: InformationFact;
  entranceExam?: InformationFact;
  source?: InformationSource;
  admissionUrl?: InformationSource;
};

export type CourseOfferingDetails = {
  description?: InformationFact;
  duration?: InformationFact;
  studyMode?: InformationFact;
  admissionCycles?: InstitutionAdmissionCycle[];
  fees?: {
    value: string;
    academicYear: string;
    paymentPeriod: string;
    source?: InformationSource;
    verificationStatus?: VerificationStatus;
  };
  scholarships?: {
    description: string;
    url?: InformationSource;
    verificationStatus?: VerificationStatus;
  }[];
};

export type InstitutionCampusOffering = {
  id: string;
  slug: string;
  institutionId: string;
  campusId: string;
  courseId: string;
  offering?: CourseOfferingDetails;
  prospectus?: InformationSource;
  sources?: { fact: string; source: InformationSource }[];
};

export type ResolvedInstitutionCampusOffering = InstitutionCampusOffering & {
  institution: InstitutionRecord;
  campus: InstitutionCampusRecord;
  isDemo: boolean;
};

export function resolveInstitutionOffering(
  offering: InstitutionCampusOffering,
): ResolvedInstitutionCampusOffering {
  const institution = institutionRecordsById.get(offering.institutionId);
  if (!institution) {
    throw new Error(
      `Institution offering "${offering.id}" references unknown institution "${offering.institutionId}".`,
    );
  }

  const campus = institution.campuses.find(
    (item) => item.id === offering.campusId,
  );
  if (!campus) {
    throw new Error(
      `Institution offering "${offering.id}" references unknown campus "${offering.campusId}" for institution "${offering.institutionId}".`,
    );
  }

  return {
    ...offering,
    institution,
    campus,
    isDemo: institution.isDemo ?? false,
  };
}

const sampleProgrammeSource = {
  label: "Sample programme page",
  url: "https://example.com/eastern-hills/bca",
  checkedOn: "2026-10-15",
};
const sampleAdmissionSource = {
  label: "Sample admission notice",
  url: "https://example.com/eastern-hills/admissions",
  checkedOn: "2026-10-15",
};

export const institutionCampusOfferings: InstitutionCampusOffering[] = [
  {
    id: "demo-01",
    slug: "eastern-hills-college",
    institutionId: "eastern-hills-college",
    campusId: "main",
    courseId: "bca",
    prospectus: {
      label: "Sample BCA prospectus",
      url: "https://example.com/eastern-hills/prospectus",
      checkedOn: "2026-10-15",
    },
    offering: {
      description: {
        value:
          "This sample profile demonstrates a detailed course record. In a live catalogue, only facts confirmed for the named programme and campus would appear here.",
        verificationStatus: "unverified",
      },
      duration: {
        value: "3 years",
        source: sampleProgrammeSource,
        verificationStatus: "unverified",
      },
      studyMode: {
        value: "Full-time",
        source: sampleProgrammeSource,
        verificationStatus: "unverified",
      },
      admissionCycles: [
        {
          academicYear: "2026–27",
          eligibility: {
            value: "Class 12 qualification (illustrative sample only)",
            source: sampleAdmissionSource,
            verificationStatus: "unverified",
          },
          admissionProcess: {
            value:
              "Apply through the institution's sample admissions portal (illustrative only)",
            source: sampleAdmissionSource,
            verificationStatus: "unverified",
          },
          entranceExam: {
            value:
              "No institution-specific entrance examination is represented in this sample.",
            source: sampleAdmissionSource,
            verificationStatus: "unverified",
          },
          source: sampleAdmissionSource,
          admissionUrl: sampleAdmissionSource,
        },
      ],
      fees: {
        value: "₹48,000",
        academicYear: "2026–27",
        paymentPeriod: "per academic year",
        source: {
          label: "Sample fee schedule",
          url: "https://example.com/eastern-hills/fees",
          checkedOn: "2026-10-15",
        },
        verificationStatus: "unverified",
      },
      scholarships: [
        {
          description:
            "Sample need-based support opportunity (illustrative only).",
          verificationStatus: "unverified",
          url: {
            label: "Sample support information",
            url: "https://example.com/eastern-hills/support",
            checkedOn: "2026-10-15",
          },
        },
      ],
    },
    sources: [
      { fact: "Course offering, duration and study mode", source: sampleProgrammeSource },
      { fact: "Admission information", source: sampleAdmissionSource },
      {
        fact: "Fees",
        source: {
          label: "Sample fee schedule",
          url: "https://example.com/eastern-hills/fees",
          checkedOn: "2026-10-15",
        },
      },
    ],
  },
  {
    id: "demo-02",
    slug: "sample-north-valley-university",
    institutionId: "sample-north-valley-university",
    campusId: "main",
    courseId: "bca",
    offering: {
      duration: {
        value: "3 years",
        source: {
          label: "Sample course directory",
          url: "https://example.com/north-valley/programmes",
          checkedOn: "2026-10-10",
        },
        verificationStatus: "unverified",
      },
    },
    sources: [
      {
        fact: "Course listing",
        source: {
          label: "Sample course directory",
          url: "https://example.com/north-valley/programmes",
          checkedOn: "2026-10-10",
        },
      },
    ],
  },
  {
    id: "demo-03",
    slug: "sample-institute-of-computing",
    institutionId: "sample-institute-of-computing",
    campusId: "main",
    courseId: "bca",
    sources: [
      {
        fact: "Course listing",
        source: {
          label: "Sample public directory record",
          url: "https://example.com/sample-computing-institute",
          checkedOn: "2026-10-08",
        },
      },
    ],
  },
  {
    id: "demo-04",
    slug: "sample-hillside-college",
    institutionId: "sample-hillside-college",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-05",
    slug: "sample-riverbend-university",
    institutionId: "sample-riverbend-university",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-06",
    slug: "sample-eastern-skills-institute",
    institutionId: "sample-eastern-skills-institute",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-07",
    slug: "sample-mountainview-college",
    institutionId: "sample-mountainview-college",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-08",
    slug: "sample-greenfield-university",
    institutionId: "sample-greenfield-university",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-09",
    slug: "sample-lakeside-college",
    institutionId: "sample-lakeside-college",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-10",
    slug: "sample-plateau-institute",
    institutionId: "sample-plateau-institute",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-11",
    slug: "sample-cedar-grove-college",
    institutionId: "sample-cedar-grove-college",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-12",
    slug: "sample-sunrise-university",
    institutionId: "sample-sunrise-university",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-13",
    slug: "sample-blue-ridge-institute",
    institutionId: "sample-blue-ridge-institute",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-14",
    slug: "sample-pinecrest-college",
    institutionId: "sample-pinecrest-college",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-15",
    slug: "sample-cloudpeak-university",
    institutionId: "sample-cloudpeak-university",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-16",
    slug: "sample-maple-leaf-institute",
    institutionId: "sample-maple-leaf-institute",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-17",
    slug: "sample-silver-stream-college",
    institutionId: "sample-silver-stream-college",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-18",
    slug: "sample-orchid-valley-university",
    institutionId: "sample-orchid-valley-university",
    campusId: "main",
    courseId: "bca",
  },
  {
    id: "demo-19",
    slug: "sample-fernwood-institute",
    institutionId: "sample-fernwood-institute",
    campusId: "main",
    courseId: "bca",
  },
];

export const resolvedInstitutionCampusOfferings =
  institutionCampusOfferings.map(resolveInstitutionOffering);
