import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const ts = loadModule("typescript");
loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  module._compile(ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  }), filename);
};

const {
  requestPasswordRecoveryCode,
  passwordRecoveryErrorMessage,
  resendPasswordRecoveryCode,
  restartPasswordRecoveryCode,
  submitRecoveredPassword,
  verifyPasswordRecoveryCode,
} = loadModule("./password-recovery.ts");
const {
  accountSettingsErrorMessage,
  updateAccountPassword,
  verifyAndPromoteEmail,
} = loadModule("./account-email-change.ts");

test("password recovery sends and resends email codes without exposing unknown accounts", async () => {
  const calls = [];
  const signIn = {
    status: "needs_first_factor",
    create: async (params) => {
      calls.push(["create", params.identifier]);
      return { error: null };
    },
    resetPasswordEmailCode: {
      sendCode: async () => {
        calls.push(["send"]);
        return { error: null };
      },
      verifyCode: async () => ({ error: null }),
      submitPassword: async () => ({ error: null }),
    },
  };

  assert.equal(await requestPasswordRecoveryCode(signIn, "student@example.test"), "ready");
  assert.deepEqual(calls, [["create", "student@example.test"], ["send"]]);
  assert.equal(await resendPasswordRecoveryCode(signIn), "ready");

  signIn.create = async () => ({ error: { code: "form_identifier_not_found" } });
  assert.equal(await requestPasswordRecoveryCode(signIn, "unknown@example.test"), "ready");
  assert.equal(calls.filter(([kind]) => kind === "send").length, 2);

  signIn.create = async () => ({ error: { code: "rate_limit_exceeded" } });
  assert.equal(await requestPasswordRecoveryCode(signIn, "student@example.test"), "failed");
});

test("password recovery distinguishes incorrect and expired codes and completes a valid reset", async () => {
  const diagnostics = [];
  const originalConsoleError = console.error;
  console.error = (...args) => diagnostics.push(args);
  const signIn = {
    status: "needs_first_factor",
    create: async () => ({ error: null }),
    resetPasswordEmailCode: {
      sendCode: async () => ({ error: null }),
      verifyCode: async ({ code }) => {
        if (code === "000000") return { error: { code: "form_code_incorrect" } };
        if (code === "999999") return { error: { code: "form_code_expired" } };
        signIn.status = "needs_new_password";
        return { error: null };
      },
      submitPassword: async ({ password }) => {
        assert.equal(password, "new-password");
        signIn.status = "complete";
        return { error: null };
      },
    },
  };

  try {
    const incorrect = await verifyPasswordRecoveryCode(signIn, "000000");
    assert.deepEqual(incorrect, { ok: false, error: { code: "form_code_incorrect" }, status: "needs_first_factor" });
    assert.match(passwordRecoveryErrorMessage(incorrect.error, "code", "fallback"), /incorrect/);

    const expired = await verifyPasswordRecoveryCode(signIn, "999999");
    assert.deepEqual(expired, { ok: false, error: { code: "form_code_expired" }, status: "needs_first_factor" });
    assert.match(passwordRecoveryErrorMessage(expired.error, "code", "fallback"), /expired/);

    assert.deepEqual(await verifyPasswordRecoveryCode(signIn, "123456"), {
      ok: true,
      status: "needs_new_password",
    });
    assert.deepEqual(await submitRecoveredPassword(signIn, "new-password"), {
      ok: true,
      status: "complete",
    });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(diagnostics[0][1].clerkErrorCode, "form_code_incorrect");
  assert.equal(diagnostics[0][1].clerkStatus, "needs_first_factor");
  assert.equal(diagnostics[1][1].clerkErrorCode, "form_code_expired");
  const loggedDiagnostics = JSON.stringify(diagnostics);
  assert.equal(loggedDiagnostics.includes("000000"), false);
  assert.equal(loggedDiagnostics.includes("999999"), false);
  assert.equal(loggedDiagnostics.includes("new-password"), false);
});

test("requesting a fresh password code clears the old attempt and completes a new sequence", async () => {
  const calls = [];
  let attempt = 0;
  const signIn = {
    status: "needs_new_password",
    reset: async () => {
      calls.push("reset");
      signIn.status = null;
      return { error: null };
    },
    create: async () => {
      calls.push("create");
      attempt += 1;
      signIn.status = "needs_first_factor";
      return { error: null };
    },
    resetPasswordEmailCode: {
      sendCode: async () => {
        calls.push(`send-${attempt}`);
        return { error: null };
      },
      verifyCode: async ({ code }) => {
        calls.push(`verify-${code}`);
        signIn.status = "needs_new_password";
        return { error: null };
      },
      submitPassword: async () => {
        calls.push("submit");
        signIn.status = "complete";
        return { error: null };
      },
    },
  };

  const resetEvents = [];
  assert.equal(await restartPasswordRecoveryCode(
    signIn,
    "student@example.test",
    () => {
      calls.push("clear-local-state");
      resetEvents.push("cleared");
    },
  ), "ready");
  assert.deepEqual(calls, ["reset", "clear-local-state", "create", "send-1"]);
  assert.deepEqual(resetEvents, ["cleared"]);
  assert.deepEqual(await verifyPasswordRecoveryCode(signIn, "fresh-code"), {
    ok: true,
    status: "needs_new_password",
  });
  assert.deepEqual(await submitRecoveredPassword(signIn, "new-password"), {
    ok: true,
    status: "complete",
  });
  assert.deepEqual(calls, ["reset", "clear-local-state", "create", "send-1", "verify-fresh-code", "submit"]);

  const failedResetEvents = [];
  signIn.create = async () => {
    calls.push("create-fail");
    return { error: { code: "rate_limit_exceeded" } };
  };
  assert.equal(await restartPasswordRecoveryCode(
    signIn,
    "student@example.test",
    () => failedResetEvents.push("cleared"),
  ), "failed");
  assert.deepEqual(failedResetEvents, ["cleared"]);
  assert.deepEqual(calls.slice(-3), ["submit", "reset", "create-fail"]);
});

test("password reset diagnostics capture Clerk response without logging credentials", async () => {
  const diagnostics = [];
  const originalConsoleError = console.error;
  console.error = (...args) => diagnostics.push(args);
  const signIn = {
    status: "needs_new_password",
    reset: async () => ({ error: null }),
    create: async () => ({ error: null }),
    resetPasswordEmailCode: {
      sendCode: async () => ({ error: null }),
      verifyCode: async () => ({ error: null }),
      submitPassword: async () => ({
        error: {
          errors: [{
            code: "form_password_validation_failed",
            longMessage: "Choose a stronger password.",
          }],
        },
      }),
    },
  };

  try {
    const result = await submitRecoveredPassword(signIn, "private-test-password");
    assert.equal(result.ok, false);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0][1].clerkErrorCode, "form_password_validation_failed");
  assert.equal(diagnostics[0][1].clerkLongMessage, "Choose a stronger password.");
  assert.equal(diagnostics[0][1].clerkStatus, "needs_new_password");
  assert.equal(JSON.stringify(diagnostics).includes("private-test-password"), false);
});

