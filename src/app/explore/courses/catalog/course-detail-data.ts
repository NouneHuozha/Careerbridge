export type CourseDetail = {
  overview: string;
  learningAreas: { title: string; description: string }[];
  simpleExplanation?: string;
  learningExperience?: { title: string; description: string }[];
  admission?: string;
  providerDescription?: string;
};

export const courseDetails: Record<string, CourseDetail> = {
  bca: {
    overview:
      "BCA introduces computing through programming, software and the systems people use every day. It combines problem-solving with practical computer applications.",
    learningAreas: [
      { title: "Programming", description: "Write and test instructions that solve defined problems." },
      { title: "Data and databases", description: "Organise information and understand how software stores and retrieves it." },
      { title: "Computer applications", description: "Explore how digital tools support people, services and organisations." },
    ],
  },
  bcom: {
    overview:
      "B.Com. explores how money, trade and organisations work. Students build a foundation in commerce subjects and learn to interpret business information.",
    learningAreas: [
      { title: "Accounting", description: "Record, organise and interpret financial activity." },
      { title: "Business and trade", description: "Understand how organisations operate and exchange goods or services." },
      { title: "Finance and taxation", description: "Explore financial decisions and the rules that shape them." },
    ],
  },
  "engineering-diploma": {
    overview:
      "An engineering diploma combines technical concepts with applied workshop or laboratory learning. The branch and depth of study depend on the programme.",
    learningAreas: [
      { title: "Technical foundations", description: "Build knowledge of mathematics, science and engineering principles." },
      { title: "Workshop practice", description: "Use tools, materials and equipment in supervised practical work." },
      { title: "Applied design", description: "Read technical drawings and explore how systems or components are made." },
    ],
  },
  bsc: {
    overview:
      "A B.Sc. develops scientific understanding through a chosen subject area. The balance of theory, laboratory work and field study varies with the specialisation.",
    learningAreas: [
      { title: "Scientific concepts", description: "Study explanations and models relevant to the selected science." },
      { title: "Investigation", description: "Ask questions, gather evidence and examine results." },
      { title: "Practical methods", description: "Use subject-specific laboratory, computational or field techniques." },
    ],
  },
  ba: {
    overview:
      "A B.A. explores ideas about people, culture and society through humanities or social-science subjects. Students practise analysis, research and clear communication.",
    learningAreas: [
      { title: "Humanities", description: "Examine language, history, culture or ideas through selected subjects." },
      { title: "Society and people", description: "Explore how communities, institutions and social change shape everyday life." },
      { title: "Reading and research", description: "Interpret sources, form arguments and communicate findings." },
    ],
  },
  btech: {
    overview:
      "B.Tech. applies scientific and mathematical ideas to engineering problems. The curriculum centres on a chosen branch and may include design projects, laboratories and industry exposure.",
    learningAreas: [
      { title: "Engineering foundations", description: "Apply mathematics and science to technical questions." },
      { title: "Branch specialisation", description: "Study systems and methods specific to the chosen engineering discipline." },
      { title: "Design and projects", description: "Develop, test and refine solutions to practical problems." },
    ],
  },
  mbbs: {
    overview:
      "MBBS is a professional medical programme that develops knowledge of human health alongside supervised clinical learning. Admission, training structure and registration requirements are governed by current official rules.",
    learningAreas: [
      { title: "Medical sciences", description: "Study the structure and function of the human body and common disease processes." },
      { title: "Clinical learning", description: "Build patient-care understanding through supervised clinical settings." },
      { title: "Community health", description: "Explore prevention, public health and care across communities." },
    ],
  },
  bdes: {
    overview:
      "B.Des. develops a design process: understanding people and contexts, exploring ideas, and making and testing concepts. Specialisations and selection methods differ between institutions.",
    learningAreas: [
      { title: "Design methods", description: "Research needs, frame problems and explore possible solutions." },
      { title: "Visual communication", description: "Use form, image, typography or interaction to express ideas." },
      { title: "Making and prototyping", description: "Create and refine models or experiences to test a design." },
    ],
  },
  "ba-llb": {
    overview:
      "B.A. LL.B. brings undergraduate study together with foundational legal education. It introduces legal systems and reasoning alongside subjects that help explain society and public life.",
    learningAreas: [
      { title: "Legal foundations", description: "Explore legal principles, institutions and sources of law." },
      { title: "Arts and social studies", description: "Study social, political or historical contexts relevant to law." },
      { title: "Legal reasoning", description: "Practise reading cases, analysing arguments and communicating clearly." },
    ],
  },
  bba: {
    overview:
      "BBA introduces management and the ways organisations plan, work with people and make decisions. Courses commonly combine business concepts with communication and applied projects.",
    learningAreas: [
      { title: "Management", description: "Understand planning, teams and day-to-day organisational work." },
      { title: "Markets and customers", description: "Explore how organisations identify needs and deliver services." },
      { title: "Business communication", description: "Present ideas, work collaboratively and interpret business information." },
    ],
  },
  bpharm: {
    overview:
      "B.Pharm. studies medicines from their scientific foundations to their use in pharmacy practice. The programme includes specialised coursework and practical learning under applicable professional rules.",
    learningAreas: [
      { title: "Pharmaceutical sciences", description: "Explore how medicines are developed, prepared and evaluated." },
      { title: "Medicines and the body", description: "Study how medicines interact with biological systems." },
      { title: "Pharmacy practice", description: "Learn about safe medicine use and responsibilities in pharmacy settings." },
    ],
  },
  "bsc-agriculture": {
    overview:
      "Agriculture study connects crop and soil science with the practical realities of food production. Programmes may also explore farm management, local conditions and sustainable practices.",
    learningAreas: [
      { title: "Crop production", description: "Understand plant growth, cultivation and crop management." },
      { title: "Soils and resources", description: "Explore soil properties, water and their role in agriculture." },
      { title: "Farm systems", description: "Consider how farming choices affect productivity, livelihoods and the environment." },
    ],
  },
  "hotel-management": {
    overview:
      "Hospitality and hotel management focuses on the services and operations that shape guest experiences. Learning may combine service practice with planning and business skills.",
    learningAreas: [
      { title: "Guest services", description: "Practise the communication and service principles used in hospitality." },
      { title: "Hospitality operations", description: "Explore accommodation, food service and event operations." },
      { title: "Tourism and business", description: "Understand visitor experiences and the organisations that support them." },
    ],
  },
  "bsc-nursing": {
    overview:
      "B.Sc. Nursing combines health-science learning with professional nursing practice. Students develop care knowledge through structured teaching and supervised clinical experience.",
    learningAreas: [
      { title: "Nursing practice", description: "Explore care planning, observation and support for patients." },
      { title: "Health sciences", description: "Study the body, health conditions and approaches to care." },
      { title: "Community and patient care", description: "Consider health promotion and care needs in different settings." },
    ],
  },
  bsw: {
    overview:
      "BSW introduces social work and the ways people and communities connect with support. It combines social-science ideas with communication, ethics and practice learning.",
    learningAreas: [
      { title: "People and communities", description: "Understand social contexts, needs and community strengths." },
      { title: "Support practice", description: "Explore approaches to working respectfully with individuals and groups." },
      { title: "Social services", description: "Learn how organisations and public programmes respond to social needs." },
    ],
  },
  journalism: {
    overview:
      "Journalism and mass communication explores how information and stories are researched, produced and shared. Study may include reporting, media formats and communication ethics.",
    learningAreas: [
      { title: "Reporting and research", description: "Find, assess and verify information for clear public communication." },
      { title: "Media production", description: "Explore writing, audio, video or digital publishing workflows." },
      { title: "Media and society", description: "Consider audiences, media systems and responsible communication." },
    ],
  },
  "environmental-science": {
    overview:
      "Environmental science uses evidence from natural and social sciences to understand environmental systems and change. Learning can include data, field methods and conservation questions.",
    learningAreas: [
      { title: "Ecosystems", description: "Study relationships among organisms and their environments." },
      { title: "Environmental change", description: "Examine human and natural influences on land, water and climate." },
      { title: "Monitoring and conservation", description: "Explore evidence-gathering methods and approaches to environmental care." },
    ],
  },
  bfa: {
    overview:
      "B.F.A. centres on sustained creative practice and the study of visual art. Students develop ideas through making, reflection and engagement with different materials or traditions.",
    learningAreas: [
      { title: "Studio practice", description: "Create and refine work using methods suited to a chosen medium." },
      { title: "Visual language", description: "Explore composition, form, colour and ways of communicating ideas." },
      { title: "Art history and critique", description: "Place creative work in context and discuss it thoughtfully." },
    ],
  },
  "computer-science": {
    overview:
      "Computer science studies the ideas behind computation as well as the software and systems built with them. It combines logical thinking with programming and analysis.",
    learningAreas: [
      { title: "Algorithms", description: "Develop step-by-step approaches to computational problems." },
      { title: "Software and data", description: "Build an understanding of programming, information and software design." },
      { title: "Computer systems", description: "Explore how hardware, operating systems and networks support computing." },
    ],
  },
  barch: {
    overview:
      "B.Arch. explores how buildings and spaces are designed in response to people, place and practical constraints. Studio projects connect design work with technical and built-environment knowledge.",
    learningAreas: [
      { title: "Architectural design", description: "Develop spatial ideas through research, drawing and design projects." },
      { title: "Building technology", description: "Explore materials, structures and how buildings are assembled." },
      { title: "People and place", description: "Consider how climate, context and users shape the built environment." },
    ],
  },
  psychology: {
    overview:
      "Psychology studies behaviour and mental processes using concepts and evidence. Programmes introduce research methods and different perspectives on people across contexts.",
    learningAreas: [
      { title: "Behaviour and cognition", description: "Explore how people think, learn, feel and act." },
      { title: "Research methods", description: "Learn how psychological questions are investigated and evidence interpreted." },
      { title: "Development and society", description: "Consider how people change and how context can shape experience." },
    ],
  },
  "public-administration": {
    overview:
      "Public administration examines how public organisations deliver services and put policies into practice. It connects institutions and governance with the needs of communities.",
    learningAreas: [
      { title: "Public institutions", description: "Understand the roles and structures of government organisations." },
      { title: "Policy and services", description: "Explore how public decisions become programmes and services." },
      { title: "Governance", description: "Consider accountability, administration and relationships with communities." },
    ],
  },
  "vocational-multimedia": {
    overview:
      "Multimedia and digital media training combines creative communication with practical production tools. The projects and software covered depend on the training provider.",
    learningAreas: [
      { title: "Digital content", description: "Plan and create visual or audiovisual material for digital use." },
      { title: "Production tools", description: "Practise workflows for editing, layout or media production." },
      { title: "Communication design", description: "Shape content for an audience, purpose and platform." },
    ],
  },
  mathematics: {
    overview:
      "Mathematics study develops abstract reasoning and quantitative problem-solving. A degree may cover theoretical ideas as well as methods used in science, technology and other fields.",
    learningAreas: [
      { title: "Mathematical reasoning", description: "Build clear arguments using definitions, logic and proof." },
      { title: "Core mathematical ideas", description: "Explore areas such as algebra, calculus or analysis as set by the programme." },
      { title: "Quantitative methods", description: "Use mathematical tools to model and interpret problems." },
    ],
  },
  "higher-secondary": {
    overview:
      "Higher secondary education continues school learning after Class 10. Subject groups and available combinations differ by board and school, so learners should compare local options before choosing.",
    learningAreas: [
      { title: "Subject groups", description: "Choose from combinations offered by the school and education board." },
      { title: "Deeper subject study", description: "Build on foundational learning in selected academic areas." },
      { title: "Preparation for next steps", description: "Develop study skills and subject knowledge for future education choices." },
    ],
  },
  "computer-engineering-diploma": {
    overview:
      "A computer engineering diploma introduces both computing and the hardware systems behind it. The mix of programming, electronics and practical work depends on the specific programme.",
    learningAreas: [
      { title: "Computer hardware", description: "Explore components and the way computer systems are assembled." },
      { title: "Programming basics", description: "Practise writing simple programs and solving technical problems." },
      { title: "Networks and systems", description: "Learn how devices connect and how computer systems operate." },
    ],
    simpleExplanation:
      "You learn how computers are built and used, and practise technical problem-solving with hardware, software and systems.",
    learningExperience: [
      { title: "Theory and concepts", description: "Learn the principles behind computer systems and technical processes." },
      { title: "Laboratory practice", description: "Use computers, components or software tools in supervised practical sessions where provided." },
      { title: "Projects", description: "Apply concepts to technical assignments or projects defined by the institution." },
    ],
    admission:
      "Entry after Class 10 is available for some diploma programmes, but subjects, marks, counselling and selection rules vary. Confirm the exact programme and approving body.",
    providerDescription:
      "Look for polytechnic or technical institutions that explicitly list this diploma. Compare the branch, laboratory facilities, duration, fees and current admission notice.",
  },
  "higher-secondary-science": {
    overview:
      "Higher Secondary Science with Mathematics is a school-level programme after Class 10. It combines science and mathematics subjects and can prepare students for different technology, engineering and science options after Class 12.",
    learningAreas: [
      { title: "Core subjects", description: "Study Physics, Chemistry and Mathematics, subject to the school's available combination." },
      { title: "Scientific reasoning", description: "Build reasoning and quantitative problem-solving through school subjects." },
      { title: "Preparation for later study", description: "Develop a foundation for future science, technology or engineering options." },
    ],
    simpleExplanation:
      "You continue school with science and mathematics so you can understand which technology or engineering subjects interest you before choosing a later programme.",
    learningExperience: [
      { title: "Classroom learning", description: "Study scientific concepts and mathematical methods through school lessons." },
      { title: "Practical work", description: "Complete practical activities where the school timetable and board requirements include them." },
      { title: "Subject exploration", description: "Use projects and exercises to understand which technology or science areas you may want to explore later." },
    ],
    admission:
      "Schools may set their own admission process, subject combinations and availability. Confirm the board, school and required marks before choosing subjects.",
    providerDescription:
      "This option is usually offered by schools or higher-secondary institutions. Compare the subject combination, board, fees and available support with the school directly.",
  },
  "electronics-trade": {
    overview:
      "A computer or electronics trade is a practical vocational route centred on a defined trade. The exact occupation, tools, modules and certificate depend on the named trade and training authority.",
    learningAreas: [
      { title: "Trade foundations", description: "Explore tools, components, safe working and basic electrical or computer concepts." },
      { title: "Trade practice", description: "Learn about installation, maintenance and fault-finding tasks." },
      { title: "Workshop learning", description: "Practise through workshop-based exercises when the provider offers them." },
    ],
    simpleExplanation:
      "You spend more time practising a specific technical trade than studying a broad academic degree.",
    learningExperience: [
      { title: "Demonstration and practice", description: "Watch trade procedures and repeat them under supervision." },
      { title: "Workshop work", description: "Use relevant tools and equipment when the training centre provides them." },
      { title: "Assessment tasks", description: "Complete practical and knowledge assessments specified for the chosen trade." },
    ],
    admission:
      "Trade eligibility, age, marks, seat availability and selection differ by trade and provider. Confirm the named trade rather than relying on the broad label.",
    providerDescription:
      "Explore recognised industrial training providers or vocational centres offering the exact trade. Check workshop access, certificate authority, duration and placement claims.",
  },
  "digital-skills": {
    overview:
      "A computer and digital skills programme is a short, focused learning option. It may cover everyday digital tools, internet use or workplace software, but the actual syllabus depends on the provider.",
    learningAreas: [
      { title: "Digital foundations", description: "Explore computer and internet basics, files, documents and online safety." },
      { title: "Digital communication", description: "Learn about common digital communication and workplace tools." },
      { title: "Provider-specific tools", description: "Practise tools and tasks included in the chosen course." },
    ],
    simpleExplanation:
      "You practise a small set of useful digital skills rather than completing a broad academic qualification.",
    learningExperience: [
      { title: "Guided demonstrations", description: "Follow step-by-step demonstrations of the tools covered by the provider." },
      { title: "Hands-on practice", description: "Repeat tasks on a computer or device during guided sessions." },
      { title: "Practical checks", description: "Complete small tasks to show what you can do, where the programme includes assessment." },
    ],
    admission:
      "Short courses may have simple entry requirements, but age, device access, fees and completion rules vary. Check the provider's current course notice.",
    providerDescription:
      "Compare schools, training centres, libraries or other providers by syllabus, learning format, support, certificate and total cost.",
  },
  "btech-computer-science": {
    overview:
      "Computer Science and Engineering combines computing concepts with engineering methods. The programme may cover software, algorithms, computer systems and practical projects; curricula differ by institution.",
    learningAreas: [
      { title: "Programming and algorithms", description: "Develop and analyse instructions for solving computational problems." },
      { title: "Computer systems", description: "Explore the software and hardware foundations of computing." },
      { title: "Projects and design", description: "Apply technical concepts through projects and engineering practice." },
    ],
    simpleExplanation:
      "You study how computing systems work and learn to design software and technical solutions through an engineering degree.",
    learningExperience: [
      { title: "Engineering foundations", description: "Study mathematics, science and computing fundamentals." },
      { title: "Laboratory and project work", description: "Apply concepts through practical sessions and projects set by the institution." },
      { title: "Specialist study", description: "Explore computing subjects that depend on the programme's curriculum." },
    ],
    admission:
      "Subject requirements, entrance exams, counselling and selection differ by institution and admission route. Confirm the current official criteria.",
    providerDescription:
      "Compare institutions by their approved programme name, curriculum, facilities, current admission notice and official recognition.",
  },
  "technology-diploma": {
    overview:
      "Technology diploma programmes vary by branch, institution and awarding authority. This category is a prompt to compare named programmes rather than a description of one specific qualification.",
    learningAreas: [
      { title: "Technical foundations", description: "Explore foundations relevant to the specific technology branch." },
      { title: "Practical work", description: "Practical components depend on the programme and provider." },
      { title: "Specialist subjects", description: "Confirm the actual syllabus in the named programme's official curriculum." },
    ],
    simpleExplanation:
      "This is a way to explore technology-focused diploma options; the exact course name and subjects must be checked with a provider.",
    admission:
      "Entry routes and eligibility differ between diploma programmes. Check the named course, approving body and current admission notice.",
    providerDescription:
      "Compare polytechnics and technical institutions by their named branch, recognition, facilities, fees and current official admission notice.",
  },
  "computing-certificate": {
    overview:
      "Computing and technology certificates can cover many different skills and levels. This category does not refer to one confirmed syllabus, duration or recognised award.",
    learningAreas: [
      { title: "Computing foundations", description: "Topics depend on the selected certificate and provider." },
      { title: "Practical skills", description: "Check whether the programme includes guided practice or assessment." },
      { title: "Award and recognition", description: "Confirm the certificate issuer and how the award is recognised." },
    ],
    simpleExplanation:
      "This category helps you look for shorter computing courses; compare the exact syllabus, provider and certificate before enrolling.",
    admission:
      "Age, prior study, fees and completion requirements vary. Confirm these details directly with the provider.",
    providerDescription:
      "Compare the syllabus, instructor support, learning format, certificate issuer and total cost before choosing a provider.",
  },
  "iti-electrician": {
    overview:
      "The ITI Electrician trade focuses on practical electrical fundamentals, safe working habits and supervised installation or maintenance tasks. Trade duration and certification should be checked with the relevant institute.",
    learningAreas: [
      { title: "Electrical fundamentals", description: "Understand basic circuits, components and measurements." },
      { title: "Installation practice", description: "Practise wiring and equipment tasks in a supervised setting." },
      { title: "Safety and maintenance", description: "Learn safe procedures and ways to inspect electrical systems." },
    ],
  },
  "iti-copa": {
    overview:
      "The ITI Computer Operator and Programming Assistant trade builds foundational digital and office-computing skills, with an introduction to programming concepts and practical computer use.",
    learningAreas: [
      { title: "Computer operations", description: "Practise using computer systems and common productivity tools." },
      { title: "Digital work", description: "Organise documents and information using standard digital workflows." },
      { title: "Programming basics", description: "Explore introductory logic and simple programming tasks." },
    ],
  },
  "civil-diploma": {
    overview:
      "A civil engineering diploma explores how infrastructure is planned and built. Students may combine drawing and measurement with construction materials, site practice and engineering fundamentals.",
    learningAreas: [
      { title: "Construction materials", description: "Study materials and methods used in building and infrastructure work." },
      { title: "Technical drawing", description: "Read and prepare drawings that communicate construction details." },
      { title: "Surveying and site work", description: "Explore measurement and practical methods used to understand a site." },
    ],
  },
  "agriculture-certificate": {
    overview:
      "Agriculture skills certificates offer focused, practical learning related to crops and farming. The skills taught, assessment and recognition depend on the certificate provider.",
    learningAreas: [
      { title: "Crop basics", description: "Explore planting, crop care and common production practices." },
      { title: "Soil and water", description: "Understand basic resource needs for growing crops." },
      { title: "Farm practice", description: "Connect practical tasks with local farming contexts." },
    ],
  },
  "hospitality-vocational": {
    overview:
      "Hospitality and tourism skills training introduces service work and the operations behind visitor experiences. Practical activities and available specialisations vary by provider.",
    learningAreas: [
      { title: "Guest interaction", description: "Practise welcoming, listening and responding to guest needs." },
      { title: "Service operations", description: "Explore everyday tasks in hospitality or tourism settings." },
      { title: "Workplace readiness", description: "Build communication, teamwork and service routines." },
    ],
  },
  "healthcare-support": {
    overview:
      "Healthcare support training introduces selected support skills used in care settings. It is not a substitute for a regulated clinical qualification; check the provider and role scope before enrolling.",
    learningAreas: [
      { title: "Care support", description: "Explore respectful assistance with everyday care needs." },
      { title: "Health and safety", description: "Learn foundational hygiene, safety and communication practices." },
      { title: "Care environments", description: "Understand how support roles work within supervised care teams." },
    ],
  },
};
