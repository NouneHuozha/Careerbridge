import {
  getPublishedCampus,
  getPublishedCourseOffering,
  getPublishedInstitution,
  listPublishedCampuses,
  listPublishedCourseOfferings,
  listPublishedInstitutions,
} from "../../db/institutions";
import type {
  InstitutionProvenance,
  PublishedCampus,
  PublishedCourseOffering,
  PublishedInstitution,
} from "../../db/institutions";
import type { InstitutionProfilePageRecord } from "./institution-directory/institution-profile-data";
import type {
  InformationSource,
  InstitutionCampusRecord,
  InstitutionOwnership,
  InstitutionType,
  VerificationStatus,
} from "./institution-directory/institution-registry";

export type PublicInstitutionProfile = Omit<
  InstitutionProfilePageRecord,
  "isDemo" | "lastReviewed"
> & {
  isDemo?: false;
  lastReviewed?: string;
};

type InstitutionSummary = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  type: InstitutionType;
  ownership?: InstitutionOwnership;
  website?: InformationSource;
};

export type PublicOfferingFact = {
  value: string;
  source?: InformationSource;
  verificationStatus?: VerificationStatus;
};

type PublishedOfferingDetails = {
  programme?: PublicOfferingFact;
  description?: PublicOfferingFact;
  duration?: PublicOfferingFact;
  studyMode?: PublicOfferingFact;
  admissionCycles?: {
    academicYear: string;
    eligibility?: PublicOfferingFact;
    admissionProcess?: PublicOfferingFact;
    entranceExam?: PublicOfferingFact;
    source?: InformationSource;
    admissionUrl?: InformationSource;
  }[];
  fees?: {
    value: string;
    academicYear?: string;
    paymentPeriod?: string;
    source?: InformationSource;
    verificationStatus?: VerificationStatus;
  };
  scholarships?: {
    description: string;
    url?: InformationSource;
    verificationStatus?: VerificationStatus;
  }[];
};

export type PublicCourseInstitutionOffering = {
  id: string;
  slug: string;
  courseId: string;
  institution: InstitutionSummary;
  campus: InstitutionCampusRecord;
  offering?: PublishedOfferingDetails;
  prospectus?: InformationSource;
  sources: { fact: string; source: InformationSource }[];
};