test("password reset remains unsuccessful and reports the observed Clerk status until complete", async () => {
  const diagnostics = [];
  const originalConsoleError = console.error;
  console.error = (...args) => diagnostics.push(args);
  const signIn = {
    status: "needs_new_password",
    reset: async () => ({ error: null }),
    create: async () => ({ error: null }),
    resetPasswordEmailCode: {
      sendCode: async () => ({ error: null }),
      verifyCode: async () => ({ error: null }),
      submitPassword: async () => ({ error: null }),
    },
  };

  let result;
  try {
    result = await submitRecoveredPassword(signIn, "private-test-password");
  } finally {
    console.error = originalConsoleError;
  }
  assert.deepEqual(result, {
    ok: false,
    error: null,
    status: "needs_new_password",
  });
  assert.match(
    passwordRecoveryErrorMessage(
      result.error,
      "password",
      "fallback",
      result.status,
    ),
    /status: needs_new_password/,
  );
  assert.equal(diagnostics[0][1].clerkStatus, "needs_new_password");
  assert.equal(JSON.stringify(diagnostics).includes("private-test-password"), false);
});

test("password recovery surfaces Clerk password policy details instead of labeling every failure weak", () => {
  assert.equal(
    passwordRecoveryErrorMessage(
      { code: "form_password_validation_failed", longMessage: "Use a longer password." },
      "password",
      "fallback",
    ),
    "Use a longer password.",
  );
  assert.match(
    passwordRecoveryErrorMessage({ code: "form_password_pwned" }, "password", "fallback"),
    /data breach/,
  );
  assert.match(
    passwordRecoveryErrorMessage(new TypeError("fetch failed"), "password", "fallback"),
    /network error/i,
  );
  assert.match(
    passwordRecoveryErrorMessage(null, "password", "fallback", "needs_second_factor"),
    /another verification factor/,
  );
});

test("email change promotes an address only after Clerk verifies its code", async () => {
  const calls = [];
  const unverified = {
    id: "email-new",
    verification: { status: "unverified" },
    attemptVerification: async () => ({
      id: "email-new",
      verification: { status: "unverified" },
      attemptVerification: unverified.attemptVerification,
    }),
  };

  assert.equal(await verifyAndPromoteEmail(
    unverified,
    "000000",
    async (address) => address,
    async (id) => calls.push(["promote", id]),
  ), false);
  assert.deepEqual(calls, []);

  const verified = {
    ...unverified,
    verification: { status: "verified" },
    attemptVerification: async () => ({
      ...unverified,
      verification: { status: "verified" },
    }),
  };

  assert.equal(await verifyAndPromoteEmail(
    unverified,
    "123456",
    async (address) => ({
      ...address,
      verification: { status: "verified" },
    }),
    async (id) => calls.push(["promote", id]),
  ), true);
  assert.deepEqual(calls, [["promote", "email-new"]]);

  assert.equal(await verifyAndPromoteEmail(
    verified,
    "",
    async () => assert.fail("Already-verified email should not ask for its code again"),
    async (id) => calls.push(["promote", id]),
  ), true);
  assert.deepEqual(calls, [["promote", "email-new"], ["promote", "email-new"]]);
});

