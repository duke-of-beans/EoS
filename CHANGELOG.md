# EYE OF SAURON — CHANGELOG

## [Unreleased]
- Sprint 3: GregLite Sprint 44.0 Code Graph Index integration

## [EOS-GIT-CLEANUP-01] — 2026-04-24 — Git + Pre-nuclear Housekeeping
### Shipped
- Confirmed node_modules is NOT tracked in git (prior STATUS.md entry was stale)
- Deleted 54 "safe to delete" pre-nuclear backup files (identical to active files)
- 43 "need review" pre-nuclear files retained pending David sign-off
- .gitignore updated: added .backup.*, *.backup, *.backup-*, eos_*.json, .pre-nuclear/ patterns
### Decisions
- node_modules was never committed to remote; git rm --cached was unnecessary

## [Sprint 2] — 2026-03-21 — EOS Lift
### Shipped
- Confirmed operational via self-scan: 13 files, 76 issues (62 critical/14 warnings), 0.1s runtime
- Git initialized, commits pushed to remote
- GitHub live: https://github.com/duke-of-beans/EoS
- Pre-nuclear cleanup manifest created
- VERSION_STRATEGY.md, MORNING_BRIEFING.md, STATUS.md written
### Decisions
- EOS ships inside GregLite as bundled module (Sprint 44.0) AND as standalone portfolio tool — both roles valid

## [Sprint 1] — 2026 (approximate)
### Shipped
- Node.js code analysis CLI
- Character forensics and pattern precognition engines active
- sauron-cli.js entry point operational
