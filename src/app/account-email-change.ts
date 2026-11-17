export type VerifiableEmailAddress = {
  id: string;
  verification: { status: string | null } | null;
  attemptVerification: (params: { code: string }) => Promise<VerifiableEmailAddress>;
};

export type PasswordChangeUser = {
  updatePassword: (params: { newPassword: string; currentPassword?: string }) => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function accountSettingsErrorMessage(error: unknown, fallback: string) {
  const details = isRecord(error) ? error : null;
  const firstError =
    details && Array.isArray(details.errors) && isRecord(details.errors[0])
      ? details.errors[0]
      : null;
  const rawCode =
    typeof details?.code === "string"
      ? details.code
      : typeof firstError?.code === "string" ? firstError.code : "";
  const longMessage =
    typeof details?.longMessage === "string"
      ? details.longMessage
      : typeof firstError?.longMessage === "string" ? firstError.longMessage : "";
  const code = rawCode.toLowerCase();

  if (code === "reverification_cancelled") {
    return "Identity verification was cancelled. No changes were made.";
  }
  if (code.includes("expired") && code.includes("code")) {
    return "That verification code has expired. Request a new code and try again.";
  }
  if (code.includes("incorrect") && code.includes("code")) {
    return "That verification code is incorrect. Check it or request a new code.";
  }
  if (longMessage) return longMessage;
  if (error instanceof TypeError) {
    return "A network error interrupted the request. Check your connection and try again.";
  }
  return fallback;
}

export async function verifyAndPromoteEmail<TAddress extends VerifiableEmailAddress>(
  emailAddress: TAddress,
  code: string,
  attemptVerification: (
    address: TAddress,
    code: string,
  ) => Promise<TAddress>,
  promotePrimaryEmail: (emailAddressId: string) => Promise<unknown>,
  onVerified: (address: TAddress) => void = () => {},
) {
  const verified = emailAddress.verification?.status === "verified"
    ? emailAddress
    : await attemptVerification(emailAddress, code);
  if (verified.verification?.status !== "verified") return false;

  onVerified(verified);
  await promotePrimaryEmail(verified.id);
  return true;
}

export async function updateAccountPassword(
  user: PasswordChangeUser,
  newPassword: string,
  currentPassword: string,
) {
  return user.updatePassword({
    newPassword,
    ...(currentPassword ? { currentPassword } : {}),
  });
}
