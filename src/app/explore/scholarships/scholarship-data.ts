export const scholarshipStudyLevels = [
  { value: "school", label: "School" },
  { value: "higher-secondary", label: "Higher secondary" },
  { value: "diploma-iti", label: "Diploma / ITI" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "research-other", label: "Research / Other" },
] as const;

export type ScholarshipStudyLevel =
  (typeof scholarshipStudyLevels)[number]["value"];
export type ScholarshipStatus =
  | "open"
  | "upcoming"
  | "closed"
  | "unknown";

export type Scholarship = {
  id: string;
  name: string;
  category: string;
  provider: string;
  purpose: string;
  support: string;
  studyLevels: ScholarshipStudyLevel[];
  eligibilityRegions: "all" | string[];
  status: ScholarshipStatus;
  officialUrl: string;
  detail: {
    benefitNotes: string[];
    eligibility: { title: string; description: string }[];
    applicationMethod: string;
    applicationSteps: string[];
    afterApplication?: string;
    documents: string[];
    renewal?: string;
    sourceTitle: string;
    sourceYear?: string;
    lastChecked?: string;
    relatedCourses?: { name: string; href: string }[];
    relatedInstitutions?: { name: string; href: string }[];
  };
};

export const northeastStates = [
  "Arunachal Pradesh",
  "Assam",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
];

