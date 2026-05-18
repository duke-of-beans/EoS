# EYE OF SAURON (EOS) — STATUS

**Status:** Production | **Phase:** TypeScript + GregLite integration
**Last Sprint:** EOS-TYPESCRIPT-01
**Last Updated:** 2026-05-18

---

## CURRENT STATE

Eye of Sauron is a dual-mode code analysis tool: original JavaScript CLI for NIGHTSHIFT
and standalone use, plus a new TypeScript-compiled API (`dist/index.js`) importable by
GregLite's sidecar for live code health in the portfolio dashboard.

**Sprint EOS-TYPESCRIPT-01 (2026-05-18):**
- TypeScript port: full `src/` directory with strict types, builds to `dist/` as CJS
- Ported: `EyeOfSauronOmniscient` → `src/scanner.ts`, `CharacterForensics` → `src/rules/character-forensics.ts`, `PatternPrecognition` → `src/rules/pattern-precognition.ts`, `BatchProcessor` → `src/batch-processor.ts`
- Public API: `scanProject(path, mode?, config?)` → `HealthReport` — typed, importable
- Types: `src/types.ts` — `HealthReport`, `ScanSummary`, `Issue`, `Severity`, `ScannerConfig`, etc.
- Build: `npx tsc` → `dist/` with declarations + source maps. `dist/package.json` override for CJS compat (root is ESM)
- Scripts: `npm run build`, `npm run lint` added to package.json
- GregLite integration: `GET /api/dashboard/code-health` endpoint scans top 10 portfolio projects, 1-hour cache
- Dashboard UI: red/yellow/green EoS dot on each portfolio health arc (bottom-right corner)
- Greg gatherContext: code health signals included — projects scoring <70 or >5 critical issues surface in Greg's briefings
- Verified: 19 files scanned, 32 issues found, healthScore 64, 389ms — output matches original JS scanner

**Sprint EOS-NIGHTSHIFT-CONFIG-01 (2026-04-24):**
- Fixed: `CharacterForensics.js` homoglyphs Map was keyed with Latin ASCII chars ('a','e','o','p','c','x') instead of Cyrillic codepoints (U+0430, U+0435, U+043E, U+0440, U+0441, U+0445). Every common letter in every source file triggered APOCALYPSE — 181,943 false positives in 183 files.
- Fixed: CRLF normalization added to `CharacterForensics.analyze()` (defensive, strips `\r` before character scanning).
- Added: `summary.healthScore` (density-based, 0-100) to scan output.
- Added: `summary.warnings` field alongside existing `criticalIssues`.
- Fixed: `--output -` now writes JSON to stdout (required for NIGHTSHIFT integration).
- Fixed: Banner "🔍 Eye of Sauron CLI Starting..." now respects `--silent` flag.
- Updated: `eos.config.json` with `skipCRLF: true` and `nightshiftMode` config block.
- Updated: NIGHTSHIFT Pass 5B reads `summary.healthScore` directly, removed proxy calc, improved logging.

**GregLite components scan post-fix (2026-04-24):**
- 183 files, 198 issues (192 critical / 6 warnings), healthScore: 74/100, 0.24s runtime
- Remaining criticals: 167 MISSING_METHOD (Tribunal contract), 23 INVISIBLE_CHAR (real), 1 MEMORY_LEAK, 1 MISSING_METHOD:DANGER
- Down from 181,943 issues (all false positives from homoglyph bug)

**Git:** Initialized. Branch: main. Commits pushed to remote.

**GitHub:** https://github.com/duke-of-beans/EoS ✅ LIVE

---

## ARCHITECTURE CONTEXT

EOS has two entry points:
1. **Original JS CLI** (`sauron-cli.js`) — ESM, used by NIGHTSHIFT Pass 5B, standalone scans
2. **TypeScript API** (`dist/index.js`) — CJS, used by GregLite sidecar for live dashboard health

Both coexist. The JS CLI is untouched and backward-compatible. The TypeScript `src/` builds
to `dist/` as CommonJS (via `dist/package.json` override) for GregLite sidecar compatibility.

GregLite integration is live: `GET /api/dashboard/code-health` endpoint in sidecar `dashboard.ts`.
Dashboard UI shows EoS health dot on each portfolio arc. Greg's `gatherContext` includes
code health signals for projects in poor shape.

---

## SPRINT 2 DELIVERABLES (SHIPPED)

- [x] Self-scan executed and documented — tool confirmed operational
- [x] `.gitignore` created — excludes `.pre-nuclear`, `.backup.*`, `node_modules/`, `dist/`
- [x] `CLAUDE_INSTRUCTIONS.md` rewritten — full operational findings, CLI flags, architecture
- [x] `_pre-nuclear-manifest.txt` created — 97 files, 54 safe, 43 need review
- [x] `PROJECT_DNA.yaml` and `PRODUCT_VISION.md` committed to git
- [x] Initial lift commit: `3924079`
- [x] `_github-setup.txt` — exact commands to create GitHub repo

---

## OPEN WORK

- [ ] 43 pre-nuclear "need review" files remain on disk — awaiting David sign-off before deletion

All architecture decisions (TypeScript port, GregLite integration, REST API scope, TESSRYX relationship) tracked in BACKLOG.md.

---

## ARCHITECTURE DECISIONS

**Dual-mode architecture:** JS CLI (ESM) + TypeScript API (CJS via dist/).
Original JS CLI unchanged. TypeScript `src/` builds to `dist/` for GregLite import.

**CLI entry confirmed:** `sauron-cli.js` with `--mode quick|deep|quantum` flag.
NOTE: `--profile` does NOT exist. Correct flag is `--mode`.

**GregLite integration shipped (EOS-TYPESCRIPT-01):** sidecar imports `dist/index.js` directly.
Dashboard endpoint: `GET /api/dashboard/code-health`. UI: EoS dot on portfolio arcs.
Greg's gatherContext includes code health signals for projects in poor shape.

---

## KNOWN SHELL ENVIRONMENT QUIRK

The GREGORE PowerShell profile intercepts all stdout/stderr from Node.js processes in this
environment. The CLI runs correctly (exit codes work) but console output is swallowed when
run via Desktop Commander's PowerShell shell. Use `cmd.exe` shell for git operations.
For Node.js output capture, use file-based output via `writeFileSync` in wrapper scripts.

---

## KEY FILES

| File | Purpose |
|---|---|
| `sauron-cli.js` | CLI entry (`--mode quick/deep/quantum`) — original JS |
| `core/EyeOfSauronOmniscient.js` | Main scan engine — original JS |
| `src/index.ts` | TypeScript public API barrel export |
| `src/scanner.ts` | TypeScript scan engine + `scanProject()` |
| `src/types.ts` | All TypeScript interfaces |
| `src/rules/character-forensics.ts` | Character forensics analyzer (TS) |
| `src/rules/pattern-precognition.ts` | Pattern/contract analyzer (TS) |
| `src/batch-processor.ts` | Parallel batch processing (TS) |
| `dist/` | Compiled CJS output (built via `npm run build`) |
| `.sauronrc.json` | Scan config (profiles: quick/standard/deep) |
| `_pre-nuclear-manifest.txt` | Pre-nuclear cleanup manifest (David review required) |
| `CLAUDE_INSTRUCTIONS.md` | Full session bootstrap (read this first) |

---

## SCAN PROFILES (.sauronrc.json)

| Profile | maxDepth | skipTests | builtInAnalyzers | consoleDetect |
|---|---|---|---|---|
| quick | 3 | true | false | false |
| standard | 10 | true | false | false |
| deep | unlimited | false | true | true |
