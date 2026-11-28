"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  FileSearch,
  History,
  Pause,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../../admin-ui";
import {
  formatLocalDate,
  isHttpUrl,
  scheduleValidationError,
} from "./collection-logic.mjs";
import {
  collectionCategories,
  createCollectionId,
  getFieldsForCategory,
  useAutomatedCollection,
  type CollectionCategory,
  type CollectionConfig,
  type CollectionFrequency,
  type CollectionRules,
  type CollectionSchedule,
  type CollectionScope,
} from "./collection-state";

const root = "/admin/data-intake/automated";
const fieldClass = "min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#17364a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]";
const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white hover:bg-[#205b51] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] disabled:cursor-not-allowed disabled:opacity-50";
const buttonQuiet = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]";
const badgeMuted = "inline-flex items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 py-1 text-xs font-semibold text-[#637572]";
const badgeAccent = "inline-flex items-center rounded-full border border-[#cfe3da] bg-[#edf6f1] px-2.5 py-1 text-xs font-semibold text-[#286c60]";
const badgeWarning = "inline-flex items-center rounded-full border border-[#ead9ae] bg-[#fbf7ea] px-2.5 py-1 text-xs font-semibold text-[#80631f]";
const regions = [
  "All Northeast India",
  "Assam",
  "Arunachal Pradesh",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
];
const scopeLabels: Record<CollectionScope, string> = {
  all: "All records in selected scope",
  selected: "Only selected records",
  "needing-updates": "Existing records needing updates",
  "discover-new": "Discover new records",
};

function PageNav() {
  const links = [
    ["Overview", root],
    ["New collection", `${root}/new`],
    ["Discovery", `${root}/discovery`],
    ["Configuration", `${root}/configuration`],
    ["Schedules", `${root}/schedules`],
    ["Fetched content", `${root}/fetched`],
    ["Extracted information", `${root}/extracted`],
    ["Changes", `${root}/changes`],
    ["History", `${root}/history`],
    ["Failures", `${root}/failures`],
    ["Rules", `${root}/rules`],
  ];
  return (
    <nav aria-label="Automated collection pages" className="flex gap-2 overflow-x-auto pb-1">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="shrink-0 rounded-full border border-[#dce5e0] bg-white px-3 py-2 text-xs font-semibold text-[#526b72] hover:border-[#9abbb0] hover:text-[#286c60]">
          {label}
        </Link>
      ))}
    </nav>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { storageError } = useAutomatedCollection();
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} />
      <PageNav />
      {storageError ? (
        <div role="alert" className="rounded-xl border border-[#ead0ca] bg-[#f7edeb] px-4 py-3 text-sm text-[#7d3f37]">
          {storageError} Refresh only after resolving the browser storage issue; existing settings have not been overwritten.
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] px-4 py-3.5 text-sm text-[#526c67]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#286c60]" />
          <p><strong className="font-semibold text-[#286c60]">Local workspace.</strong> Setup, schedules, and preferences are saved in this browser. Fetching, discovery, and job execution are not connected to a collection service.</p>
        </div>
      )}
      {children}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-xl border border-[#dce5e0] bg-white p-5">
      <p className="text-sm font-semibold text-[#526b72]">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#17364a]">{value}</p>
      <p className="mt-2 text-sm text-[#657976]">{detail}</p>
    </div>
  );
}

function EmptyOperation({
  title,
  detail,
  href = `${root}/new`,
  linkText = "Set up a collection",
}: {
  title: string;
  detail: string;
  href?: string | null;
  linkText?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#cbd9d1] bg-[#fbfcfb] px-6 py-10 text-center">
      <FileSearch aria-hidden="true" className="mx-auto size-8 text-[#77918a]" />
      <h3 className="mt-3 text-base font-semibold text-[#17364a]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#657976]">{detail}</p>
      {href ? <Link className={`${buttonSecondary} mt-5`} href={href}>{linkText}<ArrowRight className="size-4" /></Link> : null}
    </div>
  );
}

function FormError({ children }: { children: string }) {
  return <p role="alert" className="mt-2 text-sm font-medium text-[#9a4f43]">{children}</p>;
}

function CategoryLabel({ category }: { category: CollectionCategory }) {
  return <span className={badgeAccent}>{category}</span>;
}

export function AutomatedOverviewPage() {
  const { configs, schedules, globallyPaused } = useAutomatedCollection();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All statuses");
  const filtered = configs.filter((config) =>
    config.name.toLowerCase().includes(search.toLowerCase()) &&
    (category === "All categories" || config.category === category) &&
    (status === "All statuses" || (status === "Scheduled" ? schedules.some((schedule) => schedule.configId === config.id && schedule.active) : !schedules.some((schedule) => schedule.configId === config.id && schedule.active))),
  );
  const activeSchedules = schedules.filter((schedule) => schedule.active).length;
  const categoryCounts = collectionCategories.map((item) => ({
    category: item,
    count: configs.filter((config) => config.category === item).length,
  }));
  return (
    <PageFrame eyebrow="Data intake / Automated collection" title="Automated Collection" description="Configure collection workflows and review their status. No collection jobs run until a collection service is connected.">
      {globallyPaused ? <p role="status" className="rounded-lg border border-[#ead9ae] bg-[#fbf7ea] px-4 py-3 text-sm text-[#80631f]">All schedules are paused in this browser.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Collection configurations" value={configs.length} detail="Saved in this browser" />
        <Metric label="Active schedules" value={activeSchedules} detail="Configured; not executing" />
        <Metric label="Collection runs" value={0} detail="No collection service connected" />
        <Metric label="Items needing review" value={0} detail="No extraction results available" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <AdminSectionCard id="configurations" title="Collection configurations" description="Create and maintain collection scope, sources, and extraction fields." action={<Link href={`${root}/new`} className={buttonPrimary}><Plus className="size-4" />New collection</Link>}>
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(200px,1fr)_200px_180px]">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b72]">Search configurations</span><input className={fieldClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b72]">Category</span><select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{collectionCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#526b72]">Schedule</span><select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Scheduled</option><option>Unscheduled</option></select></label>
          </div>
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="border-b border-[#dfe7e2] text-xs font-semibold text-[#71817d]"><th scope="col" className="pb-3 pr-4">Collection</th><th scope="col" className="pb-3 pr-4">Category</th><th scope="col" className="pb-3 pr-4">Schedule</th><th scope="col" className="pb-3">Actions</th></tr></thead>
                <tbody className="divide-y divide-[#edf1ee]">{filtered.map((config) => {
                  const hasActiveSchedule = schedules.some((schedule) => schedule.configId === config.id && schedule.active);
                  return <tr key={config.id}><td className="py-3.5 pr-4"><span className="block font-semibold text-[#17364a]">{config.name}</span><span className="mt-1 block text-xs text-[#71817d]">{config.regions.join(", ") || "No region selected"}</span></td><td className="py-3.5 pr-4"><CategoryLabel category={config.category} /></td><td className="py-3.5 pr-4"><span className={hasActiveSchedule ? badgeAccent : badgeMuted}>{hasActiveSchedule ? "Configured" : "None"}</span></td><td className="py-3.5"><Link href={`${root}/configuration?id=${encodeURIComponent(config.id)}`} className={buttonQuiet}><Settings2 className="size-4" />Edit</Link></td></tr>;
                })}</tbody>
              </table>
            </div>
          ) : <EmptyOperation title={configs.length ? "No matching configurations" : "No collection configurations yet"} detail={configs.length ? "Change your search or filters to see other saved configurations." : "Create a configuration to define a category, scope, sources, and fields. Saving it does not start a fetch or create a schedule."} href={configs.length ? undefined : `${root}/new`} linkText="Create configuration" />}
        </AdminSectionCard>
        <AdminSectionCard id="next-actions" title="Collection workspace" description="Manage setup, schedules, and operational preferences.">
          <div className="space-y-3">
            <Link href={`${root}/schedules`} className="flex items-start gap-3 rounded-lg border border-[#dce5e0] p-4 hover:border-[#9abbb0]"><CalendarDays className="mt-0.5 size-5 text-[#286c60]" /><span><strong className="block text-sm text-[#17364a]">Schedules</strong><span className="mt-1 block text-sm text-[#657976]">{activeSchedules} active in this browser</span></span></Link>
            <Link href={`${root}/history`} className="flex items-start gap-3 rounded-lg border border-[#dce5e0] p-4 hover:border-[#9abbb0]"><History className="mt-0.5 size-5 text-[#286c60]" /><span><strong className="block text-sm text-[#17364a]">Collection history</strong><span className="mt-1 block text-sm text-[#657976]">No runs are available yet</span></span></Link>
            <Link href={`${root}/rules`} className="flex items-start gap-3 rounded-lg border border-[#dce5e0] p-4 hover:border-[#9abbb0]"><ShieldCheck className="mt-0.5 size-5 text-[#286c60]" /><span><strong className="block text-sm text-[#17364a]">Rules and preferences</strong><span className="mt-1 block text-sm text-[#657976]">Review safe defaults and local pause state</span></span></Link>
          </div>
        </AdminSectionCard>
      </div>
      <AdminSectionCard id="categories" title="Configurations by catalogue" description="Counts reflect configurations saved in this browser only.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categoryCounts.map(({ category: item, count }) => <div key={item} className="flex items-center justify-between rounded-lg border border-[#dce5e0] px-4 py-3"><span className="text-sm font-semibold text-[#405a5e]">{item}</span><span className={badgeMuted}>{count}</span></div>)}</div>
      </AdminSectionCard>
      <AdminSectionCard id="operations" title="Collection activity" description="Operational results will appear when the collection service is integrated.">
        <EmptyOperation title="No collection runs" detail="A saved configuration or schedule does not fetch information by itself. Run monitoring, fetched pages, extracted candidates, changes, and failures remain empty until a server-side collection service is available." href={null} />
      </AdminSectionCard>
    </PageFrame>
  );
}