export const scholarships: Scholarship[] = [
  {
    id: "nmmss",
    name: "National Means-cum-Merit Scholarship Scheme",
    category: "School education",
    provider: "Ministry of Education",
    purpose:
      "Supports eligible students from economically weaker sections to continue their studies after Class 8.",
    support: "Scholarship assistance for continuing school education",
    studyLevels: ["school", "higher-secondary"],
    eligibilityRegions: "all",
    status: "unknown",
    officialUrl: "https://scholarships.gov.in/",
    detail: {
      benefitNotes: [
        "Check the current scheme's annual assistance and any class-wise conditions.",
        "Confirm which school stages are covered and how continuation is assessed.",
        "The value and payment conditions are not verified for a current cycle.",
      ],
      eligibility: [
        {
          title: "School stage and progression",
          description:
            "The sample record describes support for continuing school after Class 8. Confirm the qualifying examination, eligible classes and school requirements in the current scheme guidelines.",
        },
        {
          title: "Means and merit conditions",
          description:
            "Check the current income ceiling, qualifying marks and any selection process with the official authority.",
        },
        {
          title: "Location and institution",
          description:
            "Confirm any domicile, school recognition or other jurisdiction-specific conditions before applying.",
        },
      ],
      applicationMethod:
        "The National Scholarship Portal is listed as the starting point for scheme information. The current application workflow and any school or state verification steps have not been checked.",
      applicationSteps: [
        "Check the current NMMSS guidelines and the notification for your state or Union Territory.",
        "Confirm the qualifying examination, school stage, income and merit conditions.",
        "Use the application route and documents specified for the current cycle.",
        "Keep the application reference and follow any school or authority verification instructions.",
      ],
      afterApplication:
        "The current notification determines how school, state and national-level verification is handled. Follow the status shown by the official portal and your school.",
      documents: [
        "Academic record or qualifying examination details, as requested",
        "Income certificate, if required by the current rules",
        "Bank account details, if requested for payment",
        "Identity or school verification documents specified in the notice",
      ],
      renewal:
        "Check the current continuation rules for later school classes, including academic progress, attendance or other conditions. Requirements have not been verified for the current cycle.",
      sourceTitle: "National Scholarship Portal — scheme information",
    },
  },
  {
    id: "post-matric-st",
    name: "Post-Matric Scholarship for ST Students",
    category: "Post-matric",
    provider: "Ministry of Tribal Affairs",
    purpose:
      "Financial assistance for eligible Scheduled Tribe students pursuing studies after secondary education.",
    support: "Course-related financial assistance; conditions vary",
    studyLevels: [
      "diploma-iti",
      "undergraduate",
      "postgraduate",
      "research-other",
    ],
    eligibilityRegions: "all",
    status: "unknown",
    officialUrl: "https://tribal.nic.in/Scholarship.aspx",
    detail: {
      benefitNotes: [
        "Review the applicable course group and fee or maintenance assistance in the current rules.",
        "The amount and components may depend on the course and applicable scheme conditions.",
        "No current award amount or payment method has been verified.",
      ],
      eligibility: [
        {
          title: "Applicant category",
          description:
            "The scheme title identifies Scheduled Tribe students. Confirm the required certificate and any state or authority-specific rules.",
        },
        {
          title: "Course and institution",
          description:
            "Check the recognised course, institution and post-secondary study requirements that apply to your application.",
        },
        {
          title: "Income and other conditions",
          description:
            "Verify any family-income ceiling, academic progress and other conditions in the applicable state or central guidelines.",
        },
      ],
      applicationMethod:
        "The Ministry of Tribal Affairs scholarship page is provided as an official information starting point. The current application portal and state-level process have not been verified.",
      applicationSteps: [
        "Open the current Post-Matric Scholarship guidelines for your state or administering authority.",
        "Confirm the category, course, institution, income and academic requirements.",
        "Apply through the portal named in the current notification and submit the requested evidence.",
        "Check whether your institution or state authority must verify the application.",
      ],
      afterApplication:
        "Application verification and payment steps can involve the institution and the administering authority. Follow the current notification and official application-status page.",
      documents: [
        "Scheduled Tribe certificate, if required",
        "Academic and course admission records",
        "Income and domicile evidence, where required",
        "Bank details or other records requested by the current application",
      ],
      renewal:
        "Check the applicable renewal rules, including progression to the next academic year and any required academic records.",
      sourceTitle: "Ministry of Tribal Affairs — scholarship information",
    },
  },
  {
    id: "post-matric-sc",
    name: "Post-Matric Scholarship for SC Students",
    category: "Post-matric",
    provider: "Ministry of Social Justice and Empowerment",
    purpose:
      "Supports eligible Scheduled Caste students pursuing post-secondary education.",
    support: "Course-related financial assistance; conditions vary",
    studyLevels: [
      "diploma-iti",
      "undergraduate",
      "postgraduate",
      "research-other",
    ],
    eligibilityRegions: "all",
    status: "unknown",
    officialUrl: "https://socialjustice.gov.in/schemes/25",
    detail: {
      benefitNotes: [
        "Check the current rules for applicable fee and maintenance assistance.",
        "Amounts and covered expenses can depend on course group and scheme conditions.",
        "Current rates and payment arrangements have not been verified.",
      ],
      eligibility: [
        {
          title: "Applicant category",
          description:
            "The scheme title identifies Scheduled Caste students. Confirm the required certificate and applicable authority rules.",
        },
        {
          title: "Course and institution",
          description:
            "Verify that your course and institution meet the current post-matric scheme requirements.",
        },
        {
          title: "Income and academic conditions",
          description:
            "Check the income criteria, progression rules and any additional conditions published for the applicable year.",
        },
      ],
      applicationMethod:
        "The Ministry of Social Justice and Empowerment scheme page is provided as an information source. The current application portal and state-level process have not been verified.",
      applicationSteps: [
        "Read the current Post-Matric Scholarship guidelines from the responsible authority.",
        "Confirm category, course, institution, income and academic requirements.",
        "Submit the application using the route named in the current state or central notice.",
        "Follow institution and authority verification steps shown in the official process.",
      ],
      afterApplication:
        "Check the official portal for institution verification, application progress and any requests for corrections.",
      documents: [
        "Scheduled Caste certificate, if required",
        "Admission and academic records",
        "Income or domicile evidence, where required",
        "Bank details or other records requested by the current application",
      ],
      renewal:
        "Review the current renewal conditions and required academic progress before each continuation application.",
      sourceTitle: "Ministry of Social Justice and Empowerment — scheme page",
    },
  },
  {
    id: "aicte-pragati",
    name: "AICTE Pragati Scholarship Scheme",
    category: "Technical education",
    provider: "All India Council for Technical Education",
    purpose:
      "Provides support for eligible girl students admitted to approved technical diploma or degree programmes.",
    support: "Tuition and related educational assistance; conditions apply",
    studyLevels: ["diploma-iti", "undergraduate"],
    eligibilityRegions: "all",
    status: "unknown",
    officialUrl:
      "https://www.aicte-india.org/schemes/students-development-schemes/Pragati",
    detail: {
      benefitNotes: [
        "Check the current Pragati guidelines for the applicable tuition or other educational assistance.",
        "Verify award limits, permitted expenses and how assistance is disbursed.",
        "No current-cycle amount or payment method has been verified.",
      ],
      eligibility: [
        {
          title: "Student and admission conditions",
          description:
            "The sample description refers to eligible girl students. Confirm current admission, family-income and other applicant conditions with AICTE.",
        },
        {
          title: "Approved technical programme",
          description:
            "Verify that the diploma or degree programme and institution are covered under the current scheme rules.",
        },
        {
          title: "Selection and limits",
          description:
            "Check any intake limits, selection criteria and conditions that distinguish eligibility from receiving an award.",
        },
      ],
      applicationMethod:
        "AICTE is the listed scheme authority. The current application portal, institution verification steps and application cycle have not been verified.",
      applicationSteps: [
        "Read the current AICTE Pragati notification and scheme guidelines.",
        "Confirm programme approval, admission and applicant conditions.",
        "Apply only through the portal named in the current AICTE notification.",
        "Complete any institution verification and follow official status updates.",
      ],
      afterApplication:
        "Check the current notification for institution verification, selection and disbursement steps.",
      documents: [
        "Proof of admission to the eligible technical programme",
        "Academic and applicant identity records",
        "Income evidence, if required by the current rules",
        "Bank details and any institution verification requested",
      ],
      renewal:
        "Confirm whether the current scheme allows continuation and what academic progress or other conditions are required.",
      sourceTitle: "AICTE Pragati — scheme information",
    },
  },
  {
    id: "ishan-uday",
    name: "Ishan Uday Special Scholarship Scheme",
    category: "Northeast region",
    provider: "University Grants Commission",
    purpose:
      "Scholarship support for eligible students from the North Eastern Region pursuing undergraduate studies.",
    support: "Undergraduate scholarship assistance; conditions apply",
    studyLevels: ["undergraduate"],
    eligibilityRegions: northeastStates,
    status: "unknown",
    officialUrl: "https://www.ugc.gov.in/",
    detail: {
      benefitNotes: [
        "Check the current scheme guidelines for the assistance applicable to the eligible undergraduate programme.",
        "Confirm any programme-specific benefit, selection and disbursement conditions.",
        "Current amounts and payment arrangements have not been verified.",
      ],
      eligibility: [
        {
          title: "North Eastern Region connection",
          description:
            "The sample record is for students from the North Eastern Region. Verify the official definition and required domicile or residency evidence.",
        },
        {
          title: "Undergraduate programme",
          description:
            "Confirm that your programme, mode of study and institution meet the current UGC scheme requirements.",
        },
        {
          title: "Income and academic conditions",
          description:
            "Check the applicable family-income ceiling, academic requirements and selection conditions in the current notice.",
        },
      ],
      applicationMethod:
        "UGC is the listed scheme authority. The current application portal and application cycle have not been verified; use the portal named in the latest official notification.",
      applicationSteps: [
        "Read the latest Ishan Uday notification and UGC scheme guidelines.",
        "Confirm the regional, income, course and institution requirements.",
        "Submit through the application route specified in the current notification.",
        "Follow any institute verification and official application-status updates.",
      ],
      afterApplication:
        "Check the latest scheme notice for institute verification, selection and payment updates.",
      documents: [
        "Proof of domicile or regional eligibility, if required",
        "Undergraduate admission and academic records",
        "Income evidence, if required",
        "Bank and identity details requested by the official application",
      ],
      renewal:
        "Verify the current continuation rules, including academic progress, attendance or other requirements for subsequent years.",
      sourceTitle: "University Grants Commission — scheme information",
    },
  },
  {
    id: "national-fellowship-st",
    name: "National Fellowship for ST Students",
    category: "Research",
    provider: "Ministry of Tribal Affairs",
    purpose:
      "Fellowship support for eligible Scheduled Tribe students undertaking higher research studies.",
    support: "Fellowship assistance; terms depend on the current scheme",
    studyLevels: ["research-other"],
    eligibilityRegions: "all",
    status: "unknown",
    officialUrl: "https://tribal.nic.in/Scholarship.aspx",
    detail: {
      benefitNotes: [
        "Review the current fellowship guidelines for the applicable fellowship and contingency support.",
        "Check the current award terms, duration and any discipline or institution conditions.",
        "No current amount, duration or disbursement detail has been verified.",
      ],
      eligibility: [
        {
          title: "Applicant category",
          description:
            "The scheme title identifies Scheduled Tribe students. Confirm the required certificate and applicable rules.",
        },
        {
          title: "Research programme",
          description:
            "Verify the eligible research degree, admission status, institution and discipline requirements in the current fellowship notice.",
        },
        {
          title: "Selection conditions",
          description:
            "Check current selection, availability and any restrictions before treating eligibility as an award guarantee.",
        },
      ],
      applicationMethod:
        "The Ministry of Tribal Affairs scholarship page is listed as an information starting point. The current fellowship application portal and selection process have not been verified.",
      applicationSteps: [
        "Read the latest National Fellowship for ST Students notification and guidelines.",
        "Confirm research programme, institution and applicant-category conditions.",
        "Apply using the route and within the period specified by the current notice.",
        "Follow official selection, institution verification and fellowship updates.",
      ],
      afterApplication:
        "Refer to the current notification for selection, institution verification, joining and fellowship disbursement steps.",
      documents: [
        "Scheduled Tribe certificate, if required",
        "Research programme admission or registration evidence",
        "Academic records and selection documents specified in the notice",
        "Identity and bank details requested by the official process",
      ],
      renewal:
        "Check the current fellowship rules for progress reviews, continuation, duration and any required institutional reports.",
      sourceTitle: "Ministry of Tribal Affairs — scholarship information",
    },
  },
];
