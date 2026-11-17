export type ClerkErrorLike = {
  code?: string;
  longMessage?: string;
  errors?: Array<{ code?: string; longMessage?: string }>;
};

type ClerkResult = {
  error: ClerkErrorLike | null;
};

export type PasswordRecoveryResult =
  | { ok: true; status: string }
  | { ok: false; error: ClerkErrorLike | null; status: string | null };

export type PasswordRecoverySignIn = {
  create: (params: { identifier: string }) => Promise<ClerkResult>;
  reset: () => Promise<ClerkResult>;
  resetPasswordEmailCode: {
    sendCode: () => Promise<ClerkResult>;
    verifyCode: (params: { code: string }) => Promise<ClerkResult>;
    submitPassword: (params: { password: string }) => Promise<ClerkResult>;
  };
  status: string | null;
};

function logRecoveryFailure(
  operation: "verify_code" | "submit_password",
  error: unknown,
  status: string | null,
) {
  if (process.env.NODE_ENV !== "production") {
    const details = getClerkErrorDetails(error);
    console.error("[CareerBridge] Clerk password recovery did not complete", {
      operation,
      clerkErrorCode: details?.code ?? null,
      clerkLongMessage: details?.longMessage ?? null,
      clerkStatus: status,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getClerkErrorDetails(error: unknown): ClerkErrorLike | null {
  if (!isRecord(error)) return null;
  const firstError = Array.isArray(error.errors) && isRecord(error.errors[0])
    ? error.errors[0]
    : null;
  return {
    code: typeof error.code === "string"
      ? error.code
      : typeof firstError?.code === "string" ? firstError.code : undefined,
    longMessage: typeof error.longMessage === "string"
      ? error.longMessage
      : typeof firstError?.longMessage === "string" ? firstError.longMessage : undefined,
  };
}

function isUnknownIdentifier(error: ClerkErrorLike | null) {
  return error?.code === "form_identifier_not_found" ||
    error?.code === "identifier_not_found";
}

export function passwordRecoveryErrorMessage(
  error: unknown,
  operation: "code" | "password",
  fallback: string,
  status: string | null = null,
) {
  const details = getClerkErrorDetails(error);
  const code = details?.code?.toLowerCase() ?? "";

  if (code.includes("expired") && code.includes("code")) {
    return "That verification code has expired. Request a new code and try again.";
  }
  if (code.includes("incorrect") && code.includes("code")) {
    return "That verification code is incorrect. Check it or request a new code.";
  }
  if (operation === "password" && code === "form_password_pwned") {
    return "Choose a password that has not appeared in a known data breach.";
  }
  if (details?.longMessage) return details.longMessage;
  if (operation === "password" && status === "needs_second_factor") {
    return "Clerk requires another verification factor; the password reset is not confirmed.";
  }
  if (operation === "password" && status) {
    return `Clerk did not complete the reset (status: ${status}). Try again or request a new code.`;
  }
  if (details?.code) return `Clerk rejected the request (${details.code}). ${fallback}`;
  if (error instanceof TypeError) {
    return "A network error interrupted the request. Check your connection and try again.";
  }
  return fallback;
}

export async function requestPasswordRecoveryCode(
  signIn: PasswordRecoverySignIn,
  email: string,
): Promise<"ready" | "failed"> {
  const initialized = await signIn.create({ identifier: email });
  if (initialized.error) return isUnknownIdentifier(initialized.error) ? "ready" : "failed";

  const sent = await signIn.resetPasswordEmailCode.sendCode();
  return sent.error && !isUnknownIdentifier(sent.error) ? "failed" : "ready";
}

export async function resendPasswordRecoveryCode(
  signIn: PasswordRecoverySignIn,
): Promise<"ready" | "failed"> {
  const sent = await signIn.resetPasswordEmailCode.sendCode();
  return sent.error && !isUnknownIdentifier(sent.error) ? "failed" : "ready";
}

export async function restartPasswordRecoveryCode(
  signIn: PasswordRecoverySignIn,
  email: string,
  onAttemptReset: () => void = () => {},
): Promise<"ready" | "failed"> {
  const reset = await signIn.reset();
  if (reset.error) return "failed";
  onAttemptReset();
  return requestPasswordRecoveryCode(signIn, email);
}

export async function verifyPasswordRecoveryCode(
  signIn: PasswordRecoverySignIn,
  code: string,
): Promise<PasswordRecoveryResult> {
  let result: ClerkResult;
  try {
    result = await signIn.resetPasswordEmailCode.verifyCode({ code });
  } catch (error) {
    logRecoveryFailure("verify_code", error, signIn.status);
    throw error;
  }
  if (result.error) {
    logRecoveryFailure("verify_code", result.error, signIn.status);
    return { ok: false, error: result.error, status: signIn.status };
  }
  if (signIn.status !== "needs_new_password") {
    logRecoveryFailure("verify_code", null, signIn.status);
    return { ok: false, error: null, status: signIn.status };
  }
  return { ok: true, status: signIn.status };
}

export async function submitRecoveredPassword(
  signIn: PasswordRecoverySignIn,
  password: string,
): Promise<PasswordRecoveryResult> {
  let result: ClerkResult;
  try {
    result = await signIn.resetPasswordEmailCode.submitPassword({ password });
  } catch (error) {
    logRecoveryFailure("submit_password", error, signIn.status);
    throw error;
  }
  if (result.error) {
    logRecoveryFailure("submit_password", result.error, signIn.status);
    return { ok: false, error: result.error, status: signIn.status };
  }
  if (signIn.status !== "complete") {
    logRecoveryFailure("submit_password", null, signIn.status);
    return { ok: false, error: null, status: signIn.status };
  }
  return { ok: true, status: signIn.status };
}
