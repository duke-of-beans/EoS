#!/usr/bin/env node

/**
 * Purpose: Complete CLI interface for Eye of Sauron - All-seeing code analysis framework
 * Dependencies: Node.js std lib (fs, path, process), core analyzers
 * Public API: Command-line executable with --input, --output, --upload options
 */

import { promises as fs } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EyeOfSauronOmniscient } from './core/EyeOfSauronOmniscient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class SauronCLI {
  constructor() {
    this.config = {
      version: '1.1.0',
      input: null,
      output: null,
      upload: null,
      mode: 'deep',
      verbose: false,
      silent: false,
      help: false,
      fix: false,
      config: null,

      // Advanced options
      maxWorkers: 4,
      batchSize: 10,
      allowConsole: false,
      skipTests: false,
      enableCharacterForensics: true,
      enablePatternPrecognition: true,
      enableBuiltInAnalyzers: true
    };

    this.scanner = null;
    this.startTime = null;
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--input':
        case '-i':
          this.config.input = args[++i];
          break;

        case '--output':
        case '-o':
          this.config.output = args[++i];
          break;

        case '--upload':
        case '-u':
          this.config.upload = args[++i];
          break;

        case '--mode':
        case '-m':
          this.config.mode = args[++i];
          break;

        case '--config':
        case '-c':
          this.config.config = args[++i];
          break;

        case '--verbose':
        case '-v':
          this.config.verbose = true;
          break;

        case '--silent':
        case '-s':
          this.config.silent = true;
          break;

        case '--fix':
          this.config.fix = true;
          break;

        case '--allow-console':
          this.config.allowConsole = true;
          break;

        case '--skip-tests':
          this.config.skipTests = true;
          break;

        case '--workers':
          this.config.maxWorkers = parseInt(args[++i]) || 4;
          break;

        case '--batch-size':
          this.config.batchSize = parseInt(args[++i]) || 10;
          break;

        case '--help':
        case '-h':
          this.config.help = true;
          break;

        case '--version':
          this.showVersion();
          process.exit(0);
          break;

        default:
          if (arg.startsWith('-')) {
            this.error(`Unknown option: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
          // Assume it's an input path if no --input specified
          if (!this.config.input) {
            this.config.input = arg;
          }
          break;
      }
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (this.config.help) {
      this.showHelp();
      process.exit(0);
    }

    if (!this.config.input) {
      this.error('Input path is required. Use --input <path> or provide path as argument.');
      this.showHelp();
      process.exit(1);
    }

    // Validate mode
    const validModes = ['quick', 'deep', 'quantum'];
    if (!validModes.includes(this.config.mode)) {
      this.error(`Invalid mode: ${this.config.mode}. Valid modes: ${validModes.join(', ')}`);
      process.exit(1);
    }

    // Validate numeric parameters
    if (this.config.maxWorkers < 1 || this.config.maxWorkers > 16) {
      this.error('Workers must be between 1 and 16');
      process.exit(1);
    }

    if (this.config.batchSize < 1 || this.config.batchSize > 100) {
      this.error('Batch size must be between 1 and 100');
      process.exit(1);
    }
  }

  /**
   * Load custom configuration if specified
   */
  async loadCustomConfig() {
    if (!this.config.config) return;

    try {
      const configContent = await fs.readFile(this.config.config, 'utf8');
      const customConfig = JSON.parse(configContent);

      // Merge custom config with defaults
      Object.assign(this.config, customConfig);

      if (this.config.verbose) {
        this.log(`📝 Loaded configuration from: ${this.config.config}`);
      }
    } catch (error) {
      this.error(`Failed to load config file: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Initialize the scanner with configuration
   */
  initializeScanner() {
    const scannerConfig = {
      maxWorkers: this.config.maxWorkers,
      batchSize: this.config.batchSize,
      allowConsole: this.config.allowConsole,
      skipTests: this.config.skipTests,
      enableCharacterForensics: this.config.enableCharacterForensics,
      enablePatternPrecognition: this.config.enablePatternPrecognition,
      enableBuiltInAnalyzers: this.config.enableBuiltInAnalyzers,

      // File processing settings
      maxFileSize: 1024 * 1024, // 1MB
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],

      // Performance settings
      aggregateSimilarIssues: true,
      maxSimilarIssues: 10
    };

    this.scanner = new EyeOfSauronOmniscient(scannerConfig);

    if (this.config.verbose) {
      this.log(`🔧 Scanner initialized with mode: ${this.config.mode}`);
      this.log(`⚙️  Workers: ${this.config.maxWorkers}, Batch size: ${this.config.batchSize}`);
    }
  }

  /**
   * Validate input path exists
   */
  async validateInput() {
    try {
      const inputPath = path.resolve(this.config.input);
      const stats = await stat(inputPath);

      if (!stats.isDirectory() && !stats.isFile()) {
        this.error(`Input path is neither a file nor directory: ${inputPath}`);
        process.exit(1);
      }

      this.config.input = inputPath;

      if (this.config.verbose) {
        const type = stats.isDirectory() ? 'directory' : 'file';
        this.log(`📁 Input ${type} validated: ${inputPath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.error(`Input path does not exist: ${this.config.input}`);
      } else {
        this.error(`Cannot access input path: ${error.message}`);
      }
      process.exit(1);
    }
  }

  /**
   * Execute the scan
   */
  async executeScan() {
    try {
      this.startTime = Date.now();

      if (!this.config.silent) {
        this.banner();
        this.log(`📁 Scanning: ${this.config.input}`);
        this.log(`⏳ Discovering files...`);
      }

      // Execute scan with progress monitoring
      const report = await this.scanner.scan(this.config.input, this.config.mode);

      if (!this.config.silent) {
        this.displayResults(report);
      }

      // Save output if specified
      if (this.config.output) {
        await this.saveOutput(report);
      }

      // Upload results if specified
      if (this.config.upload) {
        await this.uploadResults(report);
      }

      // Apply fixes if requested
      if (this.config.fix) {
        await this.applyFixes(report);
      }

      // Return appropriate exit code
      const criticalIssues = report.summary.criticalIssues || 0;
      process.exit(criticalIssues > 0 ? 1 : 0);

    } catch (error) {
      this.error(`Scan failed: ${error.message}`);
      if (this.config.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Display scan results to console
   */
  displayResults(report) {
    const duration = Date.now() - this.startTime;

    this.log(`\n📊 ${colors.bright}Scan Summary${colors.reset}`);
    this.log(`${'─'.repeat(50)}`);
    this.log(`📁 Total Files: ${colors.cyan}${report.summary.totalFiles}${colors.reset}`);
    this.log(`📋 Total Issues: ${colors.yellow}${report.summary.totalIssues}${colors.reset}`);

    if (report.summary.criticalIssues > 0) {
      this.log(`🚨 Critical: ${colors.red}${report.summary.criticalIssues}${colors.reset}`);
    }

    if (report.summary.totalIssues - report.summary.criticalIssues > 0) {
      const warnings = report.summary.totalIssues - report.summary.criticalIssues;
      this.log(`⚠️  Warnings: ${colors.yellow}${warnings}${colors.reset}`);
    }

    if (report.summary.skippedFiles > 0) {
      this.log(`⏭️  Skipped: ${colors.blue}${report.summary.skippedFiles}${colors.reset}`);
    }

    this.log(`⏱️  Duration: ${colors.green}${(duration / 1000).toFixed(1)}s${colors.reset}`);

    // Show top issues if verbose
    if (this.config.verbose && report.summary.totalIssues > 0) {
      this.displayTopIssues(report);
    }

    // Show prophecies if any
    if (report.prophecies && report.prophecies.length > 0) {
      this.displayProphecies(report.prophecies);
    }

    this.log('');

    // Final status message
    if (report.summary.criticalIssues > 0) {
      this.log(`${colors.red}❌ Critical issues found. Please review and fix.${colors.reset}`);
    } else if (report.summary.totalIssues > 0) {
      this.log(`${colors.yellow}⚠️  Issues found but none are critical.${colors.reset}`);
    } else {
      this.log(`${colors.green}✅ No issues found. Your code is clean!${colors.reset}`);
    }
  }

  /**
   * Display top issues in verbose mode
   */
  displayTopIssues(report) {
    this.log(`\n🔍 ${colors.bright}Top Issues${colors.reset}`);

    const allIssues = [];
    for (const [filePath, fileData] of Object.entries(report.files)) {
      if (fileData.issues) {
        for (const issue of fileData.issues) {
          allIssues.push({ ...issue, file: filePath });
        }
      }
    }

    // Sort by severity and show top 5
    const severityOrder = { 'APOCALYPSE': 4, 'DANGER': 3, 'WARNING': 2, 'NOTICE': 1, 'INFO': 0 };
    allIssues.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

    const topIssues = allIssues.slice(0, 5);
    for (const issue of topIssues) {
      const severityColor = this.getSeverityColor(issue.severity);
      const relativePath = path.relative(process.cwd(), issue.file);
      // FIXED: Handle both message and description properties
      const issueMessage = issue.message || issue.description || issue.type || 'Unknown issue';
      this.log(`  ${severityColor}${issue.severity}${colors.reset} ${relativePath}:${issue.line} - ${issueMessage}`);
    }
  }

  /**
   * Display prophecies
   */
  displayProphecies(prophecies) {
    this.log(`\n🔮 ${colors.bright}Prophecies${colors.reset}`);

    for (const prophecy of prophecies.slice(0, 3)) {
      const typeColor = prophecy.severity === 'DANGER' ? colors.red : colors.yellow;
      this.log(`  ${typeColor}${prophecy.type.toUpperCase()}${colors.reset} ${prophecy.message}`);
    }
  }

  /**
   * Save output to file (or stdout if output is '-')
   */
  async saveOutput(report) {
    try {
      // Special case: '-' means write JSON to stdout (for pipe/spawnSync consumers)
      if (this.config.output === '-') {
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
        return;
      }

      const outputPath = path.resolve(this.config.output);
      const outputDir = path.dirname(outputPath);

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Determine format based on extension
      const ext = path.extname(outputPath).toLowerCase();
      let content;

      switch (ext) {
        case '.json':
          content = JSON.stringify(report, null, 2);
          break;
        case '.html':
          content = this.generateHTMLReport(report);
          break;
        case '.txt':
          content = this.generateTextReport(report);
          break;
        default:
          content = JSON.stringify(report, null, 2);
          break;
      }

      await fs.writeFile(outputPath, content, 'utf8');

      if (!this.config.silent) {
        this.log(`💾 Report saved to: ${colors.cyan}${outputPath}${colors.reset}`);
      }
    } catch (error) {
      this.error(`Failed to save output: ${error.message}`);
    }
  }

  /**
   * Upload results to specified URL
   */
  async uploadResults(report) {
    try {
      // For now, we'll use a simple HTTP POST
      // In a real implementation, you might use fetch or a proper HTTP client
      const { default: https } = await import('https');
      const { default: http } = await import('http');
      const url = new URL(this.config.upload);

      const postData = JSON.stringify({
        timestamp: new Date().toISOString(),
        scanId: `scan-${Date.now()}`,
        summary: report.summary,
        files: Object.keys(report.files).length,
        issues: report.summary.totalIssues,
        metadata: report.metadata
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': `Eye-of-Sauron-CLI/${this.config.version}`
        }
      };

      if (!this.config.silent) {
        this.log(`📤 Uploading results to: ${colors.cyan}${this.config.upload}${colors.reset}`);
      }

      await new Promise((resolve, reject) => {
        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              if (!this.config.silent) {
                this.log(`${colors.green}✅ Upload successful${colors.reset}`);
              }
              resolve(data);
            } else {
              reject(new Error(`Upload failed with status: ${res.statusCode}`));
            }
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });

    } catch (error) {
      this.error(`Failed to upload results: ${error.message}`);
    }
  }

  /**
   * Apply fixes if supported
   */
  async applyFixes(report) {
    if (!this.config.silent) {
      this.log(`🔧 Auto-fix feature not yet implemented`);
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Eye of Sauron Scan Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .issue { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
        .critical { border-color: #d32f2f; background: #ffebee; }
        .warning { border-color: #f57c00; background: #fff3e0; }
        .info { border-color: #1976d2; background: #e3f2fd; }
    </style>
</head>
<body>
    <h1>Eye of Sauron Scan Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Files Scanned: ${report.summary.totalFiles}</p>
        <p>Total Issues: ${report.summary.totalIssues}</p>
        <p>Critical Issues: ${report.summary.criticalIssues || 0}</p>
        <p>Scan Date: ${report.metadata.scanDate}</p>
    </div>
    <h2>Issues</h2>
    ${this.generateHTMLIssues(report)}
</body>
</html>`;
  }

  /**
   * Generate HTML issues section
   */
  generateHTMLIssues(report) {
    let html = '';
    for (const [filePath, fileData] of Object.entries(report.files)) {
      if (fileData.issues && fileData.issues.length > 0) {
        html += `<h3>${filePath}</h3>`;
        for (const issue of fileData.issues) {
          const className = issue.severity === 'DANGER' || issue.severity === 'APOCALYPSE' ? 'critical' :
                          issue.severity === 'WARNING' ? 'warning' : 'info';
          // FIXED: Handle both message and description properties
          const issueMessage = issue.message || issue.description || issue.type || 'Unknown issue';
          html += `<div class="issue ${className}">
            <strong>${issue.severity}</strong> Line ${issue.line}: ${issueMessage}
            ${issue.fix ? `<br><em>Fix: ${issue.fix}</em>` : ''}
          </div>`;
        }
      }
    }
    return html || '<p>No issues found.</p>';
  }

  /**
   * Generate text report
   */
  generateTextReport(report) {
    let text = `Eye of Sauron Scan Report\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Scan Date: ${report.metadata.scanDate}\n`;
    text += `Files Scanned: ${report.summary.totalFiles}\n`;
    text += `Total Issues: ${report.summary.totalIssues}\n`;
    text += `Critical Issues: ${report.summary.criticalIssues || 0}\n\n`;

    for (const [filePath, fileData] of Object.entries(report.files)) {
      if (fileData.issues && fileData.issues.length > 0) {
        text += `File: ${filePath}\n`;
        text += `${'-'.repeat(30)}\n`;
        for (const issue of fileData.issues) {
          // FIXED: Handle both message and description properties
          const issueMessage = issue.message || issue.description || issue.type || 'Unknown issue';
          text += `[${issue.severity}] Line ${issue.line}: ${issueMessage}\n`;
          if (issue.fix) {
            text += `  Fix: ${issue.fix}\n`;
          }
        }
        text += '\n';
      }
    }

    return text;
  }

  /**
   * Get color for severity level
   */
  getSeverityColor(severity) {
    switch (severity) {
      case 'APOCALYPSE':
      case 'DANGER':
        return colors.red;
      case 'WARNING':
        return colors.yellow;
      case 'NOTICE':
        return colors.blue;
      default:
        return colors.white;
    }
  }

  /**
   * Display banner
   */
  banner() {
    const version = this.config?.version || '1.1.0';
    this.log(`${colors.cyan}🔍 Eye of Sauron Scanner v${version}${colors.reset}`);
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
${colors.cyan}🔍 Eye of Sauron - All-seeing code analysis framework${colors.reset}

${colors.bright}USAGE:${colors.reset}
  node sauron-cli.js --input <path> [options]
  node sauron-cli.js <path> [options]

${colors.bright}OPTIONS:${colors.reset}
  --input, -i <path>      Path to scan (file or directory) [required]
  --output, -o <file>     Save report to file (supports .json, .html, .txt)
  --upload, -u <url>      Upload results to specified URL
  --mode, -m <mode>       Scan mode: quick|deep|quantum (default: deep)
  --config, -c <file>     Load configuration from JSON file
  --verbose, -v           Enable verbose output
  --silent, -s            Suppress all output except errors
  --fix                   Apply safe auto-fixes (experimental)
  --allow-console         Allow console statements
  --skip-tests            Skip test files
  --workers <n>           Number of parallel workers (1-16, default: 4)
  --batch-size <n>        Batch size for processing (1-100, default: 10)
  --help, -h              Show this help message
  --version               Show version number

${colors.bright}EXAMPLES:${colors.reset}
  # Basic scan
  node sauron-cli.js --input ./src

  # Scan with JSON output
  node sauron-cli.js --input ./src --output report.json

  # Scan and upload results
  node sauron-cli.js --input ./src --upload http://localhost:3000/process

  # Quick scan with verbose output
  node sauron-cli.js --input ./src --mode quick --verbose

  # Scan with custom configuration
  node sauron-cli.js --input ./src --config .sauronrc.json

${colors.bright}SCAN MODES:${colors.reset}
  quick    - Fast scan with basic checks
  deep     - Comprehensive analysis (default)
  quantum  - Maximum depth with cross-file analysis

${colors.bright}EXIT CODES:${colors.reset}
  0 - Success (no critical issues)
  1 - Critical issues found or scan failed
`);
  }

  /**
   * Show version
   */
  showVersion() {
    const version = this.config?.version || '1.1.0';
    console.log(`Eye of Sauron v${version}`);
  }

  /**
   * Log message (respects silent mode)
   */
  log(message) {
    if (!this.config.silent) {
      console.log(message);
    }
  }

  /**
   * Log error message
   */
  error(message) {
    console.error(`${colors.red}Error:${colors.reset} ${message}`);
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      // Add debug output for Windows
      if (process.env.DEBUG) {
        console.log('CLI starting...');
      }

      this.parseArgs();
      this.validateConfig();
      await this.loadCustomConfig();
      await this.validateInput();
      this.initializeScanner();
      await this.executeScan();
    } catch (error) {
      this.error(error.message);
      if (this.config.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Execute CLI if this file is run directly
const currentFile = fileURLToPath(import.meta.url);
const scriptPath = process.argv[1];

// Debug output to confirm execution
if (process.env.DEBUG) {
  console.log('Current file:', currentFile);
  console.log('Script path:', scriptPath);
  console.log('Process argv:', process.argv);
}

if (currentFile === scriptPath || currentFile === path.resolve(scriptPath)) {
  const isSilent = process.argv.includes('--silent') || process.argv.includes('-s');
  if (!isSilent) {
    console.log('🔍 Eye of Sauron CLI Starting...');
  }
  const cli = new SauronCLI();
  cli.run().catch(error => {
    console.error('CLI execution failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
} else {
  if (process.env.DEBUG) {
    console.log('CLI not executed - file not run directly');
  }
}

export { SauronCLI };
export default SauronCLI;