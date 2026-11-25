# Fields Catalogue Draft Content Pack

## Purpose and review status

This is draft material for the existing 13 CareerBridge field identities. It is not a database import, publication decision, or student-facing source of truth. Every proposed record has `publication_status: draft`, `data_classification: real`, and `verification_status: pending_review` until a reviewer confirms the copy, source links, and claim coverage.

The field narratives below are **CareerBridge-authored general guidance** for Class 10 and Class 12 students. They do not claim that a particular course is available at a particular institution, that a student is eligible, or that a field predicts a career outcome. Course families are discovery prompts only and require programme- and institution-specific verification before display as admissions information.

**Checked:** 2026-11-19 UTC. Existing Neon development identities are reused; no new catalogue item IDs are proposed.

## Proposed source registry records

| Key | Source | Official URL | Authority | Supports |
|---|---|---|---|---|
| `ncs-career-guidance` | National Career Service | <https://ncs.gov.in/about-us> | Directorate General of Employment, Ministry of Labour and Employment | Career guidance and skill/training discovery context; not a claim that any named course or occupation is appropriate for a student. |
| `ugc-recognition` | University Grants Commission recognition FAQ | <https://www.ugc.gov.in/Home/faq> | University Grants Commission, Ministry of Education | Students should verify an institution/programme's current recognition and applicable approvals. |
| `ugc-professional-councils` | UGC professional councils | <https://www.ugc.gov.in/UGCofficials/Professional_Councils> | University Grants Commission | Some fields have relevant statutory/professional bodies; programme-specific requirements need direct verification. |
| `aicte-approval` | AICTE Approval Process Handbook 2024–2027 | <https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf> | All India Council for Technical Education | Technical-institution/programme approval context for applicable offerings. |
| `msde-ncvet` | Ministry of Skill Development annual report | <https://msde.gov.in/sites/default/files/2023-09/Final%20Skill%20AR%20Eng.pdf> | Ministry of Skill Development and Entrepreneurship / NCVET | NCVET's role in vocational education and training standards/qualifications. |
| `icar-agricultural-education` | ICAR Agricultural Education Division | <https://icar.gov.in/en/agricultural-education-division> | Indian Council of Agricultural Research | Agricultural education quality, planning, and agriculture/allied-science context. |
| `nmc-undergraduate-medical` | NMC Graduate Medical Education Regulations 2023 | <https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FLatestNews%2FUEMEB+regulations.pdf> | National Medical Commission | Undergraduate medical education is regulated and competency-based; not a substitute for current admission rules. |
| `coa-architectural-education` | Council of Architecture regulations index | <https://coa.gov.in/index1.php?lang=1&level=0&lid=287&linkid=47> | Council of Architecture | Architectural education standards and recognised-qualification context. |

**Proposed source metadata:** all eight records use `source_type: official_public_web_page`, `status: active`, and are initially `verification_status: pending_review`. Attach a source only to the narrow factual claim listed above; do not treat it as evidence for every narrative sentence.

## Field drafts

### technology

**Proposed revision metadata:** title `Technology`; summary `Computers, software and digital systems.`; classification `real`; verification `pending_review`.

- **Introduction:** Technology is about understanding, building, using and improving digital tools and systems.
- **Broadly involves:** Software, devices, networks, data and the ways people use digital services.
- **Activities and work areas:** Designing an app, testing a website, supporting a network, organising data, or checking how a digital service works.
- **Learning and subject connections:** Mathematics, logical problem-solving, computing where available, communication, and careful testing can all be useful foundations.
- **Course families to explore:** Computer applications, computer science, information technology, electronics, digital skills, and technical diplomas.
- **Further exploration:** Compare the actual subjects, practical work, delivery mode, recognition and entry requirements for a named programme. Do not assume every technical programme has the same approval route.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; `technical-programme-context` → `aicte-approval`; general discovery context → `ncs-career-guidance`.

### engineering

**Proposed revision metadata:** title `Engineering`; summary `Designing, testing and improving practical systems.`; classification `real`; verification `pending_review`.

