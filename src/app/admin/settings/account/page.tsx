import { Suspense } from "react";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "../../admin-ui";
import { getCurrentUser } from "../../../auth-server";
import { AdminAccountActions } from "./account-actions";

export default function AdminAccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="rounded-xl border border-[#dce5e0] bg-white p-5 text-sm text-[#657976]">
          Loading Admin account details…
        </p>
      }
    >
      <AdminAccountSettingsContent />
    </Suspense>
  );
}

async function AdminAccountSettingsContent() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("The authenticated Admin account could not be loaded.");
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <AdminPageHeader
        eyebrow="Settings / Admin Account"
        title="Admin Account"
        description="View the account and access information used by this Admin workspace."
      />

      <AdminSectionCard
        id="admin-account"
        title="Admin Account"
        description="Account information is read from the existing CareerBridge and Clerk authentication setup."
        action={<AdminStatusBadge tone="accent">Active</AdminStatusBadge>}
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-[#edf1ee] pb-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#edf3f7] text-[#496b85]">
            <span aria-hidden="true" className="text-lg font-semibold">
              {(user.name?.trim().charAt(0) || "A").toUpperCase()}
            </span>
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#17364a]">{user.name?.trim() || "Administrator"}</p>
            <p className="mt-1 text-sm text-[#657976]">Signed-in account</p>
          </div>
        </div>

        <dl className="divide-y divide-[#edf1ee] py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 py-4">
            <dt className="text-sm text-[#657976]">Email address</dt>
            <dd className="max-w-full break-all text-sm font-semibold text-[#17364a]">{user.email}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-4">
            <dt className="text-sm text-[#657976]">Account role</dt>
            <dd className="text-sm font-semibold text-[#17364a]">Administrator</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-4">
            <dt className="text-sm text-[#657976]">Authentication</dt>
            <dd className="text-sm font-semibold text-[#17364a]">Clerk</dd>
          </div>
        </dl>

        <div className="border-t border-[#edf1ee] pt-5">
          <h3 className="text-sm font-semibold text-[#17364a]">Account actions</h3>
          <p className="mt-1 text-sm leading-5 text-[#657976]">
            Manage account details through your authentication provider.
          </p>
          <AdminAccountActions />
        </div>
      </AdminSectionCard>

      <p className="text-xs leading-5 text-[#71817d]">
        Your account role is enforced by the existing server-side Admin authorization. It cannot be changed here.
      </p>
    </div>
  );
}
