import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { readFileSync } = require("node:fs");
    const output = ts.transpile(readFileSync(filename, "utf8"), {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    });
    module._compile(output, filename);
  };
}
const { resolveItem } = require("./saved/saved-items-page.tsx");
const { resolveHistoryItem } = require("./history/history-resolver.ts");

const pathways = [];
const exams = [{ id: "new-exam-id", name: "Example Exam", purpose: "Admission assessment." }];
const schemes = [{ id: "new-scholarship-id", name: "Example Scholarship", purpose: "Student assistance." }];

test("Saved resolves any reader-loaded Examination and Scholarship ID to its dedicated detail route", () => {
  const exam = resolveItem({ type: "examination", id: "new-exam-id", savedAt: 1, context: { stage: "class-12", fieldId: "engineering" } }, pathways, exams, schemes);
  assert.equal(exam.title, "Example Exam");
  assert.equal(exam.href, "/explore/examinations/new-exam-id?stage=class-12");
  const scholarship = resolveItem({ type: "scholarship", id: "new-scholarship-id", savedAt: 2 }, pathways, exams, schemes);
  assert.equal(scholarship.title, "Example Scholarship");
  assert.equal(scholarship.href, "/explore/scholarships/new-scholarship-id");
});

test("History resolves any reader-loaded Examination and Scholarship ID with context-preserving detail links", () => {
  const exam = resolveHistoryItem({ type: "examination", id: "new-exam-id", lastVisitedAt: 1, visitCount: 1, context: { stage: "class-12", fieldId: "engineering" } }, pathways, exams, schemes);
  assert.equal(exam.title, "Example Exam");
  assert.equal(exam.href, "/explore/examinations/new-exam-id?stage=class-12&field=engineering");
  const scholarship = resolveHistoryItem({ type: "scholarship", id: "new-scholarship-id", lastVisitedAt: 2, visitCount: 1, context: { stage: "class-10", fieldId: "technology" } }, pathways, exams, schemes);
  assert.equal(scholarship.title, "Example Scholarship");
  assert.equal(scholarship.href, "/explore/scholarships/new-scholarship-id?stage=class-10&field=technology");
});
