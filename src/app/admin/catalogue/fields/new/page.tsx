import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "../../../admin-ui";
import { CreateFieldForm } from "../create-field-form";

export default function NewFieldPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href="/admin/catalogue/fields"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#526b72] transition-colors hover:bg-white hover:text-[#17364a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Fields
      </Link>

      <AdminPageHeader
        eyebrow="Fields / Add New"
        title="Create a new Field"
        description="Add a field of study or work for students to explore. Save an incomplete draft and continue later."
      />

      <CreateFieldForm />
    </div>
  );
}