const categoryDescriptions: Record<CollectionCategory, string> = {
  Fields: "Field descriptions and related information",
  Courses: "Course details and qualifications",
  Institutions: "Institution profiles and campuses",
  Pathways: "Education and training routes",
  Examinations: "Exam details and notifications",
  Scholarships: "Eligibility, benefits, and deadlines",
};

const emptyDraft = (): Omit<CollectionConfig, "id" | "createdAt" | "updatedAt"> => ({
  name: "",
  category: "Institutions",
  regions: ["All Northeast India"],
  scope: "discover-new",
  target: "",
  useRegisteredSources: true,
  discoverOfficialSources: false,
  startingUrls: [],
  fields: getFieldsForCategory("Institutions"),
  discoveryDepth: "Relevant pages only",
  includeHtml: true,
  includePdf: true,
  permittedDocumentsOnly: true,
  changeDetection: true,
});

export function NewCollectionPage() {
  const router = useRouter();
  const { saveConfig } = useAutomatedCollection();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(emptyDraft);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const update = <K extends keyof ReturnType<typeof emptyDraft>>(key: K, value: ReturnType<typeof emptyDraft>[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const toggleRegion = (region: string) => {
    setDraft((current) => {
      if (region === "All Northeast India") return { ...current, regions: [region] };
      const selected = current.regions.filter((item) => item !== "All Northeast India");
      const next = selected.includes(region) ? selected.filter((item) => item !== region) : [...selected, region];
      return { ...current, regions: next };
    });
  };
  const addUrl = () => {
    const url = urlInput.trim();
    if (!isHttpUrl(url)) {
      setError("Enter a valid http or https URL.");
      return;
    }
    if (draft.startingUrls.includes(url)) {
      setError("That URL is already in this collection.");
      return;
    }
    update("startingUrls", [...draft.startingUrls, url]);
    setUrlInput("");
    setError("");
  };
  const continueStep = () => {
    if (step === 1 && !draft.name.trim()) return setError("Enter a name for this collection.");
    if (step === 2 && !draft.regions.length) return setError("Select at least one region.");
    if (step === 2 && draft.scope === "selected" && !draft.target.trim()) return setError("Enter the record or records to include.");
    if (step === 3 && !draft.useRegisteredSources && !draft.discoverOfficialSources && !draft.startingUrls.length) return setError("Choose a source option or add a starting URL.");
    setError("");
    setStep((current) => Math.min(4, current + 1));
  };
  const save = () => {
    const now = new Date().toISOString();
    const id = createCollectionId();
    saveConfig({ ...draft, id, createdAt: now, updatedAt: now });
    router.push(`${root}/configuration?id=${encodeURIComponent(id)}`);
  };
  const steps = ["Category", "Scope", "Sources", "Review"];
  return (
    <PageFrame eyebrow={`Automated collection / Setup / Step ${step} of 4`} title="Create collection configuration" description="Set up what to collect and where to look. This saves a local configuration; it does not start discovery or fetching.">
      <div className="grid grid-cols-4 gap-2" aria-label="Collection setup progress">{steps.map((label, index) => <div key={label} className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${index + 1 <= step ? "bg-[#edf6f1] text-[#286c60]" : "bg-[#f3f5f3] text-[#82918c]"}`}><span className="block">{index + 1}</span>{label}</div>)}</div>
      {step === 1 ? <AdminSectionCard id="category" title="Name and category" description="Choose the catalogue record type this collection is intended to support.">
        <div className="grid gap-4 md:grid-cols-[minmax(250px,.7fr)_minmax(0,1.3fr)]">
          <label><span className="mb-2 block text-sm font-semibold text-[#17364a]">Collection name <span aria-hidden="true">*</span></span><input autoFocus className={fieldClass} value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Assam institution profiles" maxLength={100} /></label>
          <fieldset><legend className="mb-2 text-sm font-semibold text-[#17364a]">Catalogue category</legend><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{collectionCategories.map((item) => <label key={item} className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border p-3 ${draft.category === item ? "border-[#8bb3a6] bg-[#edf6f1]" : "border-[#dce5e0]"}`}><input type="radio" name="category" checked={draft.category === item} onChange={() => { update("category", item); update("fields", getFieldsForCategory(item)); }} /><span><strong className="block text-sm text-[#17364a]">{item}</strong><span className="mt-1 block text-xs leading-5 text-[#657976]">{categoryDescriptions[item]}</span></span></label>)}</div></fieldset>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#657976]">Campuses and course offerings are supporting record types; configure them through their related institution or course collection.</p>
      </AdminSectionCard> : null}
      {step === 2 ? <AdminSectionCard id="scope" title="Collection scope" description="Select geographic coverage and the records that are in scope.">
        <fieldset><legend className="mb-3 text-sm font-semibold text-[#17364a]">Regions</legend><div className="flex flex-wrap gap-2">{regions.map((region) => <label key={region} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${draft.regions.includes(region) ? "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]" : "border-[#dce5e0] text-[#637572]"}`}><input type="checkbox" className="sr-only" checked={draft.regions.includes(region)} onChange={() => toggleRegion(region)} />{draft.regions.includes(region) ? <Check aria-hidden="true" className="size-3.5" /> : null}{region}</label>)}</div></fieldset>
        <fieldset className="mt-6"><legend className="mb-3 text-sm font-semibold text-[#17364a]">Records to include</legend><div className="grid gap-2 md:grid-cols-2">{(Object.entries(scopeLabels) as [CollectionScope, string][]).map(([value, label]) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#dce5e0] px-3 text-sm text-[#405a5e]"><input type="radio" name="scope" checked={draft.scope === value} onChange={() => update("scope", value)} />{label}</label>)}</div></fieldset>
        {draft.scope === "selected" ? <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Record name or identifier <span aria-hidden="true">*</span></span><input className={fieldClass} value={draft.target} onChange={(event) => update("target", event.target.value)} placeholder="Enter the specific record(s)" /></label> : null}
      </AdminSectionCard> : null}
      {step === 3 ? <AdminSectionCard id="sources" title="Source selection" description="Choose intended sources. Discovery and retrieval are unavailable until their service is connected.">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce5e0] p-4"><input type="checkbox" checked={draft.useRegisteredSources} onChange={(event) => update("useRegisteredSources", event.target.checked)} /><span><strong className="block text-sm text-[#17364a]">Use registered sources</strong><span className="mt-1 block text-sm leading-5 text-[#657976]">Include registered source records when a source integration is available.</span></span></label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce5e0] p-4"><input type="checkbox" checked={draft.discoverOfficialSources} onChange={(event) => update("discoverOfficialSources", event.target.checked)} /><span><strong className="block text-sm text-[#17364a]">Discover official sources</strong><span className="mt-1 block text-sm leading-5 text-[#657976]">Store this intent for a future connected discovery workflow; no search is performed now.</span></span></label>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Starting URL</span><input className={fieldClass} type="url" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://official-source.example" /></label><button type="button" onClick={addUrl} className={`${buttonSecondary} self-end`}><Plus className="size-4" />Add URL</button></div>
        {error && step === 3 ? <FormError>{error}</FormError> : null}
        {draft.startingUrls.length ? <ul className="mt-4 space-y-2">{draft.startingUrls.map((url) => <li key={url} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8faf8] px-3 py-2 text-sm"><span className="break-all text-[#405a5e]">{url}</span><button type="button" aria-label={`Remove ${url}`} className={buttonQuiet} onClick={() => update("startingUrls", draft.startingUrls.filter((item) => item !== url))}><Trash2 className="size-4" />Remove</button></li>)}</ul> : <p className="mt-3 text-sm text-[#657976]">No starting URLs added.</p>}
        <div className="mt-5 rounded-lg border border-[#ead9ae] bg-[#fbf7ea] p-4 text-sm leading-6 text-[#705c2a]">Respect source terms, access restrictions, and rate limits. Adding a URL does not fetch it or grant permission to access it.</div>
      </AdminSectionCard> : null}
      {step === 4 ? <AdminSectionCard id="review" title="Review configuration" description="Check the local configuration before saving. No collection run will be started.">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{[
          ["Name", draft.name],
          ["Category", draft.category],
          ["Regions", draft.regions.join(", ") || "None"],
          ["Record scope", scopeLabels[draft.scope]],
          ["Specific target", draft.target || "Not specified"],
          ["Registered sources", draft.useRegisteredSources ? "Include" : "Do not include"],
          ["Official source discovery", draft.discoverOfficialSources ? "Requested (not connected)" : "Not requested"],
          ["Starting URLs", draft.startingUrls.length ? draft.startingUrls.join(", ") : "None"],
        ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">{label}</dt><dd className="mt-1 break-words text-sm text-[#17364a]">{value}</dd></div>)}</dl>
        <div className="mt-5 rounded-lg bg-[#f8faf8] p-4"><p className="text-sm font-semibold text-[#17364a]">After a collection service is connected</p><p className="mt-1 text-sm leading-6 text-[#657976]">This configuration can be used to discover allowed sources, retrieve content, extract candidate information, compare changes, and send results for human review.</p></div>
      </AdminSectionCard> : null}
      {error && step !== 3 ? <FormError>{error}</FormError> : null}
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" disabled={step === 1} onClick={() => { setError(""); setStep((current) => Math.max(1, current - 1)); }} className={buttonSecondary}><ArrowLeft className="size-4" />Back</button>
        {step < 4 ? <button type="button" onClick={continueStep} className={buttonPrimary}>Continue<ArrowRight className="size-4" /></button> : <button type="button" onClick={save} className={buttonPrimary}><Check className="size-4" />Save configuration</button>}
      </div>
    </PageFrame>
  );
}

export function ConfigurationPage({ configId }: { configId?: string }) {
  const { configs } = useAutomatedCollection();
  const config = configs.find((item) => item.id === configId) ?? configs[0];
  return <PageFrame eyebrow="Automated collection / Configuration" title="Collection configuration" description="Review or edit the saved collection scope and extraction settings.">
    {config ? <ConfigurationEditor key={config.id} config={config} /> : <EmptyOperation title="No saved configuration" detail="Create a collection configuration first. It will be stored in this browser until this implementation is connected to a persistent service." />}
  </PageFrame>;
}

function ConfigurationEditor({ config }: { config: CollectionConfig }) {
  const router = useRouter();
  const { saveConfig, deleteConfig, schedules } = useAutomatedCollection();
  const [draft, setDraft] = useState(config);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggleField = (field: string) => setDraft((current) => ({ ...current, fields: current.fields.includes(field) ? current.fields.filter((item) => item !== field) : [...current.fields, field] }));
  const toggleRegion = (region: string) => setDraft((current) => {
    if (region === "All Northeast India") return { ...current, regions: [region] };
    const selected = current.regions.filter((item) => item !== "All Northeast India");
    const next = selected.includes(region) ? selected.filter((item) => item !== region) : [...selected, region];
    return { ...current, regions: next };
  });
  const save = () => {
    if (!draft.name.trim()) {
      setMessage("A collection name is required.");
      return;
    }
    saveConfig({ ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() });
    setMessage("Configuration saved in this browser.");
  };
  const remove = () => {
    deleteConfig(config.id);
    router.push(root);
  };
  const scheduleCount = schedules.filter((schedule) => schedule.configId === config.id).length;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className={badgeMuted}>Created {new Date(config.createdAt).toLocaleDateString()}</span><div className="flex flex-wrap gap-2"><Link href={`${root}/schedules`} className={buttonSecondary}><CalendarDays className="size-4" />Schedules ({scheduleCount})</Link><Link href={`${root}/discovery`} className={buttonSecondary}>Source discovery</Link></div></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <AdminSectionCard id="basic" title="Basic information" description="Update the collection name and scope.">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-[#17364a]">Collection name</span><input className={fieldClass} maxLength={100} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
        <p className="mt-4 text-sm font-semibold text-[#17364a]">Catalogue category</p><div className="mt-2"><CategoryLabel category={config.category} /></div>
        <fieldset className="mt-5"><legend className="mb-2 text-sm font-semibold text-[#405a5e]">Region(s)</legend><div className="flex flex-wrap gap-2">{regions.map((region) => <label key={region} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#dce5e0] px-3 py-2 text-xs font-semibold text-[#526b72]"><input type="checkbox" checked={draft.regions.includes(region)} onChange={() => toggleRegion(region)} />{region}</label>)}</div></fieldset>
        <fieldset className="mt-5"><legend className="mb-2 text-sm font-semibold text-[#405a5e]">Record scope</legend><div className="space-y-2">{(Object.entries(scopeLabels) as [CollectionScope, string][]).map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[#dce5e0] px-3 text-sm text-[#405a5e]"><input type="radio" name={`scope-${config.id}`} checked={draft.scope === value} onChange={() => setDraft((current) => ({ ...current, scope: value }))} />{label}</label>)}</div></fieldset>
        {draft.scope === "selected" ? <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Record name or identifier</span><input className={fieldClass} value={draft.target} onChange={(event) => setDraft((current) => ({ ...current, target: event.target.value }))} placeholder="Enter the specific record(s)" /></label> : null}
      </AdminSectionCard>
      <AdminSectionCard id="fields" title="Information to collect" description={`Choose fields relevant to ${config.category}.`}>
        <div className="grid gap-2 sm:grid-cols-2">{getFieldsForCategory(config.category).map((field) => <label key={field} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[#dce5e0] px-3 text-sm text-[#405a5e]"><input type="checkbox" checked={draft.fields.includes(field)} onChange={() => toggleField(field)} />{field}</label>)}</div>
      </AdminSectionCard>
      <AdminSectionCard id="collection-options" title="Collection options" description="These settings describe the intended service behavior; no fetching is active.">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Discovery depth</span><select className={fieldClass} value={draft.discoveryDepth} onChange={(event) => setDraft((current) => ({ ...current, discoveryDepth: event.target.value }))}><option>Selected pages only</option><option>Relevant pages only</option><option>One level from starting pages</option><option>Two levels from starting pages</option></select></label>
        <div className="mt-4 space-y-3">{[
          ["includeHtml", "Include HTML pages"],
          ["includePdf", "Include PDF documents"],
          ["permittedDocumentsOnly", "Only process documents with permitted access"],
          ["changeDetection", "Compare against existing source versions"],
        ].map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[#dce5e0] px-3 py-3 text-sm text-[#405a5e]"><span>{label}</span><input type="checkbox" checked={draft[key as "includeHtml" | "includePdf" | "permittedDocumentsOnly" | "changeDetection"]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div>
      </AdminSectionCard>
      <AdminSectionCard id="sources" title="Source settings" description="Selected URLs are stored with this configuration; they have not been accessed.">
        <div className="space-y-2">{draft.startingUrls.length ? draft.startingUrls.map((url) => <div key={url} className="break-all rounded-lg bg-[#f8faf8] px-3 py-2 text-sm text-[#405a5e]">{url}</div>) : <p className="text-sm text-[#657976]">No starting URLs saved.</p>}</div>
        <div className="mt-4 flex flex-wrap gap-2"><span className={draft.useRegisteredSources ? badgeAccent : badgeMuted}>{draft.useRegisteredSources ? "Registered sources requested" : "Registered sources not selected"}</span><span className={draft.discoverOfficialSources ? badgeAccent : badgeMuted}>{draft.discoverOfficialSources ? "Official discovery requested" : "Discovery not selected"}</span></div>
        <Link href={`${root}/discovery`} className={`${buttonSecondary} mt-4`}>Manage starting URLs<ArrowRight className="size-4" /></Link>
      </AdminSectionCard>
    </div>
    {message ? <p role="status" className="text-sm font-semibold text-[#286c60]">{message}</p> : null}
    <div className="flex flex-wrap justify-between gap-3">
      <div>{confirmDelete ? <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-[#9a4f43]">Delete this configuration and its local schedules?</span><button type="button" onClick={remove} className="rounded-lg bg-[#9a4f43] px-3 py-2 text-sm font-semibold text-white">Confirm delete</button><button type="button" onClick={() => setConfirmDelete(false)} className={buttonSecondary}>Keep</button></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#9a4f43] hover:bg-[#f7edeb]"><Trash2 className="size-4" />Delete configuration</button>}</div>
      <button type="button" onClick={save} className={buttonPrimary}><Check className="size-4" />Save changes</button>
    </div>
  </>;
}

export function DiscoveryPage() {
  const { configs, saveConfig } = useAutomatedCollection();
  const [configId, setConfigId] = useState(configs[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const selectedConfig = configs.find((item) => item.id === configId) ?? configs[0];
  const addStartingUrl = () => {
    if (!selectedConfig) return;
    const value = url.trim();
    if (!isHttpUrl(value)) {
      setMessage("Enter a valid http or https URL.");
      return;
    }
    if (selectedConfig.startingUrls.includes(value)) {
      setMessage("This URL is already saved.");
      return;
    }
    saveConfig({ ...selectedConfig, startingUrls: [...selectedConfig.startingUrls, value], updatedAt: new Date().toISOString() });
    setUrl("");
    setMessage("Starting URL saved. It has not been visited or checked.");
  };
  const removeStartingUrl = (value: string) => {
    if (!selectedConfig) return;
    saveConfig({ ...selectedConfig, startingUrls: selectedConfig.startingUrls.filter((item) => item !== value), updatedAt: new Date().toISOString() });
    setMessage("Starting URL removed from this configuration.");
  };
  return <PageFrame eyebrow="Automated collection / Source discovery" title="Source discovery" description="Manage starting points for a collection. Automatic web discovery and URL checks are not connected.">
    {configs.length ? <>
      <AdminSectionCard id="discovery-config" title="Choose a collection" description="Starting URLs belong to a saved collection configuration.">
        <label className="block max-w-xl"><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Collection</span><select className={fieldClass} value={selectedConfig?.id ?? ""} onChange={(event) => setConfigId(event.target.value)}>{configs.map((config) => <option key={config.id} value={config.id}>{config.name} — {config.category}</option>)}</select></label>
      </AdminSectionCard>
      {selectedConfig ? <AdminSectionCard id="starting-urls" title="Starting URLs" description="Save known URLs as configuration data; this does not contact the host.">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Website or document URL</span><input className={fieldClass} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://official-source.example" /></label><button type="button" onClick={addStartingUrl} className={`${buttonSecondary} self-end`}><Plus className="size-4" />Add URL</button></div>
        {message ? <p role="status" className="mt-3 text-sm text-[#286c60]">{message}</p> : null}
        <div className="mt-5 space-y-2">{selectedConfig.startingUrls.length ? selectedConfig.startingUrls.map((item) => <div key={item} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#dce5e0] px-3 py-3"><span className="break-all text-sm text-[#405a5e]">{item}</span><button type="button" onClick={() => removeStartingUrl(item)} className={buttonQuiet}><Trash2 className="size-4" />Remove</button></div>) : <p className="text-sm text-[#657976]">No starting URLs saved for this configuration.</p>}</div>
      </AdminSectionCard> : null}
      <AdminSectionCard id="discovery-status" title="Automated discovery" description="The discovery adapter is not available in this frontend.">
        <div className="flex items-start gap-3 rounded-lg border border-[#ead9ae] bg-[#fbf7ea] p-4"><CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#80631f]" /><p className="text-sm leading-6 text-[#705c2a]">No web search, page fetch, authority check, or domain validation is performed. Official-source discovery requires a backend integration and server-side access policy.</p></div>
      </AdminSectionCard>
    </> : <EmptyOperation title="Create a configuration before adding starting URLs" detail="A source list is tied to a collection's category and scope." />}
  </PageFrame>;
}

const frequencies: CollectionFrequency[] = ["Hourly", "Daily", "Weekly", "Monthly", "Quarterly", "Custom"];
const newSchedule = (configId: string): CollectionSchedule => {
  const now = new Date();
  return {
    id: createCollectionId(),
    configId,
    frequency: "Weekly",
    startDate: formatLocalDate(now),
    time: "09:00",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    endDate: "",
    retryTemporaryFailures: true,
    notifyOnChanges: true,
    active: true,
  };
};

export function SchedulesPage() {
  const { configs, schedules, saveSchedule, deleteSchedule, globallyPaused } = useAutomatedCollection();
  const [editing, setEditing] = useState<CollectionSchedule | null>(null);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const startNew = () => {
    if (!configs.length) return setError("Create a collection configuration before scheduling it.");
    setError("");
    setEditing(newSchedule(configs[0].id));
  };
  const save = () => {
    if (!editing) return;
    const validationError = scheduleValidationError(editing);
    if (validationError) {
      setError(validationError);
      return;
    }
    saveSchedule(editing);
    setEditing(null);
    setError("");
  };
  return <PageFrame eyebrow="Automated collection / Schedules" title="Schedules" description="Save recurring collection preferences locally. These schedules are not sent to a scheduler and will not execute.">
    <AdminSectionCard id="schedules" title="Collection schedules" description="Each schedule is associated with one saved collection." action={<div className="flex flex-wrap gap-2"><Link href={`${root}/schedules/calendar`} className={buttonSecondary}><CalendarDays className="size-4" />Calendar</Link><button type="button" onClick={startNew} className={buttonPrimary}><CalendarDays className="size-4" />Create schedule</button></div>}>
      {globallyPaused ? <p className="mb-4 rounded-lg border border-[#ead9ae] bg-[#fbf7ea] px-3 py-2 text-sm text-[#80631f]">Global pause is on. Schedules are marked active but paused locally.</p> : null}
      {schedules.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-[#dfe7e2] text-xs font-semibold text-[#71817d]"><th scope="col" className="pb-3 pr-4">Collection</th><th scope="col" className="pb-3 pr-4">Frequency</th><th scope="col" className="pb-3 pr-4">Start</th><th scope="col" className="pb-3 pr-4">Status</th><th scope="col" className="pb-3">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ee]">{schedules.map((schedule) => {
        const collection = configs.find((item) => item.id === schedule.configId);
        return <tr key={schedule.id}><td className="py-3.5 pr-4"><strong className="block text-[#17364a]">{collection?.name ?? "Missing configuration"}</strong><span className="mt-1 block text-xs text-[#71817d]">{schedule.time} · {schedule.timeZone}</span></td><td className="py-3.5 pr-4 text-[#526b72]">{schedule.frequency}</td><td className="py-3.5 pr-4 text-[#526b72]">{schedule.startDate}{schedule.endDate ? ` – ${schedule.endDate}` : " · no end date"}</td><td className="py-3.5 pr-4"><span className={schedule.active && !globallyPaused ? badgeAccent : badgeMuted}>{globallyPaused && schedule.active ? "Globally paused" : schedule.active ? "Active locally" : "Paused"}</span></td><td className="py-3.5"><div className="flex flex-wrap gap-1"><Link className={buttonQuiet} href={`${root}/schedules/${encodeURIComponent(schedule.id)}`}>Details</Link><button type="button" className={buttonQuiet} onClick={() => { setEditing(schedule); setError(""); }}>Edit</button><button type="button" className={buttonQuiet} onClick={() => saveSchedule({ ...schedule, active: !schedule.active })}>{schedule.active ? <Pause className="size-4" /> : <Play className="size-4" />}{schedule.active ? "Pause" : "Resume"}</button>{deleteId === schedule.id ? <><button type="button" className="text-sm font-semibold text-[#9a4f43]" onClick={() => { deleteSchedule(schedule.id); setDeleteId(""); }}>Confirm</button><button type="button" className={buttonQuiet} onClick={() => setDeleteId("")}>Keep</button></> : <button type="button" className={buttonQuiet} onClick={() => setDeleteId(schedule.id)} aria-label={`Delete schedule for ${collection?.name ?? "collection"}`}><Trash2 className="size-4" /></button>}</div></td></tr>;
      })}</tbody></table></div> : <EmptyOperation title="No schedules configured" detail="Create a schedule after saving at least one collection configuration. Saving schedule preferences does not activate a background worker." href={configs.length ? undefined : `${root}/new`} linkText="Create a collection" />}
    </AdminSectionCard>
    {error ? <FormError>{error}</FormError> : null}
    {editing ? <AdminSectionCard id="schedule-form" title={schedules.some((item) => item.id === editing.id) ? "Edit schedule" : "New schedule"} description="Choose when this configuration would run once a scheduler is connected." action={<button type="button" className={buttonQuiet} onClick={() => setEditing(null)}>Close</button>}>
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Collection <span aria-hidden="true">*</span></span><select className={fieldClass} value={editing.configId} onChange={(event) => setEditing({ ...editing, configId: event.target.value })}>{configs.map((config) => <option key={config.id} value={config.id}>{config.name}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Frequency</span><select className={fieldClass} value={editing.frequency} onChange={(event) => setEditing({ ...editing, frequency: event.target.value as CollectionFrequency })}>{frequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Start date</span><input className={fieldClass} type="date" value={editing.startDate} onChange={(event) => setEditing({ ...editing, startDate: event.target.value })} /></label>
        <label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Time</span><input className={fieldClass} type="time" value={editing.time} onChange={(event) => setEditing({ ...editing, time: event.target.value })} /></label>
        <label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">Time zone</span><input className={fieldClass} value={editing.timeZone} onChange={(event) => setEditing({ ...editing, timeZone: event.target.value })} placeholder="e.g. Asia/Kolkata" /></label>
        <label><span className="mb-2 block text-sm font-semibold text-[#405a5e]">End date (optional)</span><input className={fieldClass} type="date" value={editing.endDate} onChange={(event) => setEditing({ ...editing, endDate: event.target.value })} min={editing.startDate} /></label>
      </div>
      <fieldset className="mt-5"><legend className="mb-2 text-sm font-semibold text-[#405a5e]">Repeat interval</legend><div className="flex flex-wrap gap-2">{frequencies.map((frequency) => <label key={frequency} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${editing.frequency === frequency ? "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]" : "border-[#dce5e0] text-[#637572]"}`}><input className="sr-only" type="radio" name="frequency" value={frequency} checked={editing.frequency === frequency} onChange={() => setEditing({ ...editing, frequency })} />{frequency}</label>)}</div></fieldset>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="flex items-center justify-between gap-3 rounded-lg border border-[#dce5e0] px-3 py-3 text-sm text-[#405a5e]">Retry temporary failures<input type="checkbox" checked={editing.retryTemporaryFailures} onChange={(event) => setEditing({ ...editing, retryTemporaryFailures: event.target.checked })} /></label><label className="flex items-center justify-between gap-3 rounded-lg border border-[#dce5e0] px-3 py-3 text-sm text-[#405a5e]">Notify when changes are detected<input type="checkbox" checked={editing.notifyOnChanges} onChange={(event) => setEditing({ ...editing, notifyOnChanges: event.target.checked })} /></label></div>
      <div className="mt-5 flex justify-end"><button type="button" onClick={save} className={buttonPrimary}><Check className="size-4" />Save schedule</button></div>
    </AdminSectionCard> : null}
    <div className="rounded-xl border border-[#dce5e0] bg-white p-4 text-sm leading-6 text-[#657976]"><Clock3 aria-hidden="true" className="mr-2 inline size-4" />Scheduled execution, retries, notifications, and time-zone handling require a connected server-side scheduler.</div>
  </PageFrame>;
}

