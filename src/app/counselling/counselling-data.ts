export type CounsellingCategory =
  | "interests"
  | "curiosity"
  | "learning"
  | "strengths"
  | "goals";

export type CounsellingOption = {
  id: string;
  label: string;
  exclusive?: boolean;
  enabled?: boolean;
  kind?: "unsure" | "none" | "other" | "declined" | "confirmation" | "negative";
};

export type CounsellingQuestion = {
  id: string;
  version: 1;
  text: string;
  purpose: string;
  role: "opening" | "discovery" | "follow_up" | "optional" | "clarification";
  category: CounsellingCategory;
  responseType: "single_select" | "multi_select" | "free_text" | "mixed";
  maxSelections?: number;
  options?: CounsellingOption[];
  skipAllowed: true;
  enabled?: boolean;
};

export function allowsMultipleCounsellingSelections(question: CounsellingQuestion) {
  return question.responseType === "multi_select" || question.id === "Q001";
}

export function normalizeCounsellingSelection(
  question: CounsellingQuestion,
  optionIds: string[],
) {
  const selected = [...new Set(optionIds)].filter((id) =>
    question.options?.some((option) => option.id === id),
  );
  const exclusive = selected.find((id) =>
    question.options?.find((option) => option.id === id)?.exclusive,
  );
  return exclusive ? [exclusive] : selected;
}

export function toggleCounsellingSelection(
  question: CounsellingQuestion,
  optionIds: string[],
  optionId: string,
) {
  const option = question.options?.find((item) => item.id === optionId);
  if (!option) return normalizeCounsellingSelection(question, optionIds);

  const selected = normalizeCounsellingSelection(question, optionIds);
  if (selected.includes(optionId)) {
    return selected.filter((id) => id !== optionId);
  }
  if (!allowsMultipleCounsellingSelections(question) || option.exclusive) {
    return [optionId];
  }
  if (question.maxSelections && selected.length >= question.maxSelections) {
    return selected;
  }
  return [
    ...selected.filter(
      (id) => !question.options?.find((item) => item.id === id)?.exclusive,
    ),
    optionId,
  ];
}

export function hasExclusiveSelectionConflict(
  question: CounsellingQuestion,
  optionIds: string[],
) {
  return (
    optionIds.length > 1 &&
    optionIds.some((id) =>
      question.options?.find((option) => option.id === id)?.exclusive,
    )
  );
}

function options(
  labels: string[],
  kinds: Record<number, CounsellingOption["kind"]> = {},
  exclusiveIndexes: number[] = [],
  inactiveIndexes: number[] = [],
) {
  return labels.map((label, index) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    label,
    ...(kinds[index] ? { kind: kinds[index] } : {}),
    ...(exclusiveIndexes.includes(index) ? { exclusive: true } : {}),
    ...(inactiveIndexes.includes(index) ? { enabled: false } : {}),
  }));
}

