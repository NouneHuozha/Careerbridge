import {
  institutionRecords,
  institutionRecordsById,
  type InformationSource,
  type InstitutionRecord,
  type VerificationStatus,
} from "./institution-registry";

export type InstitutionProgramme = {
  name: string;
  qualification: string;
  courseId?: string;
  source: InformationSource;
  verificationStatus: VerificationStatus;
  verifiedDate?: string;
};

export type InstitutionDocument = {
  title: string;
  source: InformationSource;
  academicYear?: string;
  publishedDate?: string;
  verificationStatus?: VerificationStatus;
  verifiedDate?: string;
};

export type InstitutionNotice = {
  title: string;
  academicYear: string;
  publishedDate?: string;
  deadline?: string;
  source: InformationSource;
  verificationStatus?: VerificationStatus;
  verifiedDate?: string;
};

export type InstitutionFinancialRecord = {
  title: string;
  description: string;
  academicYear?: string;
  provider?: string;
  source: InformationSource;
  verificationStatus?: VerificationStatus;
  verifiedDate?: string;
};

export type InstitutionProfileRecord = {
  institutionId: string;
  introduction?: string;
  description?: string;
  facts?: {
    label: string;
    value: string;
    source: InformationSource;
    verificationStatus?: VerificationStatus;
    verifiedDate?: string;
  }[];
  programmes?: InstitutionProgramme[];
  reportedProgrammeCount?: {
    count: number;
    label: string;
    source: InformationSource;
  };
  admission?: {
    description: string;
    source: InformationSource;
    verificationStatus?: VerificationStatus;
    verifiedDate?: string;
  };
  admissionNotices?: InstitutionNotice[];
  documents?: InstitutionDocument[];
  fees?: InstitutionFinancialRecord;
  scholarships?: InstitutionFinancialRecord[];
  relatedScholarships?: InformationSource;
  sources: InformationSource[];
  limitedInfo?: string;
  lastReviewed: string;
};

export type InstitutionProfilePageRecord = InstitutionRecord &
  Omit<InstitutionProfileRecord, "institutionId">;

const kohimaAdmissions: InformationSource = {
  label: "Kohima Science College admissions",
  url: "https://admission.kscj.ac.in/",
};
const kohimaUndergraduate: InformationSource = {
  label: "Undergraduate programmes",
  url: "https://kscj.ac.in/index.php/component/content/article/14-under-graduate",
};
const kohimaCourseDesign: InformationSource = {
  label: "B.A. / B.Sc. course design",
  url: "https://kscj.ac.in/index.php/component/content/article/8-kscj/118-bsc-course-design?Itemid=173",
};
const kohimaSelfStudy: InformationSource = {
  label: "College self-study report",
  url: "https://kscj.ac.in/download/IQAC/SSR/SSR_2012_16_NLCOGN14512.pdf",
};
const stEdmundsAdmissions: InformationSource = {
  label: "Admission information",
  url: "https://sec.edu.in/old/Admissioninfo.php",
};

