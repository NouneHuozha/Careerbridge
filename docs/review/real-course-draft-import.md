# Real-Course Draft Import

`scripts/import-real-course-draft.mjs` is a development-only, draft-only import workflow for exactly one manually curated real course record.

It does not publish courses, set `published_revision_id`, set `published_at`, create course identities, or create aliases. Sources with canonical URLs are reconciled through `src/db/source-reconciliation.mjs` in the same transaction as the course draft; registration does not create or verify claim-level provenance by itself.

## Invocation

```powershell
node scripts/import-real-course-draft.mjs C:\path\to\one-course.json
```

Required environment variables:

- `DATABASE_URL`: matching Neon development pooler URL.
- `DATABASE_URL_UNPOOLED`: matching direct Neon development URL.
- `NEON_PROJECT_ID=calm-brook-21165945`
- `NEON_BRANCH=development`
- `NEON_BRANCH_ID=br-wandering-flower-a1f6ys66`

The importer also rejects hosted `VERCEL` execution.

## Input

The input must be one JSON object, not an array, using `src/db/course-import-validation.ts`'s `RealCourseImportRecord` shape.

Required identity/dependency fields:

- `kind: "course"`
- Stable `id`
- Existing canonical `careerbridge/course/<id>/empty-context` alias
- Existing published-real field dependency with item, revision and alias IDs
- Draft revision with `dataClassification: "real"`
- Exact course qualification and stages
- Non-empty title, summary and description
- A JSON `courseContent.learningAreas` array
- Existing source references and claim-level provenance

The input may list source metadata. URL-bearing sources are reconciled by normalized URL: matching metadata is reused, missing sources are inserted, and conflicts or ambiguous matches abort the transaction. Existing source metadata is never overwritten.

## Lifecycle

The importer verifies the complete payload with `validateRealCourseImportRecord()`, computes the approved canonical hash with `hashRealCourseImportRecord()`, and delegates lifecycle decisions to `decideCourseImportRevision()`.

- Identical content against any existing revision: `unchanged`.
- Identical draft reruns: no duplicate revision.
- Changed content against a published, archived or rejected revision: create the next revision number.
- Changed content against an existing draft, in-review or approved revision: conflict.
- A sole, typed, unpublished demo draft with no published pointer is preserved and permits a separate real draft at the next revision number. Other demo/test histories remain conflicts.

Every new revision is inserted with `publication_status='draft'`, `data_classification='real'`, and `published_at=NULL`.
