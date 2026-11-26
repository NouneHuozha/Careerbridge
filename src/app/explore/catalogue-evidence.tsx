import type { CatalogueEvidence } from "../../db/catalogue-types";

export function latestEvidenceCheck(sources: CatalogueEvidence[] = []): string | null {
  const checkedDates = sources
    .map((source) => source.checkedAt)
    .filter((value): value is string => value !== null && !Number.isNaN(Date.parse(value)))
    .map((value) => Date.parse(value));
  if (!checkedDates.length) return null;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(Math.max(...checkedDates)));
}

function dateOnly(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function CatalogueEvidence({
  sources = [],
  demo = false,
}: {
  sources?: CatalogueEvidence[];
  demo?: boolean;
}) {
  return (
    <section
      className="mt-8 rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6"
      aria-labelledby="catalogue-sources-title"
    >
      <h2 id="catalogue-sources-title" className="font-serif text-2xl font-semibold tracking-[-.03em]">
        Sources and verification
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
        Source evidence is linked to catalogue claims. A checked date records a source review; it is not, by itself, proof that every claim is current.
      </p>
      {demo ? (
        <p className="mt-4 rounded-xl border border-[#e7d6a8] bg-[#fff8e8] px-4 py-3 text-sm leading-relaxed text-[#594c32]">
          Development demo content: illustrative only, unverified, and not a published real opportunity. Its example text and links have not been reviewed for a current cycle.
        </p>
      ) : sources.length ? (
        <ul className="mt-4 space-y-3">
          {sources.map((source) => {
            const url = safeExternalUrl(source.canonicalUrl);
            return (
              <li key={`${source.sourceId}:${source.claimKey}`} className="rounded-xl border border-[#e5ebe5] bg-[#fbfcfa] p-4">
                <p className="text-xs font-semibold uppercase tracking-[.08em] text-[#52715f]">
                  Supports: {source.claimKey.replace(/^(examination|scholarship)\./, "").replaceAll("_", " ") || "general catalogue information"}
                </p>
                <p className="mt-1 font-semibold text-[#18352d]">{source.sourceName}</p>
                {source.authority && <p className="mt-1 text-sm text-[#59665e]">{source.authority}</p>}
                <p className="mt-1 text-xs text-[#718078]">Source type: {source.sourceType.replaceAll("_", " ")} · Registry: {source.sourceStatus}</p>
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-sm font-medium text-[#145543] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    Open cited source
                  </a>
                )}
                <p className="mt-2 text-xs leading-relaxed text-[#718078]">
                  Evidence status: {(source.verificationStatus ?? "not collected").replaceAll("_", " ")}
                  {dateOnly(source.checkedAt) ? ` · Checked ${dateOnly(source.checkedAt)}` : " · Not checked"}
                  {dateOnly(source.verifiedAt) ? ` · Verified ${dateOnly(source.verifiedAt)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[#718078]">No claim-level source evidence is attached to this record.</p>
      )}
    </section>
  );
}