- **Introduction:** Engineering uses science, mathematics and design to work on practical structures, machines, products and systems.
- **Broadly involves:** Asking how something works, defining a problem, testing ideas and improving a solution.
- **Activities and work areas:** Designing a component, checking a structure, planning a system, using technical drawings, building prototypes or improving a process.
- **Learning and subject connections:** Mathematics, science, design, drawing, practical problem-solving and teamwork are useful areas to explore.
- **Course families to explore:** Engineering degrees, polytechnic or engineering diplomas, technical vocational programmes, and specialised branches after checking the provider.
- **Further exploration:** Look at a named branch and institution before drawing conclusions about subjects, laboratories, admission tests or eligibility.
- **Source relationships:** `technical-programme-context` → `aicte-approval`; `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### healthcare

**Proposed revision metadata:** title `Healthcare`; summary `Understanding health, care and health-related services.`; classification `real`; verification `pending_review`.

- **Introduction:** Healthcare includes many ways of supporting health, care, prevention, treatment and health services.
- **Broadly involves:** Learning about people, health, science, care practices and the systems that help communities access services.
- **Activities and work areas:** Health education, laboratory work, clinical support, rehabilitation, public health, records, technology and service coordination.
- **Learning and subject connections:** Biology and other sciences can be relevant for some routes; communication, observation, responsibility and teamwork matter across many roles.
- **Course families to explore:** Medical, nursing, pharmacy, allied-health, laboratory, public-health and health-support programmes, depending on the exact role.
- **Further exploration:** Regulated courses and professional practice have specific current requirements. Check the relevant regulator and institution before relying on an eligibility or registration claim.
- **Source relationships:** `medical-education-regulation` → `nmc-undergraduate-medical`; `professional-body-context` → `ugc-professional-councils`; general discovery context → `ncs-career-guidance`.

### business

**Proposed revision metadata:** title `Business and Management`; summary `Understanding how organisations plan, provide and improve services.`; classification `real`; verification `pending_review`.

- **Introduction:** Business and management explores how organisations use people, information, money and time to provide products or services.
- **Broadly involves:** Planning work, understanding customers, organising resources, communicating clearly and making informed decisions.
- **Activities and work areas:** Accounting, operations, entrepreneurship, marketing, sales, finance, logistics, human resources and customer service.
- **Learning and subject connections:** Mathematics, commerce, economics, communication, data handling and collaboration can be useful foundations.
- **Course families to explore:** Commerce, business administration, management, accounting, finance, entrepreneurship, retail and logistics programmes.
- **Further exploration:** Compare course subjects and the institution's current recognition; do not treat a course title as proof of a particular job outcome.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### law

**Proposed revision metadata:** title `Law`; summary `Understanding rules, rights, responsibilities and justice.`; classification `real`; verification `pending_review`.

- **Introduction:** Law explores how rules are made, interpreted and applied in society.
- **Broadly involves:** Reading carefully, examining evidence, understanding different viewpoints and communicating reasoned arguments.
- **Activities and work areas:** Legal research, public policy, compliance, contracts, advocacy support, rights awareness and dispute-resolution processes.
- **Learning and subject connections:** Language, social studies, history, political understanding, research and clear writing are useful areas to develop.
- **Course families to explore:** Integrated law degrees, law degrees after graduation, legal studies and related public-policy or social-science programmes.
- **Further exploration:** Legal education and practice pathways can have specific recognition and professional requirements. Verify the current programme and regulator information directly.
- **Source relationships:** `professional-body-context` → `ugc-professional-councils`; `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### government

**Proposed revision metadata:** title `Government and Public Service`; summary `Understanding public systems and services.`; classification `real`; verification `pending_review`.

