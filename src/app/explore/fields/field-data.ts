import type { ActivityId } from "../../discover/flow-data";

type StudyStage = "class-10" | "class-12";

type FieldId =
  | "technology"
  | "engineering"
  | "healthcare"
  | "business"
  | "law"
  | "government"
  | "education"
  | "science"
  | "arts-design"
  | "media"
  | "agriculture-environment"
  | "hospitality-tourism"
  | "social-sciences";

type FieldGuideContent = {
  id: FieldId;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  overview: {
    shortDescription: string;
    introduction: string;
    everydayExample: string;
    activities: [string, string, string];
    areas: [string, string, string, string];
  };
  introduction: [string, string];
  everydayExample: string;
  whyItMatters: string;
  workExamples: string[];
  workContext: string;
  areas: { name: string; description: string; example: string }[];
  studyRoutes: Record<StudyStage, string[]>;
  whatYouLearn: Record<StudyStage, string>;
  opportunities: string[];
  workplaces: string[];
  usefulSkills: string[];
  reflection: string;
};

export const fieldGuideData = {
  technology: {
    id: "technology",
    name: "Technology",
    description: "Computers, software and digital systems.",
    image: "/images/fields/technology.jpg",
    imageAlt: "Computer circuit board with small electronic components",
    overview: {
      shortDescription: "Using digital tools and computer systems to solve practical problems.",
      introduction: "Technology focuses on creating, maintaining and improving digital tools and computer systems. It helps people communicate, find information and complete tasks.",
      everydayExample: "Using a phone app to check a bus time or pay a bill is one everyday use of technology.",
      activities: [
        "Create and improve websites, apps or other digital tools.",
        "Set up and maintain computers and networks.",
        "Find and fix problems with digital systems.",
      ],
      areas: ["Software and apps", "Computer systems", "Cybersecurity", "Data and information"],
    },
    introduction: [
      "Technology uses computers, digital tools and technical systems to solve problems and make everyday life easier.",
      "From mobile apps and websites to online banking and hospital systems, technology is part of many places people live, learn and work.",
    ],
    everydayExample: "A bus-tracking app, an online class and the card reader at a shop all rely on technology working behind the scenes.",
    whyItMatters: "When digital tools are easy to use, reliable and secure, they help people connect, learn and get everyday tasks done.",
    workExamples: [
      "Build and improve websites, apps or software.",
      "Set up and maintain computers, networks and digital services.",
      "Help protect systems and information.",
      "Work with data to find useful patterns and information.",
      "Test technical solutions and investigate problems when something goes wrong.",
    ],
    workContext: "People may work with designers, customers, other developers or support teams. Their everyday tools can include computers, code editors, testing tools and network equipment.",
    areas: [
      { name: "Software and app development", description: "Plan, build and test websites, apps and computer programmes.", example: "A team builds an app that lets families book a clinic appointment." },
      { name: "Computer systems and networks", description: "Connect devices and keep computer systems running reliably.", example: "A support team restores a school's Wi-Fi before online lessons begin." },
      { name: "Cybersecurity", description: "Help protect digital systems and information from misuse.", example: "A security team checks a sign-in system for weaknesses before launch." },
      { name: "Data and information", description: "Organise and study data to answer questions and support decisions.", example: "A shop studies sales records to plan which items to restock." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 and choose subjects that build useful foundations, such as mathematics or computer science where available.",
        "Explore a relevant diploma, polytechnic or vocational programme; options and entry rules vary by institution.",
        "Try beginner coding, computer applications or digital-skills projects alongside school learning.",
      ],
      "class-12": [
        "Explore undergraduate programmes in computing, information technology, computer science or related subjects.",
        "Consider a diploma or recognised skills programme in areas such as software, networks or digital support.",
        "Compare course subjects, practical work and entry requirements; some programmes require particular Class 12 subjects.",
      ],
    },
    whatYouLearn: {
      "class-10": "Depending on the route, you may build foundations in maths, computing, digital problem-solving and how computer systems work.",
      "class-12": "Courses may teach programming, databases, networks, software design or information systems, with practical projects depending on the programme.",
    },
    opportunities: [
      "Web or app developer",
      "IT support technician",
      "Network administrator",
      "Cybersecurity analyst",
      "Data analyst",
    ],
    workplaces: ["Technology companies", "Banks and businesses", "Schools and hospitals", "Government and public services"],
    usefulSkills: ["Logical thinking", "Curiosity", "Careful testing", "Clear communication", "Learning new tools"],
    reflection: "Are you curious about how apps, websites or digital systems work? Do you like testing ideas and solving practical problems?",
  },
  engineering: {
    id: "engineering",
    name: "Engineering",
    description: "Designing, testing and improving practical solutions.",
    image: "/images/fields/engineering.jpg",
    imageAlt: "Building design plans and architecture models",
    overview: {
      shortDescription: "Designing, testing and improving structures, machines and systems.",
      introduction: "Engineering uses science, mathematics and design to develop practical solutions. It helps create and maintain the structures, machines and systems people use.",
      everydayExample: "A bridge carrying traffic safely depends on engineering design, materials and regular checks.",
      activities: [
        "Plan and draw a design to address a practical need.",
        "Build models or use tools to test how a design works.",
        "Inspect and improve machines, structures or systems.",
      ],
      areas: ["Civil engineering", "Mechanical engineering", "Electrical and electronics", "Chemical and manufacturing"],
    },
    introduction: [
      "Engineering applies science, mathematics and design to create, improve and maintain things people use.",
      "Engineers work on everything from roads and clean water to machines, electrical systems and manufacturing processes.",
    ],
    everydayExample: "The phone you use, the road you travel on and the clean water reaching a home all depend on engineering.",
    whyItMatters: "Engineering turns ideas into practical things and systems, while balancing safety, cost and how they affect people and the environment.",
    workExamples: [
      "Understand a need and plan a possible solution.",
      "Draw designs, build models or use computer tools to test an idea.",
      "Measure, test and improve materials, machines or systems.",
      "Work with a team to build, inspect or maintain projects.",
      "Consider safety, cost, resources and the effect on people and the environment.",
    ],
    workContext: "Engineers often work in teams with technicians, builders, designers and clients. They may use drawings, measuring tools, models and specialist software.",
    areas: [
      { name: "Civil engineering", description: "Plan and maintain buildings, roads, bridges and water systems.", example: "A project team checks a bridge design before construction begins." },
      { name: "Mechanical engineering", description: "Design, build and maintain machines and mechanical systems.", example: "An engineer tests a pump to make sure it moves water safely and efficiently." },
      { name: "Electrical and electronics", description: "Work with electrical power, circuits, devices and control systems.", example: "A team checks the wiring and controls in a new lift." },
      { name: "Chemical and manufacturing", description: "Improve how materials and products are made and processed.", example: "A factory team adjusts a process to reduce waste when making a product." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 with mathematics and science if those subjects are available and suit your plans.",
        "Look into polytechnic diplomas in engineering branches; programmes and admissions differ by state and institution.",
        "Explore ITI or other technical training for practical trades connected to engineering work.",
      ],
      "class-12": [
        "Compare engineering degrees and diplomas in branches such as civil, mechanical, electrical or electronics.",
        "Check each programme's subject requirements, entrance process and recognition before applying.",
        "Technical certificates or apprenticeships may provide other practical routes, depending on the role.",
      ],
    },
    whatYouLearn: {
      "class-10": "School science and mathematics can build useful foundations. A technical diploma may introduce drawing, materials, machines or electrical basics.",
      "class-12": "Depending on the course, you may study engineering principles, design, materials, measurements and how to test solutions safely.",
    },
    opportunities: [
      "Civil or mechanical engineer",
      "Electrical technician",
      "Design or quality assistant",
      "Manufacturing technician",
      "Maintenance engineer",
    ],
    workplaces: ["Construction sites", "Factories and workshops", "Engineering consultancies", "Energy and transport organisations"],
    usefulSkills: ["Problem-solving", "Mathematics", "Attention to safety", "Teamwork", "Practical thinking"],
    reflection: "Do you enjoy understanding how things work, making or repairing objects, or finding a practical way through a problem?",
  },
  healthcare: {
    id: "healthcare",
    name: "Healthcare",
    description: "Health, medicine, patient care and community wellbeing.",
    image: "/images/fields/healthcare.jpg",
    imageAlt: "Healthcare professionals caring for a patient",
    overview: {
      shortDescription: "Protecting health, preventing illness and helping people recover.",
      introduction: "Healthcare is about protecting people's health, preventing illness and helping people recover when they become sick or injured.",
      everydayExample: "A routine health check, a test that helps explain a symptom and advice on preventing illness are all part of healthcare.",
      activities: [
        "Listen to patients describe their symptoms and gather information that helps the care team understand their health.",
        "Provide care and follow a treatment plan while watching how a patient is doing.",
        "Collect samples and use laboratory equipment to help find signs of illness.",
      ],
      areas: ["Medical care", "Nursing and patient care", "Medical laboratory science", "Pharmacy"],
    },
    introduction: [
      "Healthcare is about protecting people's health, preventing illness and helping people recover when they become sick or injured.",
      "It includes treating patients, carrying out medical tests, providing medicines, supporting recovery and helping whole communities stay well.",
    ],
    everydayExample: "A routine health check, a test that helps explain a symptom and advice on preventing illness are all part of healthcare.",
    whyItMatters: "Good healthcare can help people stay well, understand what is happening to their bodies and get support when they need it.",
    workExamples: [
      "Ask about symptoms, examine patients or help a trained professional understand a health problem.",
      "Provide care and follow a treatment plan while watching how a patient is doing.",
      "Collect samples and use laboratory equipment to help find signs of illness.",
      "Prepare, check or provide medicines and explain how they should be used safely.",
      "Operate or maintain equipment used to monitor, test or treat patients.",
      "Teach people and communities about preventing illness and staying healthy.",
      "Record information carefully and protect each person's privacy.",
    ],
    workContext: "Healthcare teams can include doctors, nurses, laboratory staff, pharmacists, therapists and support workers. They use tools such as medical records, test equipment and protective gear, following strict safety and privacy practices.",
    areas: [
      { name: "Medical care", description: "Identify health problems, plan treatment and support a person's recovery.", example: "A clinician checks a patient's symptoms and discusses the next steps in their care." },
      { name: "Nursing and patient care", description: "Care for patients, monitor changes and support their treatment.", example: "A nurse checks a patient's temperature and helps them follow their care plan." },
      { name: "Medical laboratory science", description: "Test samples to help care teams understand a person's health.", example: "A laboratory worker analyses a blood sample and records the result for the care team." },
      { name: "Pharmacy", description: "Understand medicines and help make sure they are supplied and used safely.", example: "A pharmacist checks a prescription and explains how to take a medicine." },
      { name: "Public health", description: "Help prevent illness and improve health across a community.", example: "A local team shares clear information about preventing the spread of an infection." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12; science subjects are needed for some healthcare courses, but not every health-related role follows the same route.",
        "Explore recognised vocational or diploma programmes related to healthcare support where available.",
        "Check course approval, age rules, practical training and entry requirements before enrolling.",
      ],
      "class-12": [
        "Explore degree and diploma routes in areas such as nursing, pharmacy, laboratory science, rehabilitation or public health.",
        "Medicine and several other regulated professions have specific subjects, entrance processes and approved-course requirements.",
        "Check the relevant official regulator and institution for current eligibility and registration rules.",
      ],
    },
    whatYouLearn: {
      "class-10": "Depending on the route, you may learn basic science, human health, patient support or practical care skills. Some clinical professions require specific subjects later.",
      "class-12": "Courses may teach anatomy, medicines, laboratory methods, patient care or community health. The subjects and practical training depend on the qualification.",
    },
    opportunities: [
      "Doctor or specialist after required training",
      "Nurse or nursing educator",
      "Medical laboratory technologist",
      "Pharmacist",
      "Public health worker",
    ],
    workplaces: ["Hospitals and clinics", "Diagnostic laboratories", "Pharmacies", "Public health organisations", "Research and education settings"],
    usefulSkills: ["Communication", "Attention to detail", "Teamwork", "Responsibility", "Empathy and patience"],
    reflection: "Are you interested in health, science or how people can be supported through illness and recovery? Caring roles also require training and responsibility.",
  },
  business: {
    id: "business",
    name: "Business & Management",
    description: "How organisations plan, manage resources and serve people.",
    image: "/images/fields/business-management.jpg",
    imageAlt: "A team working together around a table",
    overview: {
      shortDescription: "How organisations plan their work, use resources and serve people.",
      introduction: "Business and management focuses on how organisations plan, make decisions and use resources. It helps them meet people's needs and work towards their goals.",
      everydayExample: "A local shop deciding what to stock, how to serve customers and how to pay its bills is making business decisions.",
      activities: [
        "Plan projects, budgets or schedules.",
        "Find out what customers or communities need.",
        "Coordinate people, supplies and everyday operations.",
      ],
      areas: ["Finance and accounting", "Marketing and communication", "People and human resources", "Operations and entrepreneurship"],
    },
    introduction: [
      "Business and management is about how organisations plan, serve people, use resources and work towards their goals.",
      "It can involve money, marketing, operations, people, customer needs or starting a new venture.",
    ],
    everydayExample: "A local shop deciding what to stock, how to serve customers and how to pay its bills is making business decisions.",
    whyItMatters: "Thoughtful planning helps organisations meet people's needs, use resources well and keep important services running.",
    workExamples: [
      "Plan tasks, projects, budgets or schedules.",
      "Understand what customers or communities need.",
      "Keep records and use information to support decisions.",
      "Coordinate people, supplies and day-to-day operations.",
      "Communicate ideas, explain plans and solve workplace problems.",
    ],
    workContext: "People may work with customers, suppliers and colleagues across a team. Common tools include spreadsheets, budgets, sales information and planning systems.",
    areas: [
      { name: "Finance and accounting", description: "Track money, prepare records and help organisations plan.", example: "An accounts assistant checks invoices so a small business knows what it has paid." },
      { name: "Marketing and communication", description: "Understand audiences and explain products, services or ideas.", example: "A team creates a clear announcement about a new service for local families." },
      { name: "People and human resources", description: "Support hiring, learning and the way teams work together.", example: "A coordinator helps new staff learn how their workplace operates." },
      { name: "Operations and entrepreneurship", description: "Improve everyday processes or develop a new business idea.", example: "A shop owner changes a delivery schedule to reduce wasted stock." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12; commerce, humanities and science can all lead to business-related study.",
        "Build practical foundations in communication, mathematics, digital tools and basic financial understanding.",
        "Explore recognised vocational courses in areas such as office administration, retail or accounting support.",
      ],
      "class-12": [
        "Compare undergraduate courses in business, commerce, management, economics or related subjects.",
        "Diplomas and skill programmes may focus on areas such as accounting, digital marketing or office operations.",
        "Subject requirements differ; check course content and entry criteria with each institution.",
      ],
    },
    whatYouLearn: {
      "class-10": "School subjects can build useful foundations in communication, mathematics and digital skills. Vocational courses may introduce office, retail or bookkeeping tasks.",
      "class-12": "Courses may cover accounting, economics, marketing, management, business communication or how organisations make decisions.",
    },
    opportunities: [
      "Accounts assistant",
      "Marketing coordinator",
      "Sales associate",
      "Human resources assistant",
      "Operations coordinator",
    ],
    workplaces: ["Shops and service businesses", "Banks and finance teams", "Companies and startups", "Non-profits and public organisations"],
    usefulSkills: ["Communication", "Planning", "Comfort with numbers", "Working with people", "Making careful decisions"],
    reflection: "Do you enjoy organising plans, understanding what people need, working with numbers or bringing people together to get something done?",
  },
  law: {
    id: "law",
    name: "Law",
    description: "Legal systems, rights, responsibilities and justice.",
    image: "/images/fields/law.jpg",
    imageAlt: "Law books and legal documents",
    overview: {
      shortDescription: "Understanding laws, rights and ways to resolve disputes.",
      introduction: "Law focuses on the rules that organise society, protect rights and guide how disputes are handled. Legal work helps people and organisations understand their responsibilities and options.",
      everydayExample: "Rules about renting a home, protecting workers or resolving a disagreement are all connected to law.",
      activities: [
        "Read laws and documents carefully.",
        "Research a legal question and organise relevant facts.",
        "Explain legal information or help prepare case documents.",
      ],
      areas: ["Courts and advocacy", "Public and constitutional law", "Business and corporate law", "Community and social justice"],
    },
    introduction: [
      "Law is the study and practice of rules that help organise society, protect rights and resolve disputes.",
      "People in law-related work read carefully, build arguments, explain options and help individuals or organisations understand legal processes.",
    ],
    everydayExample: "Rules about renting a home, protecting workers or resolving a disagreement are all connected to law.",
    whyItMatters: "Understanding laws can help people protect their rights, meet responsibilities and find fair ways to resolve disputes.",
    workExamples: [
      "Read laws, decisions and documents closely.",
      "Research questions and organise relevant facts.",
      "Explain legal information in clear language.",
      "Prepare documents or support hearings and casework.",
      "Help organisations understand responsibilities and follow rules.",
    ],
    workContext: "Legal teams may work with clients, courts, public offices or businesses. They use laws, case documents and research, and must handle information carefully.",
    areas: [
      { name: "Courts and advocacy", description: "Present arguments and support the resolution of legal disputes.", example: "A legal team organises documents and arguments for a hearing." },
      { name: "Public and constitutional law", description: "Explore government, public powers, rights and civic responsibilities.", example: "A researcher explains how a proposed rule may affect people's rights." },
      { name: "Business and corporate law", description: "Help organisations understand agreements and legal duties.", example: "A company asks a legal team to review a partnership agreement." },
      { name: "Community and social justice", description: "Support access to justice, legal awareness and public-interest work.", example: "A community group shares information about where people can seek legal help." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12; students from different subject streams may later study law.",
        "Build reading, writing, discussion, research and critical-thinking skills through school subjects and activities.",
        "Learn about recognised law programmes, since professional routes require specific qualifications.",
      ],
      "class-12": [
        "Explore an integrated undergraduate law degree after Class 12 or a law degree taken after another bachelor's degree.",
        "Entrance tests, subject rules and recognised-programme requirements vary between institutions and jurisdictions.",
        "Check current rules from official universities and legal education or professional authorities.",
      ],
    },
    whatYouLearn: {
      "class-10": "You can build reading, writing, discussion and research skills in any school stream. These help you understand arguments and explain ideas clearly.",
      "class-12": "Law courses explore legal systems, rights, reasoning, research and writing. Professional practice requires recognised qualifications and may require further steps.",
    },
    opportunities: [
      "Lawyer after required qualification and registration",
      "Legal researcher",
      "Legal assistant",
      "Compliance officer",
      "Policy or community advocate",
    ],
    workplaces: ["Courts and legal offices", "Government departments", "Businesses and banks", "Community organisations and legal-aid services"],
    usefulSkills: ["Careful reading", "Clear writing", "Listening", "Reasoning", "Respect for confidentiality"],
    reflection: "Do you like reading closely, discussing different viewpoints, explaining ideas clearly or understanding how rules affect people's lives?",
  },
  government: {
    id: "government",
    name: "Government & Public Service",
    description: "Public services, policy and work that supports communities.",
    image: "/images/fields/government-public-service.jpg",
    imageAlt: "A public government building",
    overview: {
      shortDescription: "Organising public services and plans that support communities.",
      introduction: "Government and public service focuses on how public organisations serve communities and put laws, plans and services into practice. Its work can include administration, policy and local services.",
      everydayExample: "A public library, road repair or local health service shows how public services support a community.",
      activities: [
        "Help organise services in response to community needs.",
        "Review information and follow public procedures.",
        "Support the planning or delivery of public programmes.",
      ],
      areas: ["Public administration", "Policy and planning", "Local and community services", "Public safety and infrastructure"],
    },
    introduction: [
      "Government and public service is about how public organisations serve communities and put laws, plans and services into practice.",
      "The work can include local services, public administration, policy, safety, infrastructure and communication with the public.",
    ],
    everydayExample: "A public library, road repair, local health service or help desk is part of how public services support a community.",
    whyItMatters: "Public services help communities access shared resources, information and support in an organised way.",
    workExamples: [
      "Help organise services and respond to community needs.",
      "Keep records, review information and follow public procedures.",
      "Support the planning or delivery of public programmes.",
      "Communicate information to residents and work with different groups.",
      "Help monitor projects, budgets or service quality.",
    ],
    workContext: "Public-service teams work with residents, community groups and other departments. They may use records, budgets, maps and project plans to organise services.",
    areas: [
      { name: "Public administration", description: "Coordinate the people and processes behind public services.", example: "An office team organises applications so residents can access a service." },
      { name: "Policy and planning", description: "Study public issues and help shape plans and programmes.", example: "Researchers compare information before a town plans a new bus route." },
      { name: "Local and community services", description: "Support services delivered close to where people live.", example: "A local team helps residents find the right community support." },
      { name: "Public safety and infrastructure", description: "Contribute to safety, transport, utilities and civic systems.", example: "A project team checks that a public walkway is safe and accessible." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12; humanities, commerce and science can all connect to different public-service areas.",
        "Explore civics, history, economics, geography, communication and community projects.",
        "Public-service recruitment rules vary by role; school completion alone does not guarantee eligibility.",
      ],
      "class-12": [
        "Consider undergraduate study in public administration, political science, economics, law, social science or another relevant subject.",
        "Some public roles require specific degrees, exams, training or other criteria; others use different routes.",
        "Use official recruitment notices to check current age, qualification, exam and residency requirements.",
      ],
    },
    whatYouLearn: {
      "class-10": "Civics, history, geography, economics and communication can help you understand communities and how public decisions are made.",
      "class-12": "Relevant courses may explore public administration, policy, economics, law or social issues. Specific public roles can have separate exam and qualification rules.",
    },
    opportunities: [
      "Public administration assistant",
      "Community programme coordinator",
      "Policy research assistant",
      "Public information officer",
      "Planning and service officer",
    ],
    workplaces: ["Local and state government", "Public service offices", "Community programmes", "Public institutions and agencies"],
    usefulSkills: ["Fairness", "Organisation", "Clear communication", "Working with communities", "Attention to detail"],
    reflection: "Are you curious about how communities work, how decisions are made or how public services can reach people effectively?",
  },
  education: {
    id: "education",
    name: "Education",
    description: "Teaching, learning and helping people develop.",
    image: "/images/fields/education.jpg",
    imageAlt: "Students learning together in a classroom",
    overview: {
      shortDescription: "Helping people learn, practise skills and develop understanding.",
      introduction: "Education helps people learn new ideas and skills. It includes teaching, planning learning activities and supporting people as they practise and develop.",
      everydayExample: "A teacher helping a student understand a difficult topic is supporting learning.",
      activities: [
        "Explain ideas in ways learners can understand.",
        "Plan lessons, activities or learning materials.",
        "Give feedback and help learners practise new skills.",
      ],
      areas: ["Teaching and learning", "Early childhood learning", "Learning design and technology", "Education support and research"],
    },
    introduction: [
      "Education is about helping people learn, practise new skills and understand the world around them.",
      "It happens in schools, colleges, training centres, community programmes and digital learning spaces.",
    ],
    everydayExample: "A teacher helping a student understand fractions or a trainer showing someone how to use a tool is supporting learning.",
    whyItMatters: "Learning can open up choices, build confidence and help people take part in their communities and work.",
    workExamples: [
      "Explain ideas in ways different learners can understand.",
      "Plan activities, lessons or learning materials.",
      "Notice where learners need support and adjust how you teach.",
      "Give feedback and help people practise new skills.",
      "Work with families, colleagues or communities to support learning.",
    ],
    workContext: "Education teams may include teachers, learners, families and support staff. They use lesson plans, books, learning materials and sometimes digital tools.",
    areas: [
      { name: "Teaching and learning", description: "Support learners in a subject, classroom or training setting.", example: "A teacher uses a drawing and a practice question to explain a new idea." },
      { name: "Early childhood learning", description: "Help young children learn through play, care and structured activities.", example: "An educator uses a story and blocks to help children practise language and counting." },
      { name: "Learning design and technology", description: "Create lessons, resources and digital learning experiences.", example: "A designer makes a short online lesson that students can pause and replay." },
      { name: "Education support and research", description: "Help improve access, student support and learning programmes.", example: "A support team finds ways to make learning materials easier to use." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 and explore subjects you may later want to teach or use in training.",
        "Build communication and subject knowledge through tutoring, peer learning or community activities.",
        "Teacher and early-childhood roles can require approved training; check local qualification rules.",
      ],
      "class-12": [
        "Explore subject degrees, teacher-education programmes, early-childhood education or learning-design courses.",
        "The route to a school teaching role can depend on the age group, subject, state and current teacher-eligibility rules.",
        "Check approved programmes and official qualification requirements before choosing a course.",
      ],
    },
    whatYouLearn: {
      "class-10": "You can strengthen a subject you enjoy while practising communication, patience and explaining ideas. Teaching roles need approved training later.",
      "class-12": "Courses may focus on a subject, teaching methods, child development, learning support or educational technology, depending on the path.",
    },
    opportunities: [
      "Teacher after required training",
      "Tutor or learning-support assistant",
      "Early-childhood educator",
      "Learning-content creator",
      "Training facilitator",
    ],
    workplaces: ["Schools and colleges", "Training centres", "Community learning programmes", "Education and publishing teams"],
    usefulSkills: ["Patience", "Clear explanations", "Listening", "Planning", "Encouraging others"],
    reflection: "Do you enjoy explaining ideas, helping someone practise, making learning materials or finding different ways to make a topic clear?",
  },
  science: {
    id: "science",
    name: "Science & Research",
    description: "Asking questions, testing evidence and understanding the world.",
    image: "/images/fields/science-research.jpg",
    imageAlt: "Scientific equipment in a research laboratory",
    overview: {
      shortDescription: "Investigating questions and using evidence to understand the world.",
      introduction: "Science and research use observation, testing and evidence to investigate questions about the natural world, people and technology. The findings can help others understand problems and make informed decisions.",
      everydayExample: "Testing drinking water helps identify what it contains and whether it is safe to use.",
      activities: [
        "Plan an investigation to answer a focused question.",
        "Observe, measure or collect samples and information.",
        "Check results for patterns and explain what the evidence shows.",
      ],
      areas: ["Life and health sciences", "Physical sciences", "Earth and environment", "Research methods and data"],
    },
    introduction: [
      "Science and research explore questions about the natural world, people and technology through observation, evidence and testing.",
      "Researchers and science teams collect information, carry out investigations and share what they learn so others can use or build on it.",
    ],
    everydayExample: "Testing drinking water, tracking the weather and checking how a medicine behaves all use scientific questions and evidence.",
    whyItMatters: "Careful research helps people understand the world and make better-informed decisions about health, technology and the environment.",
    workExamples: [
      "Ask a focused question and plan how to investigate it.",
      "Observe, measure or collect samples and information.",
      "Use lab, field or data tools carefully and safely.",
      "Look for patterns, check results and consider uncertainty.",
      "Explain findings through reports, presentations or teaching.",
    ],
    workContext: "Science teams may work in laboratories, outdoors or with computers. They use measuring instruments, samples, safety equipment and records to check their results.",
    areas: [
      { name: "Life and health sciences", description: "Study living things, health, cells and ecosystems.", example: "A team observes how a plant responds to changes in light." },
      { name: "Physical sciences", description: "Explore matter, energy, forces, chemistry and the universe.", example: "Students test how different materials conduct heat." },
      { name: "Earth and environment", description: "Understand land, climate, water and environmental change.", example: "Researchers collect stream-water samples after heavy rain." },
      { name: "Research methods and data", description: "Use evidence, measurement and analysis to answer questions.", example: "A team compares survey results to see whether a new idea works." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 and compare science subjects that connect with areas you want to explore.",
        "Try supervised science projects, field activities or laboratory experiences where available.",
        "Technical and laboratory-support courses may offer additional routes; check their scope and entry rules.",
      ],
      "class-12": [
        "Explore undergraduate programmes in subjects such as biology, chemistry, physics, mathematics or environmental science.",
        "Some specialised courses require particular Class 12 subjects or entrance assessments.",
        "Research careers often involve further study or specialised training, though requirements vary by role.",
      ],
    },
    whatYouLearn: {
      "class-10": "Science subjects introduce observation, experiments and evidence. Projects can help you practise asking a question and recording what happens.",
      "class-12": "Courses may include laboratory or field methods, scientific ideas, mathematics and data analysis. The subjects required depend on the specialisation.",
    },
    opportunities: [
      "Laboratory assistant",
      "Research technician",
      "Environmental field assistant",
      "Quality-testing analyst",
      "Science educator or communicator",
    ],
    workplaces: ["Research laboratories", "Universities and schools", "Environmental organisations", "Food, health and manufacturing companies"],
    usefulSkills: ["Curiosity", "Accurate observation", "Patience", "Working with evidence", "Safety awareness"],
    reflection: "Do you enjoy asking why, noticing details, testing an idea or looking carefully at evidence before reaching a conclusion?",
  },
  "arts-design": {
    id: "arts-design",
    name: "Arts & Design",
    description: "Creative expression, visual communication and design.",
    image: "/images/fields/arts-design.jpg",
    imageAlt: "Paints and art materials on a work surface",
    overview: {
      shortDescription: "Using creative ideas to communicate and shape useful experiences.",
      introduction: "Arts and design use creative thinking to express ideas and solve visual or practical problems. They can shape images, objects, spaces and digital experiences.",
      everydayExample: "A clear road sign uses design to help people understand information quickly.",
      activities: [
        "Sketch and develop ideas for an image, object or space.",
        "Choose colours, shapes and materials to communicate clearly.",
        "Make and revise designs using feedback.",
      ],
      areas: ["Visual communication", "Product and interaction design", "Fine arts and illustration", "Space and fashion"],
    },
    introduction: [
      "Arts and design use creative thinking and visual communication to express ideas and make useful, meaningful experiences.",
      "People in this field may work with images, spaces, objects, colours, materials or digital interfaces.",
    ],
    everydayExample: "A clear road sign, an easy-to-use app screen and the shape of a water bottle all involve design choices.",
    whyItMatters: "Good design can make information easier to understand and everyday objects or experiences more useful and welcoming.",
    workExamples: [
      "Understand the idea, audience or problem behind a project.",
      "Sketch options and experiment with materials or digital tools.",
      "Choose colour, shape, words and layout to communicate clearly.",
      "Make prototypes, revise designs and respond to feedback.",
      "Prepare artwork or design files for production or use.",
    ],
    workContext: "Creative teams may work with clients, makers, writers and other designers. They use sketchbooks, materials, cameras or design software to test ideas.",
    areas: [
      { name: "Visual communication", description: "Use graphics, illustration and layout to share information.", example: "A designer creates a poster that helps people find a community event." },
      { name: "Product and interaction design", description: "Design objects, services and digital experiences around people's needs.", example: "A team tests whether someone can find the right button in an app." },
      { name: "Fine arts and illustration", description: "Create artwork through drawing, painting, print and other media.", example: "An illustrator draws a picture that helps explain a children's story." },
      { name: "Space and fashion", description: "Explore interiors, clothing, materials and how people experience them.", example: "A designer chooses fabric and shape for clothing suited to warm weather." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 and look for opportunities to study art, craft, design or related subjects.",
        "Build a portfolio of original work and practise observing, sketching and explaining your ideas.",
        "Explore recognised design or craft diplomas; check age, portfolio and admission requirements.",
      ],
      "class-12": [
        "Compare degrees and diplomas in design, fine arts, visual communication, animation or related areas.",
        "Admissions may involve portfolios, aptitude tests, interviews or specific subjects; requirements differ.",
        "Review course projects and facilities as well as the qualification title.",
      ],
    },
    whatYouLearn: {
      "class-10": "Art, craft and project work can help you practise observation and visual ideas. A portfolio can show how your work develops over time.",
      "class-12": "Courses may include design methods, drawing, materials, digital tools and projects. Some admissions ask for a portfolio or aptitude test.",
    },
    opportunities: [
      "Graphic designer",
      "Product or experience designer",
      "Illustrator",
      "Fashion or interior design assistant",
      "Creative production assistant",
    ],
    workplaces: ["Design studios", "Technology and product teams", "Publishing and media", "Independent creative practice"],
    usefulSkills: ["Creative thinking", "Observation", "Experimenting", "Taking feedback", "Explaining ideas visually"],
    reflection: "Do you enjoy making things, noticing how objects look and work, or finding a visual way to explain an idea?",
  },
  media: {
    id: "media",
    name: "Media",
    description: "Stories, journalism and ideas shared through media.",
    image: "/images/fields/media.jpg",
    imageAlt: "Camera equipment used to create media",
    overview: {
      shortDescription: "Creating and sharing stories, information and ideas with audiences.",
      introduction: "Media is how stories, information and ideas are created and shared. It includes reporting, writing, photography, audio, film and digital content.",
      everydayExample: "A local news report or a podcast interview is one way media shares information with an audience.",
      activities: [
        "Research a topic and check information before sharing it.",
        "Write, record, photograph or edit a story.",
        "Choose a format that helps an audience understand the message.",
      ],
      areas: ["Journalism and publishing", "Film and video production", "Audio and broadcasting", "Digital content and communication"],
    },
    introduction: [
      "Media is how stories, information and ideas are created and shared with an audience.",
      "It includes print, news, photography, audio, film, television, online publishing and social platforms.",
    ],
    everydayExample: "A local news report, a short video explaining a science idea and a podcast interview are all forms of media.",
    whyItMatters: "Carefully made media can inform people, help them understand different experiences and bring important stories to a wider audience.",
    workExamples: [
      "Research a topic and check information before sharing it.",
      "Plan, write, record, photograph or edit a story.",
      "Choose a format that helps an audience understand the message.",
      "Work with presenters, writers, editors, producers or technical teams.",
      "Consider accuracy, consent, copyright and the effect of published content.",
    ],
    workContext: "Media work is often collaborative: writers, reporters, camera operators, editors and producers coordinate deadlines and share equipment or editing tools.",
    areas: [
      { name: "Journalism and publishing", description: "Research, report and edit news, features and written content.", example: "A reporter speaks with several people and checks facts before publishing a local story." },
      { name: "Film and video production", description: "Plan, record and edit moving-image stories.", example: "A small crew plans a short video, records it and edits the final version." },
      { name: "Audio and broadcasting", description: "Create radio, podcast and other sound-based programmes.", example: "A presenter records an interview and an editor removes distracting background noise." },
      { name: "Digital content and communication", description: "Publish and manage content for online audiences.", example: "A team turns a public announcement into a clear post and short explainer." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 and strengthen writing, languages, media literacy and digital skills.",
        "Create supervised school projects such as a newsletter, podcast or short film to practise different roles.",
        "Explore media diplomas or vocational courses and check their facilities, age rules and entry conditions.",
      ],
      "class-12": [
        "Explore degrees or diplomas in journalism, mass communication, film, audio, photography or digital media.",
        "Look for courses with practical production, reporting, editing and ethical training.",
        "Portfolio, language or entrance requirements vary by programme; confirm details with institutions.",
      ],
    },
    whatYouLearn: {
      "class-10": "Writing, languages, media literacy and school projects can help you practise telling a story and checking information.",
      "class-12": "Courses may teach reporting, writing, photography, audio, video, editing and media ethics through practical assignments.",
    },
    opportunities: [
      "Reporter or writer",
      "Video editor",
      "Camera or audio assistant",
      "Photographer",
      "Digital content producer",
    ],
    workplaces: ["Newsrooms and publishers", "Film and production teams", "Radio and podcast studios", "Businesses and community organisations"],
    usefulSkills: ["Clear writing", "Curiosity", "Listening", "Fact-checking", "Working to deadlines"],
    reflection: "Do you like asking questions, telling stories, making videos or helping people understand information?",
  },
  "agriculture-environment": {
    id: "agriculture-environment",
    name: "Agriculture & Environment",
    description: "Food, farming, natural resources and the environment.",
    image: "/images/fields/agriculture-environment.jpg",
    imageAlt: "Green agricultural fields in a rural landscape",
    overview: {
      shortDescription: "Growing food and caring for land, water and natural systems.",
      introduction: "Agriculture and environment connect food production with plants, animals, land and water. The field includes growing and caring for living things and looking after natural resources.",
      everydayExample: "Growing vegetables depends on choosing crops and managing soil and water.",
      activities: [
        "Grow or care for crops, plants or animals.",
        "Observe soil, water or ecosystems and record changes.",
        "Help protect habitats or use resources responsibly.",
      ],
      areas: ["Agriculture and horticulture", "Animal and veterinary services", "Environment and conservation", "Food and natural resources"],
    },
    introduction: [
      "Agriculture and environment connect food, plants, animals, land, water and the natural systems people depend on.",
      "The field includes practical work, science, technology, conservation and efforts to make food and resource systems more sustainable.",
    ],
    everydayExample: "The food on a plate, the trees along a road and the quality of local water connect to agriculture and the environment.",
    whyItMatters: "Healthy land, water and ecosystems support food, livelihoods and the wellbeing of people and other living things.",
    workExamples: [
      "Grow or care for crops, plants or animals.",
      "Observe soil, water, weather or ecosystems and record changes.",
      "Use tools and technology to improve production or resource use.",
      "Help protect habitats and manage environmental impacts.",
      "Share practical advice with growers, communities or organisations.",
    ],
    workContext: "Teams may work on farms, in laboratories, outdoors or with local communities. They use tools such as soil and water tests, field notes, machinery and maps.",
    areas: [
      { name: "Agriculture and horticulture", description: "Grow crops, fruits, vegetables and useful plants.", example: "A grower checks soil and weather before choosing when to water a crop." },
      { name: "Animal and veterinary services", description: "Support animal care, production and related services with appropriate training.", example: "A trained animal-care team checks an animal and records its health." },
      { name: "Environment and conservation", description: "Study ecosystems and help care for land, water and wildlife.", example: "A field team records which plants and birds live near a wetland." },
      { name: "Food and natural resources", description: "Connect production, food quality and responsible resource use.", example: "A food team checks how produce is stored to reduce spoilage." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 and explore biology, geography or agriculture subjects where available.",
        "Look into agricultural, horticultural or environmental vocational and diploma courses offered locally.",
        "Field-based courses may require practical work; check safety, facilities and admission rules.",
      ],
      "class-12": [
        "Explore agriculture, horticulture, forestry, environmental science, food science or related programmes.",
        "Some degrees require specific science subjects or entrance assessments; confirm requirements with each institution.",
        "Diploma and skill routes may focus on crops, animal care, conservation or food production.",
      ],
    },
    whatYouLearn: {
      "class-10": "Biology, geography and practical projects can introduce plants, animals, soil and ecosystems. Local diplomas may include supervised fieldwork.",
      "class-12": "Courses may explore agriculture, horticulture, forestry, environmental science or food systems, sometimes with laboratory or field training.",
    },
    opportunities: [
      "Agriculture or horticulture assistant",
      "Environmental field assistant",
      "Food-quality technician",
      "Conservation worker",
      "Agricultural extension assistant",
    ],
    workplaces: ["Farms and nurseries", "Food and agriculture organisations", "Environmental groups", "Research and local community programmes"],
    usefulSkills: ["Observation", "Practical problem-solving", "Care for living things", "Working outdoors", "Recording details"],
    reflection: "Do you enjoy being outdoors, learning about plants or animals, or understanding how people can care for land and resources?",
  },
  "hospitality-tourism": {
    id: "hospitality-tourism",
    name: "Hospitality & Tourism",
    description: "Travel, accommodation, food and welcoming experiences.",
    image: "/images/fields/hospitality-tourism.jpg",
    imageAlt: "A traveller looking out over a scenic landscape",
    overview: {
      shortDescription: "Helping people travel, stay, eat and feel welcome.",
      introduction: "Hospitality and tourism support people when they travel, stay somewhere, eat out or attend events. The work combines guest service with planning and daily operations.",
      everydayExample: "A hotel check-in helps a guest find their room and get information about their stay.",
      activities: [
        "Welcome guests and answer questions.",
        "Plan bookings, events or travel details.",
        "Coordinate with a team to provide safe, reliable service.",
      ],
      areas: ["Hotels and accommodation", "Food and culinary services", "Travel and tourism", "Events and guest services"],
    },
    introduction: [
      "Hospitality and tourism help people travel, stay, eat, attend events and feel welcome in new places.",
      "The field brings together service, planning, food, accommodation, transport, culture and visitor experiences.",
    ],
    everydayExample: "A hotel check-in, a meal served at a café and a guided visit to a historic place are all hospitality or tourism experiences.",
    whyItMatters: "Thoughtful service helps people feel welcome, safe and informed when they travel, eat or attend an event.",
    workExamples: [
      "Welcome guests and help answer their questions.",
      "Plan bookings, events, travel details or daily service operations.",
      "Prepare and serve food or manage guest spaces.",
      "Coordinate with teams to make an experience safe and smooth.",
      "Respond calmly to changing needs and solve service problems.",
    ],
    workContext: "Teams often work directly with guests and coordinate with cooks, cleaners, guides or event staff. They may use booking systems, schedules and food-safety tools.",
    areas: [
      { name: "Hotels and accommodation", description: "Support guest stays, reception, housekeeping and property operations.", example: "A reception team helps a family check in and find their room." },
      { name: "Food and culinary services", description: "Prepare food and manage kitchens, dining or food service.", example: "A kitchen team prepares meals while following a food-safety routine." },
      { name: "Travel and tourism", description: "Help plan trips, visitor activities and local experiences.", example: "A guide helps visitors understand the history of a local place." },
      { name: "Events and guest services", description: "Coordinate gatherings, conferences and services for visitors.", example: "An event team checks the seating and schedule before guests arrive." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12 or explore recognised hospitality, food-service and tourism vocational courses.",
        "Look for practical training in communication, food safety, guest service or event support.",
        "Check the course's age requirements, placement claims, facilities and recognised certification.",
      ],
      "class-12": [
        "Compare degrees and diplomas in hotel management, tourism, culinary arts, travel or event management.",
        "Some roles value practical certificates or apprenticeships; requirements differ across employers.",
        "Review internship arrangements and the skills taught, not just the course name.",
      ],
    },
    whatYouLearn: {
      "class-10": "Communication, teamwork and practical vocational training can introduce food service, guest care or event support.",
      "class-12": "Courses may cover hotel operations, tourism, food preparation, guest services or event planning, often with practical training.",
    },
    opportunities: [
      "Hotel front-desk associate",
      "Food preparation assistant",
      "Tour guide",
      "Travel coordinator",
      "Event assistant",
    ],
    workplaces: ["Hotels and guest houses", "Restaurants and cafés", "Travel organisations", "Event venues and visitor attractions"],
    usefulSkills: ["Warm communication", "Organisation", "Teamwork", "Staying calm", "Respect for different cultures"],
    reflection: "Do you enjoy welcoming people, organising details, learning about places or working as part of a service team?",
  },
  "social-sciences": {
    id: "social-sciences",
    name: "Social Sciences",
    description: "People, communities and how society works.",
    image: "/images/fields/social-sciences.jpg",
    imageAlt: "A group of people spending time together outdoors",
    overview: {
      shortDescription: "Studying people, communities and how society changes.",
      introduction: "Social sciences study how people live together, make decisions and respond to change. They use evidence about people's experiences to understand social questions.",
      everydayExample: "A survey asking students what helps them learn can help researchers understand their experiences.",
      activities: [
        "Research a question about people, behaviour or communities.",
        "Gather information through interviews, surveys or records.",
        "Review evidence and explain what it may tell us.",
      ],
      areas: ["Psychology and human behaviour", "Sociology and anthropology", "Economics and geography", "Political and community studies"],
    },
    introduction: [
      "Social sciences study people, communities and society: how people live together, make decisions and respond to change.",
      "They use observation, interviews, historical sources, surveys and other evidence to understand real-world questions.",
    ],
    everydayExample: "Questions about why a neighbourhood is changing, how people choose what to buy or what helps students learn can be studied through social science.",
    whyItMatters: "Understanding people's experiences and the evidence around them can help communities and organisations respond more thoughtfully.",
    workExamples: [
      "Listen to people's experiences and understand different perspectives.",
      "Research a question about communities, behaviour or society.",
      "Collect and analyse interviews, surveys, records or other evidence.",
      "Explain findings clearly and consider how they could be used.",
      "Work with communities, organisations or research teams.",
    ],
    workContext: "People may work with communities, interview participants or analyse information with research teams. Respect, consent and careful handling of personal information matter.",
    areas: [
      { name: "Psychology and human behaviour", description: "Study how people think, feel, learn and interact.", example: "A researcher explores which study habits help learners stay focused." },
      { name: "Sociology and anthropology", description: "Explore groups, cultures, institutions and social change.", example: "A researcher listens to residents describe how a neighbourhood has changed." },
      { name: "Economics and geography", description: "Understand resources, livelihoods, places and patterns of change.", example: "A team maps where people travel to reach work or school." },
      { name: "Political and community studies", description: "Examine power, participation, public issues and community life.", example: "A community project asks residents what they need from a local service." },
    ],
    studyRoutes: {
      "class-10": [
        "Continue to Class 11–12; several social-science subjects can be explored through different school streams.",
        "Build reading, writing, discussion, research and data skills through school and community activities.",
        "Explore social-service or community-focused vocational programmes where available and recognised.",
      ],
      "class-12": [
        "Explore undergraduate subjects such as psychology, sociology, economics, geography, political science or social work.",
        "Some professional roles, including clinical practice, require further approved study and registration.",
        "Compare course methods and practical experience; entry subjects differ between institutions.",
      ],
    },
    whatYouLearn: {
      "class-10": "Subjects such as history, geography, civics and economics can help you ask questions about people and communities and explain what you find.",
      "class-12": "Courses may teach research methods, social theory, statistics, interviews or community practice. Some professional roles require further approved study.",
    },
    opportunities: [
      "Research assistant",
      "Community programme worker",
      "Survey or fieldwork assistant",
      "Human resources assistant",
      "Social-work professional after required training",
    ],
    workplaces: ["Research organisations", "Community and non-profit groups", "Schools and public services", "Businesses and policy teams"],
    usefulSkills: ["Listening", "Curiosity", "Respect for different experiences", "Careful research", "Clear communication"],
    reflection: "Are you curious about why people act in different ways, how communities change or what makes a society fair and supportive?",
  },
} satisfies Record<FieldId, FieldGuideContent>;

