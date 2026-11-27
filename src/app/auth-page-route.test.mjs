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

class RedirectError extends Error {
  constructor(location) {
    super(location);
    this.location = location;
  }
}

let role = "admin";
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/navigation") {
    return { redirect: (location) => { throw new RedirectError(location); } };
  }
  if (request === "../auth-role" && parent?.filename.endsWith("sign-in\\auth-page-route.tsx")) {
    return { getCurrentCareerBridgeRole: async () => role };
  }
  if (request === "./auth-page-layout" && parent?.filename.endsWith("sign-in\\auth-page-route.tsx")) {
    return { __esModule: true, default: function AuthPageLayout() {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { AuthPageRoute } = require("./sign-in/auth-page-route.tsx");
Module._load = originalLoad;

test("an already-authenticated Admin opening sign-in is routed away from Explore", async () => {
  role = "admin";
  await assert.rejects(
    AuthPageRoute({
      initialMode: "sign-in",
      searchParams: Promise.resolve({ next: "/explore" }),
    }),
    (error) => error instanceof RedirectError && error.location === "/admin",
  );
});

test("an already-authenticated student opening sign-up cannot enter Admin", async () => {
  role = "student";
  await assert.rejects(
    AuthPageRoute({
      initialMode: "sign-up",
      searchParams: Promise.resolve({ next: "/admin" }),
    }),
    (error) => error instanceof RedirectError && error.location === "/explore",
  );
});

test("an authenticated but unprovisioned sign-in is routed to account setup", async () => {
  role = "unprovisioned";
  await assert.rejects(
    AuthPageRoute({
      initialMode: "sign-in",
      searchParams: Promise.resolve({ next: "/admin" }),
    }),
    (error) => error instanceof RedirectError && error.location === "/sign-up?next=%2Fadmin",
  );
});

test("the existing account recovery setup route remains reachable for a signed-in account", async () => {
  role = "admin";
  const route = await AuthPageRoute({
    initialMode: "sign-up",
    searchParams: Promise.resolve({ next: "/admin", setup: "1" }),
  });
  assert.ok(route);
});
