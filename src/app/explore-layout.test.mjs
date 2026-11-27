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
    jsx: ts.JsxEmit.ReactJSX,
  });
  module._compile(output, filename);
};
require.extensions[".tsx"] = require.extensions[".ts"];

class RedirectError extends Error {
  constructor(location) {
    super(location);
    this.location = location;
  }
}

let role = "student";
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/navigation") {
    return { redirect: (location) => { throw new RedirectError(location); } };
  }
  if (request === "../auth-role" && parent?.filename.endsWith("explore\\layout.tsx")) {
    return { getCurrentCareerBridgeRole: async () => role };
  }
  if (request === "./student-navigation" && parent?.filename.endsWith("explore\\layout.tsx")) {
    return { StudentNavigation: function StudentNavigation() {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const ExploreLayout = require("./explore/layout.tsx").default;
Module._load = originalLoad;

function textContent(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object" && "props" in node) return textContent(node.props.children);
  return "";
}

test("Admin visiting an Explore route is redirected server-side to Admin", async () => {
  role = "admin";
  await assert.rejects(
    ExploreLayout({ children: "student route" }),
    (error) => error instanceof RedirectError && error.location === "/admin",
  );
});

test("students and unauthenticated visitors retain existing Explore access", async () => {
  role = "student";
  assert.match(textContent(await ExploreLayout({ children: "student route" })), /student route/);
  role = null;
  assert.match(textContent(await ExploreLayout({ children: "public route" })), /public route/);
});
