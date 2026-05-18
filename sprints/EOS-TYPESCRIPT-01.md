# Sprint EOS-TYPESCRIPT-01 — TypeScript Port + GregLite Health Integration
## Scope: Eye of Sauron (`D:\Projects\eye-of-sauron`)
## Estimate: 3-4 hours | Priority: P1

---

## Context
Eye of Sauron scans codebases for health issues (critical errors, warnings, code smells).
It runs nightly in NIGHTSHIFT Pass 5B and produces health scores. Currently it's a
CJS Node.js CLI. The TypeScript port enables clean import into GregLite's sidecar,
which means real-time code health in the portfolio dashboard — not just overnight scans.

## Pre-flight
```
Read: D:\Projects\eye-of-sauron\STATUS.md
Read: D:\Projects\eye-of-sauron\CLAUDE_INSTRUCTIONS.md
Run:  node D:\Projects\eye-of-sauron\sauron-cli.js --help (verify CLI works)
Check: D:\Projects\GregLite\sidecar\src\routes\dashboard.ts (where health data lives)
```

## Phase 1: TypeScript Port (2 hours)
- [ ] Create `src/` directory with TypeScript structure
- [ ] Port `sauron-cli.js` → `src/scanner.ts` (main scan logic)
- [ ] Port rule definitions → `src/rules/` (typed rule interface)
- [ ] Create `src/types.ts` (ScanResult, HealthReport, Rule interfaces)
- [ ] Add `tsconfig.json`, build to `dist/`
- [ ] Verify: `npx tsc --noEmit` passes
- [ ] Verify: `node dist/scanner.js` produces same output as `sauron-cli.js`
- [ ] Export `scanProject(path: string): HealthReport` as public API

## Phase 2: GregLite Integration (1-2 hours)
- [ ] In sidecar `dashboard.ts`, import EoS scanner
- [ ] Add `GET /api/dashboard/code-health` endpoint:
      - Runs EoS scan on top 5-10 most active projects
      - Returns per-project health score + issue count
      - Cache results for 1 hour (scans are expensive)
- [ ] Wire into GregDashboard.tsx PortfolioHealthSection:
      - If code-health data available, show EoS score as a secondary indicator
      - Red/yellow/green dot next to completion arc
- [ ] Wire into Greg's gatherContext: include code health signals

## Done: EoS in TypeScript, importable, live code health in GregLite dashboard
