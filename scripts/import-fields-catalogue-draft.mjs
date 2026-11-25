import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";
import { reconcileSourceRegistry } from "../src/db/source-reconciliation.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { Pool } = pg;
const expectedHost = "ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech";
const expectedBranchId = "br-wandering-flower-a1f6ys66";
const expectedProjectId = "calm-brook-21165945";
const checkedAt = new Date("2026-11-19T00:00:00.000Z");
const contentKeys = [
  "introduction",
  "broadlyInvolves",
  "activitiesAndWorkAreas",
  "learningAndSubjectConnections",
  "courseFamiliesToExplore",
  "furtherExploration",
];

const sources = [
  {
    key: "ncs-career-guidance",
    name: "National Career Service",
    url: "https://ncs.gov.in/about-us",
    authority: "Directorate General of Employment, Ministry of Labour and Employment",
    category: "career_guidance",
  },
  {
    key: "ugc-recognition",
    name: "University Grants Commission recognition FAQ",
    url: "https://www.ugc.gov.in/Home/faq",
    authority: "University Grants Commission, Ministry of Education",
    category: "institution_recognition",
  },
  {
    key: "ugc-professional-councils",
    name: "UGC professional councils",
    url: "https://www.ugc.gov.in/UGCofficials/Professional_Councils",
    authority: "University Grants Commission",
    category: "professional_education_regulation",
  },
  {
    key: "aicte-approval",
    name: "AICTE Approval Process Handbook 2024–2027",
    url: "https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf",
    authority: "All India Council for Technical Education",
    category: "technical_education_approval",
  },
  {
    key: "msde-ncvet",
    name: "Ministry of Skill Development annual report",
    url: "https://msde.gov.in/sites/default/files/2023-09/Final%20Skill%20AR%20Eng.pdf",
    authority: "Ministry of Skill Development and Entrepreneurship / NCVET",
    category: "vocational_education",
  },
  {
    key: "icar-agricultural-education",
    name: "ICAR Agricultural Education Division",
    url: "https://icar.gov.in/en/agricultural-education-division",
    authority: "Indian Council of Agricultural Research",
    category: "agricultural_education",
  },
  {
    key: "nmc-undergraduate-medical",
    name: "NMC Graduate Medical Education Regulations 2023",
    url: "https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FLatestNews%2FUEMEB+regulations.pdf",
    authority: "National Medical Commission",
    category: "medical_education_regulation",
  },
  {
    key: "coa-architectural-education",
    name: "Council of Architecture regulations index",
    url: "https://coa.gov.in/index1.php?lang=1&level=0&lid=287&linkid=47",
    authority: "Council of Architecture",
    category: "architectural_education_standards",
  },
];

