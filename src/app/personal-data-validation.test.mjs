import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const ts = loadModule("typescript");
loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  const source = readFileSync(filename, "utf8");
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const {
  emptyPersonalData,
  isPersonalDataMutation,
  isPersonalDataSnapshot,
} = loadModule("./personal-data-validation.ts");
const { allCounsellingQuestions } = loadModule("./counselling/counselling-data.ts");

test("validates account snapshots and guest-data transfer mutations", () => {
  const data = {
    ...emptyPersonalData(),
    savedItems: [{ type: "course", id: "bca", savedAt: 1 }],
  };

  assert.equal(isPersonalDataSnapshot(data), true);
  assert.equal(isPersonalDataMutation({ type: "migration.keep", data }), true);
});

test("rejects malformed personal data at the account mutation boundary", () => {
  assert.equal(
    isPersonalDataMutation({
      type: "saved.add",
      item: { type: "unknown", id: "item", savedAt: 1 },
    }),
    false,
  );
  assert.equal(
    isPersonalDataMutation({
      type: "progress.educationStage",
      value: "class-11",
    }),
    false,
  );
});

test("allows valid free-text, unsure, skipped, and early-finish counselling answers", () => {
  const baseSession = {
    version: 1,
    questionBankVersion: 1,
    id: "guided-valid-edges",
    status: "paused",
    currentQuestionId: "Q003",
    questionPath: ["Q001", "Q003", "Q008"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q003", "Q008"],
    skippedQuestionIds: [],
    answers: [
      {
        id: "q1-unsure",
        questionId: "Q001",
        optionIds: ["i-m-not-sure"],
        originalText: "",
        interpretationStatus: "clear",
        responseState: "unsure",
        createdAt: "2026-03-01T10:00:00.000Z",
      },
      {
        id: "q3-text",
        questionId: "Q003",
        optionIds: [],
        originalText: "I enjoy building small electronics projects.",
        interpretationStatus: "unrecognised",
        responseState: "answered",
        createdAt: "2026-03-01T10:01:00.000Z",
      },
      {
        id: "q8-declined",
        questionId: "Q008",
        optionIds: ["i-prefer-not-to-say"],
        originalText: "",
        interpretationStatus: "clear",
        responseState: "skip",
        createdAt: "2026-03-01T10:02:00.000Z",
      },
    ],
    updatedAt: "2026-03-01T10:02:00.000Z",
  };
  assert.equal(isPersonalDataSnapshot({
    ...emptyPersonalData(),
    counsellingSession: baseSession,
  }), true);

  assert.equal(isPersonalDataSnapshot({
    ...emptyPersonalData(),
    counsellingSession: {
      ...baseSession,
      status: "completed",
      completionReason: "finished_early",
      currentQuestionId: null,
      pathIndex: 2,
    },
  }), true);
});

test("rejects duplicate options, duplicate answers, and invalid answer context", () => {
  const makeSession = (answerOverrides = {}) => ({
    version: 1,
    questionBankVersion: 1,
    id: "guided-invalid-edges",
    status: "active",
    currentQuestionId: "Q002",
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    skippedQuestionIds: [],
    answers: [
      {
        id: "q1-answer",
        questionId: "Q001",
        optionIds: ["using-computers-or-technology"],
        originalText: "",
        interpretationStatus: "clear",
        responseState: "answered",
        createdAt: "2026-03-01T10:00:00.000Z",
      },
      {
        id: "q2-answer",
        questionId: "Q002",
        optionIds: ["creating-something"],
        originalText: "",
        interpretationStatus: "clear",
        responseState: "answered",
        contextOptionId: "using-computers-or-technology",
        createdAt: "2026-03-01T10:01:00.000Z",
        ...answerOverrides,
      },
    ],
    updatedAt: "2026-03-01T10:01:00.000Z",
  });

  assert.equal(isPersonalDataSnapshot({
    ...emptyPersonalData(),
    counsellingSession: makeSession({ optionIds: ["creating-something", "creating-something"] }),
  }), false);
  assert.equal(isPersonalDataSnapshot({
    ...emptyPersonalData(),
    counsellingSession: makeSession({ contextOptionId: "sports-or-physical-activity" }),
  }), false);

  const duplicateAnswers = makeSession();
  duplicateAnswers.answers.push({ ...duplicateAnswers.answers[1], id: "duplicate-q2" });
  assert.equal(isPersonalDataSnapshot({
    ...emptyPersonalData(),
    counsellingSession: duplicateAnswers,
  }), false);
});

test("enforces exclusive selections for Q001 and Q002 while allowing exclusive-only answers", () => {
  const q1 = allCounsellingQuestions.find(({ id }) => id === "Q001");
  const q2 = allCounsellingQuestions.find(({ id }) => id === "Q002");
  const q1Exclusive = q1.options.find(({ exclusive }) => exclusive);
  const q2Exclusive = q2.options.find(({ exclusive }) => exclusive);
  const q1Regular = q1.options.find(({ exclusive, enabled }) =>
    !exclusive && enabled !== false,
  );
  const q2Regular = q2.options.find(({ exclusive, enabled }) =>
    !exclusive && enabled !== false,
  );

  const makeAnswer = (questionId, option, overrides = {}) => ({
    id: `${questionId}-${option.id}`,
    questionId,
    optionIds: [option.id],
    originalText: "",
    interpretationStatus: "clear",
    responseState: "unsure",
    createdAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  });
  const makeSession = (
    questionId,
    optionIds = questionId === "Q001" ? [q1Exclusive.id] : [q2Exclusive.id],
  ) => {
    const q1Answer = makeAnswer(
      "Q001",
      q1.options.find(({ exclusive, enabled }) => !exclusive && enabled !== false),
      { responseState: "answered" },
    );
    const answers = [q1Answer];
    if (questionId === "Q001") {
      answers[0] = makeAnswer("Q001", q1Exclusive, {
        optionIds,
      });
    } else {
      answers.push(makeAnswer("Q002", q2Exclusive, {
        optionIds,
        contextOptionId: q1Answer.optionIds[0],
      }));
    }
    return {
      version: 1,
      questionBankVersion: 1,
      id: `exclusive-${questionId}`,
      status: "paused",
      currentQuestionId: questionId,
      questionPath: questionId === "Q001" ? ["Q001"] : ["Q001", "Q002"],
      pathIndex: questionId === "Q001" ? 0 : 1,
      askedQuestionIds: questionId === "Q001" ? ["Q001"] : ["Q001", "Q002"],
      skippedQuestionIds: [],
      answers,
      updatedAt: "2026-03-01T10:00:00.000Z",
    };
  };
  const isValidSession = (counsellingSession) =>
    isPersonalDataSnapshot({ ...emptyPersonalData(), counsellingSession });

  assert.equal(isValidSession(makeSession("Q001")), true);
  assert.equal(isValidSession(makeSession("Q001", [q1Exclusive.id, q1Regular.id])), false);
  assert.equal(isValidSession(makeSession("Q002")), true);
  assert.equal(isValidSession(makeSession("Q002", [q2Exclusive.id, q2Regular.id])), false);
});
