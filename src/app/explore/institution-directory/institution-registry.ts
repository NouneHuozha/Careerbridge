export type InstitutionType =
  | "College"
  | "University"
  | "Institute"
  | "School"
  | "Training centre";
export type InstitutionOwnership = "Government" | "Private" | "Public";
export type VerificationStatus = "verified" | "unverified" | "outdated";

export type InformationSource = {
  label: string;
  url: string;
  checkedOn?: string;
  verificationStatus?: VerificationStatus;
};

export type InstitutionCampusRecord = {
  id: string;
  name?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  address?: string;
  directionsUrl?: string;
  locationSource?: InformationSource;
  phone?: { value: string; source: InformationSource };
  email?: { value: string; source: InformationSource };
  facilities?: {
    label: string;
    source: InformationSource;
    verificationStatus?: VerificationStatus;
    verifiedDate?: string;
  }[];
};

export type InstitutionRecord = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  type: InstitutionType;
  ownership?: InstitutionOwnership;
  website?: InformationSource;
  campuses: InstitutionCampusRecord[];
  isDemo?: boolean;
};

const kohimaWebsite: InformationSource = {
  label: "Kohima Science College official website",
  url: "https://kscj.ac.in/",
};
const kohimaAdmissions: InformationSource = {
  label: "Kohima Science College admissions",
  url: "https://admission.kscj.ac.in/",
};
const stEdmundsWebsite: InformationSource = {
  label: "St. Edmund’s College",
  url: "https://sec.edu.in/",
};