const fields = [
  {
    id: "technology",
    title: "Technology",
    summary: "Computers, software and digital systems.",
    fieldContent: {
      introduction: "Technology is about understanding, building, using and improving digital tools and systems.",
      broadlyInvolves: "Software, devices, networks, data and the ways people use digital services.",
      activitiesAndWorkAreas: "Designing an app, testing a website, supporting a network, organising data, or checking how a digital service works.",
      learningAndSubjectConnections: "Mathematics, logical problem-solving, computing where available, communication, and careful testing can all be useful foundations.",
      courseFamiliesToExplore: "Computer applications, computer science, information technology, electronics, digital skills, and technical diplomas.",
      furtherExploration: "Compare the actual subjects, practical work, delivery mode, recognition and entry requirements for a named programme. Do not assume every technical programme has the same approval route.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["technical-programme-context", "aicte-approval"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    summary: "Designing, testing and improving practical systems.",
    fieldContent: {
      introduction: "Engineering uses science, mathematics and design to work on practical structures, machines, products and systems.",
      broadlyInvolves: "Asking how something works, defining a problem, testing ideas and improving a solution.",
      activitiesAndWorkAreas: "Designing a component, checking a structure, planning a system, using technical drawings, building prototypes or improving a process.",
      learningAndSubjectConnections: "Mathematics, science, design, drawing, practical problem-solving and teamwork are useful areas to explore.",
      courseFamiliesToExplore: "Engineering degrees, polytechnic or engineering diplomas, technical vocational programmes, and specialised branches after checking the provider.",
      furtherExploration: "Look at a named branch and institution before drawing conclusions about subjects, laboratories, admission tests or eligibility.",
    },
    claims: [
      ["technical-programme-context", "aicte-approval"],
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "healthcare",
    title: "Healthcare",
    summary: "Understanding health, care and health-related services.",
    fieldContent: {
      introduction: "Healthcare includes many ways of supporting health, care, prevention, treatment and health services.",
      broadlyInvolves: "Learning about people, health, science, care practices and the systems that help communities access services.",
      activitiesAndWorkAreas: "Health education, laboratory work, clinical support, rehabilitation, public health, records, technology and service coordination.",
      learningAndSubjectConnections: "Biology and other sciences can be relevant for some routes; communication, observation, responsibility and teamwork matter across many roles.",
      courseFamiliesToExplore: "Medical, nursing, pharmacy, allied-health, laboratory, public-health and health-support programmes, depending on the exact role.",
      furtherExploration: "Regulated courses and professional practice have specific current requirements. Check the relevant regulator and institution before relying on an eligibility or registration claim.",
    },
    claims: [
      ["medical-education-regulation", "nmc-undergraduate-medical"],
      ["professional-body-context", "ugc-professional-councils"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "business",
    title: "Business and Management",
    summary: "Understanding how organisations plan, provide and improve services.",
    fieldContent: {
      introduction: "Business and management explores how organisations use people, information, money and time to provide products or services.",
      broadlyInvolves: "Planning work, understanding customers, organising resources, communicating clearly and making informed decisions.",
      activitiesAndWorkAreas: "Accounting, operations, entrepreneurship, marketing, sales, finance, logistics, human resources and customer service.",
      learningAndSubjectConnections: "Mathematics, commerce, economics, communication, data handling and collaboration can be useful foundations.",
      courseFamiliesToExplore: "Commerce, business administration, management, accounting, finance, entrepreneurship, retail and logistics programmes.",
      furtherExploration: "Compare course subjects and the institution's current recognition; do not treat a course title as proof of a particular job outcome.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "law",
    title: "Law",
    summary: "Understanding rules, rights, responsibilities and justice.",
    fieldContent: {
      introduction: "Law explores how rules are made, interpreted and applied in society.",
      broadlyInvolves: "Reading carefully, examining evidence, understanding different viewpoints and communicating reasoned arguments.",
      activitiesAndWorkAreas: "Legal research, public policy, compliance, contracts, advocacy support, rights awareness and dispute-resolution processes.",
      learningAndSubjectConnections: "Language, social studies, history, political understanding, research and clear writing are useful areas to develop.",
      courseFamiliesToExplore: "Integrated law degrees, law degrees after graduation, legal studies and related public-policy or social-science programmes.",
      furtherExploration: "Legal education and practice pathways can have specific recognition and professional requirements. Verify the current programme and regulator information directly.",
    },
    claims: [
      ["professional-body-context", "ugc-professional-councils"],
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "government",
    title: "Government and Public Service",
    summary: "Understanding public systems and services.",
    fieldContent: {
      introduction: "Government and public service looks at how public institutions, policies and services affect communities.",
      broadlyInvolves: "Understanding public needs, rules, administration, information and responsible decision-making.",
      activitiesAndWorkAreas: "Public administration, community programmes, policy research, civic communication, records, planning and service delivery.",
      learningAndSubjectConnections: "Social studies, economics, language, history, data interpretation and communication can help students explore this area.",
      courseFamiliesToExplore: "Public administration, political science, social work, economics, law, development studies and related humanities programmes.",
      furtherExploration: "A course can build relevant knowledge, but recruitment or examination requirements are set separately by the applicable authority and can change.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "education",
    title: "Education",
    summary: "Supporting how people learn, teach and develop.",
    fieldContent: {
      introduction: "Education explores how learners develop knowledge, skills and confidence in schools, communities and other settings.",
      broadlyInvolves: "Planning learning activities, explaining ideas, listening to learners and reflecting on what helps people understand.",
      activitiesAndWorkAreas: "Teaching, learning support, curriculum development, educational content, training, counselling support and education administration.",
      learningAndSubjectConnections: "Strong communication, patience, observation, subject knowledge and an interest in how people learn are useful foundations.",
      courseFamiliesToExplore: "Education, teacher education, early childhood education, special education, training and educational technology programmes.",
      furtherExploration: "Teacher-education recognition and role requirements can be regulated. Check the specific course and current authority information before relying on it.",
    },
    claims: [
      ["professional-body-context", "ugc-professional-councils"],
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "science",
    title: "Science and Research",
    summary: "Exploring questions through observation, evidence and testing.",
    fieldContent: {
      introduction: "Science and research uses evidence, observation and testing to understand questions about the natural world, people, materials and systems.",
      broadlyInvolves: "Asking questions, forming explanations, gathering information, testing methods and communicating what was found.",
      activitiesAndWorkAreas: "Laboratory work, environmental study, data analysis, fieldwork, health research, materials study and scientific communication.",
      learningAndSubjectConnections: "Science subjects, mathematics, curiosity, careful record-keeping and logical reasoning are useful foundations.",
      courseFamiliesToExplore: "Science degrees, research-oriented programmes, laboratory and technical courses, environmental studies and interdisciplinary programmes.",
      furtherExploration: "Check the actual subject combination, laboratory access, practical requirements and progression routes for each named programme.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "arts-design",
    title: "Arts and Design",
    summary: "Visual communication, creative practice and design thinking.",
    fieldContent: {
      introduction: "Arts and design explores visual expression, making, design choices and how people experience objects, spaces and messages.",
      broadlyInvolves: "Observing, experimenting, developing ideas, making and improving work through feedback.",
      activitiesAndWorkAreas: "Illustration, visual communication, product ideas, user experience, craft, animation, fashion, architecture-related design and creative production.",
      learningAndSubjectConnections: "Art, design, observation, visual communication, technology and project work can all be useful.",
      courseFamiliesToExplore: "Fine arts, design, visual communication, animation, product design, fashion and architecture-related programmes.",
      furtherExploration: "Portfolio, entrance, recognition and subject requirements vary greatly. Architecture has separate standards-setting context and must be checked directly.",
    },
    claims: [
      ["architectural-education-context", "coa-architectural-education"],
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "media",
    title: "Media",
    summary: "Creating and sharing information, stories and digital content.",
    fieldContent: {
      introduction: "Media explores how information, stories and messages are researched, created, presented and shared.",
      broadlyInvolves: "Understanding audiences, communicating clearly, checking information, creating content and using different formats responsibly.",
      activitiesAndWorkAreas: "Journalism, video, audio, photography, editing, content design, communication, publishing, advertising and digital media.",
      learningAndSubjectConnections: "Language, research, visual thinking, technology, communication and ethical judgement are useful areas to explore.",
      courseFamiliesToExplore: "Journalism, mass communication, media studies, film, digital content, advertising, public relations and design-related programmes.",
      furtherExploration: "Check the actual curriculum, equipment, practical work and institutional status rather than assuming similarly named media courses are equivalent.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "agriculture-environment",
    title: "Agriculture and Environment",
    summary: "Food, natural resources, farming systems and environmental stewardship.",
    fieldContent: {
      introduction: "Agriculture and environment explores food systems, plants, animals, soil, water, ecosystems and how people use natural resources.",
      broadlyInvolves: "Observing living systems, understanding local conditions, testing practical approaches and considering sustainability.",
      activitiesAndWorkAreas: "Crop and soil work, horticulture, animal and fisheries systems, environmental monitoring, natural-resource management, extension and agricultural technology.",
      learningAndSubjectConnections: "Biology, chemistry, geography, environmental science, practical observation and data collection can be useful foundations.",
      courseFamiliesToExplore: "Agriculture, horticulture, forestry, fisheries, environmental science, food systems, agricultural engineering and allied-science programmes.",
      furtherExploration: "Agricultural education and programme quality have a specific ICAR context. Check the named course, university, recognition and current eligibility before applying.",
    },
    claims: [
      ["agricultural-education-context", "icar-agricultural-education"],
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "hospitality-tourism",
    title: "Hospitality and Tourism",
    summary: "Supporting travel, accommodation, food and visitor experiences.",
    fieldContent: {
      introduction: "Hospitality and tourism explores how people plan, host and support travel, accommodation, food and visitor experiences.",
      broadlyInvolves: "Communication, organisation, service design, local knowledge, teamwork and attention to detail.",
      activitiesAndWorkAreas: "Hotel operations, food service, travel support, event coordination, visitor information, destination services and tourism communication.",
      learningAndSubjectConnections: "Communication, languages, geography, business, food-related learning and teamwork can be useful foundations.",
      courseFamiliesToExplore: "Hotel management, tourism studies, travel and tourism, culinary programmes, event management and service-sector skill courses.",
      furtherExploration: "Check practical training, placement claims, programme recognition, location and provider-specific admission information directly.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["vocational-qualification-context", "msde-ncvet"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
  {
    id: "social-sciences",
    title: "Social Sciences",
    summary: "Understanding people, communities and social change.",
    fieldContent: {
      introduction: "Social sciences explore how people, communities, institutions and cultures interact and change.",
      broadlyInvolves: "Asking questions about society, reading evidence, listening to different perspectives and interpreting information carefully.",
      activitiesAndWorkAreas: "Psychology-related study, sociology, community work, research, development programmes, public communication, policy support and social services.",
      learningAndSubjectConnections: "Social studies, language, research, statistics, empathy and careful analysis are useful areas to develop.",
      courseFamiliesToExplore: "Psychology, sociology, social work, anthropology, economics, development studies, political science and interdisciplinary humanities programmes.",
      furtherExploration: "Course titles can overlap while subjects and progression differ. Compare the actual curriculum and institution information rather than inferring outcomes.",
    },
    claims: [
      ["programme-recognition", "ugc-recognition"],
      ["general-discovery-context", "ncs-career-guidance"],
    ],
  },
];

const expectedRelations = fields.flatMap((field) =>
  field.claims.map(([claim, sourceKey]) => ({
    fieldId: field.id,
    sourceKey,
    claimKey: `field.${field.id}.${claim}`,
  })),
);

assert.equal(fields.length, 13);
assert.equal(sources.length, 8);
assert.equal(expectedRelations.length, 34);
for (const field of fields) {
  assert.deepEqual(Object.keys(field.fieldContent), contentKeys);
  assert.ok(Object.values(field.fieldContent).every((value) => typeof value === "string"));
}

const directUrl = process.env.DATABASE_URL_UNPOOLED;
if (!directUrl) throw new Error("DATABASE_URL_UNPOOLED is required.");
const configuredUrl = new URL(directUrl);
if (configuredUrl.hostname !== expectedHost) {
  throw new Error("Refusing to connect: DATABASE_URL_UNPOOLED is not the verified development endpoint.");
}

const endpointMetadata = JSON.parse(
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", `neon api /projects/${expectedProjectId}/endpoints`],
    { encoding: "utf8", windowsHide: true },
  ),
);
const expectedEndpoints = endpointMetadata.endpoints.filter(
  (endpoint) => endpoint.host === expectedHost,
);
assert.equal(expectedEndpoints.length, 1, "Development endpoint is not uniquely mapped in Neon.");
assert.equal(expectedEndpoints[0].branch_id, expectedBranchId, "Development endpoint branch mismatch.");
assert.equal(expectedEndpoints[0].project_id, expectedProjectId, "Development endpoint project mismatch.");

const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 10000, max: 1 });
const sourceCategoryByKey = new Map(sources.map((source) => [source.key, source.category]));
const counts = {
  sourcesInserted: 0,
  sourcesReused: 0,
  revisionsInserted: 0,
  revisionsReused: 0,
  typedRowsInserted: 0,
  typedRowsReused: 0,
  relationshipsInserted: 0,
  relationshipsReused: 0,
  skipped: 0,
};

function sameDate(value, expected) {
  return value instanceof Date && value.getTime() === expected.getTime();
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(20261119, 13)");

    const identity = await client.query(
      "SELECT current_database() AS database_name, current_setting('server_version') AS server_version",
    );
    const totalFields = await client.query(
      "SELECT count(*)::int AS count FROM catalog_items WHERE item_type = 'field'",
    );
    assert.equal(totalFields.rows[0].count, 13, "Unexpected number of field identities.");

    const identityRows = await client.query(
      `WITH expected(field_id) AS (SELECT unnest($1::text[]))
       SELECT e.field_id, ci.id AS item_id, ci.item_type, ci.published_revision_id
       FROM expected e
       LEFT JOIN catalog_item_aliases a
         ON a.source_system = 'careerbridge' AND a.external_type = 'field'
        AND a.external_key = e.field_id AND a.external_context_key = ''
       LEFT JOIN catalog_items ci ON ci.id = a.catalog_item_id
       ORDER BY e.field_id`,
      [fields.map((field) => field.id)],
    );
    assert.equal(identityRows.rowCount, fields.length);
    const itemIds = new Map();
    const uniqueItemIds = new Set();
    for (const row of identityRows.rows) {
      assert.ok(row.item_id, `Missing existing field alias: ${row.field_id}`);
      assert.equal(row.item_type, "field", `Alias is not a field identity: ${row.field_id}`);
      assert.equal(row.published_revision_id, null, `Field already has a publication pointer: ${row.field_id}`);
      uniqueItemIds.add(row.item_id);
      itemIds.set(row.field_id, row.item_id);
    }
    assert.equal(uniqueItemIds.size, fields.length, "Field aliases do not resolve to 13 distinct identities.");

    const aliasSnapshot = await client.query(
      `SELECT source_system, external_type, external_key, external_context_key, catalog_item_id
       FROM catalog_item_aliases
       WHERE catalog_item_id = ANY($1::uuid[])
       ORDER BY source_system, external_type, external_key, external_context_key`,
      [[...itemIds.values()]],
    );

    const existingRevisions = await client.query(
      `SELECT r.id, r.catalog_item_id, r.revision_number, r.publication_status, r.title,
              r.summary, r.description, r.data_classification, r.verification_status,
              r.published_at, fr.field_content
       FROM catalog_item_revisions r
       LEFT JOIN field_revisions fr ON fr.revision_id = r.id
       WHERE r.catalog_item_id = ANY($1::uuid[])
       ORDER BY r.catalog_item_id, r.revision_number`,
      [[...itemIds.values()]],
    );
    const revisionByItem = new Map();
    for (const row of existingRevisions.rows) {
      assert.equal(row.revision_number, 1, "Unexpected existing field revision number.");
      assert.ok(!revisionByItem.has(row.catalog_item_id), "Unexpected duplicate field revisions.");
      const field = fields.find((candidate) => itemIds.get(candidate.id) === row.catalog_item_id);
      assert.equal(row.publication_status, "draft");
      assert.equal(row.title, field.title);
      assert.equal(row.summary, field.summary);
      assert.equal(row.description, null);
      assert.equal(row.data_classification, "real");
      assert.equal(row.verification_status, "pending_review");
      assert.equal(row.published_at, null);
      if (row.field_content !== null) assert.deepEqual(row.field_content, field.fieldContent);
      revisionByItem.set(row.catalog_item_id, row);
    }

    const sourceIds = new Map();
    const reconciledSources = await reconcileSourceRegistry(
      client,
      sources.map((source) => ({
        sourceKey: source.key,
        sourceName: source.name,
        authority: source.authority,
        canonicalUrl: source.url,
        category: source.category,
        sourceType: "official_public_web_page",
        status: "active",
      })),
      { mode: "apply" },
    );
    for (const source of reconciledSources) {
      sourceIds.set(source.sourceKey, source.id);
      if (source.action === "inserted") counts.sourcesInserted += 1;
      else counts.sourcesReused += 1;
    }

    const revisionIds = new Map();
    for (const field of fields) {
      const itemId = itemIds.get(field.id);
      const existing = revisionByItem.get(itemId);
      if (existing) {
        revisionIds.set(field.id, existing.id);
        counts.revisionsReused += 1;
      } else {
        const inserted = await client.query(
          `INSERT INTO catalog_item_revisions
            (catalog_item_id, revision_number, publication_status, title, summary,
             description, data_classification, verification_status)
           VALUES ($1, 1, 'draft', $2, $3, NULL, 'real', 'pending_review')
           RETURNING id`,
          [itemId, field.title, field.summary],
        );
        revisionIds.set(field.id, inserted.rows[0].id);
        counts.revisionsInserted += 1;
      }

      const revisionId = revisionIds.get(field.id);
      const existingTyped = await client.query(
        "SELECT field_content FROM field_revisions WHERE revision_id = $1",
        [revisionId],
      );
      if (existingTyped.rowCount) {
        assert.deepEqual(existingTyped.rows[0].field_content, field.fieldContent);
        counts.typedRowsReused += 1;
      } else {
        await client.query(
          "INSERT INTO field_revisions (revision_id, field_content) VALUES ($1, $2::jsonb)",
          [revisionId, JSON.stringify(field.fieldContent)],
        );
        counts.typedRowsInserted += 1;
      }
    }

    const existingLinks = await client.query(
      `SELECT revision_id, source_id, claim_key, checked_at, verified_at, verification_status
       FROM catalog_revision_sources
       WHERE revision_id = ANY($1::uuid[])`,
      [[...revisionIds.values()]],
    );
    const expectedLinkKeys = new Set(
      expectedRelations.map((relation) =>
        `${revisionIds.get(relation.fieldId)}|${sourceIds.get(relation.sourceKey)}|${relation.claimKey}`,
      ),
    );
    const existingLinkKeys = new Set();
    for (const link of existingLinks.rows) {
      const key = `${link.revision_id}|${link.source_id}|${link.claim_key}`;
      assert.ok(expectedLinkKeys.has(key), "Unexpected pre-existing provenance relationship.");
      assert.ok(!existingLinkKeys.has(key), "Duplicate provenance relationship.");
      assert.ok(sameDate(link.checked_at, checkedAt), "Unexpected provenance checked_at value.");
      assert.equal(link.verified_at, null);
      assert.equal(link.verification_status, "pending_review");
      existingLinkKeys.add(key);
    }

    for (const relation of expectedRelations) {
      const revisionId = revisionIds.get(relation.fieldId);
      const sourceId = sourceIds.get(relation.sourceKey);
      const linkKey = `${revisionId}|${sourceId}|${relation.claimKey}`;
      if (existingLinkKeys.has(linkKey)) {
        counts.relationshipsReused += 1;
        continue;
      }
      await client.query(
        `INSERT INTO catalog_revision_sources
          (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, $3, $4, NULL, 'pending_review')`,
        [revisionId, sourceId, relation.claimKey, checkedAt],
      );
      counts.relationshipsInserted += 1;
    }

    const verification = await client.query(
      `SELECT i.id AS item_id, i.published_revision_id, r.id AS revision_id,
              r.revision_number, r.publication_status, r.title, r.summary,
              r.description, r.data_classification, r.verification_status,
              r.published_at, fr.field_content
       FROM catalog_items i
       JOIN catalog_item_revisions r ON r.catalog_item_id = i.id
       LEFT JOIN field_revisions fr ON fr.revision_id = r.id
       WHERE i.id = ANY($1::uuid[])
       ORDER BY i.id`,
      [[...itemIds.values()]],
    );
    assert.equal(verification.rowCount, 13);
    for (const row of verification.rows) {
      const field = fields.find((candidate) => itemIds.get(candidate.id) === row.item_id);
      assert.equal(row.revision_number, 1);
      assert.equal(row.publication_status, "draft");
      assert.equal(row.title, field.title);
      assert.equal(row.summary, field.summary);
      assert.equal(row.description, null);
      assert.equal(row.data_classification, "real");
      assert.equal(row.verification_status, "pending_review");
      assert.equal(row.published_at, null);
      assert.equal(row.published_revision_id, null);
      assert.deepEqual(row.field_content, field.fieldContent);
      assert.deepEqual(Object.keys(row.field_content).sort(), [...contentKeys].sort());
    }

    const sourceVerification = await client.query(
      `SELECT id, source_name, authority, canonical_url, category, source_type, status, normalized_url
       FROM source_registry
       WHERE id = ANY($1::uuid[])
       ORDER BY normalized_url`,
      [[...sourceIds.values()]],
    );
    assert.equal(sourceVerification.rowCount, 8);
    for (const source of sources) {
      const row = sourceVerification.rows.find((candidate) => candidate.id === sourceIds.get(source.key));
      assert.ok(row);
      assert.equal(row.source_name, source.name);
      assert.equal(row.authority, source.authority);
      assert.equal(row.canonical_url, source.url);
      assert.equal(row.category, sourceCategoryByKey.get(source.key));
      assert.equal(row.source_type, "official_public_web_page");
      assert.equal(row.status, "active");
    }

    const linkVerification = await client.query(
      `SELECT revision_id, source_id, claim_key, checked_at, verified_at, verification_status
       FROM catalog_revision_sources
       WHERE revision_id = ANY($1::uuid[])`,
      [[...revisionIds.values()]],
    );
    assert.equal(linkVerification.rowCount, 34);
    assert.deepEqual(
      new Set(linkVerification.rows.map((link) =>
        `${link.revision_id}|${link.source_id}|${link.claim_key}`,
      )),
      expectedLinkKeys,
    );
    for (const link of linkVerification.rows) {
      assert.ok(sameDate(link.checked_at, checkedAt));
      assert.equal(link.verified_at, null);
      assert.equal(link.verification_status, "pending_review");
    }

    const aliasesAfter = await client.query(
      `SELECT source_system, external_type, external_key, external_context_key, catalog_item_id
       FROM catalog_item_aliases
       WHERE catalog_item_id = ANY($1::uuid[])
       ORDER BY source_system, external_type, external_key, external_context_key`,
      [[...itemIds.values()]],
    );
    assert.deepEqual(aliasesAfter.rows, aliasSnapshot.rows);

    await client.query("COMMIT");
    console.log(JSON.stringify({
      target: {
        projectId: expectedProjectId,
        branchId: expectedBranchId,
        endpointHost: configuredUrl.hostname,
        database: identity.rows[0].database_name,
        serverVersion: identity.rows[0].server_version,
      },
      counts,
      verified: {
        fieldIdentities: 13,
        aliasesUnchanged: aliasSnapshot.rowCount,
        fieldRevisions: verification.rowCount,
        typedContentRows: verification.rowCount,
        sourceRecords: sourceVerification.rowCount,
        provenanceRelationships: linkVerification.rowCount,
        allDraftPendingReview: true,
        verifiedAtNull: true,
        publicationPointersUnset: true,
      },
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
