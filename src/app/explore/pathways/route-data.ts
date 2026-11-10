export type EducationStage = "class-10" | "class-12";

export type StudyRoute = {
  id: string;
  stage: EducationStage;
  catalogueGroup: string;
  category: string;
  title: string;
  description: string;
  steps: string[];
  introduction: string;
  progression: {
    title: string;
    description: string;
    nextStage?: string;
  }[];
  qualification: {
    title: string;
    description: string;
  };
  considerations: {
    title: string;
    description: string;
  }[];
  furtherProgression?: string;
  references?: string[];
  courseStage: EducationStage;
};

export const studyRoutes: StudyRoute[] = [
  {
    id: "higher-secondary",
    stage: "class-10",
    catalogueGroup: "Continue secondary education",
    category: "School education",
    title: "Continue to Class 11–12",
    description:
      "Continue school education and choose from the subject combinations available at your school.",
    steps: ["Class 10", "Class 11", "Class 12"],
    introduction:
      "A route to higher secondary education, where you continue your studies and choose subjects that can influence your future study options.",
    progression: [
      {
        title: "Complete Class 10",
        description:
          "Complete your secondary education and check the admission requirements of the school you wish to join.",
        nextStage: "Class 11",
      },
      {
        title: "Choose your subjects",
        description:
          "Select from the subject combinations offered by your school. These choices may affect the courses you can pursue later.",
        nextStage: "Class 12",
      },
      {
        title: "Complete Class 12",
        description:
          "Complete higher secondary education and receive the qualification awarded by your board.",
      },
    ],
    qualification: {
      title: "Higher secondary qualification",
      description:
        "The qualification and subjects depend on your education board and the programme you complete.",
    },
    considerations: [
      {
        title: "Subject choices matter",
        description:
          "The subjects you study can affect eligibility for some higher education programmes.",
      },
      {
        title: "Options differ between schools",
        description:
          "Not every school offers the same subject combinations. Check what is actually available.",
      },
      {
        title: "Further admission requirements apply",
        description:
          "Degree and professional courses have their own eligibility and admission conditions.",
      },
    ],
    furtherProgression:
      "After Class 12, you can explore courses based on your subjects and each programme’s admission requirements.",
    references: ["Samagra Education"],
    courseStage: "class-12",
  },
  {
    id: "open-schooling",
    stage: "class-10",
    catalogueGroup: "Continue secondary education",
    category: "Alternative study mode",
    title: "Open Schooling — Senior Secondary",
    description:
      "Complete a Senior Secondary qualification through a recognised open-schooling programme rather than a conventional full-time school route.",
    steps: ["Class 10", "Open-school enrolment", "Senior Secondary study", "Qualification"],
    introduction:
      "Open schooling is an alternative way to study toward a Senior Secondary qualification. It changes the mode of study, not the qualification level itself.",
    progression: [
      {
        title: "Complete Class 10",
        description:
          "Pass Class 10 or an equivalent qualification recognised by the open-schooling programme.",
        nextStage: "Open-school enrolment",
      },
      {
        title: "Enrol in a recognised programme",
        description:
          "Check the programme’s current eligibility and enrolment requirements. NIOS Senior Secondary is one example named in the supplied reference.",
        nextStage: "Choose available subjects",
      },
      {
        title: "Study and complete assessments",
        description:
          "Choose from the programme’s available subjects and complete the required assessments.",
        nextStage: "Senior Secondary qualification",
      },
      {
        title: "Meet qualification requirements",
        description:
          "Receive the Senior Secondary qualification after meeting the programme’s completion requirements.",
      },
    ],
    qualification: {
      title: "Senior Secondary qualification",
      description:
        "This is an alternative mode for completing a Class 12-level qualification, not a separate qualification level. Recognition and course eligibility must be checked for the specific programme.",
    },
    considerations: [
      {
        title: "It is a study mode, not a different level",
        description:
          "Open schooling offers an alternative way to complete Senior Secondary education.",
      },
      {
        title: "Subjects and assessments are programme-specific",
        description:
          "Check the available subject choices, assessment rules and current enrolment requirements.",
      },
      {
        title: "Further course eligibility still applies",
        description:
          "Higher education programmes may set their own subject, recognition and admission requirements.",
      },
    ],
    furtherProgression:
      "A recognised Senior Secondary qualification may support many of the same further-study options as other Class 12 qualifications, subject to each course’s requirements.",
    references: ["NIOS Senior Secondary course", "rckolkata.nios.ac.in"],
    courseStage: "class-12",
  },
  {
    id: "polytechnic-diploma",
    stage: "class-10",
    catalogueGroup: "Technical and vocational qualifications",
    category: "Technical education",
    title: "Polytechnic diploma",
    description:
      "Explore technical diploma programmes that combine classroom learning with practical training.",
    steps: ["Class 10", "Diploma admission", "Diploma study", "Qualification"],
    introduction:
      "A technical study route centred on a diploma programme. The branch, entry route and qualification depend on the specific programme and institution.",
    progression: [
      {
        title: "Check entry requirements",
        description:
          "Confirm whether the named diploma accepts your qualification and what subjects or selection steps apply.",
        nextStage: "Diploma admission",
      },
      {
        title: "Enter a diploma programme",
        description:
          "Apply to a specific programme and branch. Availability and admission processes differ between providers.",
        nextStage: "Technical diploma study",
      },
      {
        title: "Complete programme study",
        description:
          "Study the technical subjects and practical work included in that programme’s curriculum.",
        nextStage: "Assessment",
      },
      {
        title: "Meet programme assessments",
        description:
          "Complete the assessments required by the institution or awarding body.",
      },
    ],
    qualification: {
      title: "Technical diploma",
      description:
        "The exact award and awarding body depend on the programme. Confirm these with the institution before applying.",
    },
    considerations: [
      {
        title: "Entry routes can differ",
        description:
          "Do not assume every diploma accepts the same previous qualification or subjects.",
      },
      {
        title: "Branches are not interchangeable",
        description:
          "Programme content, practical training and future options depend on the selected branch.",
      },
    ],
    furtherProgression:
      "A diploma may support technical employment, apprenticeship or further technical study. Eligible diploma holders may have a lateral-entry option into a related degree in some systems, but branch, institution, marks and admission rules determine whether it applies.",
    references: ["Directorate of Technical Education, Nagaland"],
    courseStage: "class-10",
  },
  {
    id: "trade-training",
    stage: "class-10",
    catalogueGroup: "Technical and vocational qualifications",
    category: "Vocational training",
    title: "ITI and trade training",
    description:
      "Learn practical skills in a specific trade through a recognised vocational training programme.",
    steps: ["Entry qualification", "Choose a trade", "Training", "Assessment"],
    introduction:
      "A vocational route focused on learning a defined trade through practical training and related theory. Available trades and entry rules vary by programme.",
    progression: [
      {
        title: "Check the applicable entry qualification",
        description:
          "The required qualification can vary by trade and provider. Confirm the current criteria for the specific programme.",
        nextStage: "Trade and programme selection",
      },
      {
        title: "Choose a trade and provider",
        description:
          "Compare the named trade, training centre and qualification before deciding where to apply.",
        nextStage: "Practical and theoretical training",
      },
      {
        title: "Complete the training",
        description:
          "Study the trade’s theory and practise relevant skills according to the programme curriculum.",
        nextStage: "Programme assessment",
      },
      {
        title: "Complete required assessment",
        description:
          "Assessment and certification depend on the trade and the authority responsible for the programme.",
      },
    ],
    qualification: {
      title: "Trade-related qualification",
      description:
        "The certificate or award depends on the named trade and training scheme. Check the awarding authority with the provider.",
    },
    considerations: [
      {
        title: "Eligibility is trade-specific",
        description:
          "Entry qualification, age, subjects and other criteria may differ between trades.",
      },
      {
        title: "Check recognition and assessment",
        description:
          "Confirm who awards the qualification and how the practical and theory components are assessed.",
      },
      {
        title: "Progression routes are conditional",
        description:
          "Some eligible ITI trainees may qualify for specific academic equivalency arrangements, but these do not apply automatically to every trainee.",
      },
    ],
    furtherProgression:
      "Trade training may lead to skilled work, apprenticeship or further trade training. Additional academic equivalency routes apply only to eligible trainees under the relevant scheme’s conditions.",
    references: ["Directorate General of Training (DGT)"],
    courseStage: "class-10",
  },
  {
    id: "vocational-skills-class-10",
    stage: "class-10",
    catalogueGroup: "Technical and vocational qualifications",
    category: "Vocational and skill-based programme",
    title: "Vocational and skill-based programmes",
    description:
      "Develop practical skills in a sector through a recognised programme that accepts your entry qualification.",
    steps: ["Check entry requirements", "Choose a programme", "Training and practice", "Assessment"],
    introduction:
      "Vocational and skill programmes focus on practical or occupational learning. Their recognition and qualification level depend on the specific programme and awarding body.",
    progression: [
      {
        title: "Check who can enrol",
        description:
          "Find a programme that accepts your previous qualification and check any other entry requirements.",
        nextStage: "Choose a recognised programme",
      },
      {
        title: "Choose an area and provider",
        description:
          "Programmes may cover areas such as tourism, hospitality, healthcare support, IT, retail, agriculture, or beauty and wellness.",
        nextStage: "Skills training",
      },
      {
        title: "Complete training",
        description:
          "Learn the practical or occupational skills included in the programme.",
        nextStage: "Assessment",
      },
      {
        title: "Meet assessment requirements",
        description:
          "Complete the required assessment to receive the award specified by the programme.",
      },
    ],
    qualification: {
      title: "Programme-specific certificate or qualification",
      description:
        "An ordinary participation certificate does not automatically equal Class 12 or a diploma. Check the qualification level, recognition and awarding body.",
    },
    considerations: [
      {
        title: "Check recognition before enrolling",
        description:
          "Verify the awarding body and whether the programme is a recognised qualification or a participation certificate.",
      },
      {
        title: "Progression is not automatic",
        description:
          "A next skill level or further qualification is available only where a defined progression route exists.",
      },
    ],
    furtherProgression:
      "A programme may support entry-level work, further skill development or a higher skill qualification where a recognised progression route exists.",
    references: ["Press Information Bureau (PIB)"],
    courseStage: "class-10",
  },
  {
    id: "apprenticeship-class-10",
    stage: "class-10",
    catalogueGroup: "Learn through work",
    category: "Work-based learning",
    title: "Apprenticeship and work-based training",
    description:
      "Learn through structured workplace training with an employer when an apprenticeship opportunity matches your eligibility.",
    steps: ["Check trade eligibility", "Apply for an opportunity", "Workplace training", "Assessment"],
    introduction:
      "An apprenticeship combines structured training with practical workplace experience. It is a work-based learning route, not a school or college qualification route.",
    progression: [
      {
        title: "Check trade and learner requirements",
        description:
          "Age and education requirements depend on the designated trade. Some trades accept eligible freshers; others require prior ITI, vocational Class 12 or diploma study.",
        nextStage: "Apply for a suitable opportunity",
      },
      {
        title: "Apply to an employer opportunity",
        description:
          "Apply for an available apprenticeship for which you meet the current conditions.",
        nextStage: "Structured workplace training",
      },
      {
        title: "Complete workplace training",
        description:
          "Learn practical skills through the training plan for the selected trade or apprenticeship category.",
        nextStage: "Required assessment",
      },
      {
        title: "Complete required assessment",
        description:
          "Meet the assessment and completion requirements that apply to the apprenticeship.",
      },
    ],
    qualification: {
      title: "Apprenticeship completion credential",
      description:
        "The credential depends on the apprenticeship category and applicable completion requirements. It is not automatically equivalent to Class 12, an ITI trade certificate or a diploma.",
    },
    considerations: [
      {
        title: "Entry conditions depend on the category",
        description:
          "Different trades and apprenticeship categories require different prior education and other eligibility.",
      },
      {
        title: "An apprenticeship is not a job guarantee",
        description:
          "It provides structured workplace training and experience; permanent employment is not guaranteed.",
      },
    ],
    furtherProgression:
      "An apprenticeship may provide workplace experience and a completion credential, with later employment or skill development depending on the opportunity and the learner.",
    references: ["Directorate General of Training (DGT)"],
    courseStage: "class-10",
  },
  {
    id: "undergraduate",
    stage: "class-12",
    catalogueGroup: "Degree programmes",
    category: "Degree study",
    title: "Undergraduate degree",
    description:
      "Explore degree programmes across different subjects, including integrated and professional courses.",
    steps: ["Class 12", "Admission requirements", "Degree programme", "Qualification"],
    introduction:
      "An undergraduate degree route begins after higher secondary education, with entry requirements and programme structure set by each course and institution.",
    progression: [
      {
        title: "Complete Class 12",
        description:
          "Complete the qualification required for the specific degree route you want to explore.",
        nextStage: "Course-specific admission requirements",
      },
      {
        title: "Meet course-specific requirements",
        description:
          "Check required subjects, marks and any selection or entrance process for the named programme.",
        nextStage: "Degree programme",
      },
      {
        title: "Study the degree programme",
        description:
          "Complete the curriculum, practical components and assessments set by the institution and awarding body.",
        nextStage: "Programme completion",
      },
      {
        title: "Complete the programme",
        description:
          "The qualification awarded depends on the degree and the institution or awarding body.",
      },
    ],
    qualification: {
      title: "Undergraduate degree qualification",
      description:
        "The award, duration and programme structure depend on the specific degree. Integrated and professional routes may have additional conditions.",
    },
    considerations: [
      {
        title: "Eligibility depends on the course",
        description:
          "Different programmes may require specific Class 12 subjects, marks or other qualifications.",
      },
      {
        title: "Selection processes vary",
        description:
          "Some programmes use entrance tests, counselling or other selection steps; check the current notice.",
      },
      {
        title: "Integrated and professional routes differ",
        description:
          "Their programme length and requirements are course-specific and should be checked separately.",
      },
    ],
    furtherProgression:
      "A bachelor’s degree may lead to employment, postgraduate study, research or doctoral study when the next programme’s entry requirements are met.",
    references: ["Study in India"],
    courseStage: "class-12",
  },
  {
    id: "professional-degree",
    stage: "class-12",
    catalogueGroup: "Degree programmes",
    category: "Professional and specialised degree",
    title: "Professional and specialised degree programmes",
    description:
      "Explore professional programmes with course-specific subject, eligibility, entrance and practical requirements.",
    steps: ["Meet academic requirements", "Complete required selection", "Study the programme", "Meet practice or registration rules"],
    introduction:
      "Professional and specialised programmes include degrees with specific academic and admission conditions. Some also require practical training, registration or licensing before professional practice.",
    progression: [
      {
        title: "Meet the programme’s academic requirements",
        description:
          "Check the required Class 12 subjects, marks and other criteria for the specific programme.",
        nextStage: "Entrance or selection, where required",
      },
      {
        title: "Complete required entrance or selection",
        description:
          "Some programmes require an entrance examination or other selection process; requirements differ by course.",
        nextStage: "Professional programme",
      },
      {
        title: "Complete the programme",
        description:
          "Study the required academic content and practical components of the programme.",
        nextStage: "Practical training or registration, where applicable",
      },
      {
        title: "Meet further professional conditions",
        description:
          "Some fields require additional practical training, registration or licensing before particular work can be done.",
      },
    ],
    qualification: {
      title: "Professional or specialised qualification",
      description:
        "The award and any requirements to practise depend on the specific programme and relevant professional rules.",
    },
    considerations: [
      {
        title: "Every profession has its own entry rules",
        description:
          "Subject requirements, entrance exams and selection rules are programme-specific.",
      },
      {
        title: "A degree may not be the final practice requirement",
        description:
          "Practical training, registration or licensing may apply in some fields.",
      },
    ],
    furtherProgression:
      "Professional qualifications may lead to further specialisation or postgraduate study. Work in a regulated profession may require additional registration or licensing.",
    references: ["Consortium of National Law Universities (CLAT reference)"],
    courseStage: "class-12",
  },
  {
    id: "diploma",
    stage: "class-12",
    catalogueGroup: "Diploma and skill programmes",
    category: "Technical and applied study",
    title: "Diploma programmes",
    description:
      "Consider diploma programmes focused on technical, applied or subject-specific learning.",
    steps: ["Check entry route", "Diploma admission", "Diploma study", "Qualification"],
    introduction:
      "Diploma programmes can offer technical or applied study after Class 12, but there is no single entry route or qualification shared by every diploma.",
    progression: [
      {
        title: "Check the specific entry route",
        description:
          "Confirm whether the programme accepts your qualification and whether particular subjects or selection steps apply.",
        nextStage: "Diploma admission",
      },
      {
        title: "Apply to a named programme",
        description:
          "Review the programme, institution and awarding body, along with current admission requirements.",
        nextStage: "Diploma study",
      },
      {
        title: "Complete programme study",
        description:
          "Study the subject and practical components defined by that diploma’s curriculum.",
        nextStage: "Programme assessment",
      },
      {
        title: "Complete required assessments",
        description:
          "Assessment methods and completion requirements depend on the programme and awarding body.",
      },
    ],
    qualification: {
      title: "Diploma qualification",
      description:
        "The award and its recognition depend on the named programme and awarding body.",
    },
    considerations: [
      {
        title: "Diploma entry is not uniform",
        description:
          "Required previous study, subjects and selection criteria vary across programmes.",
      },
      {
        title: "Check the awarding body",
        description:
          "Confirm what qualification is awarded and what progression it may support.",
      },
    ],
    courseStage: "class-12",
  },
  {
    id: "vocational-skills",
    stage: "class-12",
    catalogueGroup: "Diploma and skill programmes",
    category: "Vocational learning",
    title: "Vocational and skill training",
    description:
      "Build practical skills through vocational courses or focused training programmes.",
    steps: ["Check entry requirements", "Choose training", "Complete training", "Assessment"],
    introduction:
      "This route covers a range of vocational and skill programmes. The subject, training format and qualification depend on the specific course and provider.",
    progression: [
      {
        title: "Check entry requirements",
        description:
          "Confirm the previous qualification, subjects and other criteria for the specific training programme.",
        nextStage: "Select a programme",
      },
      {
        title: "Choose a programme and provider",
        description:
          "Review the training content, provider and qualification or certificate offered.",
        nextStage: "Training",
      },
      {
        title: "Complete the training",
        description:
          "The balance of theory, practical work and supervised learning varies by programme.",
        nextStage: "Assessment",
      },
      {
        title: "Meet assessment requirements",
        description:
          "Check how learning is assessed and what conditions must be met to receive the award.",
      },
    ],
    qualification: {
      title: "Programme-specific award",
      description:
        "The certificate or qualification depends on the training programme and its awarding authority.",
    },
    considerations: [
      {
        title: "Training programmes differ",
        description:
          "Course content, duration, delivery and recognition are not the same across providers.",
      },
      {
        title: "Confirm what the course awards",
        description:
          "Ask the provider which certificate or qualification is issued and by whom.",
      },
    ],
    furtherProgression:
      "Training may support skills-based employment, eligible apprenticeships or further vocational qualifications where a defined route is available.",
    courseStage: "class-12",
  },
  {
    id: "apprenticeship-class-12",
    stage: "class-12",
    catalogueGroup: "Learn through work",
    category: "Work-based learning",
    title: "Apprenticeship and work-based training",
    description:
      "Gain practical workplace experience through an apprenticeship category for which you meet the educational and other requirements.",
    steps: ["Check apprenticeship category", "Apply for an opportunity", "Workplace training", "Completion credential"],
    introduction:
      "Apprenticeships provide structured workplace training. Trade, technician-vocational, technician and graduate categories have different entry requirements.",
    progression: [
      {
        title: "Check category-specific eligibility",
        description:
          "Identify the apprenticeship category and confirm the education, age and other requirements.",
        nextStage: "Apply for an eligible opportunity",
      },
      {
        title: "Apply to an employer opportunity",
        description:
          "Some vocational Class 12 pass-outs may be eligible for Technician (Vocational) apprenticeships; other categories have different requirements.",
        nextStage: "Structured workplace training",
      },
      {
        title: "Complete workplace training",
        description:
          "Gain practical experience and complete the training plan for the apprenticeship category.",
        nextStage: "Assessment and completion",
      },
      {
        title: "Meet completion requirements",
        description:
          "Complete the applicable training and assessment to receive the relevant apprenticeship credential.",
      },
    ],
    qualification: {
      title: "Apprenticeship completion credential",
      description:
        "The credential depends on the apprenticeship category and successful completion. It does not guarantee permanent employment.",
    },
    considerations: [
      {
        title: "There are different apprenticeship categories",
        description:
          "Trade, technician-vocational, technician and graduate apprenticeships have different entry conditions.",
      },
      {
        title: "Employment is not guaranteed",
        description:
          "An apprenticeship provides work-based training and experience, not a promise of a job.",
      },
    ],
    furtherProgression:
      "An apprenticeship may support further employment or skill development, depending on the category, opportunity and learner.",
    references: ["Directorate General of Training (DGT)"],
    courseStage: "class-12",
  },
];

export function getStudyRoutes(stage: EducationStage) {
  return studyRoutes.filter((route) => route.stage === stage);
}

export function getStudyRoute(id: string) {
  return studyRoutes.find((route) => route.id === id);
}

export function getStageLabel(stage: EducationStage) {
  return stage === "class-10" ? "Class 10" : "Class 12";
}
