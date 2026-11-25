import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";
import { reconcileSourceRegistry } from "../src/db/source-reconciliation.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
loadEnvConfig(process.cwd());

const expectedHost = "ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech";
const expectedBranchId = "br-wandering-flower-a1f6ys66";
const expectedProjectId = "calm-brook-21165945";
const checkedAt = new Date("2026-11-20T00:00:00.000Z");
const contentKeys = [
  "introduction",
  "broadlyInvolves",
  "activitiesAndWorkAreas",
  "learningAndSubjectConnections",
  "courseFamiliesToExplore",
  "furtherExploration",
];

const fields = [
  {
    id: "technology",
    title: "Technology",
    summary: "Computers, software and digital systems.",
    content: {
      introduction: "Technology is about understanding, building, using and improving digital tools and systems.",
      broadlyInvolves: "Software, devices, networks, data and the ways people use digital services.",
      activitiesAndWorkAreas: "Designing an app, testing a website, supporting a network, organising data and checking how a digital service works.",
      learningAndSubjectConnections: "Mathematics, logical problem-solving, computing where available, communication and careful testing can be useful foundations.",
      courseFamiliesToExplore: "Computer applications, computer science, information technology, electronics, digital skills and technical diplomas.",
      furtherExploration: "Compare the actual subjects, practical work, delivery mode and entry requirements for a named programme. Source-backed context: AICTE publishes approval processes for applicable technical institutions and programmes; check the current provider and programme rather than assuming one rule applies everywhere.",
    },
    claims: [
      ["technical-programme-context", "aicte-approval"],
      ["technical-professional-council-context", "ugc-professional-councils"],
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    summary: "Designing, testing and improving practical systems.",
    content: {
      introduction: "Engineering uses science, mathematics and design to work on practical structures, machines, products and systems.",
      broadlyInvolves: "Asking how something works, defining a problem, testing ideas and improving a solution.",
      activitiesAndWorkAreas: "Designing a component, checking a structure, planning a system, using technical drawings, building prototypes and improving a process.",
      learningAndSubjectConnections: "Mathematics, science, design, drawing, practical problem-solving and teamwork are useful areas to explore.",
      courseFamiliesToExplore: "Engineering degrees, polytechnic or engineering diplomas, technical vocational programmes and specialised branches.",
      furtherExploration: "Look at a named branch and institution before drawing conclusions about laboratories, admission tests or eligibility. Source-backed context: AICTE approval requirements apply to applicable technical institutions/programmes, not automatically to every course with an engineering-related name.",
    },
    claims: [
      ["technical-programme-context", "aicte-approval"],
      ["technical-professional-council-context", "ugc-professional-councils"],
    ],
  },
  {
    id: "healthcare",
    title: "Healthcare",
    summary: "Understanding health, care and health-related services.",
    content: {
      introduction: "Healthcare includes many ways of supporting health, care, prevention, treatment and health services.",
      broadlyInvolves: "Learning about people, health, science, care practices and the systems that help communities access services.",
      activitiesAndWorkAreas: "Health education, laboratory work, clinical support, rehabilitation, public health, records, technology and service coordination.",
      learningAndSubjectConnections: "Biology and other sciences can be relevant for some routes; communication, observation, responsibility and teamwork matter across many roles.",
      courseFamiliesToExplore: "Medical, nursing, pharmacy, allied-health, laboratory, public-health and health-support programmes, depending on the exact role.",
      furtherExploration: "Regulated routes have different current requirements. Source-backed context: NMC covers medical undergraduate education; INC publishes nursing programme guidance; PCI regulates pharmacy education. Check the exact course, institution and applicable regulator before relying on an eligibility or registration claim.",
    },
    claims: [
      ["medical-education-regulation", "nmc-undergraduate-medical"],
      ["nursing-education-context", "inc-nursing-programs-guidelines"],
      ["pharmacy-education-context", "pci-introduction"],
      ["professional-body-context", "ugc-professional-councils"],
    ],
  },
  {
    id: "business",
    title: "Business and Management",
    summary: "Understanding how organisations plan, provide and improve services.",
    content: {
      introduction: "Business and management explores how organisations use people, information, money and time to provide products or services.",
      broadlyInvolves: "Planning work, understanding customers, organising resources, communicating clearly and making informed decisions.",
      activitiesAndWorkAreas: "Accounting, operations, entrepreneurship, marketing, sales, finance, logistics, human resources and customer service.",
      learningAndSubjectConnections: "Mathematics, commerce, economics, communication, data handling and collaboration can be useful foundations.",
      courseFamiliesToExplore: "Commerce, business administration, management, accounting, finance, entrepreneurship, retail and logistics programmes.",
      furtherExploration: "Compare the course subjects and current institution/programme status. Do not treat a course title as proof of a particular job outcome.",
    },
    claims: [["programme-recognition", "ugc-recognition"]],
  },
  {
    id: "law",
    title: "Law",
    summary: "Understanding rules, rights, responsibilities and justice.",
    content: {
      introduction: "Law explores how rules are made, interpreted and applied in society.",
      broadlyInvolves: "Reading carefully, examining evidence, understanding different viewpoints and communicating reasoned arguments.",
      activitiesAndWorkAreas: "Legal research, public policy, compliance, contracts, rights awareness and dispute-resolution processes.",
      learningAndSubjectConnections: "Language, social studies, history, political understanding, research and clear writing are useful areas to develop.",
      courseFamiliesToExplore: "Integrated law degrees, law degrees after graduation, legal studies and related public-policy or social-science programmes.",
      furtherExploration: "Source-backed context: the Bar Council of India states that it regulates legal education standards and recognition context for law degrees qualifying for enrolment. Verify the current institution, course mode and BCI information directly; do not infer professional eligibility from a course title.",
    },
    claims: [
      ["legal-education-context", "bci-legal-education-clarification"],
      ["legal-education-notices", "bci-legal-education-notices"],
    ],
  },
  {
    id: "government",
    title: "Government and Public Service",
    summary: "Understanding public systems and services.",
    content: {
      introduction: "Government and public service looks at how public institutions, policies and services affect communities.",
      broadlyInvolves: "Understanding public needs, rules, administration, information and responsible decision-making.",
      activitiesAndWorkAreas: "Public administration, community programmes, policy research, civic communication, records, planning and service delivery.",
      learningAndSubjectConnections: "Social studies, economics, language, history, data interpretation and communication can help students explore this area.",
      courseFamiliesToExplore: "Public administration, political science, social work, economics, law, development studies and related humanities programmes.",
      furtherExploration: "A course can build relevant knowledge, but recruitment and examination requirements are set separately by the relevant authority and can change. No named recruitment pathway is asserted here.",
    },
    claims: [],
  },
  {
    id: "education",
    title: "Education",
    summary: "Supporting how people learn, teach and develop.",
    content: {
      introduction: "Education explores how learners develop knowledge, skills and confidence in schools, communities and other settings.",
      broadlyInvolves: "Planning learning activities, explaining ideas, listening to learners and reflecting on what helps people understand.",
      activitiesAndWorkAreas: "Teaching, learning support, curriculum development, educational content, training and education administration.",
      learningAndSubjectConnections: "Strong communication, patience, observation, subject knowledge and an interest in how people learn are useful foundations.",
      courseFamiliesToExplore: "Education, teacher education, early childhood education, special education, training and educational technology programmes.",
      furtherExploration: "Source-backed context: NCTE describes its norms, standards and recognition role for teacher education. Check the exact programme and current recognition information before treating any route as a teaching qualification.",
    },
    claims: [
      ["teacher-education-context", "ncte-introduction"],
      ["teacher-education-recognition", "ncte-rti"],
    ],
  },
  {
    id: "science",
    title: "Science and Research",
    summary: "Exploring questions through observation, evidence and testing.",
    content: {
      introduction: "Science and research uses evidence, observation and testing to understand questions about the natural world, people, materials and systems.",
      broadlyInvolves: "Asking questions, forming explanations, gathering information, testing methods and communicating what was found.",
      activitiesAndWorkAreas: "Laboratory work, environmental study, data analysis, fieldwork, health research, materials study and scientific communication.",
      learningAndSubjectConnections: "Science subjects, mathematics, curiosity, careful record-keeping and logical reasoning are useful foundations.",
      courseFamiliesToExplore: "Science degrees, research-oriented programmes, laboratory and technical courses, environmental studies and interdisciplinary programmes.",
      furtherExploration: "Compare actual subject combinations, laboratory access, practical requirements and progression routes for each named programme. Source-backed context: CSIR research-fellowship guidance demonstrates that research training has programme- and eligibility-specific conditions; it does not establish an undergraduate route.",
    },
    claims: [
      ["research-training-context", "csir-jrf-guidance"],
      ["research-scheme-context", "csir-sponsored-research-schemes"],
    ],
  },
  {
    id: "arts-design",
    title: "Arts and Design",
    summary: "Visual communication, creative practice and design thinking.",
    content: {
      introduction: "Arts and design explores visual expression, making, design choices and how people experience objects, spaces and messages.",
      broadlyInvolves: "Observing, experimenting, developing ideas, making and improving work through feedback.",
      activitiesAndWorkAreas: "Illustration, visual communication, product ideas, user experience, craft, animation, fashion, architecture-related design and creative production.",
      learningAndSubjectConnections: "Art, design, observation, visual communication, technology and project work can all be useful.",
      courseFamiliesToExplore: "Fine arts, design, visual communication, animation, product design, fashion and architecture-related programmes.",
      furtherExploration: "Portfolio, entrance, recognition and subject requirements vary widely. Source-backed context: CoA standards apply to architectural education, one part of this broad field; they do not validate every arts or design programme.",
    },
    claims: [
      ["architectural-education-context", "coa-architectural-education"],
      ["architectural-education-sitemap", "coa-regulations-sitemap"],
    ],
  },
  {
    id: "media",
    title: "Media",
    summary: "Creating and sharing information, stories and digital content.",
    content: {
      introduction: "Media explores how information, stories and messages are researched, created, presented and shared.",
      broadlyInvolves: "Understanding audiences, communicating clearly, checking information, creating content and using different formats responsibly.",
      activitiesAndWorkAreas: "Journalism, video, audio, photography, editing, content design, communication, publishing, advertising and digital media.",
      learningAndSubjectConnections: "Language, research, visual thinking, technology, communication and ethical judgement are useful areas to explore.",
      courseFamiliesToExplore: "Journalism, mass communication, media studies, film, digital content, advertising, public relations and design-related programmes.",
      furtherExploration: "Check the actual curriculum, equipment, practical work and institutional status. Source-backed context: the Ministry of Information and Broadcasting identifies public media-training institutes, including IIMC and FTII; this is not a claim about availability at another provider.",
    },
    claims: [
      ["public-media-training-context", "mib-about-us"],
      ["public-media-training-citizen-charter", "ftii-citizen-charter"],
    ],
  },
  {
    id: "agriculture-environment",
    title: "Agriculture and Environment",
    summary: "Food, natural resources, farming systems and environmental stewardship.",
    content: {
      introduction: "Agriculture and environment explores food systems, plants, animals, soil, water, ecosystems and how people use natural resources.",
      broadlyInvolves: "Observing living systems, understanding local conditions, testing practical approaches and considering sustainability.",
      activitiesAndWorkAreas: "Crop and soil work, horticulture, animal and fisheries systems, environmental monitoring, natural-resource management, extension and agricultural technology.",
      learningAndSubjectConnections: "Biology, chemistry, geography, environmental science, practical observation and data collection can be useful foundations.",
      courseFamiliesToExplore: "Agriculture, horticulture, forestry, fisheries, environmental science, food systems, agricultural engineering and allied-science programmes.",
      furtherExploration: "Source-backed context: ICAR describes its role in agricultural-education planning, coordination and quality. Check the named course, university, recognition and current eligibility before applying.",
    },
    claims: [
      ["agricultural-education-context", "icar-agricultural-education"],
      ["agricultural-education-mandate", "icar-mandate"],
    ],
  },
  {
    id: "hospitality-tourism",
    title: "Hospitality and Tourism",
    summary: "Supporting travel, accommodation, food and visitor experiences.",
    content: {
      introduction: "Hospitality and tourism explores how people plan, host and support travel, accommodation, food and visitor experiences.",
      broadlyInvolves: "Communication, organisation, service design, local knowledge, teamwork and attention to detail.",
      activitiesAndWorkAreas: "Hotel operations, food service, travel support, event coordination, visitor information, destination services and tourism communication.",
      learningAndSubjectConnections: "Communication, languages, geography, business, food-related learning and teamwork can be useful foundations.",
      courseFamiliesToExplore: "Hotel management, tourism studies, travel and tourism, culinary programmes, event management and service-sector skill courses.",
      furtherExploration: "Check practical training, provider status, location and admission information directly. Source-backed context: NCVET provides vocational-qualification context, but no direct hospitality/tourism education authority was confirmed in this review; keep this field pending review.",
    },
    claims: [["vocational-qualification-context", "msde-ncvet"]],
  },
  {
    id: "social-sciences",
    title: "Social Sciences",
    summary: "Understanding people, communities and social change.",
    content: {
      introduction: "Social sciences explore how people, communities, institutions and cultures interact and change.",
      broadlyInvolves: "Asking questions about society, reading evidence, listening to different perspectives and interpreting information carefully.",
      activitiesAndWorkAreas: "Psychology-related study, sociology, community work, research, development programmes, public communication, policy support and social services.",
      learningAndSubjectConnections: "Social studies, language, research, statistics, empathy and careful analysis are useful areas to develop.",
      courseFamiliesToExplore: "Psychology, sociology, social work, anthropology, economics, development studies, political science and interdisciplinary humanities programmes.",
      furtherExploration: "Compare the actual curriculum and institution information rather than inferring outcomes. Avoid treating this broad field as evidence of a clinical or professional qualification.",
    },
    claims: [],
  },
];

const sources = [
  ["ncs-career-guidance", "National Career Service", "Directorate General of Employment, Ministry of Labour and Employment", "https://ncs.gov.in/about-us", "career_guidance"],
  ["ugc-recognition", "University Grants Commission recognition FAQ", "University Grants Commission, Ministry of Education", "https://www.ugc.gov.in/Home/faq", "institution_recognition"],
  ["ugc-professional-councils", "UGC professional councils", "University Grants Commission", "https://www.ugc.gov.in/UGCofficials/Professional_Councils", "professional_education_regulation"],
  ["aicte-approval", "AICTE Approval Process Handbook 2024–2027", "All India Council for Technical Education", "https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf", "technical_education_approval"],
  ["msde-ncvet", "Ministry of Skill Development annual report", "Ministry of Skill Development and Entrepreneurship / NCVET", "https://msde.gov.in/sites/default/files/2023-09/Final%20Skill%20AR%20Eng.pdf", "vocational_education"],
  ["icar-agricultural-education", "ICAR Agricultural Education Division", "Indian Council of Agricultural Research", "https://icar.gov.in/en/agricultural-education-division", "agricultural_education"],
  ["nmc-undergraduate-medical", "NMC Graduate Medical Education Regulations 2023", "National Medical Commission", "https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FLatestNews%2FUEMEB+regulations.pdf", "medical_education_regulation"],
  ["coa-architectural-education", "Council of Architecture regulations index", "Council of Architecture", "https://coa.gov.in/index1.php?lang=1&level=0&lid=287&linkid=47", "architectural_education_standards"],
  ["inc-nursing-programs-guidelines", "INC Nursing Programs Guidelines", "Indian Nursing Council", "https://indiannursingcouncil.org/nursing-programs-guidelines", "nursing_education_regulation"],
  ["pci-introduction", "PCI Introduction", "Pharmacy Council of India", "https://pci.nic.in/GenInfo_About_Introduction.html", "pharmacy_education_regulation"],
  ["bci-legal-education-clarification", "BCI legal education clarification", "Bar Council of India", "https://www.barcouncilofindia.org/info/clarificat-vfrru1", "legal_education_regulation"],
  ["bci-legal-education-notices", "BCI legal education notices", "Bar Council of India", "https://www.barcouncilofindia.org/info/notifications/le", "legal_education_regulation"],
  ["ncte-introduction", "NCTE introduction", "National Council for Teacher Education", "https://web.ncte.gov.in/page/introduction", "teacher_education_regulation"],
  ["ncte-rti", "NCTE RTI page", "National Council for Teacher Education", "https://web.ncte.gov.in/page/rti", "teacher_education_regulation"],
  ["csir-jrf-guidance", "CSIR JRF guidance", "CSIR Human Resource Development Group", "https://csirhrdg.res.in/Home/Index/1/Default/3384/60", "research_training_guidance"],
  ["csir-sponsored-research-schemes", "CSIR sponsored research schemes", "CSIR Human Resource Development Group", "https://www.csirhrdg.res.in/Home/Index/1/Default/3283/63", "research_training_guidance"],
  ["coa-regulations-sitemap", "CoA regulations sitemap", "Council of Architecture", "https://coa.gov.in/sitemap.php?lang=1&level=0&lid=31&linkid=30", "architectural_education_standards"],
  ["mib-about-us", "Ministry of Information and Broadcasting About Us", "Ministry of Information and Broadcasting", "https://mib.gov.in/en/ministry/about-us", "public_media_training"],
  ["ftii-citizen-charter", "FTII Citizen Charter", "Film and Television Institute of India", "https://ftii.ac.in/en/citizen-charter-ic-", "public_media_training"],
  ["icar-mandate", "ICAR mandate", "Indian Council of Agricultural Research", "https://icar.gov.in/en/our-mandate", "agricultural_education"],
];

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

function sameJson(left, right) {
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
  );
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
const endpointMatches = endpointMetadata.endpoints.filter(
  (endpoint) => endpoint.host === expectedHost,
);
assert.equal(endpointMatches.length, 1);
assert.equal(endpointMatches[0].project_id, expectedProjectId);
assert.equal(endpointMatches[0].branch_id, expectedBranchId);

const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 10000, max: 1 });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(20261120, 20)");

    const identityRows = await client.query(
      `SELECT i.id AS item_id,i.item_type,i.published_revision_id,
              a.source_system,a.external_type,a.external_key,a.external_context_key
       FROM catalog_items i
       JOIN catalog_item_aliases a ON a.catalog_item_id=i.id
       WHERE i.item_type='field'
         AND a.source_system='careerbridge'
         AND a.external_type='field'
       ORDER BY a.external_key`,
    );
    assert.equal(identityRows.rowCount, 13);
    const itemByField = new Map();
    const aliasSnapshot = [];
    for (const row of identityRows.rows) {
      assert.equal(row.item_type, "field");
      assert.equal(row.published_revision_id, null);
      assert.equal(row.external_context_key, "");
      assert.ok(!itemByField.has(row.external_key));
      itemByField.set(row.external_key, row.item_id);
    }
    assert.equal(itemByField.size, 13);
    for (const field of fields) assert.ok(itemByField.has(field.id));

    const aliasesAfterBase = await client.query(
      `SELECT source_system,external_type,external_key,external_context_key,catalog_item_id
       FROM catalog_item_aliases
       WHERE catalog_item_id=ANY($1::uuid[])
       ORDER BY source_system,external_type,external_key,external_context_key`,
      [[...itemByField.values()]],
    );
    aliasSnapshot.push(...aliasesAfterBase.rows);

    const revisionRows = await client.query(
      `SELECT r.id,r.catalog_item_id,r.revision_number,r.publication_status,r.title,r.summary,
              r.description,r.data_classification,r.verification_status,r.published_at,
              fr.field_content
       FROM catalog_item_revisions r
       LEFT JOIN field_revisions fr ON fr.revision_id=r.id
       WHERE r.revision_number=1
         AND r.catalog_item_id=ANY($1::uuid[])
       ORDER BY r.catalog_item_id,r.revision_number`,
      [[...itemByField.values()]],
    );
    const revisionsByItem = new Map();
    for (const row of revisionRows.rows) {
      assert.equal(row.revision_number, 1);
      assert.equal(row.publication_status, "draft");
      assert.equal(row.data_classification, "real");
      assert.equal(row.verification_status, "pending_review");
      assert.equal(row.published_at, null);
      assert.ok(!revisionsByItem.has(row.catalog_item_id));
      revisionsByItem.set(row.catalog_item_id, row);
    }
    assert.equal(revisionsByItem.size, 13);

    const sourceIds = new Map();
    const reconciledSources = await reconcileSourceRegistry(
      client,
      sources.map(([sourceKey, sourceName, authority, canonicalUrl, category]) => ({
        sourceKey,
        sourceName,
        authority,
        canonicalUrl,
        category,
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
      assert.deepEqual(Object.keys(field.content).sort(), [...contentKeys].sort());
      assert.ok(Object.values(field.content).every((value) => typeof value === "string"));
      const itemId = itemByField.get(field.id);
      const original = revisionsByItem.get(itemId);
      assert.ok(original);

      const changed =
        !sameJson(original.field_content, field.content) ||
        original.title !== field.title ||
        original.summary !== field.summary;
      const existingRevision2 = await client.query(
        `SELECT r.id,r.revision_number,r.publication_status,r.title,r.summary,r.description,
                r.data_classification,r.verification_status,r.published_at,fr.field_content
         FROM catalog_item_revisions r
         LEFT JOIN field_revisions fr ON fr.revision_id=r.id
         WHERE r.catalog_item_id=$1 AND r.revision_number=2`,
        [itemId],
      );

      if (existingRevision2.rowCount) {
        const revision2 = existingRevision2.rows[0];
        assert.equal(revision2.publication_status, "draft");
        assert.equal(revision2.data_classification, "real");
        assert.equal(revision2.verification_status, "pending_review");
        assert.equal(revision2.published_at, null);
        assert.equal(revision2.title, field.title);
        assert.equal(revision2.summary, field.summary);
        assert.equal(revision2.description, null);
        assert.deepEqual(revision2.field_content, field.content);
        revisionIds.set(field.id, revision2.id);
        counts.revisionsReused += 1;
        counts.typedRowsReused += 1;
      } else if (changed) {
        const revision = await client.query(
          `INSERT INTO catalog_item_revisions
            (catalog_item_id,revision_number,publication_status,title,summary,description,
             data_classification,verification_status)
           VALUES ($1,2,'draft',$2,$3,NULL,'real','pending_review') RETURNING id`,
          [itemId, field.title, field.summary],
        );
        const revisionId = revision.rows[0].id;
        await client.query(
          "INSERT INTO field_revisions (revision_id,field_content) VALUES ($1,$2::jsonb)",
          [revisionId, JSON.stringify(field.content)],
        );
        revisionIds.set(field.id, revisionId);
        counts.revisionsInserted += 1;
        counts.typedRowsInserted += 1;
      } else {
        revisionIds.set(field.id, original.id);
        counts.revisionsReused += 1;
        counts.typedRowsReused += 1;
      }

      if (!changed && !existingRevision2.rowCount) counts.skipped += 1;
    }

    for (const field of fields) {
      const revisionId = revisionIds.get(field.id);
      for (const [claimName, sourceKey] of field.claims) {
        const sourceId = sourceIds.get(sourceKey);
        assert.ok(sourceId);
        const claimKey = `field.${field.id}.${claimName}`;
        const existing = await client.query(
          `SELECT checked_at,verified_at,verification_status
           FROM catalog_revision_sources
           WHERE revision_id=$1 AND source_id=$2 AND claim_key=$3`,
          [revisionId, sourceId, claimKey],
        );
        if (existing.rowCount) {
          assert.equal(existing.rows[0].verified_at, null);
          assert.equal(existing.rows[0].verification_status, "pending_review");
          assert.equal(existing.rows[0].checked_at?.toISOString(), checkedAt.toISOString());
          counts.relationshipsReused += 1;
        } else {
          await client.query(
            `INSERT INTO catalog_revision_sources
              (revision_id,source_id,claim_key,checked_at,verified_at,verification_status)
             VALUES ($1,$2,$3,$4,NULL,'pending_review')`,
            [revisionId, sourceId, claimKey, checkedAt],
          );
          counts.relationshipsInserted += 1;
        }
      }
    }

    const aliasesFinal = await client.query(
      `SELECT source_system,external_type,external_key,external_context_key,catalog_item_id
       FROM catalog_item_aliases
       WHERE catalog_item_id=ANY($1::uuid[])
       ORDER BY source_system,external_type,external_key,external_context_key`,
      [[...itemByField.values()]],
    );
    assert.deepEqual(aliasesFinal.rows, aliasSnapshot);

    const finalRevisions = await client.query(
      `SELECT r.catalog_item_id,r.revision_number,r.publication_status,r.data_classification,
              r.verification_status,r.published_at,fr.field_content
       FROM catalog_item_revisions r
       JOIN field_revisions fr ON fr.revision_id=r.id
       WHERE r.catalog_item_id=ANY($1::uuid[])
       ORDER BY r.catalog_item_id,r.revision_number`,
      [[...itemByField.values()]],
    );
    for (const row of finalRevisions.rows) {
      assert.ok(row.publication_status !== "published");
      assert.notEqual(row.data_classification, "demo");
      assert.notEqual(row.data_classification, "test");
      assert.equal(row.verification_status, "pending_review");
      assert.equal(row.published_at, null);
    }

    const pointers = await client.query(
      "SELECT count(*)::int AS count FROM catalog_items WHERE item_type='field' AND published_revision_id IS NOT NULL",
    );
    assert.equal(pointers.rows[0].count, 0);
    const sourceCount = await client.query("SELECT count(*)::int AS count FROM source_registry");

    await client.query("COMMIT");
    console.log(JSON.stringify({
      target: {
        projectId: expectedProjectId,
        branchId: expectedBranchId,
        endpointHost: configuredUrl.hostname,
      },
      counts,
      verified: {
        fieldIdentities: 13,
        aliasesUnchanged: aliasSnapshot.length,
        revisionRows: finalRevisions.rowCount,
        sourceRecords: sourceCount.rows[0].count,
        publishedPointers: 0,
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
