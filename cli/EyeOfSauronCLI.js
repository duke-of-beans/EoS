#!/usr/bin/env node

/**
 * Purpose: CLI entry point for Eye of Sauron - All-seeing code analysis framework
 * Dependencies: commander, Node.js std lib (fs, path), Config, EyeOfSauronOmniscient, OmniReportFormatter
 * Public API: None - CLI executable only
 * 
 * Handles command-line argument parsing, config loading, scanner initialization,
 * and report generation for the Eye of Sauron code analysis system.
 * 
 * Note: This file is designed to be run directly as a CLI tool and will execute
 * immediately when imported.
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import Config from '../config/Config.js';
import EyeOfSauronOmniscient from '../omniscient/EyeOfSauronOmniscient.js';
import OmniReportFormatter from '../omniscient/OmniReportFormatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EyeOfSauronCLI {
  constructor() {
    this.program = new Command();
    this.config = null;
    this.scanner = null;
    this.formatter = null;
  }

  /**
   * Initialize CLI with command definitions
   */
  initialize() {
    this.program
      .name('eye-of-sauron')
      .description('All-seeing code analysis framework - Nothing escapes its gaze')
      .version('1.0.0')
      .option('-m, --mode <mode>', 'scan mode (quick|deep|quantum)', 'deep')
      .option('-p, --path <path>', 'root path to scan', process.cwd())
      .option('-c, --config <file>', 'custom config file')
      .option('-o, --output <types>', 'comma-separated output formats (console,json,html)', 'console')
      .option('--parallel <n>', 'number of parallel workers', parseInt, 4)
      .option('-i, --incremental', 'incremental scan mode (only scan changed files)')
      .option('--verbose', 'verbose output')
      .option('--silent', 'suppress console output except errors')
      .action(async (options) => {
        await this.execute(options);
      });

    this.program.on('--help', () => {
      console.log('');
      console.log('Examples:');
      console.log('  $ eye-of-sauron --mode quick --path ./src');
      console.log('  $ eye-of-sauron --mode deep --output console,json --parallel 8');
      console.log('  $ eye-of-sauron --config custom-config.json --incremental');
    });
  }

  /**
   * Execute the CLI with given options
   */
  async execute(options) {
    const startTime = Date.now();
    let spinner = null;

    try {
      // Initialize spinner for visual feedback
      if (!options.silent) {
        spinner = ora('Initializing Eye of Sauron...').start();
      }

      // Load configuration
      await this.loadConfig(options, spinner);

      // Validate scan path
      await this.validatePath(this.config.scanPath);

      // Initialize scanner
      if (spinner) spinner.text = 'Awakening the Eye...';
      this.scanner = new EyeOfSauronOmniscient(this.config);

      // Initialize formatter
      this.formatter = new OmniReportFormatter(this.config);

      // Run scan
      if (spinner) spinner.text = `Scanning ${this.config.scanPath} in ${options.mode} mode...`;
      const vision = await this.scanner.scan(this.config.scanPath);

      if (spinner) {
        spinner.succeed('Scan complete');
      }

      // Generate and output reports
      await this.generateReports(vision, options);

      // Print summary
      if (!options.silent) {
        this.printSummary(vision, startTime);
      }

    } catch (error) {
      if (spinner) spinner.fail('Scan failed');
      console.error(chalk.red('Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Load configuration from file or create from options
   */
  async loadConfig(options, spinner) {
    try {
      if (options.config) {
        if (spinner) spinner.text = `Loading config from ${options.config}...`;
        this.config = await Config.load(options.config);
      } else {
        // Create config from CLI options
        this.config = new Config({
          mode: options.mode,
          scanPath: path.resolve(options.path),
          outputFormats: options.output.split(',').map(f => f.trim()),
          parallel: {
            enabled: options.parallel > 1,
            workers: options.parallel
          },
          incremental: {
            enabled: options.incremental
          },
          verbose: options.verbose,
          silent: options.silent
        });
      }

      // Override config with CLI options
      if (options.mode) this.config.mode = options.mode;
      if (options.path) this.config.scanPath = path.resolve(options.path);
      if (options.output) this.config.outputFormats = options.output.split(',').map(f => f.trim());
      if (options.parallel) {
        this.config.parallel.enabled = options.parallel > 1;
        this.config.parallel.workers = options.parallel;
      }
      if (options.incremental !== undefined) {
        this.config.incremental.enabled = options.incremental;
      }

    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Validate scan path exists and is accessible
   */
  async validatePath(scanPath) {
    try {
      const stats = await fs.stat(scanPath);
      if (!stats.isDirectory()) {
        throw new Error(`Scan path is not a directory: ${scanPath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Scan path does not exist: ${scanPath}`);
      }
      throw error;
    }
  }

  /**
   * Generate reports in requested formats
   */
  async generateReports(vision, options) {
    const outputFormats = this.config.outputFormats;

    for (const format of outputFormats) {
      switch (format.toLowerCase()) {
        case 'console':
          if (!options.silent) {
            const consoleReport = this.formatter.formatConsole(vision);
            console.log(consoleReport);
          }
          break;

        case 'json':
          const jsonReport = this.formatter.formatJSON(vision);
          const jsonPath = path.join(process.cwd(), 'eye-of-sauron-report.json');
          await fs.writeFile(jsonPath, jsonReport, 'utf8');
          if (!options.silent) {
            console.log(chalk.green(`✓ JSON report saved to: ${jsonPath}`));
          }
          break;

        case 'html':
          const htmlReport = this.formatter.formatHTML(vision);
          const htmlPath = path.join(process.cwd(), 'eye-of-sauron-report.html');
          await fs.writeFile(htmlPath, htmlReport, 'utf8');
          if (!options.silent) {
            console.log(chalk.green(`✓ HTML report saved to: ${htmlPath}`));
          }
          break;

        default:
          console.warn(chalk.yellow(`Warning: Unknown output format: ${format}`));
      }
    }
  }

  /**
   * Print scan summary
   */
  printSummary(vision, startTime) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const fileCount = Object.keys(vision.files).length;
    const totalIssues = Object.values(vision.files)
      .reduce((sum, file) => sum + file.issues.length, 0);

    console.log('');
    console.log(chalk.bold('Scan Summary:'));
    console.log(`  Mode: ${chalk.cyan(this.config.mode)}`);
    console.log(`  Files analyzed: ${chalk.cyan(fileCount)}`);
    console.log(`  Total issues: ${chalk.yellow(totalIssues)}`);
    console.log(`  Duration: ${chalk.cyan(duration)}s`);
    
    if (vision.summary) {
      const summary = vision.summary;
      console.log('');
      console.log(chalk.bold('Issue Breakdown:'));
      if (summary.critical > 0) console.log(`  Critical: ${chalk.red(summary.critical)}`);
      if (summary.major > 0) console.log(`  Major: ${chalk.yellow(summary.major)}`);
      if (summary.minor > 0) console.log(`  Minor: ${chalk.blue(summary.minor)}`);
      if (summary.suggestion > 0) console.log(`  Suggestions: ${chalk.gray(summary.suggestion)}`);
    }

    console.log('');
    console.log(chalk.dim('The Eye sees all. Nothing escapes its gaze.'));
  }

  /**
   * Run the CLI
   */
  async run() {
    this.initialize();
    await this.program.parseAsync(process.argv);
  }
}

// Execute CLI
const cli = new EyeOfSauronCLI();
cli.run().catch(error => {
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});

export default EyeOfSauronCLI;