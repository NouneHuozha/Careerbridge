"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, Trash2 } from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import {
  addSavedItem,
  removeSavedItem,
  savedItemKey,
  useSavedItems,
  type SavedItem,
  type SavedItemType,
} from "../saved-items";
import { fieldGuideData } from "../fields/field-data";
import { courseCatalog } from "../courses/catalog/course-catalog-data";
import { institutionProfilePages } from "../institution-directory/institution-profile-data";
import { studyRoutes } from "../pathways/route-data";
import { examinations } from "../examinations/examination-data";
import { scholarships } from "../scholarships/scholarship-data";
import { resolvedInstitutionCampusOfferings } from "../institutions/institution-data";

type SavedCategory = Exclude<SavedItemType, "institution-offering">;
type SavedSort = "recent" | "oldest" | "az" | "za";

const categories: { id: SavedCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "field", label: "Fields" },
  { id: "course", label: "Courses" },
  { id: "institution", label: "Institutions" },
  { id: "pathway", label: "Pathways" },
  { id: "examination", label: "Examinations" },
  { id: "scholarship", label: "Scholarships" },
];

type ResolvedSavedItem = {
  item: SavedItem;
  category: SavedCategory;
  label: string;
  title: string;
  description: string;
  href?: string;
};

function resolveItem(item: SavedItem): ResolvedSavedItem {
  if (item.type === "field") {
    const field = fieldGuideData[item.id as keyof typeof fieldGuideData];
    if (field) {
      return {
        item,
        category: "field",
        label: "Field",
        title: field.name,
        description: field.description,
        href: `/explore/fields/${field.id}${item.context?.stage ? `?stage=${encodeURIComponent(item.context.stage)}` : ""}`,
      };
    }
  }

  if (item.type === "course") {
    const course = courseCatalog.find((entry) => entry.id === item.id);
    if (course) {
      return {
        item,
        category: "course",
        label: "Course",
        title: course.name,
        description: course.description,
        href: `/explore/courses/catalog/${course.id}${item.context?.stage ? `?stage=${encodeURIComponent(item.context.stage)}` : ""}`,
      };
    }
  }

  if (item.type === "institution") {
    const institution = institutionProfilePages.find((entry) => entry.slug === item.id);
    if (institution) {
      return {
        item,
        category: "institution",
        label: "Institution",
        title: institution.name,
        description: institution.introduction ?? institution.description ?? "Institution profile and available study information.",
        href: `/explore/institution-directory/${institution.slug}`,
      };
    }
  }

  if (item.type === "institution-offering") {
    const offering = resolvedInstitutionCampusOfferings.find(
      (entry) => entry.slug === item.id && entry.courseId === item.context?.courseId,
    );
    if (offering && item.context?.courseId) {
      const courseName = courseCatalog.find(
        (entry) => entry.id === item.context?.courseId,
      )?.name ?? item.context.courseName ?? item.context.courseId;
      const params = new URLSearchParams({
        course: item.context.courseId,
        courseName,
        field: item.context.fieldId ?? "",
      });
      if (item.context.stage) params.set("stage", item.context.stage);
      return {
        item,
        category: "institution",
        label: "Course-specific institution option",
        title: offering.institution.name,
        description: `Institution listing for ${courseName}${offering.campus.name ? ` · ${offering.campus.name}` : ""}.`,
        href: `/explore/institutions/${offering.slug}?${params.toString()}`,
      };
    }
  }

  if (item.type === "pathway") {
    const route = studyRoutes.find((entry) => entry.id === item.id);
    if (route) {
      const params = new URLSearchParams({ stage: route.stage });
      if (item.context?.fieldId) params.set("field", item.context.fieldId);
      return {
        item,
        category: "pathway",
        label: "Pathway",
        title: route.title,
        description: route.description,
        href: `/explore/pathways/${route.id}?${params.toString()}`,
      };
    }
  }

  if (item.type === "examination") {
    const examination = examinations.find((entry) => entry.id === item.id);
    if (examination) {
      return {
        item,
        category: "examination",
        label: "Examination",
        title: examination.name,
        description: examination.purpose,
        href: examination.id === "jee-main"
          ? `/explore/examinations/${examination.id}${item.context?.stage ? `?stage=${encodeURIComponent(item.context.stage)}` : ""}`
          : `/explore/examinations?${new URLSearchParams({
              q: examination.name,
              ...(item.context?.stage ? { stage: item.context.stage } : {}),
              ...(item.context?.fieldId ? { field: item.context.fieldId } : {}),
            }).toString()}`,
      };
    }
  }

  if (item.type === "scholarship") {
    const scholarship = scholarships.find((entry) => entry.id === item.id);
    if (scholarship) {
      return {
        item,
        category: "scholarship",
        label: "Scholarship",
        title: scholarship.name,
        description: scholarship.purpose,
        href: `/explore/scholarships/${scholarship.id}`,
      };
    }
  }

  return {
    item,
    category: item.type === "institution-offering" ? "institution" : item.type,
    label: item.type === "institution-offering" ? "Course-specific institution option" : item.type,
    title: "Saved item no longer available",
    description: "This item is no longer in the current catalogue. You can remove it from Saved.",
  };
}