export function ScheduleCalendarPage() {
  const { schedules, configs, globallyPaused } = useAutomatedCollection();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dateKey = (day: number) => `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
  return <PageFrame eyebrow="Automated collection / Schedules / Calendar" title="Schedule calendar" description="View configured start dates. These are local schedule preferences, not actual or guaranteed execution times.">
    <AdminSectionCard id="schedule-calendar" title={monthLabel} description="Only each schedule's configured start date is shown; recurrence previews are not execution records." action={<div className="flex gap-2"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className={buttonSecondary}><ArrowLeft className="size-4" /></button><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className={buttonSecondary}><ArrowRight className="size-4" /></button></div>}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-7 border-l border-t border-[#dce5e0]">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => <div key={day} className="border-b border-r border-[#dce5e0] bg-[#f8faf8] px-2 py-3 text-center text-xs font-semibold text-[#526b72]">{day}</div>)}
          {cells.map((day, index) => {
            const daySchedules = day === null ? [] : schedules.filter((schedule) => schedule.startDate === dateKey(day));
            return <div key={index} className={`min-h-28 border-b border-r border-[#dce5e0] p-2 ${day === null ? "bg-[#fbfcfb]" : "bg-white"}`}>
              {day !== null ? <><span className="text-xs font-semibold text-[#526b72]">{day}</span><div className="mt-2 space-y-1">{daySchedules.map((schedule) => {
                const config = configs.find((item) => item.id === schedule.configId);
                return <Link key={schedule.id} href={`${root}/schedules/${encodeURIComponent(schedule.id)}`} className="block rounded-md bg-[#edf6f1] px-2 py-1 text-xs font-medium leading-4 text-[#286c60] hover:bg-[#dcefe5]">{config?.name ?? "Missing configuration"}<span className="mt-0.5 block text-[10px]">{globallyPaused && schedule.active ? "Paused" : schedule.active ? "Start date · not executed" : "Inactive"}</span></Link>;
              })}</div></> : null}
            </div>;
          })}
        </div>
      </div>
      {schedules.length === 0 ? <p className="mt-4 text-sm text-[#657976]">No schedule start dates to display. Create a schedule to add a locally saved date.</p> : null}
    </AdminSectionCard>
    <p className="text-xs leading-5 text-[#657976]">Hourly/daily/weekly recurrence, daylight-saving adjustments, retries, and actual execution are managed by a server-side scheduler and are not simulated here.</p>
  </PageFrame>;
}