const institutionTypes: InstitutionType[] = [
  "College",
  "University",
  "Institute",
  "School",
  "Training centre",
];
const ownershipTypes: InstitutionOwnership[] = ["Government", "Private", "Public"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function contentString(content: Record<string, unknown>, key: string) {
  return stringValue(content[key]);
}

function verificationStatus(value: string | null): VerificationStatus {
  if (value === "verified") return "verified";
  if (["stale", "expired", "superseded", "outdated"].includes(value ?? "")) {
    return "outdated";
  }
  return "unverified";
}

function dateValue(value: Date | null) {
  return value?.toISOString().slice(0, 10);
}

function sourceFromProvenance(
  provenance: InstitutionProvenance | undefined,
): InformationSource | undefined {
  if (!provenance?.canonicalUrl) return undefined;
  const url = new URL(provenance.canonicalUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported institution source URL protocol "${url.protocol}".`);
  }
  return {
    label: `${provenance.sourceName} · ${provenance.claimKey}`,
    url: provenance.canonicalUrl,
    checkedOn: dateValue(provenance.verifiedAt ?? provenance.checkedAt),
    verificationStatus: verificationStatus(provenance.verificationStatus),
  };
}

function sourceForClaim(
  provenance: InstitutionProvenance[],
  claimKey: string,
  verifiedOnly = false,
) {
  const match = provenance.find(
    (entry) =>
      entry.claimKey === claimKey &&
      (!verifiedOnly || entry.verificationStatus === "verified"),
  );
  return sourceFromProvenance(match);
}

function institutionSummary(record: PublishedInstitution): InstitutionSummary {
  if (!institutionTypes.includes(record.institutionType as InstitutionType)) {
    throw new Error(`Unsupported published institution type "${record.institutionType}".`);
  }
  if (record.ownership !== null && !ownershipTypes.includes(record.ownership as InstitutionOwnership)) {
    throw new Error(`Unsupported published institution ownership "${record.ownership}".`);
  }

  const websiteUrl = contentString(record.content, "website");
  const websiteEvidence = record.provenance.find(
    (entry) =>
      entry.claimKey === "institution.website" &&
      entry.canonicalUrl === websiteUrl,
  );
  return {
    id: record.slug,
    slug: record.slug,
    name: record.title,
    initials: record.initials,
    type: record.institutionType as InstitutionType,
    ...(record.ownership ? { ownership: record.ownership as InstitutionOwnership } : {}),
    ...(sourceFromProvenance(websiteEvidence)
      ? { website: sourceFromProvenance(websiteEvidence) }
      : {}),
  };
}

function campusRecord(record: PublishedCampus): InstitutionCampusRecord {
  const { content, provenance } = record;
  const locationSource =
    sourceForClaim(provenance, "campus.location") ??
    sourceForClaim(provenance, "campus.address");
  const phoneValue = contentString(content, "phone");
  const phoneSource = sourceForClaim(provenance, "campus.phone");
  const emailValue = contentString(content, "email");
  const emailSource = sourceForClaim(provenance, "campus.email");

  return {
    id: record.catalogItemId,
    name: record.title,
    locality: contentString(content, "locality"),
    city: contentString(content, "city"),
    district: contentString(content, "district"),
    state: contentString(content, "state"),
    address: contentString(content, "address"),
    locationSource,
    ...(phoneValue && phoneSource ? { phone: { value: phoneValue, source: phoneSource } } : {}),
    ...(emailValue && emailSource ? { email: { value: emailValue, source: emailSource } } : {}),
  };
}

function profileSources(provenance: InstitutionProvenance[]) {
  return provenance
    .map(sourceFromProvenance)
    .filter((source): source is InformationSource => source !== undefined);
}

function profileRecord(
  record: PublishedInstitution,
  campuses: PublishedCampus[],
): PublicInstitutionProfile {
  return {
    ...institutionSummary(record),
    campuses: campuses.map(campusRecord),
    ...(record.summary ? { introduction: record.summary } : {}),
    ...(record.description ? { description: record.description } : {}),
    sources: profileSources(record.provenance),
  };
}

export async function listPublicInstitutionDirectory(): Promise<PublicInstitutionProfile[]> {
  const [institutions, campuses] = await Promise.all([
    listPublishedInstitutions(),
    listPublishedCampuses(),
  ]);
  return institutions.map((institution) =>
    profileRecord(
      institution,
      campuses.filter((campus) => campus.institutionItemId === institution.catalogItemId),
    ),
  );
}

export async function getPublicInstitutionProfile(
  identifier: string,
): Promise<PublicInstitutionProfile | null> {
  const institution = await getPublishedInstitution(identifier);
  if (!institution) return null;
  const campuses = await listPublishedCampuses();
  return profileRecord(
    institution,
    campuses.filter((campus) => campus.institutionItemId === institution.catalogItemId),
  );
}

function fact(
  value: unknown,
  provenance: InstitutionProvenance[],
  claimKey: string,
): PublicOfferingFact | undefined {
  const raw = typeof value === "string" ? value : isRecord(value) ? value.value : undefined;
  const text = stringValue(raw);
  if (!text) return undefined;
  const evidence = provenance.find((entry) => entry.claimKey === claimKey);
  return {
    value: text,
    source: sourceFromProvenance(evidence),
    verificationStatus: evidence
      ? verificationStatus(evidence.verificationStatus)
      : "unverified",
  };
}

function mapOfferingDetails(record: PublishedCourseOffering): PublishedOfferingDetails | undefined {
  const details = record.details;
  const provenance = record.provenance;
  const result: PublishedOfferingDetails = {};

  const programme = fact(record.title, provenance, "offering.programme");
  if (programme) result.programme = programme;

  for (const key of ["description", "duration", "studyMode"] as const) {
    const mapped = fact(details[key], provenance, `offering.${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`);
    if (mapped) result[key] = mapped;
  }

  if (Array.isArray(details.admissionCycles)) {
    result.admissionCycles = details.admissionCycles.flatMap((cycle, index) => {
      if (!isRecord(cycle)) return [];
      const academicYear = stringValue(cycle.academicYear);
      if (!academicYear) return [];
      const prefix = `offering.admission_cycles[${index}]`;
      const mapped = {
        academicYear,
        eligibility: fact(cycle.eligibility, provenance, `${prefix}.eligibility`),
        admissionProcess: fact(cycle.admissionProcess, provenance, `${prefix}.admission_process`),
        entranceExam: fact(cycle.entranceExam, provenance, `${prefix}.entrance_exam`),
        source:
          sourceForClaim(provenance, `${prefix}.admission_process`) ??
          sourceForClaim(provenance, `${prefix}.eligibility`) ??
          sourceForClaim(provenance, `${prefix}.entrance_exam`),
        admissionUrl: sourceForClaim(provenance, `${prefix}.admission_url`, true),
      };
      return [mapped];
    });
  }

  if (details.fees !== undefined) {
    const fee = fact(details.fees, provenance, "offering.fees");
    if (fee) {
      const detailsFee = isRecord(details.fees) ? details.fees : {};
      result.fees = {
        value: fee.value,
        academicYear: stringValue(detailsFee.academicYear),
        paymentPeriod: stringValue(detailsFee.paymentPeriod),
        source: fee.source,
        verificationStatus: fee.verificationStatus,
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function offeringSources(provenance: InstitutionProvenance[]) {
  return provenance.flatMap((entry) => {
    const source = sourceFromProvenance(entry);
    return source ? [{ fact: entry.claimKey, source }] : [];
  });
}

function courseInstitutionOffering(
  offering: PublishedCourseOffering,
  institution: PublishedInstitution,
  campus: PublishedCampus,
  courseId: string,
  detailSlug: string,
): PublicCourseInstitutionOffering {
  if (
    offering.institutionItemId !== institution.catalogItemId ||
    campus.institutionItemId !== institution.catalogItemId ||
    offering.campusItemId !== campus.catalogItemId
  ) {
    throw new Error(`Published course offering "${offering.catalogItemId}" has mismatched relationships.`);
  }
  return {
    id: offering.catalogItemId,
    slug: detailSlug,
    courseId,
    institution: institutionSummary(institution),
    campus: campusRecord(campus),
    offering: mapOfferingDetails(offering),
    prospectus: sourceForClaim(offering.provenance, "offering.prospectus"),
    sources: offeringSources(offering.provenance),
  };
}

function matchingCourseAlias(record: PublishedCourseOffering, courseId: string) {
  return record.aliases
    .filter(
      (alias) =>
        alias.sourceSystem === "careerbridge" &&
        alias.externalType === "institution-offering" &&
        alias.externalContextKey === courseId &&
        alias.externalKey.length > 0,
    )
    .sort((left, right) => left.externalKey.localeCompare(right.externalKey))[0];
}

export async function listPublicCourseInstitutionOfferings(
  courseId: string,
): Promise<PublicCourseInstitutionOffering[]> {
  if (!courseId) return [];
  const [offerings, institutions, campuses] = await Promise.all([
    listPublishedCourseOfferings(),
    listPublishedInstitutions(),
    listPublishedCampuses(),
  ]);
  const institutionsById = new Map(
    institutions.map((institution) => [institution.catalogItemId, institution]),
  );
  const campusesById = new Map(campuses.map((campus) => [campus.catalogItemId, campus]));

  return offerings.flatMap((offering) => {
    const alias = matchingCourseAlias(offering, courseId);
    const institution = institutionsById.get(offering.institutionItemId);
    const campus = campusesById.get(offering.campusItemId);
    if (
      !alias ||
      !institution ||
      !campus ||
      campus.institutionItemId !== institution.catalogItemId
    ) {
      return [];
    }
    return [
      courseInstitutionOffering(
        offering,
        institution,
        campus,
        courseId,
        alias.externalKey,
      ),
    ];
  });
}

export async function getPublicCourseInstitutionOffering(
  institutionIdentifier: string,
  courseId: string,
): Promise<PublicCourseInstitutionOffering | null> {
  if (!institutionIdentifier || !courseId) return null;
  const offering = await getPublishedCourseOffering(institutionIdentifier, courseId);
  if (!offering) return null;
  const alias = matchingCourseAlias(offering, courseId);
  if (!alias || alias.externalKey !== institutionIdentifier) return null;

  const [institution, campus] = await Promise.all([
    getPublishedInstitution(offering.institutionItemId),
    getPublishedCampus(offering.campusItemId),
  ]);
  if (!institution || !campus) return null;
  return courseInstitutionOffering(
    offering,
    institution,
    campus,
    courseId,
    institutionIdentifier,
  );
}
