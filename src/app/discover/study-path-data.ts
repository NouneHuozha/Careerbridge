export type StudyCategory = {
  slug: string;
  name: string;
  summary: string;
  explanation: string;
};

export type StudyPathConfig = {
  eyebrow: string;
  breadcrumb: string;
  title: string;
  description: string;
  reminder: string;
  catalogueNote: string;
  detailBasePath: "/streams" | "/courses";
  detailActionLabel: string;
  categories: StudyCategory[];
};

export const class10StudyPath: StudyPathConfig = {
  eyebrow: "Class 10 study pathways",
  breadcrumb: "After Class 10",
  title: "After Class 10, what would you like to study?",
  description:
    "It’s okay if you don’t know yet. These four broad categories can help you understand the kinds of study people explore after Class 10.",
  reminder:
    "These are ways to browse, not recommendations. Reading about a category does not select it for you or tell you what you qualify for.",
  catalogueNote:
    "This page explains broad categories only; it does not show verified local subject combinations or school listings. Check current options with your school or board.",
  detailBasePath: "/streams",
  detailActionLabel: "Explore this stream",
  categories: [
    {
      slug: "science",
      name: "Science",
      summary:
        "A broad direction centred on science-focused learning after Class 10.",
      explanation:
        "Schools and boards decide which subjects and combinations are available. This page does not list or confirm a local subject set, so check the official options where you study.",
    },
    {
      slug: "arts",
      name: "Arts / Humanities",
      summary:
        "A broad direction that includes humanities and social-science-focused study.",
      explanation:
        "The subjects grouped under Arts or Humanities can vary between schools and boards. Check an official subject list for the options available to you.",
    },
    {
      slug: "commerce",
      name: "Commerce",
      summary:
        "A broad direction focused on business, accounting, and economics-related study.",
      explanation:
        "The subjects and combinations offered under Commerce vary by school and board. This is a general description, not a verified local subject list or an eligibility check.",
    },
    {
      slug: "vocational",
      name: "Vocational / Skill",
      summary:
        "Practical or skills-focused study, where those options are offered.",
      explanation:
        "Specific vocational options depend on the school or training provider. Check official information for actual availability, course content, and entry requirements.",
    },
  ],
};

export const class12StudyPath: StudyPathConfig = {
  eyebrow: "Class 12 study pathways",
  breadcrumb: "After Class 12",
  title: "After Class 12, what kind of study interests you?",
  description:
    "There are different kinds of further study to look into. You can read about them without choosing one today.",
  reminder:
    "These categories help you browse. They do not recommend a course, confirm local availability, or decide what you qualify for.",
  catalogueNote:
    "This page explains broad course areas only; it does not show verified local course or institution listings. Check current official information from the provider or institution.",
  detailBasePath: "/courses",
  detailActionLabel: "See courses in this area",
  categories: [
    {
      slug: "diploma",
      name: "Diploma / Polytechnic",
      summary:
        "Practical or technical study offered through diploma and polytechnic programmes.",
      explanation:
        "Programmes, duration, providers, and entry requirements differ. Check the official course and institution information before relying on a specific option.",
    },
    {
      slug: "university-degree",
      name: "University degree",
      summary:
        "Academic programmes offered by colleges and universities across different subjects.",
      explanation:
        "Each programme and institution sets its own subjects and entry requirements. This category does not confirm that a particular degree is available or that you qualify for it.",
    },
    {
      slug: "skill-training",
      name: "Skill training",
      summary:
        "Training programmes focused on building skills in a particular area.",
      explanation:
        "Providers differ in course content, duration, recognition, and entry requirements. Check the official provider and programme details for current information.",
    },
    {
      slug: "professional-study",
      name: "Professional study",
      summary:
        "Specialized programmes that can have defined admission or examination requirements.",
      explanation:
        "Requirements can vary by profession and programme. Use current official sources for any specific subject, examination, or admission information; this page does not determine eligibility.",
    },
  ],
};
