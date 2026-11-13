import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const ts = loadModule("typescript");

loadModule.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const {
  chooseNextAction,
  clearCounsellingAnswers,
  continueCounselling,
  deriveStudentInsights,
  editCounsellingAnswer,
  getDependentAnswerEditImpact,
  getDependentAnswerRemovalImpact,
  removeCounsellingAnswer,
  setCounsellingStatus,
  skipCurrentQuestion,
  startNewCounselling,
  submitCounsellingAnswer,
} = loadModule("./counselling-engine.ts");
const {
  counsellingQuestionById,
  branchQuestions,
  allowsMultipleCounsellingSelections,
  normalizeCounsellingSelection,
  toggleCounsellingSelection,
} = loadModule("./counselling-data.ts");
const {
  getCounsellingFieldSuggestions,
  getGuidedExploreStartingPoints,
  counsellingPossibilityMappings,
  counsellingPossibilityMappingVersion,
} = loadModule("../explore/explore-data.ts");

function session(overrides = {}) {
  return {
    version: 1,
    questionBankVersion: 1,
    id: "test-session",
    status: "active",
    currentQuestionId: "Q001",
    questionPath: ["Q001"],
    pathIndex: 0,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
    answers: [],
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function answer(questionId, optionIds, responseState = "answered", interpretationStatus = "clear") {
  return {
    id: `answer-${questionId}`,
    questionId,
    optionIds,
    originalText: "",
    responseState,
    interpretationStatus,
    createdAt: new Date(0).toISOString(),
  };
}

function withBrowserStorage(run) {
  const values = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
    localStorage: { getItem: () => null, removeItem: () => {}, setItem: () => {} },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  };
  loadModule("../account-data-sync.ts").setAccountMode(false);
  try {
    return run();
  } finally {
    delete globalThis.window;
  }
}

function submitAndGet(current, optionIds, originalText = "") {
  const result = submitCounsellingAnswer(current, { optionIds, originalText });
  assert.equal(result.ok, true, `Could not submit ${current.currentQuestionId}`);
  return result.session;
}

test("asks one contextual follow-up for a clear opening interest", () => {
  const current = session({
    answers: [answer("Q001", ["using-computers-or-technology"])],
  });
  assert.deepEqual(chooseNextAction(current, "Q001"), {
    action: "follow_up",
    questionId: "Q002",
    reasonCode: "understand_activity_motivation",
  });
});

test("asks the distinct technology follow-up after the motivation question", () => {
  const current = session({
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["creating-something"]),
    ],
  });
  assert.equal(chooseNextAction(current, "Q002").questionId, "T01");
});

test("keeps the Q001 suggestions source-aligned and makes uncertainty exclusive", () => {
  const question = counsellingQuestionById.get("Q001");
  const activity = "using-computers-or-technology";
  const unsure = "i-m-not-sure";

  assert.equal(question.responseType, "mixed");
  assert.deepEqual(question.options.map((option) => option.label), [
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
  ]);
  assert.deepEqual(normalizeCounsellingSelection(question, [activity, unsure]), [unsure]);
  assert.deepEqual(toggleCounsellingSelection(question, [activity], unsure), [unsure]);
  assert.deepEqual(toggleCounsellingSelection(question, [unsure], activity), [activity]);
  assert.deepEqual(toggleCounsellingSelection(question, [unsure], unsure), []);
  const thirdActivity = "reading-learning-or-discovering";
  const fourthActivity = "sports-or-physical-activity";
  assert.deepEqual(
    toggleCounsellingSelection(
      question,
      [activity, "drawing-designing-or-making-things", thirdActivity],
      fourthActivity,
    ),
    [activity, "drawing-designing-or-making-things", thirdActivity],
  );
  assert.deepEqual(
    submitCounsellingAnswer(session(), {
      optionIds: [activity, unsure],
      originalText: "",
    }),
    { ok: false, reason: "unavailable" },
  );
  assert.deepEqual(
    submitCounsellingAnswer(session(), {
      optionIds: [activity, "drawing-designing-or-making-things", thirdActivity, fourthActivity],
      originalText: "",
    }),
    { ok: false, reason: "unavailable" },
  );
});

test("accepts a written response without requiring a selected option", () => {
  const current = session();
  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };

  try {
    const result = submitCounsellingAnswer(current, {
      optionIds: [],
      originalText: "I enjoy building small robots.",
    });
    assert.equal(result.ok, true);
    assert.equal(result.session.answers[0].originalText, "I enjoy building small robots.");
    assert.equal(result.session.currentQuestionId, "Q002");
    assert.equal(persisted.answers[0].originalText, "I enjoy building small robots.");
  } finally {
    delete globalThis.window;
  }
});

