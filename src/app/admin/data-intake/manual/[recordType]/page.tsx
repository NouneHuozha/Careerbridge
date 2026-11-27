import { Suspense } from "react";
import { ManualEntryPage } from "../../manual-entry";

export default function ManualRecordTypePage({
  params,
}: {
  params: Promise<{ recordType: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-64 animate-pulse rounded-xl bg-white" />}>
      <ManualRecordTypeContent params={params} />
    </Suspense>
  );
}

async function ManualRecordTypeContent({
  params,
}: {
  params: Promise<{ recordType: string }>;
}) {
  const { recordType } = await params;
  return <ManualEntryPage recordType={recordType} />;
}