function savedDate(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "Saved recently";
  if (days === 1) return "Saved yesterday";
  if (days < 7) return `Saved ${days} days ago`;
  return `Saved ${new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export default function SavedItemsPage() {
  const saved = useSavedItems();
  const [category, setCategory] = useState<SavedCategory | "all">("all");
  const [sort, setSort] = useState<SavedSort>("recent");
  const [search, setSearch] = useState("");
  const [undoItem, setUndoItem] = useState<SavedItem | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<SavedItem | null>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = confirmationRef.current;
    if (!dialog) return;
    if (pendingRemoval) dialog.showModal();
    else if (dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [pendingRemoval]);
  const resolved = useMemo(
    () => saved.status === "saved" ? saved.items.map(resolveItem) : [],
    [saved],
  );
  const query = search.trim().toLocaleLowerCase();
  const matchingItems = resolved
    .filter(({ category: itemCategory, title, description }) =>
      (category === "all" || category === itemCategory) &&
      (!query || `${title} ${description}`.toLocaleLowerCase().includes(query)),
    )
    .sort((a, b) => {
      if (sort === "recent") return b.item.savedAt - a.item.savedAt;
      if (sort === "oldest") return a.item.savedAt - b.item.savedAt;
      const nameOrder = a.title.localeCompare(b.title);
      return sort === "az" ? nameOrder : -nameOrder;
    });

  if (saved.status === "loading") {
    return <PageLoadingSkeleton variant="collection" showHeader={false} />;
  }

  function remove(item: SavedItem) {
    if (!removeSavedItem(item)) {
      setError("Saved items couldn’t be updated in this browser. Check your storage settings and try again.");
      return;
    }
    setError("");
    setUndoItem(item);
  }

  function undoRemove() {
    if (!undoItem) return;
    if (!addSavedItem(undoItem)) {
      setError("This item couldn’t be restored. Check your browser storage settings and try again.");
      return;
    }
    setUndoItem(null);
    setError("");
  }

  const unavailable = saved.status === "unavailable" || saved.status === "invalid";

  return (
    <main className="min-h-svh bg-[#fbfaf6] pb-20 text-[#18352d]">
      <Breadcrumbs
        items={[{ label: "Explore", href: "/explore" }, { label: "Saved" }]}
        className="pt-5 sm:pt-7"
      />
      <div className="cb-container pt-7 sm:pt-10">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[.13em] text-[#52715f]">
            Your collection
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl">
            Your saved items
          </h1>
          <p className="mt-3 text-base leading-7 text-[#59665e] sm:text-lg">
            Keep track of the fields, courses and opportunities you may want to explore again.
          </p>
          <p className="mt-3 text-sm text-[#718078]">
            Saved on this device · Not synced across devices
          </p>
        </header>

        {unavailable ? (
          <section role="alert" className="mt-8 rounded-2xl border border-[#e7d6a8] bg-[#fff8e8] p-6 text-[#594c32]">
            <h2 className="font-serif text-xl font-semibold">
              {saved.status === "invalid" ? "Saved items couldn’t be read." : "Saved items are unavailable."}
            </h2>
            <p className="mt-2 text-sm leading-6">
              {saved.status === "invalid"
                ? "Your saved data hasn’t been changed. Check this browser’s stored data before trying again."
                : "This browser couldn’t access local storage. Check your browser settings and reload this page."}
            </p>
          </section>
        ) : resolved.length === 0 ? (
          <section className="mt-9 rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-9">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eaf2ed] text-[#145543]">
              <Bookmark aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-serif text-2xl font-semibold sm:text-3xl">
              Nothing saved yet
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-[#59665e]">
              When you find a field, course, institution or opportunity you want to revisit, save it here.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Explore CareerBridge <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <section aria-label="Search saved items" className="mt-8 rounded-2xl border border-[#dce7df] bg-white p-4 sm:p-5">
              <label htmlFor="saved-search" className="sr-only">Search your saved items</label>
              <input
                id="saved-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your saved items..."
                className="min-h-12 w-full rounded-xl border border-[#cbd9cf] bg-[#fbfcfa] px-4 text-sm outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
              />
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap gap-2" aria-label="Filter by item type">
                  {categories.map((option) => {
                    const count = option.id === "all"
                      ? resolved.length
                      : resolved.filter((entry) => entry.category === option.id).length;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={category === option.id}
                        onClick={() => setCategory(option.id)}
                        className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
                          category === option.id
                            ? "bg-[#145543] text-white"
                            : "border border-[#dce7df] bg-white text-[#52645a] hover:bg-[#eaf2ed]"
                        }`}
                      >
                        {option.label} · {count}
                      </button>
                    );
                  })}
                </div>
                <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-[#52645a]">
                  Sort by
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SavedSort)}
                    className="min-h-10 cursor-pointer rounded-xl border border-[#dce7df] bg-white px-3 text-sm text-[#18352d] outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
                  >
                    <option value="recent">Recently saved</option>
                    <option value="oldest">Oldest saved</option>
                    <option value="az">Name A–Z</option>
                    <option value="za">Name Z–A</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="mt-8" aria-labelledby="saved-collection-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="saved-collection-title" className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
                    Your collection
                  </h2>
                  <p className="mt-1 text-sm text-[#718078]">
                    {sort === "recent" ? "Recently saved first" : sort === "oldest" ? "Oldest saved first" : sort === "az" ? "Name A–Z" : "Name Z–A"}
                  </p>
                </div>
                <p className="text-sm font-medium text-[#52645a]" aria-live="polite">
                  {matchingItems.length} {matchingItems.length === 1 ? "item" : "items"}
                </p>
              </div>

              {matchingItems.length ? (
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                  {matchingItems.map(({ item, label, title, description, href }) => (
                    <li key={savedItemKey(item)} className="flex h-full flex-col rounded-2xl border border-[#dce7df] bg-white p-5 transition-colors hover:border-[#b8d5c2] sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-h-7 items-center rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#315345]">
                          {label}
                        </span>
                        <p className="shrink-0 text-xs font-medium text-[#718078]">
                          {savedDate(item.savedAt)}
                        </p>
                      </div>
                      <h3 className="mt-4 font-serif text-xl font-semibold leading-snug tracking-[-.025em] sm:text-2xl">
                        {href ? (
                          <Link href={href} className="rounded-sm hover:text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                            {title}
                          </Link>
                        ) : title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#59665e]">
                        {description}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#edf1ed] pt-4">
                        {href && (
                          <Link href={href} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#eaf2ed] px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#dce9e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                            View <ArrowRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setPendingRemoval(item)}
                          aria-label={`Remove ${title} from Saved`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#ead4d0] bg-white px-4 text-sm font-semibold text-[#9b5148] transition-colors hover:border-[#dfb8b2] hover:bg-[#fff7f5] hover:text-[#843d35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b5148]"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl border border-[#dce7df] bg-white p-6">
                  <h3 className="font-serif text-xl font-semibold">No matching saved items</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                    Try another search or choose a different category.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
        {error && !unavailable && (
          <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] p-4 text-sm text-[#8b3529]">
            {error}
          </p>
        )}
        {undoItem && !error && !unavailable && (
          <p role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#eaf2ed] p-4 text-sm text-[#29483a]">
            Item removed from Saved.
            <button type="button" onClick={undoRemove} className="font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
              Undo
            </button>
          </p>
        )}
        <dialog
          ref={confirmationRef}
          aria-labelledby="saved-remove-title"
          aria-describedby="saved-remove-description"
          onCancel={(event) => {
            event.preventDefault();
            setPendingRemoval(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPendingRemoval(null);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[#dce7df] bg-white p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.3)] backdrop:bg-[#102d26]/50 backdrop:backdrop-blur-sm"
        >
          <div className="p-6 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fff0ed] text-[#9b5148]">
              <Trash2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 id="saved-remove-title" className="mt-5 font-serif text-2xl font-semibold">
              Remove this saved item?
            </h2>
            <p id="saved-remove-description" className="mt-2 text-sm leading-relaxed text-[#59665e]">
              {pendingRemoval
                ? `“${resolveItem(pendingRemoval).title}” will be removed from your Saved list. You can save it again later.`
                : ""}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setPendingRemoval(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dce7df] bg-white px-5 text-sm font-semibold text-[#52645a] transition-colors hover:bg-[#f4f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Keep item
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingRemoval) remove(pendingRemoval);
                  setPendingRemoval(null);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9b5148] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#843d35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b5148]"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Remove item
              </button>
            </div>
          </div>
        </dialog>
      </div>
    </main>
  );
}