test("keeps clarification open-text and makes Q002 and Q005 multi-select", () => {
  const clarification = counsellingQuestionById.get("Q003");
  const experience = counsellingQuestionById.get("T02");
  const motivation = counsellingQuestionById.get("Q002");
  const curiosity = counsellingQuestionById.get("Q005");

  assert.equal(clarification.text, "What activity or topic did you have in mind?");
  assert.equal(clarification.responseType, "free_text");
  assert.ok(clarification.options.length > 0, "Retired options keep saved answers readable");
  assert.equal(motivation.responseType, "multi_select");
  assert.equal(motivation.options.find(({ kind }) => kind === "unsure").exclusive, true);
  assert.equal(curiosity.maxSelections, 3);
  assert.equal(curiosity.options.find(({ kind }) => kind === "unsure").exclusive, true);
  assert.equal(counsellingQuestionById.get("Q004").enabled, false);
  for (let questionNumber = 7; questionNumber <= 16; questionNumber += 1) {
    assert.equal(
      counsellingQuestionById.get(`Q${String(questionNumber).padStart(3, "0")}`).enabled,
      false,
    );
  }
  assert.deepEqual(
    branchQuestions
      .filter((question) => question.enabled !== false)
      .map(({ id }) => id),
    ["T01", "A01", "S01", "P01", "B01", "SP01", "N01"],
  );
  assert.equal(counsellingQuestionById.get("T01").text, "What about technology would you be interested in exploring?");
  assert.deepEqual(
    counsellingQuestionById.get("T01").options
      .filter((option) => option.enabled !== false)
      .map(({ label }) => label),
    [
      "Understanding how computers and devices work",
      "Creating digital things",
      "Finding ways to solve problems using technology",
      "Understanding how technology is used in everyday life",
      "Something else",
      "I'm not sure",
    ],
  );
  assert.equal(
    counsellingQuestionById.get("T01").options.find(({ id }) => id === "creating-something").enabled,
    false,
  );
  for (const [questionId, optionId] of [
    ["A01", "drawing"],
    ["S01", "technology-or-machines"],
    ["B01", "business-or-money"],
  ]) {
    assert.equal(
      counsellingQuestionById.get(questionId).options.find((option) => option.id === optionId)
        ?.enabled,
      false,
      `Legacy ${questionId} answer ${optionId} should remain readable but not selectable`,
    );
  }
  assert.ok(branchQuestions.every(
    (question) => question.responseType === "mixed" && question.options?.length,
  ));
  assert.deepEqual(experience.options.map((option) => option.label), [
    "Yes",
    "Not yet",
    "I'm not sure",
  ]);
  assert.equal(experience.options[1].kind, "negative");
  assert.equal(experience.options[2].kind, "unsure");
  assert.equal(allowsMultipleCounsellingSelections(experience), false);
  assert.equal(allowsMultipleCounsellingSelections(counsellingQuestionById.get("Q001")), true);
  assert.equal(allowsMultipleCounsellingSelections(motivation), true);

  assert.deepEqual(
    normalizeCounsellingSelection(curiosity, ["technology-or-machines", "not-sure"]),
    ["not-sure"],
  );
  assert.deepEqual(
    toggleCounsellingSelection(curiosity, ["technology-or-machines"], "not-sure"),
    ["not-sure"],
  );
  assert.deepEqual(
    toggleCounsellingSelection(
      motivation,
      ["creating-something", "solving-problems"],
      "helping-others",
    ),
    ["creating-something", "solving-problems", "helping-others"],
  );
  assert.deepEqual(
    toggleCounsellingSelection(
      curiosity,
      ["technology-or-machines", "the-human-body", "nature-or-the-world"],
      "people-or-behaviour",
    ),
    ["technology-or-machines", "the-human-body", "nature-or-the-world"],
  );
  assert.deepEqual(
    submitCounsellingAnswer(
      session({
        currentQuestionId: "Q005",
        questionPath: ["Q001", "Q005"],
        pathIndex: 1,
        askedQuestionIds: ["Q001", "Q005"],
      }),
      {
        optionIds: [
          "computers-or-digital-technology",
          "machines-structures-or-how-things-are-built",
          "the-human-body",
          "nature-or-the-natural-world",
        ],
        originalText: "",
      },
    ),
    { ok: false, reason: "unavailable" },
  );
});

test("Q005 offers distinct field topics and retains changed legacy choices only for saved answers", () => {
  const curiosity = counsellingQuestionById.get("Q005");
  assert.equal(curiosity.maxSelections, 3);
  assert.deepEqual(
    curiosity.options.filter(({ enabled }) => enabled !== false).map(({ label }) => label),
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
    ],
  );
  assert.equal(curiosity.options.find(({ id }) => id === "technology-or-machines").enabled, false);

  const alternate = counsellingQuestionById.get("Q006");
  assert.equal(
    alternate.options.find(({ id }) => id === "build-or-improve-a-practical-object-or-machine")
      .label,
    "Build or improve a practical object or machine",
  );
  assert.equal(alternate.options.find(({ id }) => id === "build-or-create-something").enabled, false);
  assert.deepEqual(
    submitCounsellingAnswer(
      session({
        currentQuestionId: "Q005",
        questionPath: ["Q001", "Q005"],
        pathIndex: 1,
        askedQuestionIds: ["Q001", "Q005"],
      }),
      { optionIds: ["technology-or-machines"], originalText: "" },
    ),
    { ok: false, reason: "unavailable" },
  );
});

test("refined Q005 answers route only to relevant topic follow-ups", () => {
  const cases = [
    ["computers-or-digital-technology", "T01"],
    ["the-human-body", "S01"],
    ["nature-or-the-natural-world", "N01"],
    ["people-behaviour-or-communities", "P01"],
    ["business-or-money", "B01"],
    ["design-or-creative-expression", "A01"],
    ["machines-structures-or-how-things-are-built", null],
  ];

  for (const [optionId, expectedQuestionId] of cases) {
    const current = session({
      currentQuestionId: "Q005",
      questionPath: ["Q001", "Q005"],
      pathIndex: 1,
      askedQuestionIds: ["Q001", "Q005"],
      answers: [answer("Q005", [optionId])],
    });
    const action = chooseNextAction(current, "Q005");
    assert.equal(
      action.action === "follow_up" ? action.questionId : null,
      expectedQuestionId,
      `Unexpected follow-up for ${optionId}`,
    );
  }
});

test("asks one plural contextual follow-up for multiple opening interests", () => {
  const current = session({
    answers: [
      answer("Q001", [
        "using-computers-or-technology",
        "drawing-designing-or-making-things",
      ]),
    ],
  });
  assert.equal(chooseNextAction(current, "Q001").questionId, "Q002");
});

test("tries one different question for uncertainty, then accepts it", () => {
  const opening = session({
    answers: [answer("Q001", ["i-m-not-sure"], "unsure")],
  });
  assert.equal(chooseNextAction(opening, "Q001").questionId, "Q006");

  const followUp = session({
    currentQuestionId: "Q006",
    questionPath: ["Q001", "Q006"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q006"],
    answers: [
      answer("Q001", ["i-m-not-sure"], "unsure"),
      answer("Q006", ["not-sure"], "unsure"),
    ],
  });
  assert.deepEqual(chooseNextAction(followUp, "Q006"), {
    action: "complete",
    reasonCode: "accepted_uncertainty",
  });

  const uncertainMotivation = session({
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["not-sure"], "unsure"),
    ],
  });
  assert.equal(chooseNextAction(uncertainMotivation, "Q002").questionId, "Q005");
});

