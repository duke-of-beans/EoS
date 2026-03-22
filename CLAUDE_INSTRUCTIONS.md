# EYE OF SAURON (EOS) — CLAUDE INSTRUCTIONS
**Last Updated:** 2026-03-21
**Version:** Sprint 2 — EOS Lift

---

## 1. PROJECT IDENTITY

**Name:** Eye of Sauron (EOS)
**Path:** `D:\Projects\eye-of-sauron`
**Version:** 1.1.0 (per sauron-cli.js)
**Language:** JavaScript (ES modules, `"type": "module"` in package.json)
**Status:** Functional. Confirmed operational via self-scan on 2026-03-21.

EOS is a deep code analysis CLI tool. It scans entire codebases and produces structured reports covering:
- Character forensics (homoglyphs, encoding anomalies)
- Pattern precognition (memory leaks, anti-patterns, contract violations)
- Dependency impact analysis
- Security vulnerability detection
- Technical debt quantification

**What it produces:** Scan reports as JSON (structured data) and/or console output with ANSI formatting. HTML output via reporter modules. A web UI exists (`serve-ui.mjs`) but scope TBD.

---

## 2. ENTRY POINTS

| Entry point | Command | Purpose |
|---|---|---|
| `sauron-cli.js` | `node sauron-cli.js --input <path> --mode <mode>` | Primary CLI |
| `standalone-launcher.cjs` | `node standalone-launcher.cjs` | Packaged binary launcher |
| `server.js` | `node server.js` | REST API mode |
| `serve-ui.mjs` | `node serve-ui.mjs` | Web UI server |
| `index.js` | `import { EyeOfSauronOmniscient }` | Module entry for programmatic use |

**Node.js path on this machine:** `D:\Program Files\nodejs\node.exe` (not always in PATH)
**Shell:** PowerShell (GREGORE profile active). Use `& "D:\Program Files\nodejs\node.exe"` for Node.

---

## 3. CLI FLAGS (CONFIRMED)

The CLI uses `--mode`, NOT `--profile`. Valid modes: `quick`, `deep`, `quantum`.

```
node sauron-cli.js --input ./src --mode quick
node sauron-cli.js --input ./src --mode deep --output report.json
node sauron-cli.js --input . --mode deep --verbose
```

Exit codes: `0` = no critical issues, `1` = critical issues found (expected, not an error).

**IMPORTANT:** The CLI has a path-comparison guard (`currentFile === scriptPath`) that can silently prevent execution depending on how Node resolves paths in this shell environment. If the CLI runs silently with exit 0 but produces no output, the guard is firing. Workaround: spawn via a wrapper `.mjs` that imports `SauronCLI` and overrides `process.argv` directly.

---

## 4. SCAN PROFILES (from .sauronrc.json)

| Profile | maxDepth | skipTests | enableBuiltInAnalyzers | detectConsoleUsage |
|---|---|---|---|---|
| `quick` | 3 | true | false | false |
| `standard` | 10 | true | false | false |
| `deep` | unlimited | false | true | true |

Default profile in `.sauronrc.json`: `standard`. Profiles are referenced by `.sauronrc.json` — the CLI `--mode` flag maps to these at the scanner level.

---

## 5. ARCHITECTURE

```
eye-of-sauron/
├── sauron-cli.js              ← CLI entry (--mode quick/deep/quantum)
├── standalone-launcher.cjs    ← pkg binary launcher
├── SauronCore.js              ← secure pipeline orchestrator (NOT main scan engine)
├── index.js                   ← module entry, exports EyeOfSauronOmniscient
├── server.js                  ← REST API
├── serve-ui.mjs               ← web UI server
├── .sauronrc.json             ← scan config (profiles, rules, ignore patterns)
├── package.json               ← type: module, node >= 16
├── core/                      ← main analyzer modules
│   ├── EyeOfSauronOmniscient.js   ← ACTUAL scan engine (orchestrates analyzers)
│   ├── CharacterForensics.js      ← homoglyph + encoding detection
│   ├── PatternPrecognition.js     ← memory leak, anti-pattern detection
│   ├── SauronConfigLoader.js      ← config loading
│   ├── SauronPluginManager.js     ← plugin system
│   ├── ScanPolicyManager.js       ← scan policy enforcement
│   └── [others]
├── analyzers/                 ← (directory exists, contents overlap with core/)
├── cli/                       ← CLI support modules
│   └── simple-cli.js
├── reporters/                 ← output formatters
│   ├── OmniReporterFormatter.js
│   └── SauronReportViewer.js
├── utils/                     ← utility modules (30+ files, all utilities)
├── performance/               ← BatchProcessor.js
├── server/                    ← SauronAPI.js (REST API impl)
├── src/                       ← source files scanned in self-test
│   ├── core/                  ← detectionEngine.js etc.
│   ├── components/
│   ├── config/
│   ├── detectors/
│   ├── render/
│   ├── services/
│   └── utils/
├── ui/                        ← web UI assets
├── dist/                      ← compiled binaries (excluded from git)
├── docs/                      ← ARCHITECTURE.md, DEPLOYMENT.md, EoS-manifest.md
├── dev/                       ← dev notes and planning docs
├── testing/                   ← test harness, examples
└── *.pre-nuclear              ← DO NOT DELETE — see below
```