export type PossibilityFieldId = keyof typeof fieldGuideData;
export type PossibilityField = (typeof fieldGuideData)[PossibilityFieldId];
export type { ActivityId, FieldGuideContent, StudyStage };

export const possibilityFields = Object.values(fieldGuideData);

const fieldsById = new Map<PossibilityFieldId, PossibilityField>(
  possibilityFields.map((field) => [field.id, field] as const),
);

const fieldsByActivity: Record<ActivityId, PossibilityFieldId[]> = {
  // Building and repairing connects to designing systems, technology and scientific testing.
  fixing: ["engineering", "technology", "science"],
  // Caring and support are central to health, learning and community work.
  helping: ["healthcare", "education", "social-sciences"],
  // Plants, animals and natural systems connect to agriculture and environmental science.
  outdoors: ["agriculture-environment", "science"],
  // Digital tools are used to build software, engineered systems and media.
  computers: ["technology", "engineering", "media"],
  // Planning activities is common in business, visitor services and public administration.
  organising: ["business", "hospitality-tourism", "government"],
  // Visual design and communication are shared by design, media and product engineering.
  creative: ["arts-design", "media", "engineering"],
  // Quantitative information is used to investigate science, business and digital systems.
  numbers: ["science", "business", "technology"],
  // Teaching and explaining are central to education and media communication.
  teaching: ["education", "media"],
  // Speaking, presenting and making arguments are common in media, law and education.
  talking: ["media", "law", "education"],
  // Investigating and resolving complex questions is common in engineering, science and law.
  "problem-solving": ["engineering", "science", "law"],
};

