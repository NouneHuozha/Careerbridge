import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
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

const {
  filterCatalogueListingRecords,
  getCatalogueListingPageCount,
  paginateCatalogueListingRecords,
} = require("./listing-utils.ts");

const records = [
  {
    id: "CB-COURSE-001",
    title: "Bachelor of Computer Application",
    aliases: ["bca"],
    updatedAt: "2026-11-25T00:00:00.000Z",
    publicationStatus: "published",
    verificationStatus: "verified",
    details: [],
    filterValues: {
      field: "Computer science",
      stages: ["class-12"],
      qualification: "Degree",
      publicationStatus: "published",
      verificationStatus: "verified",
    },
  },
  {
    id: "CB-COURSE-002",
    title: "Bachelor of Science",
    aliases: ["bsc"],
    updatedAt: "2026-11-26T00:00:00.000Z",
    publicationStatus: "in_review",
    verificationStatus: "pending_review",
    details: [],
    filterValues: {
      field: "Science",
      stages: ["class-10", "class-12"],
      qualification: "Degree",
      publicationStatus: "in_review",
      verificationStatus: "pending_review",
    },
  },
  {
    id: "CB-COURSE-003",
    title: "Diploma in Business",
    aliases: ["dib"],
    updatedAt: "2026-11-24T00:00:00.000Z",
    publicationStatus: "draft",
    verificationStatus: "unverified",
    details: [],
    filterValues: {
      field: "Business",
      stages: ["class-10"],
      qualification: "Diploma",
      publicationStatus: "draft",
      verificationStatus: "unverified",
    },
  },
];

test("search and schema-backed filters narrow preview records", () => {
  assert.deepEqual(
    filterCatalogueListingRecords(records, "bca", {}, "updated").map(({ id }) => id),
    ["CB-COURSE-001"],
  );
  assert.deepEqual(
    filterCatalogueListingRecords(
      records,
      "",
      { publicationStatus: "in_review", stages: "class-10" },
      "updated",
    ).map(({ id }) => id),
    ["CB-COURSE-002"],
  );
});

test("sort order and pagination keep stable result boundaries", () => {
  const sortedByName = filterCatalogueListingRecords(records, "", {}, "name");
  assert.deepEqual(sortedByName.map(({ id }) => id), [
    "CB-COURSE-001",
    "CB-COURSE-002",
    "CB-COURSE-003",
  ]);
  assert.equal(getCatalogueListingPageCount(sortedByName.length, 2), 2);
  assert.deepEqual(
    paginateCatalogueListingRecords(sortedByName, 2, 2).map(({ id }) => id),
    ["CB-COURSE-003"],
  );
});
