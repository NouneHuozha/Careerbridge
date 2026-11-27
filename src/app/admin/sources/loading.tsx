export default function SourcesLoading() {
  return (
    <div role="status" aria-label="Loading Sources workspace" className="space-y-6">
      <span className="sr-only">Loading Sources workspace</span>
      <div className="h-24 animate-pulse rounded-xl bg-[#e6ece8]" />
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl bg-white ring-1 ring-[#dce5e0]" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-white ring-1 ring-[#dce5e0]" />
    </div>
  );
}
