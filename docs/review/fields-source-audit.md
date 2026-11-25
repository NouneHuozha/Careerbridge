# Fields Source Evidence Audit

## Scope and conclusion

Checked 2026-11-19 UTC against Neon development only. The audit reviewed the 13 imported field revisions, eight source records, and 34 `catalog_revision_sources` rows. All field revisions are `draft`, `real`, and `pending_review`; every provenance row has `verified_at: null` and `verification_status: pending_review`. No publication recommendation is made in this document.

The imported copy is largely CareerBridge-authored guidance. That is appropriate for broad introductions, activities, subject connections, and exploratory course families, provided it remains framed as general guidance. Existing sources substantiate narrow claims about career-information services, programme/institution verification, and selected regulated education contexts. They do **not** independently establish every descriptive sentence in a field record.

## Existing evidence baseline

| Existing source | Direct URL | What it establishes | Limit |
|---|---|---|---|
| National Career Service | <https://ncs.gov.in/about-us> | NCS is a Ministry of Labour and Employment career, skill, counselling and employment service. | Does not establish any particular field's activities, courses or outcomes. |
| UGC recognition FAQ | <https://www.ugc.gov.in/Home/faq> | Students should check current recognition/approval and the applicable authority for a programme or institution. | Does not validate a particular course family or institution. |
| UGC professional councils | <https://www.ugc.gov.in/UGCofficials/Professional_Councils> | Lists statutory/professional bodies relevant to regulated fields. | A directory, not direct evidence of programme eligibility. |
| AICTE Approval Process Handbook 2024–2027 | <https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf> | Approval context for applicable technical institutions/programmes. | Not a description of technology or engineering work. |
| MSDE / NCVET annual report | <https://msde.gov.in/sites/default/files/2023-09/Final%20Skill%20AR%20Eng.pdf> | NCVET's standards and qualification role in vocational education/training. | Not a guarantee that a named skills course is recognised or available. |
| ICAR Agricultural Education Division | <https://icar.gov.in/en/agricultural-education-division> | ICAR's agricultural-education quality, planning and coordination role. | Does not validate a named agricultural programme. |
| NMC Graduate Medical Education Regulations 2023 | <https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FLatestNews%2FUEMEB+regulations.pdf> | Undergraduate medical education is regulated and competency-based. | Applies to medical education, not all healthcare routes. |
| Council of Architecture regulations index | <https://coa.gov.in/index1.php?lang=1&level=0&lid=287&linkid=47> | Architectural education standards/recognised-qualification context. | Applies to architecture, not all arts/design programmes. |

**Existing relationship quality:** 34 rows cover discovery context for every field and generic recognition context for most fields; agriculture, arts/design, education, engineering, healthcare and hospitality also have one specialist-context row. This is sufficient for a draft provenance structure, but not sufficient to mark the descriptions verified.

## Additional checked sources

| Key | Source and authority | URL | Relevant section | Exact supported claim | Independent corroboration |
|---|---|---|---|---|---|
| `inc-nursing` | Indian Nursing Council, Ministry of Health and Family Welfare | <https://indiannursingcouncil.org/nursing-programs-guidelines> | Nursing Programs Guidelines | Nursing education has nationally published programme guidelines/standards. | INC home page identifies its statutory role. |
| `pci-pharmacy` | Pharmacy Council of India | <https://pci.nic.in/GenInfo_About_Introduction.html> | Introduction and objectives | PCI regulates pharmacy education and practice up to graduate level under the Pharmacy Act context. | UGC professional-councils directory lists PCI. |
| `ncte-teacher-ed` | National Council for Teacher Education | <https://web.ncte.gov.in/page/introduction> | Introduction and Programmes Recognised by NCTE | NCTE regulates norms/standards for teacher education and identifies recognised programme categories. | NCTE RTI page confirms recognition/withdrawal role of regional committees. |
| `icar-agri` | ICAR Agricultural Education Division | <https://icar.gov.in/en/agricultural-education-division> | Mandate | ICAR plans, promotes and coordinates agricultural education and quality/relevance work. | ICAR mandate page: <https://icar.gov.in/en/our-mandate>. |
| `nmc-medical` | National Medical Commission | <https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FLatestNews%2FUEMEB+regulations.pdf> | Graduate Medical Education Regulations 2023 | Medical undergraduate education includes competency-based professional preparation. | NMC rules/regulations page lists current UGMEB regulations. |
| `coa-architecture` | Council of Architecture | <https://coa.gov.in/index1.php?lang=1&level=0&lid=287&linkid=47> | Architectural Education / Regulations | CoA publishes minimum-standard regulations for architectural education. | CoA regulations sitemap lists recognised qualification materials. |

## Field-by-field audit

### technology

**Existing coverage:** NCS discovery context; UGC recognition context; AICTE technical-programme context. All pending review.

