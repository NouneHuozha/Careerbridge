export function AuditHistoryLoading() {
  return (
    <div aria-busy="true" aria-label="Loading audit history" className="space-y-5">
      <div className="h-28 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-24 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-96 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}

export default AuditHistoryLoading;