test("uses Q006 for uncertain Q001 or Q005, and skipping Q003 continues", () => {
  const uncertainCuriosity = session({
    currentQuestionId: "Q005",
    questionPath: ["Q001", "Q005"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q005"],
    answers: [answer("Q005", ["not-sure"], "unsure")],
  });
  assert.equal(chooseNextAction(uncertainCuriosity, "Q005").questionId, "Q006");

  const afterUnclearClarification = session({
    currentQuestionId: "Q003",
    questionPath: ["Q001", "Q003"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q003"],
    skippedQuestionIds: ["Q003"],
    answers: [answer("Q001", ["something-else"])],
  });
  assert.equal(chooseNextAction(afterUnclearClarification, "Q003").questionId, "Q005");

  const clarifiedKnownActivity = session({
    currentQuestionId: "Q003",
    questionPath: ["Q001", "Q003"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q003"],
    answers: [
      answer("Q001", ["using-computers-or-technology", "something-else"]),
      answer("Q003", [], "answered", "unrecognised"),
    ],
  });
  assert.equal(chooseNextAction(clarifiedKnownActivity, "Q003").questionId, "Q002");
});

test("asks at most one branch follow-up after each main interest question", () => {
  const openingAnswers = [
    "drawing-designing-or-making-things",
    "using-computers-or-technology",
  ];
  const afterMotivation = session({
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [
      answer("Q001", openingAnswers),
      answer("Q002", ["creating-something"]),
    ],
  });
  assert.equal(chooseNextAction(afterMotivation, "Q002").questionId, "A01");
  assert.equal(
    chooseNextAction(
      {
        ...afterMotivation,
        answers: [answer("Q001", [...openingAnswers].reverse()), afterMotivation.answers[1]],
      },
      "Q002",
    ).questionId,
    "A01",
  );

  const afterCreativeFollowUp = {
    ...afterMotivation,
    currentQuestionId: "A01",
    questionPath: ["Q001", "Q002", "A01"],
    pathIndex: 2,
    askedQuestionIds: ["Q001", "Q002", "A01"],
    answers: [...afterMotivation.answers, answer("A01", ["drawing-or-visual-art"])],
  };
  assert.equal(chooseNextAction(afterCreativeFollowUp, "A01").questionId, "Q005");

  const afterBusinessCuriosity = {
    ...afterCreativeFollowUp,
    currentQuestionId: "Q005",
    questionPath: ["Q001", "Q002", "A01", "Q005"],
    pathIndex: 3,
    askedQuestionIds: ["Q001", "Q002", "A01", "Q005"],
    answers: [
      ...afterCreativeFollowUp.answers,
      answer("Q005", ["nature-or-the-world", "business-or-money"]),
    ],
  };
  assert.equal(chooseNextAction(afterBusinessCuriosity, "Q005").questionId, "B01");

  const afterCuriosityFollowUp = {
    ...afterBusinessCuriosity,
    currentQuestionId: "B01",
    questionPath: [...afterBusinessCuriosity.questionPath, "B01"],
    pathIndex: 4,
    askedQuestionIds: [...afterBusinessCuriosity.askedQuestionIds, "B01"],
    answers: [...afterBusinessCuriosity.answers, answer("B01", ["understanding-money-and-budgets"])],
  };
  assert.equal(chooseNextAction(afterCuriosityFollowUp, "B01").action, "complete");
});

test("complete journey with several activities and curiosity topics stays bounded and order-neutral", () =>
  withBrowserStorage(() => {
    let current = submitAndGet(session(), [
      "using-computers-or-technology",
      "drawing-designing-or-making-things",
      "helping-or-spending-time-with-people",
    ]);
    assert.equal(current.currentQuestionId, "Q002");

    current = submitAndGet(current, [
      "creating-something",
      "helping-others",
      "expressing-ideas",
    ]);
    assert.equal(current.currentQuestionId, "A01");

    current = submitAndGet(current, ["drawing-or-visual-art"]);
    assert.equal(current.currentQuestionId, "Q005");

    current = submitAndGet(current, [
      "computers-or-digital-technology",
      "people-behaviour-or-communities",
      "business-or-money",
    ]);
    assert.equal(current.currentQuestionId, "B01");

    current = submitAndGet(current, ["understanding-money-and-budgets"]);
    assert.equal(current.currentQuestionId, null);
    assert.deepEqual(current.questionPath, ["Q001", "Q002", "A01", "Q005", "B01"]);
  }));

test("Q001 unsure offers Q006 and uses its selected idea as Explore evidence", () =>
  withBrowserStorage(() => {
    let current = submitAndGet(session(), ["i-m-not-sure"]);
    assert.equal(current.currentQuestionId, "Q006");
    current = submitAndGet(current, ["explore-nature"]);
    assert.equal(current.currentQuestionId, null);
    assert.deepEqual(
      getCounsellingFieldSuggestions(current.answers).map(({ field }) => field.name),
      ["Agriculture & Environment"],
    );
  }));

test("uncertain motivation continues to curiosity; uncertainty there then offers Q006", () =>
  withBrowserStorage(() => {
    let current = submitAndGet(session(), ["using-computers-or-technology"]);
    assert.equal(current.currentQuestionId, "Q002");

    current = submitAndGet(current, ["not-sure"]);
    assert.equal(current.currentQuestionId, "Q005");
    assert.equal(current.questionPath.includes("Q006"), false);

    current = submitAndGet(current, ["not-sure"]);
    assert.equal(current.currentQuestionId, "Q006");
    current = submitAndGet(current, ["learn-about-people"]);
    assert.equal(current.currentQuestionId, null);
    assert.deepEqual(
      getCounsellingFieldSuggestions(current.answers).map(({ field }) => field.name),
      ["Technology", "Social Sciences"],
    );
  }));

test("skipping Q001 or Q002 moves to the next relevant question", () =>
  withBrowserStorage(() => {
    const skippedOpening = skipCurrentQuestion(session());
    assert.equal(skippedOpening.ok, true);
    assert.equal(skippedOpening.session.currentQuestionId, "Q005");

    let current = submitAndGet(session(), ["using-computers-or-technology"]);
    assert.equal(current.currentQuestionId, "Q002");
    const skippedMotivation = skipCurrentQuestion(current);
    assert.equal(skippedMotivation.ok, true);
    assert.equal(skippedMotivation.session.currentQuestionId, "T01");
  }));

test("asks clarification only for an unelaborated other activity, then explores motivation", () =>
  withBrowserStorage(() => {
    let current = submitAndGet(session(), ["something-else"]);
    assert.equal(current.currentQuestionId, "Q003");
    current = submitAndGet(current, [], "I make them from spare parts.");
    assert.equal(current.currentQuestionId, "Q002");
    current = submitAndGet(current, ["understanding-how-things-work"]);
    assert.equal(current.currentQuestionId, "Q005");
    assert.deepEqual(
      current.answers.map(({ questionId, originalText }) => [questionId, originalText]),
      [
        ["Q001", ""],
        ["Q003", "I make them from spare parts."],
        ["Q002", ""],
      ],
    );
  }));

test("a written unlisted activity goes to motivation without repeating a clarification", () =>
  withBrowserStorage(() => {
    let current = submitAndGet(
      session(),
      ["something-else"],
      "I enjoy repairing old phones and figuring out why they stop working.",
    );
    assert.equal(current.currentQuestionId, "Q002");
    current = submitAndGet(current, ["understanding-how-things-work"]);
    assert.equal(current.currentQuestionId, "Q005");
    assert.deepEqual(
      getCounsellingFieldSuggestions(current.answers),
      [],
    );
    assert.equal(current.answers[0].originalText,
      "I enjoy repairing old phones and figuring out why they stop working.");
  }));

test("skipping clarification continues, and editing an earlier interest removes stale follow-ups", () =>
  withBrowserStorage(() => {
    let current = submitAndGet(session(), ["something-else"]);
    assert.equal(current.currentQuestionId, "Q003");
    const skippedClarification = skipCurrentQuestion(current);
    assert.equal(skippedClarification.ok, true);
    assert.equal(skippedClarification.session.currentQuestionId, "Q005");

    current = submitAndGet(session(), ["using-computers-or-technology"]);
    current = submitAndGet(current, ["creating-something"]);
    assert.equal(current.currentQuestionId, "T01");
    current = submitAndGet(current, ["creating-digital-things"]);
    assert.equal(current.currentQuestionId, "Q005");

    const edit = editCounsellingAnswer(
      current,
      current.answers.find(({ questionId }) => questionId === "Q001").id,
      { optionIds: ["sports-or-physical-activity"], originalText: "" },
      true,
    );
    assert.equal(edit.ok, true);
    assert.equal(edit.session.currentQuestionId, "Q002");
    assert.deepEqual(
      edit.session.answers.map(({ questionId }) => questionId),
      ["Q001"],
    );
    assert.equal(edit.session.questionPath.at(-1), "Q005");

    current = submitAndGet(edit.session, ["solving-problems"]);
    assert.equal(current.currentQuestionId, "SP01");
    current = submitAndGet(current, ["competition"]);
    assert.equal(current.currentQuestionId, "Q005");
    assert.equal(current.answers.some(({ questionId }) => questionId === "T01"), false);
  }));

test("resumes the next unsubmitted prompt after editing an earlier answer", () => {
  const current = session({
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002", "T02"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["creating-something"]),
    ],
  });
  assert.equal(chooseNextAction(current, "Q002").questionId, "T01");
});

test("repeats only the selected answer without inferring an activity", () => {
  const current = session({
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      {
        ...answer("Q002", ["creating-something"]),
        contextOptionId: "using-computers-or-technology",
      },
    ],
  });
  const insights = deriveStudentInsights(current);
  const followUp = insights.find((insight) => insight.id === "answer-Q002");
  assert.equal(insights.length, 2);
  assert.equal(
    followUp.value,
    `For “${counsellingQuestionById.get("Q002").text}”, you selected: Creating something.`,
  );
  assert.deepEqual(followUp.sourceQuestionIds, ["Q002"]);
  assert.deepEqual(followUp.sourceAnswerIds, ["answer-Q002"]);

  assert.equal(
    deriveStudentInsights(session({ answers: [current.answers[1]] }))[0].value,
    followUp.value,
  );
  assert.deepEqual(
    deriveStudentInsights(session({
      answers: [
        {
          ...answer("Q001", ["using-computers-or-technology", "i-m-not-sure"]),
        },
      ],
    }))[0].value,
    `For “${counsellingQuestionById.get("Q001").text}”, you selected: I'm not sure.`,
  );
  assert.equal(
    deriveStudentInsights(session({
      answers: [{
        ...answer("Q003", [], "answered", "unrecognised"),
        originalText: "I enjoy building small robots.",
      }],
    }))[0].value,
    `For “${counsellingQuestionById.get("Q003").text}”, you wrote: “I enjoy building small robots.”`,
  );

  const withWrittenNote = deriveStudentInsights(session({
    answers: [{
      ...answer("Q001", ["using-computers-or-technology"]),
      originalText: "I enjoy repairing old phones.",
    }],
  }));
  assert.equal(withWrittenNote.length, 2);
  assert.equal(withWrittenNote[0].id, "answer-Q001");
  assert.deepEqual(withWrittenNote[0].sourceAnswerIds, ["answer-Q001"]);
  assert.equal(withWrittenNote[1].id, "answer-Q001:written");
  assert.deepEqual(withWrittenNote[1].sourceQuestionIds, ["Q001"]);
  assert.deepEqual(withWrittenNote[1].sourceAnswerIds, []);
  assert.equal(withWrittenNote[1].writtenResponseId, "answer-Q001:written");
});

test("repeats selected answers without treating confirmations or declines as evidence", () => {
  const manyThings = counsellingQuestionById
    .get("Q005")
    .options.find((option) => option.label === "Many things");
  const yes = counsellingQuestionById
    .get("Q008")
    .options.find((option) => option.label === "Yes");
  const preferNotToSay = counsellingQuestionById
    .get("Q008")
    .options.find((option) => option.label === "I prefer not to say");

  assert.equal(manyThings.kind, undefined);
  assert.equal(yes.kind, "confirmation");
  assert.equal(preferNotToSay.kind, "declined");
  const insights = deriveStudentInsights(session({
    answers: [
      answer("Q005", ["many-things"]),
      answer("Q008", ["yes"]),
      answer("Q008", ["i-prefer-not-to-say"], "skip"),
    ],
  }));
  assert.equal(insights.length, 3);
  assert.equal(
    insights[0].value,
    `For “${counsellingQuestionById.get("Q005").text}”, you selected: Many things.`,
  );
  assert.equal(
    insights[1].value,
    `For “${counsellingQuestionById.get("Q008").text}”, you selected: Yes.`,
  );
  assert.equal(
    insights[2].value,
    `For “${counsellingQuestionById.get("Q008").text}”, you selected: I prefer not to say.`,
  );
  const notYet = {
    ...answer("T02", ["not-yet"]),
  };
  assert.equal(
    deriveStudentInsights(session({ answers: [notYet] }))[0].value,
    `For “${counsellingQuestionById.get("T02").text}”, you selected: Not yet.`,
  );
});

test("continues only from the saved current question, without forcing an optional prompt", () => {
  const saved = session({
    status: "completed",
    currentQuestionId: "Q005",
    questionPath: ["Q001", "Q005"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q005"],
  });

  test("records an early finish separately and clears it when the session is reopened", () => {
    let persisted;
    globalThis.window = {
      sessionStorage: {
        setItem: (_key, value) => {
          persisted = JSON.parse(value);
        },
      },
      dispatchEvent: () => true,
    };

    try {
      const finished = setCounsellingStatus(session(), "completed", "finished_early");
      assert.equal(finished.ok, true);
      assert.equal(finished.session.completionReason, "finished_early");
      assert.equal(persisted.completionReason, "finished_early");

      const reopened = continueCounselling(finished.session);
      assert.equal(reopened.ok, true);
      assert.equal(reopened.session.completionReason, undefined);
      assert.equal(persisted.completionReason, undefined);
    } finally {
      delete globalThis.window;
    }
  });
  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };

  try {
    const result = continueCounselling(saved);
    assert.equal(result.ok, true);
    assert.equal(result.session.currentQuestionId, "Q005");
    assert.equal(result.session.status, "active");
    assert.equal(result.session.askedQuestionIds.includes("Q009"), false);
    assert.equal(persisted.currentQuestionId, "Q005");
  } finally {
    delete globalThis.window;
  }

  assert.deepEqual(
    continueCounselling(session({ status: "completed", currentQuestionId: null })),
    { ok: false, reason: "unavailable" },
  );
});

test("editing an opening interest confirms and removes its dependent motivation response", () => {
  const saved = session({
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["creating-something"]),
    ],
  });
  const input = {
    optionIds: ["sports-or-physical-activity"],
    originalText: "",
  };
  assert.deepEqual(
    getDependentAnswerEditImpact(saved, "answer-Q001", input).map((item) => item.questionId),
    ["Q002"],
  );
  assert.deepEqual(editCounsellingAnswer(saved, "answer-Q001", input), {
    ok: false,
    reason: "dependent_answers",
  });

  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };

  try {
    const result = editCounsellingAnswer(saved, "answer-Q001", input, true);
    assert.equal(result.ok, true);
    assert.equal(result.session.currentQuestionId, "Q002");
    assert.deepEqual(result.session.answers.map((item) => item.questionId), ["Q001"]);
    assert.equal(result.session.askedQuestionIds.includes("Q002"), false);
    assert.equal(persisted.currentQuestionId, "Q002");
  } finally {
    delete globalThis.window;
  }
});