**Note on SauronCore.js vs EyeOfSauronOmniscient.js:**
- `SauronCore.js` = secure pipeline orchestrator (post-scan: archive, audit, encryption, anomaly detection)
- `EyeOfSauronOmniscient.js` in `core/` = actual scan engine called by CLI
- The CLI imports from `./core/EyeOfSauronOmniscient.js`, not `SauronCore.js`

---

## 6. ARCHITECTURE CONTEXT

**EOS ships inside GregLite as a bundled module.** GregLite is a standalone cognitive OS — EOS is its code intelligence layer powering Sprint 44.0 (Code Graph Index).

**EOS also has value as a standalone portfolio tool** — callable directly, used by SHIM for code analysis. Both roles are valid and non-conflicting.

**JavaScript, not TypeScript.** TypeScript port is deferred — do not start without explicit session mandate. GregLite is TypeScript strict mode, so integration will require a shim or port, but that decision is not made here.

**Archive artifact:** `D:\Projects\_Archive\T-App-tribunal-assistant\` contains `eye-of-sauron.cjs` and `sauron-report` files — evidence of a prior EOS integration. Review before any modernization work.

---

## 7. BOOTSTRAP SEQUENCE (every session)

```
1. Read CLAUDE_INSTRUCTIONS.md         ← this file
2. Read STATUS.md                      ← current sprint state
3. Read D:\Projects\GregLite\STATUS.md ← ALWAYS — Sprint 44.0 dependency
4. Run self-verify:
   $node = "D:\Program Files\nodejs\node.exe"
   Set-Location "D:\Projects\eye-of-sauron"
   & $node sauron-cli.js --input ./src --mode quick
   (expect exit 1 with scan summary — critical issues in src/ are known/expected)
```

If the self-scan runs silently (no output), use the diagnostic wrapper pattern — see Section 3.

---

## 8. OPERATIONAL STATE (as of 2026-03-21)

**WORKING:**
- CLI scans execute successfully (`--input`, `--mode` flags confirmed)
- `EyeOfSauronOmniscient` scan engine operational — 13 files in `./src` scanned in 0.1s
- Results: 76 issues found (62 critical, 14 warnings) on self-scan of `./src`
- Character forensics active (homoglyph/encoding detection)
- Pattern precognition active
- Prophecies (pattern predictions) generated
- JSON output format works
- Exit codes correct: 0 = clean, 1 = critical issues found

**KNOWN ISSUES / LIMITATIONS:**
- CLI has a path-comparison guard that can silently prevent execution in certain shell environments (GREGORE PowerShell profile). stdout is also swallowed by GREGORE. Use file-based output or wrapper pattern.
- `--profile` flag does NOT exist — the correct flag is `--mode`. Sprint documentation had this wrong.
- `--help` flag exits silently in this shell environment (same stdout issue).
- Web UI (`serve-ui.mjs`) and REST API (`server.js`) scope not verified this sprint.

**NOT STARTED:**
- TypeScript port (deferred)
- GregLite Sprint 44.0 integration
- TESSRYX relationship assessment

---

## 9. SPRINT PROTOCOL

- No feature work without reading STATUS.md first
- No TypeScript port without explicit session mandate
- No GregLite integration without reading GregLite STATUS.md first
- `.pre-nuclear` files: **do not delete without David sign-off** — manifest at `_pre-nuclear-manifest.txt`
- Diagnostic/temp files (`_diag*.mjs`, `scan-diagnostic.txt`, etc.) are in `.gitignore` — clean up after sprints
- Session-close: update STATUS.md → write MORNING_BRIEFING.md → commit → push

---

## 10. KEY FILES

| File | Purpose |
|---|---|
| `.sauronrc.json` | Scan configuration — profiles, rules, ignore patterns |
| `sauron-cli.js` | CLI entry point (`--mode quick/deep/quantum`) |
| `core/EyeOfSauronOmniscient.js` | Main scan engine |
| `SauronCore.js` | Post-scan pipeline (archive, encrypt, audit) |
| `_pre-nuclear-manifest.txt` | Pre-nuclear backup file inventory (David review pending) |
| `STATUS.md` | Current state and open work |
| `PROJECT_DNA.yaml` | Project identity and strategic role |
| `PRODUCT_VISION.md` | Product vision and roadmap |

---

## 11. GIT

Repository: `duke-of-beans/eye-of-sauron` (GitHub)
Git binary: `D:\Program Files\Git\cmd\git.exe` if not in PATH
`.gitignore` excludes: `node_modules/`, `dist/`, `*.pre-nuclear`, `coverage/`, diagnostic temp files