export const institutionProfiles: InstitutionProfileRecord[] = [
  {
    institutionId: "kohima-science-college-jotsoma",
    description:
      "Established in 1961, Kohima Science College is a government institution offering undergraduate programmes in science and humanities, along with postgraduate study in several science disciplines.",
    introduction:
      "Offers undergraduate programmes in science and humanities, with postgraduate study in several science disciplines.",
    facts: [
      {
        label: "Established",
        value: "1961",
        source: kohimaAdmissions,
        verificationStatus: "unverified",
      },
      {
        label: "Accreditation",
        value: "NAAC Grade A (2017; CGPA 3.42)",
        source: kohimaAdmissions,
        verificationStatus: "unverified",
      },
      {
        label: "Ownership",
        value: "Government college",
        source: kohimaSelfStudy,
        verificationStatus: "unverified",
      },
    ],
    programmes: [
      {
        name: "Bachelor of Science (B.Sc.)",
        qualification: "Degree · Undergraduate",
        courseId: "bsc",
        source: kohimaUndergraduate,
        verificationStatus: "unverified",
      },
      {
        name: "Bachelor of Arts (Honours in English)",
        qualification: "Degree · Undergraduate",
        courseId: "ba",
        source: kohimaUndergraduate,
        verificationStatus: "unverified",
      },
      {
        name: "Honours subject: Computer Science",
        qualification: "Undergraduate honours subject",
        source: kohimaCourseDesign,
        verificationStatus: "unverified",
      },
      {
        name: "Honours subject: Tenyidie",
        qualification: "Undergraduate honours subject",
        source: kohimaCourseDesign,
        verificationStatus: "unverified",
      },
    ],
    reportedProgrammeCount: {
      count: 13,
      label: "undergraduate programmes",
      source: kohimaUndergraduate,
    },
    admission: {
      description:
        "The college publishes admission information through its dedicated admissions portal. Check the portal for current instructions and notices.",
      source: kohimaAdmissions,
      verificationStatus: "unverified",
    },
    documents: [
      { title: "Undergraduate programme catalogue", source: kohimaUndergraduate },
      { title: "B.A. / B.Sc. course design", source: kohimaCourseDesign },
    ],
    sources: [
      kohimaAdmissions,
      kohimaUndergraduate,
      kohimaCourseDesign,
      kohimaSelfStudy,
    ],
    lastReviewed: "6 November 2026",
  },
  {
    institutionId: "st-edmunds-college-shillong",
    programmes: [
      {
        name: "Bachelor of Arts (B.A.)",
        qualification: "Degree · Undergraduate",
        courseId: "ba",
        source: stEdmundsAdmissions,
        verificationStatus: "unverified",
      },
      {
        name: "Bachelor of Science (B.Sc.)",
        qualification: "Degree · Undergraduate",
        courseId: "bsc",
        source: stEdmundsAdmissions,
        verificationStatus: "unverified",
      },
    ],
    sources: [
      {
        label: "College address",
        url: "https://sec.edu.in/principals.php",
      },
      stEdmundsAdmissions,
    ],
    limitedInfo:
      "CareerBridge currently has limited confirmed information about this institution. Check its official website for admissions, fees and other details.",
    lastReviewed: "6 November 2026",
  },
];

const verifiedInstitutionProfiles: InstitutionProfilePageRecord[] =
  institutionProfiles.map((profile) => {
    const institution = institutionRecordsById.get(profile.institutionId);
    if (!institution) {
      throw new Error(
        `Institution profile references unknown institution "${profile.institutionId}".`,
      );
    }

    return { ...institution, ...profile };
  });

const sampleInstitutionProfiles = institutionRecords
  .filter((institution) => institution.isDemo)
  .map<InstitutionProfilePageRecord>((institution) => ({
    ...institution,
    sources: [],
    limitedInfo:
      "This fictional institution is included only to demonstrate the directory design. Its name, location and other details are sample data, not verified information.",
    lastReviewed: "Sample data",
  }));

export const institutionProfilePages: InstitutionProfilePageRecord[] = [
  ...verifiedInstitutionProfiles,
  ...sampleInstitutionProfiles,
];

export function isVerifiedProgramme(programme: InstitutionProgramme) {
  const verifiedAt = programme.verifiedDate
    ? Date.parse(programme.verifiedDate)
    : Number.NaN;

  return (
    programme.verificationStatus === "verified" &&
    Number.isFinite(verifiedAt) &&
    Boolean(programme.source.url) &&
    (programme.source.verificationStatus === undefined ||
      programme.source.verificationStatus === "verified")
  );
}

export function getProgrammeCounts(
  profile: Pick<InstitutionProfileRecord, "programmes" | "reportedProgrammeCount">,
) {
  const programmes = profile.programmes ?? [];
  return {
    reported: profile.reportedProgrammeCount?.count,
    recorded: programmes.length,
    verified: programmes.filter(isVerifiedProgramme).length,
  };
}
