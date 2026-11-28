import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { readFileSync } = require("node:fs");
    const output = ts.transpile(readFileSync(filename, "utf8"), {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    });
    module._compile(output, filename);
  };
}

let catalogueData;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "./catalogue-overview-data" && parent?.filename.endsWith("catalogue\\page.tsx")) {
    return { async getCatalogueOverviewData() {
      if (catalogueData instanceof Error) throw catalogueData;
      return catalogueData;
    } };
  }
  if (request === "../admin-date" && parent?.filename.endsWith("catalogue\\page.tsx")) {
    return { AdminDate: ({ value }) => ({ type: "time", props: { children: String(value) } }) };
  }
  if (request === "./retry-button" && parent?.filename.endsWith("catalogue\\page.tsx")) {
    return { CatalogueRetryButton: () => ({ type: "button", props: { children: "Retry" } }) };
  }
  if (request === "next/link") {
    return { __esModule: true, default: ({ children, ...props }) => ({ type: "a", props: { ...props, children } }) };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const CataloguePage = require("./page.tsx").default;
Module._load = originalLoad;

async function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return (await Promise.all(node.map(textContent))).join("");
  if (node && typeof node.then === "function") return textContent(await node);
  if (node && typeof node.type === "function") {
    return textContent(await node.type(node.props));
  }
  if (node && typeof node === "object" && "props" in node) {
    return textContent(node.props.children);
  }
  return "";
}

function overviewData({ recentRecords = [] } = {}) {
  return {
    metrics: {
      totalItems: 145,
      publishedItems: 20,
      inReviewItems: 4,
      withoutPublishedVersion: 125,
    },
    categories: [
      { slug: "fields", label: "Fields", description: "Taxonomy", href: "/admin/catalogue/fields", count: 13 },
      { slug: "courses", label: "Courses", description: "Courses and offerings", href: "/admin/catalogue/courses", count: 83 },
      { slug: "institutions", label: "Institutions", description: "Institutions and campuses", href: "/admin/catalogue/institutions", count: 23 },
      { slug: "pathways", label: "Pathways", description: "Routes", href: "/admin/catalogue/pathways", count: 11 },
      { slug: "examinations", label: "Examinations", description: "Exams", href: "/admin/catalogue/examinations", count: 7 },
      { slug: "scholarships", label: "Scholarships", description: "Funding", href: "/admin/catalogue/scholarships", count: 8 },
    ],
    recentRecords,
  };
}

test("Catalogue Overview renders exactly the requested metrics and six categories", async () => {
  catalogueData = overviewData({
    recentRecords: Array.from({ length: 5 }, (_, index) => ({
      id: `record-${index}`,
      itemType: index === 0 ? "course_offering" : "institution",
      title: `Database record ${index + 1}`,
      revisionNumber: 1,
      publicationStatus: index === 0 ? "in_review" : "published",
      updatedAt: new Date("2026-11-26T12:00:00.000Z"),
    })),
  });
  const text = await textContent(CataloguePage());

  for (const label of [
    "Total records",
    "Published",
    "In Review",
    "Without Published Version",
    "Fields",
    "Courses",
    "Institutions",
    "Pathways",
    "Examinations",
    "Scholarships",
  ]) {
    assert.ok(text.includes(label), `Expected "${label}" in rendered overview`);
  }
  for (let index = 1; index <= 5; index += 1) {
    assert.ok(text.includes(`Database record ${index}`));
  }
  assert.equal((text.match(/Database record \d/g) ?? []).length, 5);
  assert.doesNotMatch(text, /Needs attention|Preview only|Audit-backed/);
});

test("Catalogue Overview renders a retryable error state", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    catalogueData = new Error("database unavailable");
    const text = await textContent(CataloguePage());
    assert.match(text, /Catalogue overview is temporarily unavailable/);
    assert.match(text, /Retry/);
    assert.doesNotMatch(text, /database unavailable/);
  } finally {
    console.error = originalError;
  }
});

test("Catalogue Overview has a meaningful empty state when no real revisions exist", async () => {
  catalogueData = overviewData();
  const text = await textContent(CataloguePage());
  assert.match(text, /No recently updated records/);
});