export function RulesPage() {
  const { rules, saveRules, globallyPaused, setGloballyPaused } = useAutomatedCollection();
  const [draft, setDraft] = useState<CollectionRules>(rules);
  const [message, setMessage] = useState("");
  const [confirmPause, setConfirmPause] = useState(false);
  const save = () => {
    if (draft.discoveryDepth < 0 || draft.discoveryDepth > 10 || draft.maximumFileSizeMb < 1 || draft.maximumFileSizeMb > 500 || draft.retryLimit < 0 || draft.retryLimit > 10) {
      setMessage("Depth must be 0–10, file size 1–500 MB, and retries 0–10.");
      return;
    }
    saveRules(draft);
    setMessage("Preferences saved in this browser. Server-side safety limits are not changed.");
  };
  const toggle = (key: keyof CollectionRules) => setDraft((current) => ({ ...current, [key]: !current[key] }));
  return <PageFrame eyebrow="Automated collection / Rules" title="Collection rules & preferences" description="Configure local defaults for a future connected collection service. These are not server-side enforcement controls.">
    <div className="grid gap-5 lg:grid-cols-2">
      <AdminSectionCard id="behaviour" title="Default review behaviour" description="Human review remains required before catalogue changes are published.">
        <div className="space-y-3">{[
          ["compareExistingData", "Compare extracted data against existing catalogue data"],
          ["preserveSourceVersions", "Preserve source versions and evidence"],
          ["requireReview", "Require human review before publication"],
          ["autoPublishLowRisk", "Automatically publish low-risk changes"],
        ].map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-[#dce5e0] px-3 py-3 text-sm text-[#405a5e]"><span>{label}</span><input type="checkbox" checked={draft[key as keyof CollectionRules] as boolean} onChange={() => toggle(key as keyof CollectionRules)} /></label>)}</div>
        <p className="mt-3 text-xs leading-5 text-[#657976]">Automatic publication remains off by default. Local preference changes cannot override server permissions or workflow policy.</p>
      </AdminSectionCard>
      <AdminSectionCard id="limits" title="Preferred collection limits" description="Displayed as local preferences only; enforce limits in the future service.">
        <div className="space-y-4">{[
          ["discoveryDepth", "Maximum discovery depth", 0, 10],
          ["maximumFileSizeMb", "Maximum document size (MB)", 1, 500],
          ["retryLimit", "Retry attempts", 0, 10],
        ].map(([key, label, min, max]) => <label key={key as string} className="block"><span className="mb-2 block text-sm font-semibold text-[#405a5e]">{label as string}</span><input className={`${fieldClass} max-w-xs`} type="number" min={min as number} max={max as number} value={draft[key as keyof CollectionRules] as number} onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div>
      </AdminSectionCard>
    </div>
    <AdminSectionCard id="source-priority" title="Source review priorities" description="Guidance for human review; these labels do not validate or rank source content.">
      <ol className="grid gap-2 sm:grid-cols-2">{["Official institution sources", "Government sources", "Recognised regulators and authorities", "Other sources requiring additional scrutiny"].map((item, index) => <li key={item} className="flex items-center gap-3 rounded-lg bg-[#f8faf8] p-3 text-sm text-[#405a5e]"><span className={badgeMuted}>{index + 1}</span>{item}</li>)}</ol>
    </AdminSectionCard>
    <AdminSectionCard id="automation-controls" title="Schedule pause" description="A local display preference. It does not stop or start a server-side worker." action={<span className={globallyPaused ? badgeWarning : badgeMuted}>{globallyPaused ? "Paused locally" : "Not paused"}</span>}>
      {!globallyPaused ? <button type="button" onClick={() => setConfirmPause(true)} className={buttonSecondary}><Pause className="size-4" />Pause schedules locally</button> : <button type="button" onClick={() => setGloballyPaused(false)} className={buttonSecondary}><Play className="size-4" />Resume schedules locally</button>}
      {confirmPause ? <div role="alertdialog" aria-label="Confirm pause schedules" className="mt-4 rounded-lg border border-[#ead9ae] bg-[#fbf7ea] p-4"><p className="text-sm text-[#705c2a]">Mark all schedules as paused in this browser?</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setGloballyPaused(true); setConfirmPause(false); }} className={buttonPrimary}>Confirm pause</button><button type="button" onClick={() => setConfirmPause(false)} className={buttonSecondary}>Cancel</button></div></div> : null}
    </AdminSectionCard>
    {message ? <p role="status" className="text-sm font-semibold text-[#286c60]">{message}</p> : null}
    <div className="flex justify-end"><button type="button" onClick={save} className={buttonPrimary}><Check className="size-4" />Save preferences</button></div>
  </PageFrame>;
}

function OperationUnavailable({
  eyebrow,
  title,
  description,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  id?: string;
  children?: ReactNode;
}) {
  return <PageFrame eyebrow={eyebrow} title={title} description={description}>
    {children}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[["Fetched content", `${root}/fetched`], ["Extracted information", `${root}/extracted`], ["Change detection", `${root}/changes`], ["Failed fetches", `${root}/failures`]].map(([label, href]) => <Link key={href} href={href} className="rounded-lg border border-[#dce5e0] bg-white p-4 text-sm font-semibold text-[#286c60] hover:border-[#9abbb0]">{label}<ArrowRight aria-hidden="true" className="ml-2 inline size-4" /></Link>)}
    </div>
    <AdminSectionCard id="operation-state" title={id ? `Requested item: ${id}` : "No operation data"} description="Results are sourced from collection runs and are not fabricated in the frontend.">
      <EmptyOperation title="Collection service not connected" detail="This view is ready for run, fetch, extraction, comparison, and failure records. No job has executed here, so there is no real operational data to display or act on." href={`${root}/configuration`} linkText="Review configurations" />
    </AdminSectionCard>
    <AdminSectionCard id="safety-notes" title="Review and safety" description="When connected, collected information will remain a proposal until reviewed.">
      <ul className="grid gap-2 text-sm text-[#526b72] sm:grid-cols-2"><li className="rounded-lg bg-[#f8faf8] p-3">Collection does not verify claims or authority.</li><li className="rounded-lg bg-[#f8faf8] p-3">Access restrictions and source terms must be respected.</li><li className="rounded-lg bg-[#f8faf8] p-3">Detected changes must not overwrite published catalogue data.</li><li className="rounded-lg bg-[#f8faf8] p-3">Failures and retries require server-side job history.</li></ul>
    </AdminSectionCard>
  </PageFrame>;
}

export function RunDetailPage({ runId = "unknown" }: { runId?: string }) {
  return <OperationUnavailable eyebrow={`Automated collection / Run / ${runId}`} title="Collection run" description="Inspect the progress, stages, and outcomes of a collection run." id={runId}>
    <AdminSectionCard id="run-summary" title="Run summary" description="Run metrics appear only after a real collection job has started." action={<span className={badgeMuted}>Not available</span>}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Status", "No run data"], ["Pages processed", "—"], ["Changes detected", "—"], ["Candidates awaiting review", "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#f8faf8] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">{label}</dt><dd className="mt-2 text-sm font-semibold text-[#17364a]">{value}</dd></div>)}</dl>
    </AdminSectionCard>
    <AdminSectionCard id="run-stages" title="Run stages" description="Stage status is not available because no run has executed.">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{["Source discovery", "Page and document retrieval", "Document processing", "Information extraction", "Change comparison", "Candidate preparation"].map((stage, index) => <li key={stage} className="flex items-center gap-3 rounded-lg border border-[#dce5e0] p-3 text-sm text-[#526b72]"><span className={badgeMuted}>{index + 1}</span>{stage}<span className="ml-auto text-xs text-[#82918c]">Waiting for service</span></li>)}</ol>
    </AdminSectionCard>
    <div className="flex flex-wrap gap-2"><button type="button" disabled title="Run controls require a connected collection service" className={buttonSecondary}><Pause className="size-4" />Pause run</button><button type="button" disabled title="Run controls require a connected collection service" className={buttonSecondary}>Cancel run</button><Link href={`${root}/jobs/${encodeURIComponent(runId)}`} className={buttonSecondary}>Job details<ArrowRight className="size-4" /></Link></div>
  </OperationUnavailable>;
}

export function JobDetailPage({ jobId = "unknown" }: { jobId?: string }) {
  return <OperationUnavailable eyebrow={`Automated collection / Job / ${jobId}`} title="Job details" description="Inspect processing stages, safe diagnostic logs, and retry status." id={jobId}>
    <AdminSectionCard id="job-summary" title="Job summary" description="No job record exists for this route." action={<span className={badgeMuted}>Unavailable</span>}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Job type", "—"], ["Parent run", "—"], ["Status", "Not found"], ["Output", "No data"]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-[#71817d]">{label}</dt><dd className="mt-1 text-sm text-[#17364a]">{value}</dd></div>)}</dl>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled title="Logs require a connected collection service" className={buttonSecondary}>View safe processing logs</button><button type="button" disabled title="Retry requires a persisted failed job" className={buttonSecondary}>Retry job</button><button type="button" disabled title="Cancel requires a running job" className={buttonSecondary}>Cancel job</button></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function FetchedContentPage() {
  return <OperationUnavailable eyebrow="Automated collection / Fetched content" title="Fetched pages & documents" description="Review pages and documents retrieved by a collection run.">
    <AdminSectionCard id="fetched-filters" title="Find fetched content" description="Filters activate when fetched-content records are supplied by the collection service.">
      <fieldset disabled className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_180px_180px]"><label className="text-xs font-semibold text-[#526b72]">Search URL or title<input className={`${fieldClass} mt-2`} type="search" placeholder="Search fetched content" /></label><label className="text-xs font-semibold text-[#526b72]">Content type<select className={`${fieldClass} mt-2`}><option>All types</option><option>HTML</option><option>PDF</option></select></label><label className="text-xs font-semibold text-[#526b72]">Fetch status<select className={`${fieldClass} mt-2`}><option>All statuses</option><option>Fetched</option><option>Failed</option></select></label></fieldset>
      <div className="mt-5"><EmptyOperation title="No fetched pages or documents" detail="A collection service must retrieve content before previews, source details, or fetch outcomes can be shown." href={null} /></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function ExtractedInformationPage() {
  return <OperationUnavailable eyebrow="Automated collection / Extracted information" title="Extracted information" description="Review candidate facts, evidence, matching, and record conflicts.">
    <AdminSectionCard id="candidate-review" title="Candidate review queue" description="Candidate filters and review actions require persisted extraction results." action={<span className={badgeMuted}>0 candidates</span>}>
      <fieldset disabled className="flex flex-wrap gap-3"><label className="text-xs font-semibold text-[#526b72]">Candidate status<select className={`${fieldClass} mt-1 min-w-48`}><option>All candidates</option><option>New</option><option>Changed</option><option>Conflicts</option><option>Unmatched</option></select></label><label className="text-xs font-semibold text-[#526b72]">Record category<select className={`${fieldClass} mt-1 min-w-48`}><option>All categories</option>{collectionCategories.map((item) => <option key={item}>{item}</option>)}</select></label></fieldset>
      <div className="mt-5"><EmptyOperation title="No extraction candidates" detail="Extracted values, evidence, quality indicators, matching, and duplicate checks will appear after a collection run. No candidate can be sent for review or rejected yet." href={null} /></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function ChangeDetectionPage() {
  return <OperationUnavailable eyebrow="Automated collection / Change detection" title="Detected changes" description="Compare proposed values with catalogue records before review.">
    <AdminSectionCard id="change-review" title="Change review" description="A detected change is a proposal and must never overwrite published catalogue data.">
      <fieldset disabled className="grid gap-3 md:grid-cols-3"><label className="text-xs font-semibold text-[#526b72]">Change type<select className={`${fieldClass} mt-1`}><option>All changes</option><option>New</option><option>Modified</option><option>Removed</option><option>Conflicts</option></select></label><label className="text-xs font-semibold text-[#526b72]">Category<select className={`${fieldClass} mt-1`}><option>All categories</option>{collectionCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-[#526b72]">Review status<select className={`${fieldClass} mt-1`}><option>All statuses</option><option>Needs review</option><option>Resolved</option></select></label></fieldset>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-[#dce5e0] p-4"><p className="text-xs font-semibold uppercase text-[#71817d]">Previous published value</p><p className="mt-2 text-sm text-[#657976]">No comparison data</p></div><div className="rounded-lg border border-[#dce5e0] p-4"><p className="text-xs font-semibold uppercase text-[#71817d]">Newly detected value</p><p className="mt-2 text-sm text-[#657976]">No comparison data</p></div></div>
      <div className="mt-5"><EmptyOperation title="No changes to review" detail="Change comparison requires source versions and extraction results from a connected service." href={null} /></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function CollectionHistoryPage() {
  return <OperationUnavailable eyebrow="Automated collection / History" title="Collection history" description="Search prior manual and scheduled collection runs.">
    <AdminSectionCard id="history-search" title="Run history" description="History filters and export are unavailable until completed runs are persisted." action={<button type="button" disabled title="There are no stored runs to export" className={buttonSecondary}><History className="size-4" />Export report</button>}>
      <fieldset disabled className="grid gap-3 md:grid-cols-4"><label className="text-xs font-semibold text-[#526b72]">Search<input className={`${fieldClass} mt-1`} type="search" placeholder="Collection, run ID, source" /></label><label className="text-xs font-semibold text-[#526b72]">Category<select className={`${fieldClass} mt-1`}><option>All categories</option>{collectionCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-[#526b72]">Status<select className={`${fieldClass} mt-1`}><option>All statuses</option><option>Complete</option><option>Partial</option><option>Failed</option></select></label><label className="text-xs font-semibold text-[#526b72]">Date range<input className={`${fieldClass} mt-1`} type="date" /></label></fieldset>
      <div className="mt-5"><EmptyOperation title="No collection history" detail="Manual and scheduled runs will appear here only after a connected service records them. Nothing has run from this browser." href={null} /></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function FailuresPage() {
  return <OperationUnavailable eyebrow="Automated collection / Failed fetches" title="Failed fetches" description="Inspect fetch failures, access issues, and retry eligibility.">
    <AdminSectionCard id="failure-queue" title="Items needing attention" description="Retry and inspect actions must be based on persisted failure records." action={<button type="button" disabled title="No recorded failures are available" className={buttonSecondary}>Retry eligible</button>}>
      <fieldset disabled className="flex flex-wrap gap-3">{["All issues", "Temporary errors", "Access denied", "Invalid pages", "Extraction errors"].map((label) => <label key={label} className="inline-flex items-center gap-2 rounded-full border border-[#dce5e0] px-3 py-2 text-xs font-semibold text-[#637572]"><input type="radio" name="failure-filter" checked={label === "All issues"} readOnly />{label}</label>)}</fieldset>
      <div className="mt-5"><EmptyOperation title="No failed fetches" detail="Failures, attempt counts, safe diagnostic details, and retry eligibility are not available until a collection service runs." href={null} /></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function FetchedItemPage({ itemId }: { itemId: string }) {
  return <OperationUnavailable eyebrow={`Automated collection / Fetched content / ${itemId}`} title="Fetched item details" description="Review a page or document, its source, retrieval outcome, and safe preview." id={itemId}>
    <AdminSectionCard id="content-preview" title="Content preview" description="Restricted content is never exposed in this screen.">
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-[#f8faf8] p-4"><p className="text-xs font-semibold uppercase text-[#71817d]">Source and URL</p><p className="mt-2 text-sm text-[#657976]">No fetched item exists</p></div><div className="rounded-lg bg-[#f8faf8] p-4"><p className="text-xs font-semibold uppercase text-[#71817d]">Type and outcome</p><p className="mt-2 text-sm text-[#657976]">Unavailable until a collection run</p></div></div>
      <div className="mt-4"><EmptyOperation title="Preview unavailable" detail="A real fetched-content record and its access policy are required before preview is enabled." href={null} /></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function ExtractedItemPage({ itemId }: { itemId: string }) {
  return <OperationUnavailable eyebrow={`Automated collection / Extracted information / ${itemId}`} title="Candidate details" description="Inspect extracted values, evidence, matching, and review actions." id={itemId}>
    <AdminSectionCard id="candidate-details" title="Candidate information" description="Candidate details are only shown when extraction records exist.">
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-[#f8faf8] p-4"><p className="text-xs font-semibold uppercase text-[#71817d]">Existing catalogue value</p><p className="mt-2 text-sm text-[#657976]">No matched record</p></div><div className="rounded-lg bg-[#f8faf8] p-4"><p className="text-xs font-semibold uppercase text-[#71817d]">Extracted value</p><p className="mt-2 text-sm text-[#657976]">No candidate value</p></div></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-lg border border-[#dce5e0] p-4"><h3 className="text-sm font-semibold text-[#17364a]">Evidence</h3><p className="mt-2 text-sm text-[#657976]">No source, page section, fetch time, or version is attached.</p></div><div className="rounded-lg border border-[#dce5e0] p-4"><h3 className="text-sm font-semibold text-[#17364a]">Match and duplicate check</h3><p className="mt-2 text-sm text-[#657976]">No matching or duplicate result is available.</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled title="Candidate review requires a real extraction result" className={buttonPrimary}>Send for review</button><button type="button" disabled title="Candidate review requires a real extraction result" className={buttonSecondary}>Edit candidate</button><button type="button" disabled title="Candidate review requires a real extraction result" className={buttonSecondary}>Reject candidate</button></div>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function ChangeItemPage({ itemId }: { itemId: string }) {
  return <OperationUnavailable eyebrow={`Automated collection / Change detection / ${itemId}`} title="Change comparison" description="Compare previous and detected values, source versions, and conflicts." id={itemId}>
    <AdminSectionCard id="comparison" title="Before and after" description="Detected changes are proposals only; they do not update a catalogue record.">
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-[#f8faf8] p-5"><p className="text-xs font-semibold uppercase text-[#71817d]">Previously published</p><p className="mt-3 text-sm text-[#657976]">No previous value</p></div><div className="rounded-lg border border-[#dce5e0] p-5"><p className="text-xs font-semibold uppercase text-[#71817d]">Newly detected</p><p className="mt-3 text-sm text-[#657976]">No detected value</p></div></div>
      <div className="mt-4 rounded-lg border border-[#dce5e0] p-4"><h3 className="text-sm font-semibold text-[#17364a]">Evidence and source versions</h3><p className="mt-2 text-sm text-[#657976]">No evidence or comparison record is available.</p></div>
      <button type="button" disabled title="A verified change record is required" className={`${buttonPrimary} mt-4`}>Send proposed revision for review</button>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function FailureItemPage({ itemId }: { itemId: string }) {
  return <OperationUnavailable eyebrow={`Automated collection / Failed fetches / ${itemId}`} title="Failure details" description="Review a safe error summary and retry eligibility." id={itemId}>
    <AdminSectionCard id="failure-details" title="Attempt details" description="Credentials, restricted content, and sensitive response bodies are not shown.">
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase text-[#71817d]">Source and URL</dt><dd className="mt-1 text-sm text-[#657976]">No failed attempt record</dd></div><div><dt className="text-xs font-semibold uppercase text-[#71817d]">Failure type</dt><dd className="mt-1 text-sm text-[#657976]">Unavailable</dd></div><div><dt className="text-xs font-semibold uppercase text-[#71817d]">Attempts</dt><dd className="mt-1 text-sm text-[#657976]">—</dd></div><div><dt className="text-xs font-semibold uppercase text-[#71817d]">Retry eligibility</dt><dd className="mt-1 text-sm text-[#657976]">Unknown</dd></div></dl>
      <button type="button" disabled title="Retry requires a persisted failure and server-side eligibility check" className={`${buttonSecondary} mt-5`}>Retry fetch</button>
    </AdminSectionCard>
  </OperationUnavailable>;
}

export function ScheduleItemPage({ itemId }: { itemId: string }) {
  const { schedules, configs, saveSchedule } = useAutomatedCollection();
  const schedule = schedules.find((item) => item.id === itemId);
  const config = configs.find((item) => item.id === schedule?.configId);
  return <PageFrame eyebrow={`Automated collection / Schedules / ${itemId}`} title="Schedule details" description="Inspect and manage a saved local schedule.">
    {schedule ? <AdminSectionCard id="schedule-detail" title={config?.name ?? "Collection schedule"} description="This preference is saved locally and will not execute until a scheduler is integrated."><dl className="grid gap-4 sm:grid-cols-2">{[["Frequency", schedule.frequency], ["Start date", schedule.startDate], ["Time", `${schedule.time} ${schedule.timeZone}`], ["End date", schedule.endDate || "No end date"], ["Retry temporary failures", schedule.retryTemporaryFailures ? "Yes" : "No"], ["Notify on changes", schedule.notifyOnChanges ? "Yes" : "No"]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-[#71817d]">{label}</dt><dd className="mt-1 text-sm text-[#17364a]">{value}</dd></div>)}</dl><button type="button" onClick={() => saveSchedule({ ...schedule, active: !schedule.active })} className={`${buttonSecondary} mt-5`}>{schedule.active ? <Pause className="size-4" /> : <Play className="size-4" />}{schedule.active ? "Pause locally" : "Resume locally"}</button></AdminSectionCard> : <EmptyOperation title="Schedule not found" detail="This schedule may have been removed from this browser." href={`${root}/schedules`} linkText="Back to schedules" />}
  </PageFrame>;
}