**Supported factual claim:** Applicable technical institutions/programmes may be subject to AICTE approval processes. Source: AICTE Approval Process Handbook, Chapter I; checked 2026-11-19; independently contextualised by UGC's professional-councils directory.

**Unsupported or authored content:** Digital tools, apps, networks, data, activities, and subject connections are CareerBridge-authored orientation, not source-verified occupational facts.

**Recommended correction:** Retain general copy, but change any broad statement implying all computer-science/IT programmes require AICTE approval to “check the current institution and programme requirements.”

**Readiness:** Draft only. Add a direct official technology/IT education or skills source only when a concrete programme or regulated claim is introduced.

### engineering

**Existing coverage:** NCS, UGC FAQ, AICTE handbook. All pending review.

**Supported factual claim:** AICTE's handbook describes approval processes for applicable technical institutions/programmes at diploma, undergraduate and postgraduate levels. Chapter I, checked 2026-11-19; corroborated by UGC's professional-councils directory.

**Unsupported or authored content:** The explanation of design, testing, prototypes and branches is guidance, not evidence of a particular professional route.

**Recommended correction:** Keep “may explore” phrasing. Do not state that a degree/diploma guarantees professional engineering practice or admission eligibility.

**Readiness:** Draft only; suitable for review once the technical-programme sentence is narrowed to applicable institutions/programmes.

### healthcare

**Existing coverage:** NCS, NMC medical-education regulation, UGC professional-councils directory. All pending review.

**Supported factual claims:** NMC regulations support medical-undergraduate context only. Indian Nursing Council guidance supports nursing-programme standards; Pharmacy Council of India supports pharmacy-education regulation. Checked 2026-11-19; the UGC directory independently identifies NMC, INC and PCI as relevant professional bodies.

**Unsupported or authored content:** “Healthcare” as a broad field, clinical-support/laboratory/public-health examples, and allied-health course families are guidance. They are not all covered by NMC.

**Recommended correction:** Split future regulated claims by profession: medical → NMC; nursing → INC; pharmacy → PCI. Add an official allied-health authority source before making any allied-health recognition statement.

**Readiness:** Draft only; strongest evidence among fields, but broad healthcare content must not be labelled verified as a whole.

### business

**Existing coverage:** NCS and UGC recognition FAQ. Both pending review.

**Supported factual claim:** Students should verify the current status/authority of a chosen programme or institution. UGC FAQ, checked 2026-11-19.

**Unsupported or authored content:** Accounting, finance, entrepreneurship, management and logistics examples are CareerBridge guidance; no field-specific official evidence is attached.

**Recommended correction:** Retain only as exploratory wording. Add a specialist source only for a future claim about regulated accounting/professional qualifications.

**Readiness:** Draft only; evidence is generic.

### law

**Existing coverage:** NCS, UGC professional-councils directory, UGC FAQ. All pending review.

**Supported factual claim:** Law has professional-body context and a chosen programme/institution must be checked through current official sources. UGC directory and FAQ, checked 2026-11-19.

**Unsupported or authored content:** Legal research, advocacy support, practice pathways and integrated-law descriptions are not directly supported by an existing law-specific source.

**Missing evidence:** A direct Bar Council of India legal-education / recognised-institution source has not yet been verified for this audit.

**Recommended correction:** Keep the record draft; add a checked BCI source before publishing any legal-education recognition statement.

**Readiness:** Not publication-ready for regulated education language.

### government

**Existing coverage:** NCS and UGC FAQ. Both pending review.

**Supported factual claim:** Only generic programme/institution verification guidance.

**Unsupported or authored content:** Public administration, policy, civic communication and recruitment/examination wording are guidance; no public-service authority source currently supports a defined pathway.

**Missing evidence:** No direct official source for a named public-service recruitment/examination or public-administration curriculum is attached.

**Recommended correction:** Keep “requirements are set separately and can change.” Do not name recruitment routes or examinations until a precise official authority and date are attached.

**Readiness:** Draft only; weakest specialist evidence.

### education

**Existing coverage:** NCS, UGC professional-councils directory, UGC FAQ. All pending review.

**Supported factual claim:** NCTE regulates norms/standards and recognition context for teacher education; its introduction page identifies recognised teacher-education programme categories. Checked 2026-11-19; corroborated by NCTE's recognition-role page.

**Unsupported or authored content:** Teaching, curriculum, learning support, educational technology and career examples are guidance, not evidence of teacher eligibility.

**Recommended correction:** Add `ncte-teacher-ed` to the review plan for the narrow sentence about regulated teacher education. Avoid displaying a generic “teacher route” as eligibility advice.

**Readiness:** Draft only; publication can be considered after NCTE claim review.

### science

**Existing coverage:** NCS and UGC FAQ. Both pending review.

**Supported factual claim:** Only programme/institution verification context.

**Unsupported or authored content:** Research, laboratory, data, environmental work and science-course examples are CareerBridge guidance.

