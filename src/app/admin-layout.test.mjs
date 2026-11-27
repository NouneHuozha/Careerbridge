import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const Module = loadModule("node:module");
const ts = loadModule("typescript");
for (const extension of [".ts", ".tsx"]) loadModule.extensions[extension] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
  });
  module._compile(output, filename);
};

class AdminAuthenticationRequiredError extends Error {}
class AdminAccessDeniedError extends Error {}
class RedirectError extends Error {
  constructor(location) {
    super(location);
    this.location = location;
  }
}

const state = {
  access: "admin",
  developmentTargetAllowed: true,
  databaseName: "neondb",
  requireAdminCalls: 0,
};
const authorization = {
  AdminAuthenticationRequiredError,
  AdminAccessDeniedError,
  async requireAdmin() {
    state.requireAdminCalls += 1;
    if (state.access === "unauthenticated") throw new AdminAuthenticationRequiredError();
    if (state.access === "denied") throw new AdminAccessDeniedError();
    return { id: 1 };
  },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/link") return { __esModule: true, default: function Link() {} };
  if (request === "next/navigation") {
    return { redirect: (location) => { throw new RedirectError(location); } };
  }
  if (request === "../../../scripts/import-real-pathway-draft.mjs" &&
      parent?.filename.endsWith("admin\\layout.tsx")) {
    return {
      assertDevelopmentTarget() {
        if (!state.developmentTargetAllowed) throw new Error("Development target refused.");
      },
      verifyNeonDevelopmentEndpoint() {},
    };
  }
  if (request === "../../db/pool" && parent?.filename.endsWith("admin\\layout.tsx")) {
    return {
      getPool: () => ({
        async query() {
          return { rows: [{ database_name: state.databaseName }] };
        },
      }),
    };
  }
  if (request === "../admin-auth" && parent?.filename.endsWith("admin\\layout.tsx")) {
    return authorization;
  }
  return originalLoad.call(this, request, parent, isMain);
};
const AdminLayout = loadModule("./admin/layout.tsx").default;
Module._load = originalLoad;

function reset() {
  state.access = "admin";
  state.developmentTargetAllowed = true;
  state.databaseName = "neondb";
  state.requireAdminCalls = 0;
}

function textContent(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textContent(node.props.children);
  }
  return "";
}

test("Admin layout includes children only for an authorized development admin", async () => {
  reset();
  const layout = await AdminLayout({ children: "protected admin data" });
  assert.match(textContent(layout), /protected admin data/);
  assert.equal(state.requireAdminCalls, 1);
});

test("Admin layout redirects unauthenticated users to the existing sign-in flow", async () => {
  reset();
  state.access = "unauthenticated";
  await assert.rejects(
    AdminLayout({ children: "protected admin data" }),
    (error) => error instanceof RedirectError &&
      error.location === "/sign-in?next=%2Fadmin",
  );
});

test("Admin layout withholds children from authenticated non-admin users", async () => {
  reset();
  state.access = "denied";
  const layout = await AdminLayout({ children: "protected admin data" });
  assert.match(textContent(layout), /Admin access denied/);
  assert.doesNotMatch(textContent(layout), /protected admin data/);
});

test("Admin layout refuses a non-development target before checking the user", async () => {
  reset();
  state.developmentTargetAllowed = false;
  const layout = await AdminLayout({ children: "protected admin data" });
  assert.match(textContent(layout), /temporarily unavailable/);
  assert.doesNotMatch(textContent(layout), /protected admin data/);
  assert.equal(state.requireAdminCalls, 0);
});

test("Admin layout refuses a database outside the verified development database", async () => {
  reset();
  state.databaseName = "production";
  const layout = await AdminLayout({ children: "protected admin data" });
  assert.match(textContent(layout), /temporarily unavailable/);
  assert.doesNotMatch(textContent(layout), /protected admin data/);
  assert.equal(state.requireAdminCalls, 0);
});
