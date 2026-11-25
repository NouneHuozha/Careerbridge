# Real-course publication workflow

The importer only creates a `draft` real-course revision. It never approves or publishes a course.

1. Import exactly one reviewed record with `node scripts/import-real-course-draft.mjs <payload.json>`.
2. Run `node scripts/publish-real-course.mjs preflight <course-id> <revision-id>`. A `ready_for_review` result means the record is eligible for explicit approval; it does not publish it.
3. After human content review, run `node scripts/publish-real-course.mjs approve <course-id> <revision-id>`.
4. Immediately publish with `node scripts/publish-real-course.mjs publish <course-id> <revision-id> <expected-revision-id|none>`. Use `none` only for first publication; for a replacement, provide the current published revision ID observed during review.

Both write actions require the existing development-target guard, direct and pooled URLs for the verified development branch, and an advisory transaction lock. Publication re-runs preflight inside its transaction, compares the current pointer with the explicitly supplied expected revision, changes the new common revision first, then atomically rotates the pointer, and verifies the exact pointer, typed revision, classification, and provenance before commit. Any failure rolls back both changes. The prior published revision is never changed or deleted. Re-running publication for the already-pointed-to revision returns `unchanged`; a stale expected pointer is rejected.

Publishable evidence means every actionable claim accepted by the course validator has an active source record, an unambiguous source URL, `verified` claim status, and both `checked_at` and `verified_at`. The linked field must still be the published real typed field revision. Demo/test records, incomplete evidence, wrong lifecycle states, and existing different published pointers are rejected.

The schema has `created_by`, `updated_by`, and `published_by`, but this workflow has no authenticated reviewer identity to populate them and no dedicated approval-event history. Phase 3 Admin should add authenticated reviewer attribution and immutable review events before operational use; this script deliberately does not invent an identity.

For disposable integration tests only: set `REAL_COURSE_TEST_DATABASE_URL` to a loopback PostgreSQL URL whose database name is exactly `careerbridge_real_course_test`, then run `node --test src/db/real-course-draft-import.integration.test.mjs`. The test guard refuses every other target.
