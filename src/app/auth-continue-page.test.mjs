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
  if (request === "../../auth-role" && parent?.filename.endsWith("auth\\continue\\page.tsx")) {
    return { getCurrentCareerBridgeRole: async () => role };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const AuthContinuePage = require("./auth/continue/page.tsx").default;
Module._load = originalLoad;

test("post-login callback redirects an Admin to Admin even when next requests Explore", async () => {
  role = "admin";
  await assert.rejects(
    AuthContinuePage({ searchParams: Promise.resolve({ next: "/explore/saved" }) }),
    (error) => error instanceof RedirectError && error.location === "/admin",
  );
});

test("post-login callback sends a student requesting Admin to Explore", async () => {
  role = "student";
  await assert.rejects(
    AuthContinuePage({ searchParams: Promise.resolve({ next: "/admin" }) }),
    (error) => error instanceof RedirectError && error.location === "/explore",
  );
});

test("post-login callback routes unprovisioned and unauthenticated sessions safely", async () => {
  role = "unprovisioned";
  await assert.rejects(
    AuthContinuePage({ searchParams: Promise.resolve({ next: "/explore/saved" }) }),
    (error) => error instanceof RedirectError &&
      error.location === "/sign-up?next=%2Fexplore%2Fsaved",
  );

  role = null;
  await assert.rejects(
    AuthContinuePage({ searchParams: Promise.resolve({ next: "/admin" }) }),
    (error) => error instanceof RedirectError &&
      error.location === "/sign-in?next=%2Fadmin",
  );
});
