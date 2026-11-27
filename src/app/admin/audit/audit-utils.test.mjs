import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "../../../db/schema/catalog") return {};
  if (request === "./audit-preview-data") {
    return { auditPreviewEvents: events };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const events = [
  {
    id: "event-older",
    createdAt: "2026-11-26T09:00:00+05:30",
    actorName: "Admin",
    action: "submit",
    kind: "exam",
    itemId: "CB-EXAM-003",
    itemTitle: "NEET",
    recordHref: "/admin/catalogue/examinations/CB-EXAM-003",
    revisionHref: "/admin/catalogue/examinations/CB-EXAM-003?tab=revisions",
  },
  {
    id: "event-newer",
    createdAt: "2026-11-27T09:00:00+05:30",
    actorName: "Reviewer",
    action: "approve",
    kind: "course_offering",
    itemId: "CB-OFFER-001",
    itemTitle: "BCA offering",
    recordHref: "/admin/catalogue/course-offerings/CB-OFFER-001",
    revisionHref: "/admin/catalogue/course-offerings/CB-OFFER-001?tab=revisions",
  },
  {
    id: "event-tie",
    createdAt: "2026-11-27T09:00:00+05:30",
    actorName: "Admin",
    action: "publish",
    kind: "institution",
    itemId: "CB-INST-001",
    itemTitle: "Assam Down Town University",
    recordHref: "/admin/catalogue/institutions/CB-INST-001",
    revisionHref: "/admin/catalogue/institutions/CB-INST-001?tab=revisions",
  },
];

const { filterAuditEvents, getAuditPageCount, paginateAuditEvents } = require("./audit-utils.ts");
Module._load = originalLoad;

const emptyFilters = {
  query: "",
  action: "all",
  actor: "all",
  kind: "all",
  fromDate: "",
  toDate: "",
};

test("audit filters compose record, actor, action, kind and date criteria", () => {
  const filtered = filterAuditEvents(events, {
    ...emptyFilters,
    query: "bca",
    action: "approve",
    actor: "Reviewer",
    kind: "course_offering",
    fromDate: "2026-11-27",
    toDate: "2026-11-27",
  });

  assert.deepEqual(filtered.map(({ id }) => id), ["event-newer"]);
  assert.deepEqual(filterAuditEvents(events, { ...emptyFilters, query: "unknown" }), []);
});

test("audit events sort newest first with deterministic ID tie-breaking", () => {
  assert.deepEqual(
    filterAuditEvents(events, emptyFilters).map(({ id }) => id),
    ["event-tie", "event-newer", "event-older"],
  );
});

test("pagination reports at least one page and returns the requested slice", () => {
  assert.equal(getAuditPageCount(0, 5), 1);
  assert.equal(getAuditPageCount(6, 5), 2);
  assert.deepEqual(
    paginateAuditEvents(events, 2, 2).map(({ id }) => id),
    ["event-tie"],
  );
});