test("editing a topic requires confirmation before removing dependent answers and reroutes", () => {
  const saved = session({
    currentQuestionId: "Q005",
    questionPath: ["Q001", "Q002", "T02", "Q005"],
    pathIndex: 3,
    askedQuestionIds: ["Q001", "Q002", "T02", "Q005"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["creating-something"]),
      answer("T02", ["yes"]),
      answer("Q005", ["stories-or-media"]),
    ],
  });
  const input = {
    optionIds: ["sports-or-physical-activity"],
    originalText: "",
  };
  assert.deepEqual(
    getDependentAnswerEditImpact(saved, "answer-Q001", input).map((item) => item.questionId),
    ["Q002", "T02"],
  );
  assert.deepEqual(editCounsellingAnswer(saved, "answer-Q001", input), {
    ok: false,
    reason: "dependent_answers",
  });

  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };
  try {
    const result = editCounsellingAnswer(saved, "answer-Q001", input, true);
    assert.equal(result.ok, true);
    assert.equal(result.session.currentQuestionId, "Q002");
    assert.deepEqual(
      result.session.answers.map((item) => item.questionId),
      ["Q001", "Q005"],
    );
    assert.equal(result.session.askedQuestionIds.includes("Q002"), false);
    assert.equal(result.session.askedQuestionIds.includes("T02"), false);
    assert.equal(result.session.skippedQuestionIds.includes("T02"), false);
    assert.equal(persisted.currentQuestionId, "Q002");
  } finally {
    delete globalThis.window;
  }
});

