export type ExaminationStage = "class-10" | "class-12";
export type ExaminationLevel = "national" | "state" | "institution";

export type Examination = {
  id: string;
  name: string;
  level: ExaminationLevel;
  stages: ExaminationStage[];
  purpose: string;
  programmes: string[];
  authority: string;
  regions: string[];
  fields: string[];
  officialUrl?: string;
};

export const examinationLevels: Record<ExaminationLevel, string> = {
  national: "National level",
  state: "State level",
  institution: "Institution-specific",
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

export const examinations: Examination[] = [
  {
    id: "jee-main",
    name: "JEE Main",
    level: "national",
    stages: ["class-12"],
    purpose:
      "An entrance examination used for admission to participating engineering, architecture and planning programmes.",
    programmes: ["B.E. / B.Tech", "B.Arch", "B.Planning"],
    authority: "National Testing Agency (NTA)",
    regions: [],
    fields: ["engineering", "technology"],
    officialUrl: "https://jeemain.nta.nic.in/",
  },
  {
    id: "neet-ug",
    name: "NEET-UG",
    level: "national",
    stages: ["class-12"],
    purpose:
      "An entrance examination used for admission to specified undergraduate medical programmes.",
    programmes: ["MBBS", "BDS", "Other specified medical programmes"],
    authority: "National Testing Agency (NTA)",
    regions: [],
    fields: ["healthcare"],
  },
  {
    id: "cuet-ug",
    name: "CUET-UG",
    level: "national",
    stages: ["class-12"],
    purpose:
      "An entrance examination used by participating universities for undergraduate admissions.",
    programmes: ["Various undergraduate programmes"],
    authority: "National Testing Agency (NTA)",
    regions: [],
    fields: [],
  },
  {
    id: "clat-ug",
    name: "CLAT-UG",
    level: "national",
    stages: ["class-12"],
    purpose:
      "An entrance examination for undergraduate law programmes at participating institutions.",
    programmes: ["Undergraduate law programmes"],
    authority: "Consortium of National Law Universities",
    regions: [],
    fields: ["law"],
  },
  {
    id: "jee-advanced",
    name: "JEE Advanced",
    level: "national",
    stages: ["class-12"],
    purpose:
      "An entrance examination used for admission to undergraduate programmes at participating Indian Institutes of Technology.",
    programmes: ["B.Tech", "BS", "Other participating undergraduate programmes"],
    authority: "Joint Admission Board and participating IITs",
    regions: [],
    fields: ["engineering", "technology"],
  },
  {
    id: "nata",
    name: "NATA",
    level: "national",
    stages: ["class-12"],
    purpose:
      "An aptitude test used by institutions for admission to undergraduate architecture programmes.",
    programmes: ["Bachelor of Architecture (B.Arch)"],
    authority: "Council of Architecture",
    regions: [],
    fields: ["architecture"],
  },
  {
    id: "nid-dat",
    name: "NID DAT",
    level: "institution",
    stages: ["class-12"],
    purpose:
      "The National Institute of Design's admission test for its undergraduate design programme.",
    programmes: ["Bachelor of Design (B.Des)"],
    authority: "National Institute of Design",
    regions: [],
    fields: ["design"],
  },
];
