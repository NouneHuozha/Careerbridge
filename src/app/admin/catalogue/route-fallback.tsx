export function CatalogueRouteFallback() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading catalogue page"
      className="space-y-5"
    >
      <div className="h-28 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-16 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-80 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}