const activityFieldReasons: Record<
  ActivityId,
  Partial<Record<PossibilityFieldId, string>>
> = {
  fixing: {
    engineering: "Engineering involves designing, building and improving practical systems.",
    technology: "Technology includes creating and maintaining digital tools and systems.",
    science: "Science uses practical investigation to understand and solve questions about the world.",
  },
  helping: {
    healthcare: "Healthcare focuses on supporting people's health and wellbeing.",
    education: "Education helps people learn and develop through teaching and support.",
    "social-sciences": "Social sciences explore people's experiences and ways to support communities.",
  },
  outdoors: {
    "agriculture-environment": "This field works with plants, animals, farming and the natural environment.",
    science: "Science investigates living things, ecosystems and natural processes.",
  },
  computers: {
    technology: "Technology includes creating software and maintaining computer systems.",
    engineering: "Engineers use computers to design, model and test practical solutions.",
    media: "Digital tools are used to create, edit and share media.",
  },
  organising: {
    business: "Business work often involves planning resources, tasks and services.",
    "hospitality-tourism": "Hospitality and tourism involve coordinating visitor services and experiences.",
    government: "Public services organise programmes and services for communities.",
  },
  creative: {
    "arts-design": "Arts and design turn ideas into visual, crafted or designed work.",
    media: "Media teams use creative ideas to make stories and content.",
    engineering: "Engineering uses design ideas to develop and improve practical products and systems.",
  },
  numbers: {
    science: "Science uses measurements and data to investigate questions.",
    business: "Businesses use numbers to understand costs, activity and decisions.",
    technology: "Technology includes organising and analysing digital information.",
  },
  teaching: {
    education: "Education involves explaining ideas and helping others learn.",
    media: "Media communicates information and ideas to different audiences.",
  },
  talking: {
    media: "Media work involves communicating stories and information to an audience.",
    law: "Law involves explaining, interpreting and discussing rules and arguments.",
    education: "Education uses clear communication to explain ideas and support learning.",
  },
  "problem-solving": {
    engineering: "Engineering applies investigation and design to practical challenges.",
    science: "Science investigates questions by gathering evidence and testing ideas.",
    law: "Law involves examining information and reasoning through questions about rules.",
  },
};

export function getActivityConnections(
  fieldId: PossibilityFieldId,
  activityIds: readonly ActivityId[],
) {
  return activityIds.flatMap((activityId) => {
    const reason = activityFieldReasons[activityId][fieldId];
    return reason ? [{ activityId, reason }] : [];
  });
}

export function getPossibilityFields(activityIds: readonly ActivityId[]): PossibilityField[] {
  if (activityIds.length === 0) return possibilityFields;

  const selectedIds = new Set<PossibilityFieldId>();
  for (const activityId of activityIds) {
    for (const fieldId of fieldsByActivity[activityId]) selectedIds.add(fieldId);
  }

  return [...selectedIds].map((fieldId) => fieldsById.get(fieldId)!);
}
