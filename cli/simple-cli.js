#!/usr/bin/env node

/**
 * Simple CLI for Eye of Sauron - Fixed Version
 * Purpose: Simplified command-line interface for basic scans
 * Dependencies: EyeOfSauronOmniscient
 */

import { promises as fs } from 'fs';
import path from 'path';
import { EyeOfSauronOmniscient } from '../core/EyeOfSauronOmniscient.js';

class SimpleCLI {
  constructor() {
    this.scanner = null;
  }

  async run() {
    try {
      console.log('🔍 Eye of Sauron Scanner CLI');

      // Get command line arguments
      const inputPath = process.argv[2] || '.';
      const outputFile = this.getOutputFile();

      console.log('📦 Importing scanner...');

      // Create scanner instance (CORRECT: use 'new' with class)
      console.log('✅ Scanner imported');
      console.log(`📁 Scanning: ${inputPath}`);
      console.log('🔧 Initializing scanner...');

      // Configure scanner
      const config = {
        mode: 'standard',
        maxConcurrentScans: 4,
        enableTelemetry: false,
        patterns: {
          ignoreDirectories: ['node_modules', '.git', 'dist', 'build'],
          supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
        }
      };

      this.scanner = new EyeOfSauronOmniscient(config);

      console.log('⚡ Running scan...');

      // Run the scan (CORRECT: call scanPath method on instance)
      const results = await this.scanner.scan(inputPath);

      console.log('✅ Scan completed successfully!');

      // Save results
      if (outputFile) {
        await this.saveResults(results, outputFile);
        console.log(`💾 Results saved to: ${outputFile}`);
      }

      // Print summary
      this.printSummary(results);

    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      if (process.env.DEBUG) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  getOutputFile() {
    const args = process.argv;
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
      return args[outputIndex + 1];
    }
    return null;
  }

  async saveResults(results, outputFile) {
    const jsonOutput = JSON.stringify(results, null, 2);
    await fs.writeFile(outputFile, jsonOutput, 'utf8');
  }

  printSummary(results) {
    console.log('\n📊 SCAN SUMMARY:');
    console.log('═══════════════════════════════════════');

    if (results.summary) {
      console.log(`📁 Files scanned: ${results.summary.filesScanned || 'N/A'}`);
      console.log(`🔍 Total issues: ${results.summary.totalIssues || 0}`);

      if (results.summary.issuesBySeverity) {
        const severities = results.summary.issuesBySeverity;
        if (severities.APOCALYPSE) console.log(`🚨 APOCALYPSE: ${severities.APOCALYPSE}`);
        if (severities.DANGER) console.log(`⚠️  DANGER: ${severities.DANGER}`);
        if (severities.WARNING) console.log(`⚡ WARNING: ${severities.WARNING}`);
        if (severities.INFO) console.log(`ℹ️  INFO: ${severities.INFO}`);
      }
    } else {
      console.log('📊 No summary data available');
    }

    if (results.files && results.files.length > 0) {
      console.log(`\n📋 Files with issues: ${results.files.length}`);

      // Show top 5 files with most issues
      const sortedFiles = results.files
        .filter(file => file.issues && file.issues.length > 0)
        .sort((a, b) => b.issues.length - a.issues.length)
        .slice(0, 5);

      if (sortedFiles.length > 0) {
        console.log('\n🔥 Top issue files:');
        sortedFiles.forEach(file => {
          console.log(`   ${file.file}: ${file.issues.length} issues`);
        });
      }
    }

    console.log('\n✨ Scan complete!');
  }
}

// Run the CLI
const cli = new SimpleCLI();
await cli.run();