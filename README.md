# Eye of Sauron

AST-level code quality scanner. Analyzes JavaScript/TypeScript codebases for structural issues, maps dependency graphs, scores complexity, and produces health metrics. CLI and web dashboard.

## What it scans

- **Structural analysis** — AST parsing to detect anti-patterns, dead code paths, circular dependencies, and complexity hotspots
- **Dependency mapping** — builds a full dependency graph across the codebase, identifies coupling and cohesion issues
- **Complexity scoring** — cyclomatic complexity, cognitive complexity, and nesting depth per function and file
- **Health metrics** — composite health score (0–100) aggregating structural, dependency, and complexity signals

## Usage

```bash
# Scan a directory
node sauron-cli.js --path /path/to/project

# Scan with specific config
node sauron-cli.js --path /path/to/project --config eos.config.json

# Launch web dashboard
node serve-ui.mjs
```

## Output

Produces a structured JSON report with per-file and per-function metrics, plus an HTML dashboard for visual inspection. Reports include:

- File-level health scores
- Function-level complexity breakdown
- Dependency graph (who imports what)
- Pattern detection results (anti-patterns, code smells)
- Trend tracking across scans

## Architecture

```
SauronCore.js           — Main analysis engine
├── core/               — Detection engines (forensics, pattern learning, dependency analysis)
├── cli/                — Command-line interfaces
├── reporters/          — Output formatters (HTML, JSON, policy violation)
├── server/             — API server and scheduler
├── utils/              — Supporting utilities (audit trails, scan caching, metrics export)
└── eye-of-sauron-ui.html — Web dashboard (single-file, self-contained)
```

## Requirements

- Node.js 18+

## License

MIT