test("starting a new conversation resets the saved flow with a fresh session id", () => {
  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };
  try {
    const result = startNewCounselling();
    assert.equal(result.ok, true);
    assert.equal(result.session.currentQuestionId, "Q001");
    assert.deepEqual(result.session.answers, []);
    assert.deepEqual(result.session.askedQuestionIds, ["Q001"]);
    assert.notEqual(result.session.id, "test-session");
    assert.equal(persisted.id, result.session.id);
  } finally {
    delete globalThis.window;
  }
});

test("editing Q005 removes only obsolete curiosity-branch answers and selects a new branch", () => {
  const saved = session({
    currentQuestionId: "S02",
    questionPath: ["Q001", "Q005", "S01", "S02"],
    pathIndex: 3,
    askedQuestionIds: ["Q001", "Q005", "S01", "S02"],
    answers: [
      answer("Q001", ["reading-learning-or-discovering"]),
      answer("Q005", ["the-human-body"]),
      answer("S01", ["yes"]),
    ],
  });
  const input = {
    optionIds: ["computers-or-digital-technology"],
    originalText: "",
  };
  assert.deepEqual(
    getDependentAnswerEditImpact(saved, "answer-Q005", input).map((item) => item.questionId),
    ["S01"],
  );
  assert.deepEqual(editCounsellingAnswer(saved, "answer-Q005", input), {
    ok: false,
    reason: "dependent_answers",
  });

  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };
  try {
    const result = editCounsellingAnswer(saved, "answer-Q005", input, true);
    assert.equal(result.ok, true);
    assert.equal(result.session.currentQuestionId, "T01");
    assert.deepEqual(
      result.session.answers.map((item) => item.questionId),
      ["Q001", "Q005"],
    );
    assert.equal(result.session.askedQuestionIds.includes("S01"), false);
    assert.equal(persisted.currentQuestionId, "T01");
  } finally {
    delete globalThis.window;
  }
});