export const institutionRecords: InstitutionRecord[] = [
  {
    id: "kohima-science-college-jotsoma",
    slug: "kohima-science-college-jotsoma",
    name: "Kohima Science College, Jotsoma",
    initials: "KS",
    type: "College",
    ownership: "Government",
    website: kohimaWebsite,
    campuses: [
      {
        id: "main",
        name: "Jotsoma campus",
        locality: "Phezhu",
        city: "Jotsoma",
        district: "Kohima",
        state: "Nagaland",
        address: "Kohima Science College, Phezhu, Jotsoma, Kohima, Nagaland 797002",
        locationSource: kohimaAdmissions,
      },
    ],
  },
  {
    id: "st-edmunds-college-shillong",
    slug: "st-edmunds-college-shillong",
    name: "St. Edmund’s College",
    initials: "SE",
    type: "College",
    website: stEdmundsWebsite,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        locality: "Laitumkhrah",
        city: "Shillong",
        district: "East Khasi Hills",
        state: "Meghalaya",
        locationSource: {
          label: "College address",
          url: "https://sec.edu.in/principals.php",
        },
      },
    ],
  },
  {
    id: "eastern-hills-college",
    slug: "eastern-hills-college",
    name: "Eastern Hills College",
    initials: "EH",
    type: "College",
    ownership: "Private",
    isDemo: true,
    website: {
      label: "Sample institution website",
      url: "https://example.com/eastern-hills",
      checkedOn: "2026-10-15",
    },
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Kohima",
        district: "Kohima",
        state: "Nagaland",
        email: {
          value: "admissions@example.com",
          source: {
            label: "Sample contact page",
            url: "https://example.com/eastern-hills/contact",
            checkedOn: "2026-10-15",
          },
        },
      },
    ],
  },
  {
    id: "sample-north-valley-university",
    slug: "sample-north-valley-university",
    name: "Sample North Valley University",
    initials: "NV",
    type: "University",
    ownership: "Private",
    isDemo: true,
    website: {
      label: "Sample institution website",
      url: "https://example.com/north-valley",
      checkedOn: "2026-10-10",
    },
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Shillong",
        district: "East Khasi Hills",
        state: "Meghalaya",
      },
    ],
  },
  {
    id: "sample-institute-of-computing",
    slug: "sample-institute-of-computing",
    name: "Sample Institute of Computing",
    initials: "IC",
    type: "Institute",
    ownership: "Public",
    isDemo: true,
    website: {
      label: "Sample institution website",
      url: "https://example.com/sample-computing-institute",
      checkedOn: "2026-10-08",
    },
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Imphal",
        district: "Imphal West",
        state: "Manipur",
      },
    ],
  },
  {
    id: "sample-hillside-college",
    slug: "sample-hillside-college",
    name: "Sample Hillside College",
    initials: "HC",
    type: "College",
    ownership: "Government",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Aizawl",
        district: "Aizawl",
        state: "Mizoram",
      },
    ],
  },
  {
    id: "sample-riverbend-university",
    slug: "sample-riverbend-university",
    name: "Sample Riverbend University",
    initials: "RU",
    type: "University",
    ownership: "Public",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Agartala",
        district: "West Tripura",
        state: "Tripura",
      },
    ],
  },
  {
    id: "sample-eastern-skills-institute",
    slug: "sample-eastern-skills-institute",
    name: "Sample Eastern Skills Institute",
    initials: "ES",
    type: "Institute",
    ownership: "Private",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Kohima",
        district: "Kohima",
        state: "Nagaland",
      },
    ],
  },
  {
    id: "sample-mountainview-college",
    slug: "sample-mountainview-college",
    name: "Sample Mountainview College",
    initials: "MC",
    type: "College",
    ownership: "Government",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Gangtok",
        district: "Gangtok",
        state: "Sikkim",
      },
    ],
  },
  {
    id: "sample-greenfield-university",
    slug: "sample-greenfield-university",
    name: "Sample Greenfield University",
    initials: "GU",
    type: "University",
    ownership: "Private",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Itanagar",
        district: "Papum Pare",
        state: "Arunachal Pradesh",
      },
    ],
  },
  {
    id: "sample-lakeside-college",
    slug: "sample-lakeside-college",
    name: "Sample Lakeside College",
    initials: "LC",
    type: "College",
    ownership: "Government",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Guwahati",
        district: "Kamrup Metropolitan",
        state: "Assam",
      },
    ],
  },
  {
    id: "sample-plateau-institute",
    slug: "sample-plateau-institute",
    name: "Sample Plateau Institute",
    initials: "PI",
    type: "Institute",
    ownership: "Public",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Shillong",
        district: "East Khasi Hills",
        state: "Meghalaya",
      },
    ],
  },
  {
    id: "sample-cedar-grove-college",
    slug: "sample-cedar-grove-college",
    name: "Sample Cedar Grove College",
    initials: "CG",
    type: "College",
    ownership: "Private",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Dibrugarh",
        district: "Dibrugarh",
        state: "Assam",
      },
    ],
  },
  {
    id: "sample-sunrise-university",
    slug: "sample-sunrise-university",
    name: "Sample Sunrise University",
    initials: "SU",
    type: "University",
    ownership: "Public",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Tura",
        district: "West Garo Hills",
        state: "Meghalaya",
      },
    ],
  },
  {
    id: "sample-blue-ridge-institute",
    slug: "sample-blue-ridge-institute",
    name: "Sample Blue Ridge Institute",
    initials: "BR",
    type: "Institute",
    ownership: "Government",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Dimapur",
        district: "Dimapur",
        state: "Nagaland",
      },
    ],
  },
  {
    id: "sample-pinecrest-college",
    slug: "sample-pinecrest-college",
    name: "Sample Pinecrest College",
    initials: "PC",
    type: "College",
    ownership: "Government",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Tezpur",
        district: "Sonitpur",
        state: "Assam",
      },
    ],
  },
  {
    id: "sample-cloudpeak-university",
    slug: "sample-cloudpeak-university",
    name: "Sample Cloudpeak University",
    initials: "CU",
    type: "University",
    ownership: "Private",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Pasighat",
        district: "East Siang",
        state: "Arunachal Pradesh",
      },
    ],
  },
  {
    id: "sample-maple-leaf-institute",
    slug: "sample-maple-leaf-institute",
    name: "Sample Maple Leaf Institute",
    initials: "ML",
    type: "Institute",
    ownership: "Public",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Imphal",
        district: "Imphal West",
        state: "Manipur",
      },
    ],
  },
  {
    id: "sample-silver-stream-college",
    slug: "sample-silver-stream-college",
    name: "Sample Silver Stream College",
    initials: "SS",
    type: "College",
    ownership: "Private",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Aizawl",
        district: "Aizawl",
        state: "Mizoram",
      },
    ],
  },
  {
    id: "sample-orchid-valley-university",
    slug: "sample-orchid-valley-university",
    name: "Sample Orchid Valley University",
    initials: "OV",
    type: "University",
    ownership: "Government",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Agartala",
        district: "West Tripura",
        state: "Tripura",
      },
    ],
  },
  {
    id: "sample-fernwood-institute",
    slug: "sample-fernwood-institute",
    name: "Sample Fernwood Institute",
    initials: "FI",
    type: "Institute",
    ownership: "Private",
    isDemo: true,
    campuses: [
      {
        id: "main",
        name: "Main campus",
        city: "Jowai",
        district: "West Jaintia Hills",
        state: "Meghalaya",
      },
    ],
  },
];

export const institutionRecordsById = new Map(
  institutionRecords.map((institution) => [institution.id, institution]),
);

export const institutionRecordsBySlug = new Map(
  institutionRecords.map((institution) => [institution.slug, institution]),
);
