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

const { postLoginUrl, resolvePostLoginPath, safeReturnPath } = require("./auth-routing.ts");

test("Admin post-login routing never sends an Admin to a student Explore path", () => {
  assert.equal(resolvePostLoginPath("admin", null), "/admin");
  assert.equal(resolvePostLoginPath("admin", "/explore/saved?tab=all"), "/admin");
  assert.equal(resolvePostLoginPath("admin", "/%65xplore/saved"), "/admin");
  assert.equal(resolvePostLoginPath("admin", "/%2525252565xplore/saved"), "/admin");
  assert.equal(resolvePostLoginPath("admin", "/admin"), "/admin");
  assert.equal(resolvePostLoginPath("admin", "/privacy"), "/admin");
});

test("student post-login routing overrides an Admin-only requested path", () => {
  assert.equal(resolvePostLoginPath("student", null), "/explore");
  assert.equal(resolvePostLoginPath("student", "/admin"), "/explore");
  assert.equal(resolvePostLoginPath("student", "/explore/saved"), "/explore/saved");
});

test("return paths reject external, protocol-relative, and auth callback destinations", () => {
  assert.equal(safeReturnPath("https://example.com/"), null);
  assert.equal(safeReturnPath("//example.com/"), null);
  assert.equal(safeReturnPath("/auth/continue?next=/admin"), null);
  assert.equal(safeReturnPath("/sign-in"), null);
  assert.equal(postLoginUrl("https://example.com/"), "/auth/continue?next=%2Fexplore");
});