export const counsellingQuestions: CounsellingQuestion[] = [
  {
    id: "Q001",
    version: 1,
    text: "What do you usually enjoy doing when you have some free time?",
    purpose: "Discover everyday interests",
    role: "opening",
    category: "interests",
    responseType: "mixed",
    maxSelections: 3,
    options: options(
      [
        "Using computers or technology",
        "Drawing, designing or making things",
        "Reading, learning or discovering",
        "Sports or physical activity",
        "Helping or spending time with people",
        "Puzzles or figuring things out",
        "Videos, movies or content",
        "Games",
        "Hands-on activities",
        "Outdoors or nature",
        "Something else",
        "I'm not sure",
      ],
      { 10: "other", 11: "unsure" },
      [11],
    ),
    skipAllowed: true,
  },
  {
    id: "Q002",
    version: 1,
    text: "What do you enjoy most about these activities?",
    purpose: "Understand what the student enjoys about an activity",
    role: "follow_up",
    category: "interests",
    responseType: "multi_select",
    options: options(
      [
        "Creating something",
        "Understanding how things work",
        "Solving problems",
        "Helping others",
        "Expressing ideas",
        "Discovering new things",
        "Relaxing or having fun",
        "Doing it with others",
        "Something else",
        "Not sure",
      ],
      { 9: "unsure" },
      [9],
    ),
    skipAllowed: true,
  },
  {
    id: "Q003",
    version: 1,
    text: "What activity or topic did you have in mind?",
    purpose: "Clarify a broad or uncertain activity without guessing its meaning",
    role: "clarification",
    category: "interests",
    responseType: "free_text",
    // Keep retired choices readable in saved sessions; free-text screens do not render them.
    options: options(
      [
        "Creating something",
        "Understanding how things work",
        "Solving problems",
        "Helping others",
        "Expressing ideas",
        "Discovering new things",
        "Something else",
        "I'm not sure",
      ],
      { 7: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "Q004",
    version: 1,
    text: "Is there anything you enjoy learning or doing outside your schoolwork?",
    purpose: "Explore activities outside school when useful",
    role: "optional",
    category: "interests",
    responseType: "single_select",
    options: options(
      [
        "Learning online",
        "Creative activities",
        "Practical activities",
        "Learning from people",
        "Exploring independently",
        "Nothing particular",
        "Not sure",
        "Other",
      ],
      { 5: "none", 6: "unsure", 7: "other" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q005",
    version: 1,
    text: "When you come across something new, what kinds of things usually make you curious?",
    purpose: "Discover topics the student is curious about",
    role: "discovery",
    category: "curiosity",
    responseType: "multi_select",
    maxSelections: 3,
    options: options(
      [
        "Computers or digital technology",
        "Machines, structures or how things are built",
        "The human body",
        "Nature or the natural world",
        "People, behaviour or communities",
        "Business or money",
        "Design or creative expression",
        "Stories, news, film or media",
        "Rules, rights or justice",
        "Government, public decisions or public services",
        "Science, experiments or discoveries",
        "Travel, places or different cultures",
        "Many things",
        "Not sure",
        "Technology or machines",
        "Nature or the world",
        "People or behaviour",
        "Design or creation",
        "Society or government",
        "Stories or media",
      ],
      { 13: "unsure" },
      [13],
      [14, 15, 16, 17, 18, 19],
    ),
    skipAllowed: true,
  },
  {
    id: "Q006",
    version: 1,
    text: "If you had the chance to learn something completely new, what would you be curious to try?",
    purpose: "Offer a different angle when current activities are unclear or limited",
    role: "optional",
    category: "curiosity",
    responseType: "single_select",
    options: options(
      [
        "Build or improve a practical object or machine",
        "Investigate or experiment",
        "Learn about people",
        "Explore nature",
        "Design something",
        "Solve a real-world problem",
        "Learn how a business works",
        "Try a practical activity",
        "Not sure",
        "Build or create something",
      ],
      { 8: "unsure" },
      [],
      [9],
    ),
    skipAllowed: true,
  },
  {
    id: "Q007",
    version: 1,
    text: "Are there any school subjects or topics you genuinely enjoy learning about?",
    purpose: "Explore subjects only with the student's actual curriculum",
    role: "optional",
    category: "learning",
    responseType: "multi_select",
    options: options(["None", "Not sure", "Other"], {
      0: "none",
      1: "unsure",
      2: "other",
    }),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q008",
    version: 1,
    text: "Is there anything you find interesting, even if you sometimes find it difficult?",
    purpose: "Separate interest from difficulty without treating difficulty as disqualification",
    role: "optional",
    category: "learning",
    responseType: "single_select",
    options: options(
      [
        "Yes",
        "Some topics interest me but are difficult",
        "Nothing comes to mind",
        "Not sure",
        "I prefer not to say",
      ],
      { 0: "confirmation", 2: "none", 3: "unsure", 4: "declined" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q009",
    version: 1,
    text: "When you're learning something new, what usually helps you understand it better?",
    purpose: "Record a stated learning preference only when discussed",
    role: "optional",
    category: "learning",
    responseType: "single_select",
    options: options(
      [
        "Examples or demonstrations",
        "Trying it",
        "Reading or research",
        "Listening to an explanation",
        "Discussing it",
        "Videos",
        "A mix",
        "Not sure",
      ],
      { 7: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q010",
    version: 1,
    text: "Which sounds more enjoyable to you?",
    purpose: "Explore a learning preference without assigning a fixed type",
    role: "optional",
    category: "learning",
    responseType: "single_select",
    options: options(
      [
        "Understanding ideas",
        "Trying things and learning by doing",
        "A mix",
        "It depends on the topic",
        "Not sure",
      ],
      { 4: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q011",
    version: 1,
    text: "What kinds of things do you feel comfortable doing?",
    purpose: "Record the student's own sense of comfort, not measured ability",
    role: "optional",
    category: "strengths",
    responseType: "multi_select",
    options: options([
      "Explaining",
      "Solving problems",
      "Organising",
      "Creating or designing",
      "Working with people",
      "Working independently",
      "Finding information",
      "Practical tasks",
      "Learning new things",
      "Still discovering",
    ]),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q012",
    version: 1,
    text: "Do friends, classmates or family ever ask you for help with something?",
    purpose: "Record what the student reports without treating it as proof of ability",
    role: "optional",
    category: "strengths",
    responseType: "multi_select",
    options: options(
      [
        "Schoolwork or explaining",
        "Technology",
        "Creative work",
        "Organising",
        "Problem-solving",
        "Listening or support",
        "Practical tasks",
        "Something else",
        "Not really",
        "Not sure",
      ],
      { 7: "other", 8: "none", 9: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q013",
    version: 1,
    text: "Is there anything you'd like to learn or improve, even if you aren't very good at it yet?",
    purpose: "Explore a stated wish to learn without treating it as career suitability",
    role: "optional",
    category: "strengths",
    responseType: "single_select",
    options: options(
      [
        "Communication",
        "Technology",
        "Creative skills",
        "Problem-solving",
        "Leadership or organisation",
        "Practical skills",
        "Academic subjects",
        "Other",
        "I haven't thought about it",
      ],
      { 7: "other", 8: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q014",
    version: 1,
    text: "When you imagine your future, what kinds of things would matter most to you?",
    purpose: "Explore values in concrete, optional terms",
    role: "optional",
    category: "goals",
    responseType: "multi_select",
    options: options(
      [
        "Doing something enjoyable",
        "Helping people",
        "Stability",
        "Financial independence",
        "Creativity",
        "Learning or discovery",
        "Making a difference",
        "Freedom or flexibility",
        "Running something",
        "I haven't thought about it",
      ],
      { 9: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q015",
    version: 1,
    text: "If you could make a difference in some way, what would you like to contribute to?",
    purpose: "Invite reflection without judging the answer",
    role: "optional",
    category: "goals",
    responseType: "single_select",
    options: options(
      [
        "Helping individuals",
        "Improving my community",
        "Creating useful things",
        "Solving problems",
        "Discovering knowledge",
        "Protecting nature",
        "Sharing ideas",
        "Not sure",
      ],
      { 7: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
  {
    id: "Q016",
    version: 1,
    text: "Have you thought about what you'd like your future working life to feel like?",
    purpose: "Explore future preferences without assigning a fixed career type",
    role: "optional",
    category: "goals",
    responseType: "single_select",
    options: options(
      [
        "Interesting or creative",
        "Stable or predictable",
        "Active or varied",
        "Helping people",
        "Independent or flexible",
        "Challenging or full of learning",
        "I haven't thought about it",
      ],
      { 6: "unsure" },
    ),
    skipAllowed: true,
    enabled: false,
  },
];

const inactiveBranchQuestionIds = new Set([
  "T02", "T03", "T04", "T05",
  "A02", "A03", "A04",
  "S02", "S03", "S04",
  "P02", "P03", "P04",
  "B02", "B03", "B04",
  "SP02", "SP03", "SP04",
  "N02", "N03", "N04",
]);

const branchQuestionRecords: CounsellingQuestion[] = [
  {
    id: "T01",
    version: 1,
    text: "What about technology would you be interested in exploring?",
    purpose: "Clarify what the student is curious about in technology without assuming experience",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      [
        "Understanding how computers and devices work",
        "Creating digital things",
        "Finding ways to solve problems using technology",
        "Understanding how technology is used in everyday life",
        "Something else",
        "I'm not sure",
        "Creating something",
        "Understanding how things work",
        "Solving problems",
        "Expressing ideas",
        "Discovering new things",
      ],
      { 5: "unsure" },
      [5],
      [6, 7, 8, 9, 10],
    ),
    skipAllowed: true,
  },
  {
    id: "T02",
    version: 1,
    text: "Have you ever tried creating something using a computer?",
    purpose: "Understand relevant experience without assuming proficiency",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Yes", "Not yet", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "T03",
    version: 1,
    text: "Do you enjoy understanding how technology works?",
    purpose: "Explore a stated technology interest",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Yes", "Not really", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "T04",
    version: 1,
    text: "Do you prefer creating things or using things others have created?",
    purpose: "Explore a stated preference around technology",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      ["Creating things", "Using things others have created", "Both", "I'm not sure"],
      { 3: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "T05",
    version: 1,
    text: "Is there something about technology you'd like to learn?",
    purpose: "Explore stated curiosity about technology",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(["Yes", "Not right now", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "A01",
    version: 1,
    text: "What kind of creative work interests you most?",
    purpose: "Clarify which kind of creative work interests the student",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      [
        "Drawing or visual art",
        "Designing how something looks or works",
        "Making things by hand",
        "Creating digital content",
        "Experimenting with ideas and materials",
        "Something else",
        "I'm not sure",
        "Drawing",
        "Designing",
        "Crafting",
        "Making things",
      ],
      { 6: "unsure" },
      [],
      [7, 8, 9, 10],
    ),
    skipAllowed: true,
  },
  {
    id: "A02",
    version: 1,
    text: "Do you prefer drawing, designing, crafting or experimenting with ideas?",
    purpose: "Explore a stated creative preference",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      ["Drawing", "Designing", "Crafting", "Experimenting with ideas", "I'm not sure"],
      { 4: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "A03",
    version: 1,
    text: "Do you enjoy creating from your imagination or working from examples?",
    purpose: "Explore how the student approaches creative activities",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      ["From my imagination", "From examples", "A mix of both", "I'm not sure"],
      { 3: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "A04",
    version: 1,
    text: "Would you like to learn more creative techniques?",
    purpose: "Explore stated curiosity about creative activities",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(["Yes", "Not right now", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "S01",
    version: 1,
    text: "What about the human body would you like to understand?",
    purpose: "Clarify a curiosity about the human body without directing the student to one field",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(
      [
        "How the human body works",
        "Health and illness",
        "How people grow and develop",
        "Movement and physical activity",
        "Something else",
        "I'm not sure",
        "Technology or machines",
        "The human body",
        "Nature or the world",
      ],
      { 5: "unsure" },
      [],
      [6, 7, 8],
    ),
    skipAllowed: true,
  },
  {
    id: "S02",
    version: 1,
    text: "Do you enjoy experiments or understanding explanations more?",
    purpose: "Explore a stated science or discovery preference",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(["Experiments", "Understanding explanations", "Both", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "S03",
    version: 1,
    text: "Are you curious about nature, the human body, space or how things work?",
    purpose: "Explore the topics within a stated scientific curiosity",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(["Nature", "The human body", "Space", "How things work", "I'm not sure"], {
      4: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "S04",
    version: 1,
    text: "Is there something you've always wanted to understand?",
    purpose: "Invite the student to share a question they are curious about",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(["Nature", "The human body", "Space", "How things work", "I'm not sure"], {
      4: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "P01",
    version: 1,
    text: "What do you enjoy about helping others?",
    purpose: "Understand a stated interest in helping people",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      ["Teaching", "Listening", "Explaining", "Solving problems with people", "I'm not sure"],
      { 4: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "P02",
    version: 1,
    text: "Do you enjoy teaching, listening, explaining or solving problems with people?",
    purpose: "Explore activities the student enjoys with other people",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Yes", "Not really", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "P03",
    version: 1,
    text: "Do you prefer working with a few people or larger groups?",
    purpose: "Explore a stated preference for working with people",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["A few people", "Larger groups", "Either", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "P04",
    version: 1,
    text: "Is helping others something you enjoy regularly or in certain situations?",
    purpose: "Understand the context of a stated interest in helping",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Regularly", "In certain situations", "I'm not sure"], { 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "B01",
    version: 1,
    text: "What interests you most about how a business works?",
    purpose: "Clarify which parts of how a business works interest the student",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(
      [
        "Coming up with ideas for products or services",
        "Organising people or activities",
        "Understanding money and budgets",
        "Communicating with customers or selling something",
        "Something else",
        "I'm not sure",
        "Business or money",
        "Planning or organising",
      ],
      { 5: "unsure" },
      [],
      [6, 7],
    ),
    skipAllowed: true,
  },
  {
    id: "B02",
    version: 1,
    text: "Do you enjoy organising, planning, selling or managing things?",
    purpose: "Explore a stated interest in organisation or business",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Yes", "Not really", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "B03",
    version: 1,
    text: "Do you enjoy coming up with ideas for something new?",
    purpose: "Explore a stated interest in creating new ideas",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Yes", "Not really", "I'm not sure"], { 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "B04",
    version: 1,
    text: "Have you ever tried organising or running something yourself?",
    purpose: "Understand relevant experience without assuming proficiency",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Yes", "Not yet", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
  {
    id: "SP01",
    version: 1,
    text: "What do you enjoy most about playing sports or being active?",
    purpose: "Understand a stated interest in sports or physical activity",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Competition", "Practice", "Simply being active", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "SP02",
    version: 1,
    text: "Do you enjoy individual activities or team activities more?",
    purpose: "Explore a stated sports or activity preference",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Individual activities", "Team activities", "Both", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "SP03",
    version: 1,
    text: "Do you enjoy competition, practice or simply being active?",
    purpose: "Explore what the student values about being active",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Competition", "Practice", "Simply being active", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "SP04",
    version: 1,
    text: "Are there other physical activities you enjoy?",
    purpose: "Invite the student to share other activities",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Team activities", "Individual activities", "Outdoor activities", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "N01",
    version: 1,
    text: "What interests you most about nature?",
    purpose: "Understand a stated interest in nature or the environment",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(
      ["Plants", "Animals", "Outdoor exploration", "Environmental topics", "I'm not sure"],
      { 4: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "N02",
    version: 1,
    text: "Do you enjoy plants, animals, outdoor exploration or environmental topics?",
    purpose: "Explore a stated nature or environmental interest",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(
      ["Plants", "Animals", "Outdoor exploration", "Environmental topics", "I'm not sure"],
      { 4: "unsure" },
    ),
    skipAllowed: true,
  },
  {
    id: "N03",
    version: 1,
    text: "Do you prefer observing nature or doing practical activities outdoors?",
    purpose: "Explore a stated nature or activity preference",
    role: "follow_up",
    category: "interests",
    responseType: "mixed",
    options: options(["Observing nature", "Practical activities outdoors", "Both", "I'm not sure"], {
      3: "unsure",
    }),
    skipAllowed: true,
  },
  {
    id: "N04",
    version: 1,
    text: "Is there an environmental issue you're curious about?",
    purpose: "Explore a stated curiosity about the environment",
    role: "follow_up",
    category: "curiosity",
    responseType: "mixed",
    options: options(["Yes", "Not right now", "I'm not sure"], { 1: "negative", 2: "unsure" }),
    skipAllowed: true,
  },
];

export const branchQuestions = branchQuestionRecords.map((question) =>
  inactiveBranchQuestionIds.has(question.id)
    ? { ...question, enabled: false }
    : question,
);

export const allCounsellingQuestions = [...counsellingQuestions, ...branchQuestions];

export const counsellingQuestionById = new Map(
  allCounsellingQuestions.map((question) => [question.id, question]),
);

export const branchQuestionIds = {
  technology: ["T01", "T02", "T03", "T04", "T05"],
  creative: ["A01", "A02", "A03", "A04"],
  science: ["S01", "S02", "S03", "S04"],
  people: ["P01", "P02", "P03", "P04"],
  business: ["B01", "B02", "B03", "B04"],
  sports: ["SP01", "SP02", "SP03", "SP04"],
  nature: ["N01", "N02", "N03", "N04"],
} as const;