- **Introduction:** Government and public service looks at how public institutions, policies and services affect communities.
- **Broadly involves:** Understanding public needs, rules, administration, information and responsible decision-making.
- **Activities and work areas:** Public administration, community programmes, policy research, civic communication, records, planning and service delivery.
- **Learning and subject connections:** Social studies, economics, language, history, data interpretation and communication can help students explore this area.
- **Course families to explore:** Public administration, political science, social work, economics, law, development studies and related humanities programmes.
- **Further exploration:** A course can build relevant knowledge, but recruitment or examination requirements are set separately by the applicable authority and can change.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### education

**Proposed revision metadata:** title `Education`; summary `Supporting how people learn, teach and develop.`; classification `real`; verification `pending_review`.

- **Introduction:** Education explores how learners develop knowledge, skills and confidence in schools, communities and other settings.
- **Broadly involves:** Planning learning activities, explaining ideas, listening to learners and reflecting on what helps people understand.
- **Activities and work areas:** Teaching, learning support, curriculum development, educational content, training, counselling support and education administration.
- **Learning and subject connections:** Strong communication, patience, observation, subject knowledge and an interest in how people learn are useful foundations.
- **Course families to explore:** Education, teacher education, early childhood education, special education, training and educational technology programmes.
- **Further exploration:** Teacher-education recognition and role requirements can be regulated. Check the specific course and current authority information before relying on it.
- **Source relationships:** `professional-body-context` → `ugc-professional-councils`; `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### science

**Proposed revision metadata:** title `Science and Research`; summary `Exploring questions through observation, evidence and testing.`; classification `real`; verification `pending_review`.

- **Introduction:** Science and research uses evidence, observation and testing to understand questions about the natural world, people, materials and systems.
- **Broadly involves:** Asking questions, forming explanations, gathering information, testing methods and communicating what was found.
- **Activities and work areas:** Laboratory work, environmental study, data analysis, fieldwork, health research, materials study and scientific communication.
- **Learning and subject connections:** Science subjects, mathematics, curiosity, careful record-keeping and logical reasoning are useful foundations.
- **Course families to explore:** Science degrees, research-oriented programmes, laboratory and technical courses, environmental studies and interdisciplinary programmes.
- **Further exploration:** Check the actual subject combination, laboratory access, practical requirements and progression routes for each named programme.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### arts-design

**Proposed revision metadata:** title `Arts and Design`; summary `Visual communication, creative practice and design thinking.`; classification `real`; verification `pending_review`.

- **Introduction:** Arts and design explores visual expression, making, design choices and how people experience objects, spaces and messages.
- **Broadly involves:** Observing, experimenting, developing ideas, making and improving work through feedback.
- **Activities and work areas:** Illustration, visual communication, product ideas, user experience, craft, animation, fashion, architecture-related design and creative production.
- **Learning and subject connections:** Art, design, observation, visual communication, technology and project work can all be useful.
- **Course families to explore:** Fine arts, design, visual communication, animation, product design, fashion and architecture-related programmes.
- **Further exploration:** Portfolio, entrance, recognition and subject requirements vary greatly. Architecture has separate standards-setting context and must be checked directly.
- **Source relationships:** `architectural-education-context` → `coa-architectural-education`; `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### media

**Proposed revision metadata:** title `Media`; summary `Creating and sharing information, stories and digital content.`; classification `real`; verification `pending_review`.

- **Introduction:** Media explores how information, stories and messages are researched, created, presented and shared.
- **Broadly involves:** Understanding audiences, communicating clearly, checking information, creating content and using different formats responsibly.
- **Activities and work areas:** Journalism, video, audio, photography, editing, content design, communication, publishing, advertising and digital media.
- **Learning and subject connections:** Language, research, visual thinking, technology, communication and ethical judgement are useful areas to explore.
- **Course families to explore:** Journalism, mass communication, media studies, film, digital content, advertising, public relations and design-related programmes.
- **Further exploration:** Check the actual curriculum, equipment, practical work and institutional status rather than assuming similarly named media courses are equivalent.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### agriculture-environment

**Proposed revision metadata:** title `Agriculture and Environment`; summary `Food, natural resources, farming systems and environmental stewardship.`; classification `real`; verification `pending_review`.

