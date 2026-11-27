import Link from "next/link";
import { AdminPageHeader, AdminEmptyState } from "../../admin-ui";
import { History } from "lucide-react";

export default function AuditEventNotFound() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit History / Event details"
        title="Event not found"
        description="This event is not part of the current preview data."
      />
      <AdminEmptyState
        title="No matching audit event"
        description="The preview event may have changed. Return to the Audit History directory to choose an available example."
        icon={History}
      />
      <Link
        href="/admin/audit"
        className="inline-flex min-h-10 items-center rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        Back to audit history
      </Link>
    </div>
  );
}
