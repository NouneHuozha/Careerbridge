# Repository Integration Notes

This is a documentation-only integration; it does not change application code or include credentials.

## What this integration replaces/adds

- Replace the contents of the existing `docs/project-foundation/01_PROJECT_VISION.md` through `11_SECURITY_PRIVACY_AND_QUALITY_ASSURANCE.md` with the corresponding files in this package.
- Add `docs/project-foundation/12_IMPLEMENTATION_ALIGNMENT_AND_OPEN_DECISIONS.md`.
- Replace `docs/project-foundation/README.md`.
- Add the complete `docs/implementation/` directory.
- Update the root `README.md` to link to the documentation entry points and explain the status vocabulary.

## Existing files retained

- Root `AGENTS.md` retains repository-specific coding instructions.
- `docs/UI_UX_IMPROVEMENT_GUIDE.md` retains visual and accessibility guidance and is linked from the frontend implementation specification.
- Root `README.md` retains the project description and setup guidance alongside the documentation map.

## Remaining verification

1. Confirm the actual database project/connection target locally without sharing secrets.
2. Confirm provider projects exist where applicable; do not paste credentials into chat.
3. Review open provider decisions and record selections only after evaluation.
4. Run link, Markdown and consistency checks after integration.