**Missing evidence:** No direct source from a science/research authority has been checked for specific education or curriculum claims.

**Recommended correction:** Keep current broad language; obtain a direct DST/CSIR or named public-institution curriculum source only if specific research-training claims are added.

**Readiness:** Draft only; generic evidence.

### arts-design

**Existing coverage:** NCS, UGC FAQ, CoA regulations index. All pending review.

**Supported factual claim:** CoA provides standards/recognised-qualification context for architecture, not all design or arts courses. Checked 2026-11-19; corroborated by CoA's regulations sitemap.

**Unsupported or authored content:** Illustration, animation, fashion, UX, product design and creative production examples are guidance.

**Recommended correction:** Keep architecture clearly qualified as one regulated sub-area. Add direct official design-institution curriculum evidence only for future factual statements about design programmes.

**Readiness:** Draft only; do not allow CoA evidence to stand in for all arts/design content.

### media

**Existing coverage:** NCS and UGC FAQ. Both pending review.

**Supported factual claim:** Only programme/institution verification context.

**Unsupported or authored content:** Journalism, film, advertising, public relations and digital-content course/activity lists are guidance.

**Missing evidence:** No checked Ministry of Information and Broadcasting, public media institute, or curriculum authority source is attached.

**Recommended correction:** Retain general guidance; add a direct public-institution or Ministry source only for a specific factual media-education claim.

**Readiness:** Draft only; generic evidence.

### agriculture-environment

**Existing coverage:** NCS, UGC FAQ, ICAR Agricultural Education Division. All pending review.

**Supported factual claim:** ICAR plans/promotes/co-ordinates agricultural education and its quality/relevance work. Checked 2026-11-19; corroborated by ICAR's mandate page.

**Unsupported or authored content:** Agriculture/environment activity examples and course-family list are broad guidance; ICAR's page does not establish admission eligibility for a particular programme.

**Recommended correction:** Add `icar-agri` for the narrow agricultural-education statement. Keep environmental-science and agricultural-engineering references as exploratory until programme sources are attached.

**Readiness:** Draft only; comparatively strong specialist context.

### hospitality-tourism

**Existing coverage:** NCS, UGC FAQ, MSDE/NCVET annual-report context. All pending review.

**Supported factual claim:** NCVET has a vocational-education/training standards and qualification role. This does not verify a named tourism/hospitality programme. Checked 2026-11-19.

**Unsupported or authored content:** Hotel operations, travel, culinary, events and visitor services examples are guidance.

**Missing evidence:** No checked Ministry of Tourism, NCHMCT, or other direct official hospitality/tourism education source.

**Recommended correction:** Add a direct official hospitality/tourism curriculum or standards source before publishing field-specific education claims.

**Readiness:** Draft only; specialist evidence is too indirect.

### social-sciences

**Existing coverage:** NCS and UGC FAQ. Both pending review.

**Supported factual claim:** Only generic programme/institution verification context.

**Unsupported or authored content:** Psychology, sociology, social work, development, community work and policy-support examples are guidance.

**Missing evidence:** No direct ICSSR, university curriculum, or other public social-science authority source has been checked.

**Recommended correction:** Preserve exploratory language and avoid professional/clinical claims about psychology or social work without direct authority evidence.

**Readiness:** Draft only; generic evidence.

## Claim-to-source action matrix

| Claim class | Existing relation quality | Action before publication |
|---|---|---|
| General discovery context | NCS is relevant but broad | Keep as source-discovery context, not validation of field narrative. |
| Programme/institution verification | UGC FAQ is directly useful | Retain; present as a student verification reminder. |
| Technical programme approval | AICTE is useful for applicable technical providers | Narrow wording; do not apply to every technology/engineering programme. |
| Medical education | NMC is directly useful for MBBS/medical undergraduate context | Split from nursing, pharmacy and allied-health claims. |
| Nursing and pharmacy education | Existing database has no direct links | Add INC/PCI only after reviewer accepts the precise regulated-education sentence. |
| Teacher education | Existing database has only generic professional-body context | Add NCTE for recognition/norms statement. |
| Agricultural education | ICAR is directly useful | Retain for education-quality context; do not infer admissions. |
| Architecture | CoA is directly useful only for architecture | Keep as narrow sub-area context. |
| Law, media, government, science, social sciences, hospitality | Specialist evidence absent or not yet directly checked | Keep content authored and draft; research a claim-specific source before publication. |

## Publication recommendation

No field should move from `draft` / `pending_review` yet. The main work is not adding more URLs; it is reviewing each sentence, retaining authored guidance as guidance, and attaching field-specific sources only to concrete statements that those sources directly support.

The highest-value next evidence work is healthcare (INC, PCI and an allied-health authority), education (NCTE), hospitality/tourism (an official tourism/hospitality education authority), law (BCI), and public-service/government pathways (only if a specific factual pathway is introduced).
