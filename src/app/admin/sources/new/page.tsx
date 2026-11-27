import { AdminPageHeader } from "../../admin-ui";
import { SourceForm } from "../source-form";

export default function RegisterSourcePage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="Sources / Register source"
        title="Register a new source"
        description="Add a source once so it can be reused across multiple catalogue records."
      />
      <SourceForm cancelHref="/admin/sources" />
    </div>
  );
}
