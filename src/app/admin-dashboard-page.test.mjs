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

let loadError = null;
let recentActivity = [];
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "./dashboard-data" && parent?.filename.endsWith("admin\\page.tsx")) {
    return {
      async getAdminDashboardData() {
        if (loadError) throw loadError;
        return {
          catalogue: {
            totalItems: 3,
            publishedItems: 1,
            unpublishedItems: 2,
            inReviewItems: 1,
            byType: [{ type: "field", count: 3 }],
          },
          recentActivity,
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const AdminPage = require("./admin/page.tsx").default;
Module._load = originalLoad;

function textContent(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object" && typeof node.type === "function") {
    return textContent(node.type(node.props));
  }
  if (node && typeof node === "object" && "props" in node) {
    return textContent(node.props.children);
  }
  return "";
}

test("dashboard page handles database errors, missing related data, and empty history", async () => {
  const originalError = console.error;
  const logs = [];
  try {
    loadError = new Error("SELECT secret_connection_string");
    console.error = (...args) => logs.push(args);
    const errorPage = await AdminPage();
    const errorText = textContent(errorPage);
    assert.match(errorText, /Dashboard data is temporarily unavailable/);
    assert.doesNotMatch(errorText, /secret_connection_string|SELECT/);
    assert.deepEqual(logs, [
      ["[careerbridge-next] Admin dashboard data query failed", "Error"],
    ]);

    loadError = null;
    recentActivity = [{
      id: "event-1",
      createdAt: new Date("2026-11-27T06:00:00.000Z"),
      actorId: 7,
      actorName: null,
      actorEmail: null,
      kind: "exam",
      action: "publish",
      itemId: "catalog-item-1",
      itemTitle: null,
    }];
    const eventText = textContent(await AdminPage());
    assert.match(eventText, /User #7/);
    assert.match(eventText, /Examination/);
    assert.match(eventText, /Published/);
    assert.match(eventText, /catalog-item-1/);

    recentActivity = [];
    assert.match(textContent(await AdminPage()), /No Admin activity recorded yet/);
  } finally {
    console.error = originalError;
    loadError = null;
    recentActivity = [];
  }
});