- **Introduction:** Agriculture and environment explores food systems, plants, animals, soil, water, ecosystems and how people use natural resources.
- **Broadly involves:** Observing living systems, understanding local conditions, testing practical approaches and considering sustainability.
- **Activities and work areas:** Crop and soil work, horticulture, animal and fisheries systems, environmental monitoring, natural-resource management, extension and agricultural technology.
- **Learning and subject connections:** Biology, chemistry, geography, environmental science, practical observation and data collection can be useful foundations.
- **Course families to explore:** Agriculture, horticulture, forestry, fisheries, environmental science, food systems, agricultural engineering and allied-science programmes.
- **Further exploration:** Agricultural education and programme quality have a specific ICAR context. Check the named course, university, recognition and current eligibility before applying.
- **Source relationships:** `agricultural-education-context` → `icar-agricultural-education`; `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

### hospitality-tourism

**Proposed revision metadata:** title `Hospitality and Tourism`; summary `Supporting travel, accommodation, food and visitor experiences.`; classification `real`; verification `pending_review`.

- **Introduction:** Hospitality and tourism explores how people plan, host and support travel, accommodation, food and visitor experiences.
- **Broadly involves:** Communication, organisation, service design, local knowledge, teamwork and attention to detail.
- **Activities and work areas:** Hotel operations, food service, travel support, event coordination, visitor information, destination services and tourism communication.
- **Learning and subject connections:** Communication, languages, geography, business, food-related learning and teamwork can be useful foundations.
- **Course families to explore:** Hotel management, tourism studies, travel and tourism, culinary programmes, event management and service-sector skill courses.
- **Further exploration:** Check practical training, placement claims, programme recognition, location and provider-specific admission information directly.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; `vocational-qualification-context` → `msde-ncvet`; general discovery context → `ncs-career-guidance`.

### social-sciences

**Proposed revision metadata:** title `Social Sciences`; summary `Understanding people, communities and social change.`; classification `real`; verification `pending_review`.

- **Introduction:** Social sciences explore how people, communities, institutions and cultures interact and change.
- **Broadly involves:** Asking questions about society, reading evidence, listening to different perspectives and interpreting information carefully.
- **Activities and work areas:** Psychology-related study, sociology, community work, research, development programmes, public communication, policy support and social services.
- **Learning and subject connections:** Social studies, language, research, statistics, empathy and careful analysis are useful areas to develop.
- **Course families to explore:** Psychology, sociology, social work, anthropology, economics, development studies, political science and interdisciplinary humanities programmes.
- **Further exploration:** Course titles can overlap while subjects and progression differ. Compare the actual curriculum and institution information rather than inferring outcomes.
- **Source relationships:** `programme-recognition` → `ugc-recognition`; general discovery context → `ncs-career-guidance`.

## Database mapping for review

For each field identity resolved through the existing `careerbridge / field / <field-id> / ''` alias:

1. Create one draft `catalog_item_revisions` row with the proposed metadata above and reviewer-owned timestamps/actors.
2. Create one matching `field_revisions` row. Put the student-facing structured sections in `field_content`; shared title, summary and concise description stay in `catalog_item_revisions`.
3. Add or reuse the source registry records above.
4. Add `catalog_revision_sources` rows only for the narrow claim keys named in each field. Suggested claim-key format: `field.<id>.<claim-name>`.
5. Do not set `catalog_items.published_revision_id` until review accepts the content and source coverage.

## Unresolved claims and review checklist

- No programme availability, fees, deadlines, scholarship eligibility, placement outcomes, salary, or institution-level claims are included.
- No field should imply that a particular school subject guarantees admission or a career.
- Reviewers must decide whether each general course-family list has sufficient source coverage for publication or should remain labelled as exploration guidance.
- Any future course/institution/offering claim needs a separate published revision and direct source link; this field pack cannot substantiate it.
- Before publication, verify each official URL, source retrieval date, source status, and whether the cited source still supports its attached claim.
