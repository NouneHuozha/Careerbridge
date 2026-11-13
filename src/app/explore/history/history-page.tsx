"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookmarkCheck,
  Clock3,
  Compass,
  History,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import {
  clearExplorationHistory,
  explorationHistoryKey,
  removeHistoryItem,
  restoreHistoryItem,
  useExplorationHistory,
  type ExplorationHistoryItem,
} from "../exploration-history";
import { SavedItemButton } from "../saved-item-button";
import type { SavedItemType } from "../saved-items";
import { resolveHistoryItem, type ResolvedHistoryItem } from "./history-resolver";

type Category = Exclude<SavedItemType, "institution-offering">;

const categories: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "field", label: "Fields" },
  { id: "course", label: "Courses" },
  { id: "institution", label: "Institutions" },
  { id: "pathway", label: "Pathways" },
  { id: "examination", label: "Examinations" },
  { id: "scholarship", label: "Scholarships" },
];

const categoryStyles: Record<Category, string> = {
  field: "bg-[#eaf2ed] text-[#315345]",
  course: "bg-[#f5efdf] text-[#79602b]",
  institution: "bg-[#e8f0f3] text-[#3d6170]",
  pathway: "bg-[#f0eaf3] text-[#685270]",
  examination: "bg-[#f6eae4] text-[#8a583e]",
  scholarship: "bg-[#f3edf0] text-[#805568]",
};

function visitDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateKey = (value: Date) =>
    `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;

  if (dateKey(date) === dateKey(today)) return "Today";
  if (dateKey(date) === dateKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function visitTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function HistoryCard({
  entry,
  onRemove,
  featured = false,
}: {
  entry: ResolvedHistoryItem;
  onRemove: (item: ExplorationHistoryItem) => void;
  featured?: boolean;
}) {
  const { item, category, label, title, description, href } = entry;
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[#dfe9e4] bg-white p-5 shadow-[0_14px_35px_rgba(24,53,45,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#b9d4bf] hover:shadow-[0_24px_60px_rgba(24,53,45,0.12)] ${
        featured ? "sm:p-6" : ""
      }`}
    >
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#cfe0d2] to-transparent opacity-70" />
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[.08em] uppercase ${categoryStyles[category]}`}>
          {label}
        </span>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-[.12em] text-[#718078]">
          {visitTime(item.lastVisitedAt)}
        </span>
      </div>
      <h3 className={`mt-4 font-serif font-semibold leading-snug tracking-[-.025em] ${featured ? "text-2xl sm:text-3xl" : "text-xl sm:text-[1.9rem]"}`}>
        <Link
          href={href}
          className="rounded-sm text-[#18352d] transition-colors hover:text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          {title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#59665e]">
        {description}
      </p>
      {item.type === "institution-offering" && (
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f3f7f3] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#52645a]">
          <BookmarkCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Course-specific option
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#718078]">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
          {item.visitCount > 1 ? `Visited ${item.visitCount} times` : "First visit"}
        </p>
        <div className="flex items-center gap-2">
          <SavedItemButton
            type={item.type}
            id={item.id}
            context={item.context}
            saveLabel="Save for later"
            className="min-h-9 rounded-full border-[#d9e3d8] bg-[#f8faf7] px-3 text-[11px] font-semibold uppercase tracking-[.08em] text-[#145543]"
          />
          <button
            type="button"
            aria-label={`Remove ${title} from history`}
            onClick={() => onRemove(item)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#f1dfdb] bg-[#fffaf9] px-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#8a594e] transition-colors hover:bg-[#fbefec] hover:text-[#763d32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a594e]"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ExplorationHistoryPage() {
  const history = useExplorationHistory();
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [undoItem, setUndoItem] = useState<ExplorationHistoryItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState("");
  const confirmationRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = confirmationRef.current;
    if (!dialog) return;
    if (confirmClear && !dialog.open) dialog.showModal();
    else if (!confirmClear && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [confirmClear]);

  const resolved = useMemo(
    () => history.status === "saved"
      ? history.items
          .map(resolveHistoryItem)
          .sort((a, b) => b.item.lastVisitedAt - a.item.lastVisitedAt)
      : [],
    [history],
  );
  const counts = useMemo(() => ({
    all: resolved.length,
    field: resolved.filter((entry) => entry.category === "field").length,
    course: resolved.filter((entry) => entry.category === "course").length,
    institution: resolved.filter((entry) => entry.category === "institution").length,
    pathway: resolved.filter((entry) => entry.category === "pathway").length,
    examination: resolved.filter((entry) => entry.category === "examination").length,
    scholarship: resolved.filter((entry) => entry.category === "scholarship").length,
  }), [resolved]);
  const query = search.trim().toLocaleLowerCase();
  const matchingItems = resolved.filter(({ category: itemCategory, title, description }) =>
    (category === "all" || category === itemCategory) &&
    (!query || `${title} ${description}`.toLocaleLowerCase().includes(query)),
  );
  const latest = matchingItems[0];
  const olderItems = matchingItems.slice(1);
  const visibleItems = olderItems.slice(0, visibleCount);
  const groups = visibleItems.reduce<{ label: string; entries: ResolvedHistoryItem[] }[]>(
    (result, entry) => {
      const label = visitDate(entry.item.lastVisitedAt);
      const lastGroup = result[result.length - 1];
      if (lastGroup?.label === label) lastGroup.entries.push(entry);
      else result.push({ label, entries: [entry] });
      return result;
    },
    [],
  );

  if (history.status === "loading") {
    return <PageLoadingSkeleton variant="collection" showHeader={false} />;
  }

  function remove(item: ExplorationHistoryItem) {
    if (!removeHistoryItem(item)) {
      setError("History could not be updated. Check that browser storage is available.");
      return;
    }
    setError("");
    setUndoItem(item);
  }

  function undoRemoval() {
    if (!undoItem) return;
    if (!restoreHistoryItem(undoItem)) {
      setError("The item could not be restored. Check that browser storage is available.");
      return;
    }
    setUndoItem(null);
    setError("");
  }

  function clearHistory() {
    if (!clearExplorationHistory()) {
      setError("History could not be cleared. Check that browser storage is available.");
      return;
    }
    setConfirmClear(false);
    setUndoItem(null);
    setError("");
  }

  const unavailable = history.status === "invalid" || history.status === "unavailable";

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f7f5f0] text-[#18352d]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,_rgba(23,91,72,0.14),transparent_55%)]" />
      <div className="cb-container relative pb-16 pt-6 sm:pb-20 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Profile" },
            { label: "Exploration history" },
          ]}
          className="!px-0"
        />

        <header className="mt-7 overflow-hidden rounded-[2rem] border border-[#dfe8e4] bg-[#18352d] text-white shadow-[0_30px_70px_rgba(24,53,45,0.18)]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#d2b778]/10 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#dfece5]">
                  Your exploration trail
                </p>
                <h1 className="mt-3 max-w-[14ch] font-serif text-4xl font-semibold leading-[0.95] tracking-[-.05em] sm:text-5xl lg:text-[4rem]">
                  Explore your journey
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#dfe9e4] sm:text-lg">
                  Return to the fields, courses and opportunities you have explored along the way.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {history.status === "saved" && history.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[.12em] text-[#f0f4f0] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Clear history
                  </button>
                )}
                <div className="rounded-full border border-[#d2b778]/30 bg-[#d2b778]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-[#f4e5b0]">
                  Local only
                </div>
              </div>
            </div>
          </div>
        </header>

        {unavailable ? (
          <section role="alert" className="mt-8 rounded-[1.7rem] border border-[#e7d6a8] bg-[#fff8e8] p-6 text-[#594c32] shadow-[0_18px_40px_rgba(89,76,50,0.08)]">
            <h2 className="font-serif text-xl font-semibold">
              {history.status === "invalid" ? "History couldn’t be read." : "History is unavailable."}
            </h2>
            <p className="mt-2 text-sm leading-6">
              {history.status === "invalid"
                ? "Your stored history has not been changed. Check this browser’s stored data before trying again."
                : "This browser couldn’t access local storage. Check your browser settings and reload this page."}
            </p>
          </section>
        ) : resolved.length === 0 ? (
          <section className="mt-9 rounded-[2rem] border border-[#dce7df] bg-white p-6 shadow-[0_16px_40px_rgba(24,53,45,0.04)] sm:p-9">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eaf2ed] text-[#145543]">
              <Compass aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-serif text-2xl font-semibold sm:text-3xl">
              Your exploration trail starts here
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-[#59665e]">
              As you explore fields, courses, institutions and opportunities, the pages you open will appear here. You can return to them anytime.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Start exploring <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <section aria-label="Search exploration history" className="mt-8 rounded-[1.7rem] border border-[#dfe8e4] bg-white p-4 shadow-[0_12px_30px_rgba(24,53,45,0.04)] sm:p-5">
              <label htmlFor="history-search" className="sr-only">Search your exploration history</label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" />
                <input
                  id="history-search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(6);
                  }}
                  placeholder="Search by name or content type..."
                  className="min-h-12 w-full rounded-full border border-[#d3ddd5] bg-[#f8faf8] pl-11 pr-4 text-sm text-[#18352d] outline-none transition-all duration-200 focus:border-[#145543] focus:bg-white focus:ring-4 focus:ring-[#dfeee4]"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by item type">
                {categories.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={category === option.id}
                    onClick={() => {
                      setCategory(option.id);
                      setVisibleCount(6);
                    }}
                    className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
                      category === option.id
                        ? "bg-[#145543] text-white shadow-[0_10px_25px_rgba(20,85,67,0.25)]"
                        : "border border-[#dfe8e4] bg-white text-[#52645a] hover:bg-[#eaf2ed]"
                    }`}
                  >
                    {option.label} · {counts[option.id]}
                  </button>
                ))}
              </div>
            </section>

            {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fff3ef] px-4 py-3 text-sm text-[#813e32]">{error}</p>}

            {matchingItems.length === 0 ? (
              <section role="status" className="mt-8 rounded-[1.7rem] border border-[#dce7df] bg-white px-6 py-10 text-center shadow-[0_12px_30px_rgba(24,53,45,0.04)]">
                <History aria-hidden="true" className="mx-auto h-8 w-8 text-[#718078]" />
                <h2 className="mt-4 font-serif text-2xl font-semibold">No matching explorations</h2>
                <p className="mt-2 text-sm leading-6 text-[#59665e]">
                  Try another search or choose a different category.
                </p>
              </section>
            ) : (
              <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
                <div className="min-w-0">
                  <section aria-labelledby="latest-title" className="cb-reveal">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#52715f]">
                          Pick up where you left off
                        </p>
                        <h2 id="latest-title" className="mt-1 font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
                          Most recent
                        </h2>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#718078]">
                        {visitDate(latest!.item.lastVisitedAt)} · {visitTime(latest!.item.lastVisitedAt)}
                      </p>
                    </div>
                    <div className="mt-4">
                      <HistoryCard entry={latest!} featured onRemove={remove} />
                    </div>
                  </section>

                  {groups.length > 0 && (
                    <section className="cb-scroll-reveal mt-9" aria-labelledby="history-trail-title">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h2 id="history-trail-title" className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
                            Your trail
                          </h2>
                          <p className="mt-1 text-sm text-[#718078]">Earlier explorations · Newest first</p>
                        </div>
                        <p className="text-sm font-medium text-[#52645a]" aria-live="polite">
                          {matchingItems.length} {matchingItems.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <div className="mt-6 space-y-7">
                        {groups.map((group) => (
                          <section key={group.label} aria-label={group.label}>
                            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-[#718078]">
                              {group.label}
                            </h3>
                            <ul className="grid gap-4 md:grid-cols-2">
                              {group.entries.map((entry) => (
                                <li key={explorationHistoryKey(entry.item)}>
                                  <HistoryCard entry={entry} onRemove={remove} />
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                      {olderItems.length > visibleCount && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount((count) => count + 6)}
                          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cbd9cf] bg-white px-5 text-sm font-semibold text-[#315345] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                        >
                          Show older explorations
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </button>
                      )}
                    </section>
                  )}
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24">
                  <section className="rounded-[1.7rem] border border-[#dfe8e4] bg-white p-5 shadow-[0_14px_35px_rgba(24,53,45,0.05)]">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ed] text-[#145543]">
                      <History aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <h2 className="mt-4 font-serif text-xl font-semibold">History and Saved</h2>
                    <p className="mt-2 text-sm leading-6 text-[#59665e]">
                      History remembers the pages you open. Saved keeps the things you deliberately want to revisit.
                    </p>
                    <Link
                      href="/explore/saved"
                      className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#145543] transition-colors hover:text-[#0f4537] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                    >
                      Visit Saved <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </section>
                  <section className="rounded-[1.7rem] bg-[#eaf2ed] p-5 shadow-[0_16px_35px_rgba(24,53,45,0.04)]">
                    <h2 className="font-serif text-xl font-semibold">Your history, your control</h2>
                    <p className="mt-2 text-sm leading-6 text-[#52645a]">
                      Only meaningful content pages are recorded. Your searches and filters are not included.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#d0dfd4] pt-3 text-center">
                      <div>
                        <p className="text-xl font-semibold text-[#18352d]">{resolved.length}</p>
                        <p className="text-[10px] uppercase tracking-[.12em] text-[#718078]">items</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-[#18352d]">{counts.course + counts.field}</p>
                        <p className="text-[10px] uppercase tracking-[.12em] text-[#718078]">study</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-[#18352d]">{counts.institution}</p>
                        <p className="text-[10px] uppercase tracking-[.12em] text-[#718078]">institutions</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-[#718078]">
                      Stored on this device. History is not synced across devices.
                    </p>
                  </section>
                </aside>
              </div>
            )}
          </>
        )}

        {error && resolved.length > 0 && (
          <p role="alert" className="sr-only">{error}</p>
        )}

        {undoItem && !unavailable && (
          <div role="status" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-[#dce7df] bg-white px-4 py-3 shadow-[0_12px_35px_rgba(27,65,52,0.14)]">
            <span className="text-sm text-[#354b40]">Removed from your history.</span>
            <button
              type="button"
              onClick={undoRemoval}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Undo
            </button>
          </div>
        )}

        <dialog
          ref={confirmationRef}
          onCancel={(event) => {
            event.preventDefault();
            setConfirmClear(false);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[1.7rem] border border-[#dce7df] bg-white p-0 text-[#18352d] shadow-[0_18px_60px_rgba(27,65,52,0.22)] backdrop:bg-[#173f32]/35"
        >
          <div className="p-6 sm:p-7">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fbefec] text-[#8a594e]">
              <Trash2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-serif text-2xl font-semibold">Clear your exploration history?</h2>
            <p className="mt-2 text-sm leading-6 text-[#59665e]">
              This removes all items from this device. Your Saved items won’t be affected.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-10 rounded-full border border-[#dce7df] px-4 text-sm font-semibold text-[#52645a] hover:bg-[#f4f7f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Keep history
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className="min-h-10 rounded-full bg-[#8a594e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#763d32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a594e]"
              >
                Clear history
              </button>
            </div>
          </div>
        </dialog>
      </div>
    </main>
  );
}