test("asks only one active follow-up per main question and avoids repeated topics", () => {
  const multiInterest = session({
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [
      answer("Q001", ["using-computers-or-technology", "drawing-designing-or-making-things"]),
      answer("Q002", ["creating-something"]),
    ],
  });
  assert.equal(chooseNextAction(multiInterest, "Q002").questionId, "A01");

  const afterRetiredTechnologyQuestion = {
    ...multiInterest,
    currentQuestionId: "A01",
    questionPath: ["Q001", "Q002", "A01"],
    pathIndex: 2,
    askedQuestionIds: ["Q001", "Q002", "A01"],
    answers: [...multiInterest.answers, answer("A01", ["drawing-or-visual-art"])],
  };
  assert.equal(chooseNextAction(afterRetiredTechnologyQuestion, "A01").questionId, "Q005");

  const afterCreative = {
    ...afterRetiredTechnologyQuestion,
    currentQuestionId: "Q005",
    questionPath: ["Q001", "Q002", "A01", "Q005"],
    pathIndex: 3,
    askedQuestionIds: ["Q001", "Q002", "A01", "Q005"],
    answers: [
      ...afterRetiredTechnologyQuestion.answers,
      answer("Q005", ["technology-or-machines", "design-or-creation"]),
    ],
  };
  assert.equal(chooseNextAction(afterCreative, "Q005").questionId, "T01");
});

test("follows distinct topics selected in the curiosity question", () => {
  const current = session({
    currentQuestionId: "Q005",
    questionPath: ["Q001", "Q005"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q005"],
    answers: [answer("Q005", ["business-or-money", "nature-or-the-world"])],
  });
  assert.equal(chooseNextAction(current, "Q005").questionId, "B01");

  const afterBusiness = {
    ...current,
    currentQuestionId: "B01",
    questionPath: ["Q001", "Q005", "B01"],
    pathIndex: 2,
    askedQuestionIds: ["Q001", "Q005", "B01"],
    answers: [...current.answers, answer("B01", ["business-or-money"])],
  };
  assert.deepEqual(chooseNextAction(afterBusiness, "B01"), {
    action: "complete",
    reasonCode: "relevant_topics_explored",
  });
});

test("preserves free text without interpreting it and asks at most one clarification", () => {
  globalThis.window = {
    sessionStorage: { setItem: () => {} },
    dispatchEvent: () => true,
  };
  try {
    const opening = submitCounsellingAnswer(session(), {
      optionIds: [],
      originalText: "I like building little robots.",
    });
    assert.equal(opening.ok, true);
    assert.equal(opening.session.currentQuestionId, "Q002");
    assert.equal(opening.session.answers[0].originalText, "I like building little robots.");
    assert.equal(opening.session.answers[0].interpretationStatus, "unrecognised");

    const motivation = submitCounsellingAnswer(opening.session, {
      optionIds: ["understanding-how-things-work"],
      originalText: "",
    });
    assert.equal(motivation.ok, true);
    assert.equal(motivation.session.currentQuestionId, "Q005");
    assert.deepEqual(motivation.session.answers.map(({ questionId }) => questionId), ["Q001", "Q002"]);

    const unlisted = submitCounsellingAnswer(session(), {
      optionIds: ["something-else"],
      originalText: "",
    });
    assert.equal(unlisted.ok, true);
    assert.equal(unlisted.session.currentQuestionId, "Q003");
    const clarification = submitCounsellingAnswer(unlisted.session, {
      optionIds: [],
      originalText: "I make them from spare parts.",
    });
    assert.equal(clarification.ok, true);
    assert.equal(clarification.session.currentQuestionId, "Q002");
    assert.equal(
      clarification.session.answers[1].originalText,
      "I make them from spare parts.",
    );
  } finally {
    delete globalThis.window;
  }
});

test("requires confirmation before skipping a saved answer with dependent responses", () => {
  const saved = session({
    currentQuestionId: "Q001",
    questionPath: ["Q001", "Q002", "T02", "Q005"],
    pathIndex: 0,
    askedQuestionIds: ["Q001", "Q002", "T02", "Q005"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["creating-something"]),
      answer("T02", ["yes"]),
      answer("Q005", ["nature-or-the-world"]),
    ],
  });
  assert.deepEqual(
    getDependentAnswerRemovalImpact(saved, "answer-Q001").map((item) => item.questionId),
    ["Q002", "T02"],
  );
  assert.deepEqual(skipCurrentQuestion(saved), {
    ok: false,
    reason: "dependent_answers",
  });

  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };
  try {
    const result = skipCurrentQuestion(saved, true);
    assert.equal(result.ok, true);
    assert.deepEqual(result.session.answers.map((item) => item.questionId), ["Q005"]);
    assert.deepEqual(result.session.skippedQuestionIds, ["Q001"]);
    assert.equal(result.session.currentQuestionId, "N01");
    assert.deepEqual(persisted.answers.map((item) => item.questionId), ["Q005"]);
  } finally {
    delete globalThis.window;
  }
});