test("email operations retry after reverification and keep verified email pending if promotion is cancelled", async () => {
  const calls = [];
  function withReverification(operation) {
    let firstAttempt = true;
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        if (error.code !== "session_reverification_required" || !firstAttempt) throw error;
        firstAttempt = false;
        calls.push(["reverify"]);
        return operation(...args);
      }
    };
  }

  const address = {
    id: "email-new",
    verification: { status: "unverified" },
    attemptVerification: async () => address,
  };
  const attempt = withReverification(async (candidate, code) => {
    calls.push(["verify", code]);
    if (calls.filter(([kind]) => kind === "verify").length === 1) {
      throw { code: "session_reverification_required" };
    }
    return { ...candidate, verification: { status: "verified" } };
  });
  let promoteCalls = 0;
  const promote = withReverification(async (id) => {
    calls.push(["promote", id]);
    promoteCalls += 1;
    if (promoteCalls === 1) throw { code: "session_reverification_required" };
  });
  const verifiedAddresses = [];

  assert.equal(await verifyAndPromoteEmail(
    address,
    "123456",
    attempt,
    promote,
    (verified) => verifiedAddresses.push(verified),
  ), true);
  assert.deepEqual(calls, [
    ["verify", "123456"],
    ["reverify"],
    ["verify", "123456"],
    ["promote", "email-new"],
    ["reverify"],
    ["promote", "email-new"],
  ]);
  assert.equal(verifiedAddresses[0].verification.status, "verified");

  await assert.rejects(verifyAndPromoteEmail(
    { ...address, verification: { status: "verified" } },
    "",
    async () => assert.fail("Already-verified email should not ask for its code again"),
    async () => {
      throw { code: "reverification_cancelled" };
    },
  ));
  assert.match(
    accountSettingsErrorMessage({ code: "reverification_cancelled" }, "fallback"),
    /cancelled/i,
  );
});

test("account email-code errors distinguish invalid and expired codes", () => {
  assert.match(
    accountSettingsErrorMessage({ code: "form_code_incorrect" }, "fallback"),
    /incorrect/,
  );
  assert.match(
    accountSettingsErrorMessage({ code: "form_code_expired" }, "fallback"),
    /expired/,
  );
  assert.match(
    accountSettingsErrorMessage({ errors: [{ code: "form_code_incorrect" }] }, "fallback"),
    /incorrect/,
  );
  assert.equal(
    accountSettingsErrorMessage({
      errors: [{ code: "form_password_validation_failed", longMessage: "Choose a stronger password." }],
    }, "fallback"),
    "Choose a stronger password.",
  );
});

test("authenticated password change delegates to Clerk with the current password when provided", async () => {
  const calls = [];
  const user = {
    updatePassword: async (params) => calls.push(params),
  };

  await updateAccountPassword(user, "new-password", "current-password");
  await updateAccountPassword(user, "new-password", "");

  assert.deepEqual(calls, [
    { newPassword: "new-password", currentPassword: "current-password" },
    { newPassword: "new-password" },
  ]);
});

test("authenticated password change retries after successful reverification", async () => {
  const calls = [];
  let attempts = 0;
  const user = {
    updatePassword: async (params) => {
      calls.push(params);
      attempts += 1;
      if (attempts === 1) throw { code: "session_reverification_required" };
    },
  };
  const updateAfterReverification = async (...args) => {
    try {
      return await user.updatePassword(...args);
    } catch (error) {
      if (error.code !== "session_reverification_required") throw error;
      calls.push("identity-verified");
      return user.updatePassword(...args);
    }
  };

  await updateAccountPassword(
    { updatePassword: updateAfterReverification },
    "new-password",
    "current-password",
  );
  assert.deepEqual(calls, [
    { newPassword: "new-password", currentPassword: "current-password" },
    "identity-verified",
    { newPassword: "new-password", currentPassword: "current-password" },
  ]);
});

test("settings password fields start blank and are not persisted by application code", () => {
  const source = readFileSync(new URL("./explore/settings/settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /const \[currentPassword, setCurrentPassword\] = useState\(""\)/);
  assert.match(source, /const \[newPassword, setNewPassword\] = useState\(""\)/);
  assert.match(source, /const \[confirmPassword, setConfirmPassword\] = useState\(""\)/);
  assert.doesNotMatch(source, /(localStorage|sessionStorage)/);
});
