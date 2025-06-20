# Eye of Sauron Manifest

**Version:** v1.0.0
**Generated:** 2025-06-19
**Config Hash:** abc123def456789012345678901234567890abcd

## Files

### Root Files
- `index.js` - Main entry point for programmatic usage
- `sauron-cli.js` - Command-line interface
- `server.js` - REST API server
- `package.json` - NPM package configuration
- `README.md` - Project documentation
- `.gitignore` - Git ignore rules
- `LICENSE` - MIT license

### Core Engine (`core/`)
- `core/EyeOfSauronOmniscient.js` - Master scanner orchestrator
- `core/CharacterForensics.js` - Character-level forensic analyzer
- `core/PatternPrecognition.js` - Contract and risk pattern detector
- `core/BatchProcessor.js` - Parallel file processing engine
- `core/FileDiscovery.js` - Scan-eligible file discovery
- `core/ScanProfileManager.js` - Scan profile management
- `core/ScanReportAssembler.js` - Final report assembly
- `core/ErrorLogger.js` - Error aggregation utility
- `core/IncrementalScanCache.js` - Incremental scan support
- `core/Config.js` - Configuration loader and merger

### Utilities (`utils/`)
- `utils/KaizenSnapshot.js` - Scan state snapshot management
- `utils/OneClickHealing.js` - Safe auto-fix application
- `utils/ScanHistoryManager.js` - Scan history storage/retrieval
- `utils/ScanTemplateEngine.js` - Reusable scan templates
- `utils/ScanPolicyManager.js` - Organization scan policies
- `utils/SauronModuleRegistry.js` - Module health tracking
- `utils/SauronPluginManager.js` - External plugin management
- `utils/SauronComplianceChecker.js` - Compliance validation
- `utils/SauronTelemetryReporter.js` - Telemetry reporting
- `utils/GitHookInstaller.js` - Git hook installation
- `utils/MetricsExporter.js` - Metrics export (Prometheus/DataDog)
- `utils/WebhookNotifier.js` - Webhook notifications
- `utils/TimeEffortOptimizer.js` - Scan optimization suggestions
- `utils/TechnicalDebtCalculator.js` - Technical debt computation
- `utils/PatternLearningEngine.js` - Pattern learning across scans
- `utils/FixImpactAnalyzer.js` - Fix impact prediction
- `utils/DependencyImpactAnalyzer.js` - Dependency mapping

### Reporters (`reporters/`)
- `reporters/OmniReportFormatter.js` - Multi-format report output
- `reporters/HTMLReportFormatter.js` - HTML report generation
- `reporters/SauronInsightReporter.js` - Combined insight reports
- `reporters/PolicyViolationReporter.js` - Policy violation formatting

### Documentation (`docs/`)
- `docs/README.md` - Documentation index
- `docs/EoS-manifest.md` - This manifest file
- `docs/API.md` - API documentation
- `docs/CONFIGURATION.md` - Configuration guide

## Top-Level API Points

### CLI: sauron-cli.js

**Command:** `node sauron-cli.js`

**Arguments:**
- `--input <path>` - Path to scan (required)
- `--output <path>` - Output file path (optional, defaults to console)
- `--upload <url>` - URL to upload results (optional)
- `--mode <mode>` - Scan mode: quick|standard|deep|paranoid (default: standard)
- `--config <file>` - Custom configuration file path
- `--fix` - Apply safe auto-fixes
- `--incremental` - Use incremental scanning cache
- `--help` - Display help information

**Behavior:**
1. Validates input arguments
2. Loads configuration from Config.js
3. Initializes EyeOfSauronOmniscient engine
4. Executes scan based on mode
5. Formats results via OmniReportFormatter
6. Outputs to console or file
7. Optionally uploads results to specified URL
8. Returns exit code 0 for success, 1 for errors

### API: server.js

**Base URL:** `http://localhost:3000`

**Endpoints:**

#### POST /process
Processes uploaded code for analysis.

**Request Body:**
```json
{
  "content": "const code = 'example';",
  "filename": "example.js"
}
```

**Response:**
```json
{
  "status": "success",
  "issues": [
    {
      "file": "example.js",
      "line": 1,
      "column": 1,
      "type": "character|pattern",
      "severity": "error|warning|info",
      "message": "Issue description"
    }
  ],
  "summary": {
    "totalIssues": 0,
    "byType": {},
    "bySeverity": {}
  }
}
```

#### POST /summary
Generates a summary report from multiple scan results.

**Request Body:**
```json
{
  "reports": [
    {
      "file": "file1.js",
      "issues": []
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "summary": {
    "filesScanned": 1,
    "totalIssues": 0,
    "issuesByType": {},
    "issuesBySeverity": {},
    "topFiles": []
  }
}
```

## Module Integration

### Core Flow
1. **Entry Points**
   - `index.js` → Programmatic API
   - `sauron-cli.js` → Command-line interface
   - `server.js` → REST API

2. **Scanning Pipeline**
   - `Config.js` → Configuration loading
   - `FileDiscovery.js` → File enumeration
   - `BatchProcessor.js` → Parallel processing
   - `CharacterForensics.js` + `PatternPrecognition.js` → Analysis
   - `ScanReportAssembler.js` → Report generation

3. **Output Pipeline**
   - `OmniReportFormatter.js` → Format selection
   - `HTMLReportFormatter.js` → HTML generation
   - `PolicyViolationReporter.js` → Violation formatting

## Configuration Schema

```json
{
  "scan": {
    "mode": "standard",
    "maxDepth": 10,
    "excludePatterns": ["node_modules", ".git", "dist"],
    "includePatterns": ["*.js", "*.ts", "*.jsx", "*.tsx"],
    "batchSize": 50,
    "maxWorkers": 4
  },
  "character": {
    "enabled": true,
    "checkInvisibleChars": true,
    "checkHomoglyphs": true,
    "checkSmartQuotes": true,
    "checkTabs": true,
    "checkExcessiveNewlines": true
  },
  "pattern": {
    "enabled": true,
    "checkContracts": true,
    "checkMemoryLeaks": true,
    "checkListenerLeaks": true,
    "customPatterns": []
  },
  "reporting": {
    "formats": ["console"],
    "verbose": false,
    "includeFileContent": false
  }
}
```

## System Requirements

- **Node.js**: >= 14.0.0
- **Memory**: 256MB minimum, 1GB recommended
- **CPU**: 2+ cores recommended for parallel processing
- **Storage**: 50MB for installation + temporary scan cache
- **Network**: Only required for webhook notifications or result uploads

## License

MIT License - See LICENSE file for details

## Version History

- **v1.0.0** (2025-06-19) - Initial release
  - Core scanning engine with character and pattern analysis
  - CLI and API interfaces
  - Multi-format reporting
  - Incremental scanning support