test("removes dependent answers only after confirmation and preserves unrelated responses", () => {
  const saved = session({
    currentQuestionId: null,
    status: "completed",
    questionPath: ["Q001", "Q002", "T02", "Q005", "N01"],
    pathIndex: 4,
    askedQuestionIds: ["Q001", "Q002", "T02", "Q005", "N01"],
    answers: [
      answer("Q001", ["using-computers-or-technology"]),
      answer("Q002", ["creating-something"]),
      answer("T02", ["yes"]),
      answer("Q005", ["nature-or-the-world"]),
      answer("N01", ["plants"]),
    ],
  });
  assert.deepEqual(removeCounsellingAnswer(saved, "answer-Q001"), {
    ok: false,
    reason: "dependent_answers",
  });
  assert.deepEqual(
    getDependentAnswerRemovalImpact(saved, "answer-Q001").map((item) => item.questionId),
    ["Q002", "T02"],
  );

  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };
  try {
    const result = removeCounsellingAnswer(saved, "answer-Q001", true);
    assert.equal(result.ok, true);
    assert.deepEqual(result.session.answers.map((item) => item.questionId), ["Q005", "N01"]);
    assert.equal(persisted.answers.length, 2);
  } finally {
    delete globalThis.window;
  }
});

test("clears all answers and resets the active conversation to its opening question", () => {
  const saved = session({
    status: "completed",
    currentQuestionId: null,
    questionPath: ["Q001", "Q005"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q005"],
    skippedQuestionIds: ["Q002"],
    answers: [answer("Q001", ["using-computers-or-technology"])],
  });
  let persisted;
  globalThis.window = {
    sessionStorage: {
      setItem: (_key, value) => {
        persisted = JSON.parse(value);
      },
    },
    dispatchEvent: () => true,
  };
  try {
    const result = clearCounsellingAnswers(saved);
    assert.equal(result.ok, true);
    assert.equal(result.session.status, "active");
    assert.equal(result.session.currentQuestionId, "Q001");
    assert.deepEqual(result.session.questionPath, ["Q001"]);
    assert.deepEqual(result.session.answers, []);
    assert.deepEqual(result.session.skippedQuestionIds, []);
    assert.equal(persisted.answers.length, 0);
  } finally {
    delete globalThis.window;
  }
});

test("Explore possibilities show direct field links with their exact question and answer", () => {
  const suggestions = getCounsellingFieldSuggestions([
    answer("Q001", ["using-computers-or-technology"]),
    {
      ...answer("Q005", ["business-or-money"]),
      originalText: "I want to work with people.",
    },
  ]);
  assert.deepEqual(
    suggestions.map(({ field }) => field.name),
    ["Technology", "Business & Management"],
  );
  assert.deepEqual(suggestions[0].evidence, [
    {
      answerId: "answer-Q001",
      mappingVersion: 2,
      questionText: "What do you usually enjoy doing when you have some free time?",
      selectedAnswers: ["Using computers or technology"],
      relationship: "direct",
      explanation: "You mentioned using computers or technology. Technology explores computers, software and digital systems.",
    },
  ]);
  assert.deepEqual(suggestions[1].evidence, [
    {
      answerId: "answer-Q005",
      mappingVersion: 2,
      questionText: "When you come across something new, what kinds of things usually make you curious?",
      selectedAnswers: ["Business or money"],
      relationship: "direct",
      explanation: "You mentioned business or money. Business & Management explores how organisations manage resources, people and services.",
    },
  ]);
  assert.deepEqual(suggestions[1].writtenEvidence, [
    {
      id: "answer-Q005:written",
      questionId: "Q005",
      questionText: counsellingQuestionById.get("Q005").text,
      text: "I want to work with people.",
    },
  ]);
  assert.deepEqual(suggestions[0].writtenEvidence, []);
});

test("Explore groups independent answers that point to the same field", () => {
  const suggestions = getCounsellingFieldSuggestions([
    answer("Q001", ["drawing-designing-or-making-things"]),
    answer("Q005", ["design-or-creative-expression"]),
  ]);
  assert.deepEqual(suggestions.map(({ field }) => field.name), ["Arts & Design"]);
  assert.deepEqual(
    suggestions[0].evidence.map(({ questionText, selectedAnswers, relationship }) => ({
      questionText,
      selectedAnswers,
      relationship,
    })),
    [
      {
        questionText: "What do you usually enjoy doing when you have some free time?",
        selectedAnswers: ["Drawing, designing or making things"],
        relationship: "direct",
      },
      {
        questionText: "When you come across something new, what kinds of things usually make you curious?",
        selectedAnswers: ["Design or creative expression"],
        relationship: "direct",
      },
    ],
  );
});

test("Explore retains every direct possibility without ranking or truncation", () => {
  const suggestions = getCounsellingFieldSuggestions([
    answer("Q001", ["using-computers-or-technology"]),
    answer("Q005", [
      "machines-structures-or-how-things-are-built",
      "business-or-money",
      "rules-rights-or-justice",
    ]),
  ]);
  assert.deepEqual(
    suggestions.map(({ field }) => field.name),
    ["Technology", "Engineering", "Business & Management", "Law"],
  );
});

test("Explore uses a Q006 answer as direct starting-point evidence", () => {
  const suggestions = getCounsellingFieldSuggestions([
    answer("Q006", ["learn-about-people"]),
  ]);
  assert.deepEqual(suggestions.map(({ field }) => field.name), ["Social Sciences"]);
  assert.deepEqual(suggestions[0].evidence, [
    {
      answerId: "answer-Q006",
      mappingVersion: 2,
      questionText: counsellingQuestionById.get("Q006").text,
      selectedAnswers: ["Learn about people"],
      relationship: "direct",
      explanation: "You mentioned learn about people. Social Sciences explores how people live, interact and shape society.",
    },
  ]);
});

test("all 13 fields have an explicit direct-answer route", () => {
  const directFieldIds = new Set(
    counsellingPossibilityMappings
      .filter(({ relationship }) => relationship === "direct")
      .map(({ fieldId }) => fieldId),
  );
  assert.equal(directFieldIds.size, 13);
  assert.equal(counsellingPossibilityMappingVersion, 2);
  for (const { questionId, answerId, mappingVersion } of counsellingPossibilityMappings) {
    assert.equal(mappingVersion, counsellingPossibilityMappingVersion);
    assert.equal(
      counsellingQuestionById.get(questionId)?.options?.some(({ id }) => id === answerId),
      true,
      `Unknown mapped answer ${questionId}/${answerId}`,
    );
  }

  const directAnswers = counsellingPossibilityMappings
    .filter(({ relationship }) => relationship === "direct")
    .map(({ questionId, answerId }) => answer(questionId, [answerId]));
  const suggestedFieldIds = new Set(
    getCounsellingFieldSuggestions(directAnswers).map(({ field }) => field.id),
  );
  assert.deepEqual(suggestedFieldIds, directFieldIds);
});

test("ambiguous body and nature topics require their specific follow-up answers", () => {
  assert.deepEqual(
    getCounsellingFieldSuggestions([answer("Q005", ["the-human-body"])]),
    [],
  );
  assert.deepEqual(
    getCounsellingFieldSuggestions([answer("Q005", ["nature-or-the-natural-world"])]),
    [],
  );

  const health = getCounsellingFieldSuggestions([
    answer("Q005", ["the-human-body"]),
    answer("S01", ["health-and-illness"]),
  ]);
  assert.deepEqual(health.map(({ field }) => field.name), ["Healthcare"]);
  assert.deepEqual(
    health[0].evidence.map(({ relationship, selectedAnswers }) => ({
      relationship,
      selectedAnswers,
    })),
    [
      { relationship: "requires_clarification", selectedAnswers: ["The human body"] },
      { relationship: "direct", selectedAnswers: ["Health and illness"] },
    ],
  );

  const nature = getCounsellingFieldSuggestions([
    answer("Q005", ["nature-or-the-natural-world"]),
    answer("N01", ["plants"]),
  ]);
  assert.deepEqual(nature.map(({ field }) => field.name), ["Agriculture & Environment"]);
  assert.deepEqual(
    nature[0].evidence.map(({ relationship }) => relationship),
    ["requires_clarification", "direct"],
  );
});

test("supporting answers add context only to an explicitly introduced field", () => {
  const contextOnly = getCounsellingFieldSuggestions([
    answer("Q002", ["creating-something"], "answered"),
  ]);
  assert.deepEqual(contextOnly, []);

  const supported = getCounsellingFieldSuggestions([
    {
      ...answer("Q001", ["using-computers-or-technology"]),
      id: "opening-answer",
    },
    {
      ...answer("Q002", ["creating-something"]),
      id: "motivation-answer",
      contextOptionId: "using-computers-or-technology",
    },
    answer("Q006", ["solve-a-real-world-problem"]),
    answer("Q001", ["games"]),
  ]);
  assert.deepEqual(supported.map(({ field }) => field.name), ["Technology"]);
  assert.deepEqual(
    supported[0].evidence.map(({ answerId, relationship, selectedAnswers }) => ({
      answerId,
      relationship,
      selectedAnswers,
    })),
    [
      {
        answerId: "opening-answer",
        relationship: "direct",
        selectedAnswers: ["Using computers or technology"],
      },
      {
        answerId: "motivation-answer",
        relationship: "supporting",
        selectedAnswers: ["Creating something"],
      },
    ],
  );
});

test("unsure, skipped, written-only and unrelated answers do not introduce fields", () => {
  for (const response of [
    answer("Q005", ["not-sure"], "unsure"),
    answer("Q001", ["games"]),
    answer("Q001", ["sports-or-physical-activity"]),
    {
      ...answer("Q001", []),
      originalText: "I build computers and teach people.",
    },
    answer("Q006", ["solve-a-real-world-problem"]),
  ]) {
    assert.deepEqual(
      getCounsellingFieldSuggestions([response]),
      [],
    );
  }
});

test("guided Explore starting points appear only after a completed session", () => {
  const answers = [answer("Q001", ["using-computers-or-technology"])];

  assert.equal(
    getGuidedExploreStartingPoints({
      status: "saved",
      session: session({ status: "active", answers }),
    }),
    null,
  );
  assert.equal(
    getGuidedExploreStartingPoints({
      status: "saved",
      session: session({ status: "paused", answers }),
    }),
    null,
  );
  assert.deepEqual(
    getGuidedExploreStartingPoints({
      status: "saved",
      session: session({ status: "completed", answers }),
    }).map(({ field }) => field.name),
    ["Technology"],
  );
  assert.equal(getGuidedExploreStartingPoints({ status: "empty" }), null);
  assert.deepEqual(
    getGuidedExploreStartingPoints({
      status: "saved",
      session: session({
        status: "completed",
        answers: [answer("Q001", [], "answered", "unrecognised")],
      }),
    }),
    [],
  );
  assert.deepEqual(
    getGuidedExploreStartingPoints({
      status: "saved",
      session: session({
        status: "completed",
        answers: [answer("Q001", ["using-computers-or-technology"], "skip")],
      }),
    }),
    [],
  );
});
