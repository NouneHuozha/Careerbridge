export type AccountHeaderState = "loading" | "signed-in" | "signed-out" | "unavailable";

export function accountHeaderState(
  status: "loading" | "guest" | "authenticated" | "unavailable",
): AccountHeaderState {
  if (status === "loading") return "loading";
  if (status === "unavailable") return "unavailable";
  return status === "authenticated" ? "signed-in" : "signed-out";
}
