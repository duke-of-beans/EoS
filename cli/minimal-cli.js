#!/usr/bin/env node

/**
 * Minimal Working CLI for Eye of Sauron
 * Ultra-simple version that just focuses on getting the scanner working
 */

import { promises as fs } from 'fs';
import path from 'path';

// Simple argument parsing
const args = process.argv.slice(2);
const scanPath = args.find(arg => !arg.startsWith('--')) || '.';
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔍 Eye of Sauron Minimal CLI

Usage: node minimal-cli.js [path] [--output file.json] [--help]

Examples:
  node minimal-cli.js                    # Scan current directory
  node minimal-cli.js ./src              # Scan src directory
  node minimal-cli.js . --output out.json # Save results to file
`);
  process.exit(0);
}

async function runMinimalScan() {
  try {
    console.log('🔍 Eye of Sauron Minimal Scanner');
    console.log(`📁 Scanning: ${scanPath}`);
    console.log('');

    // Import and create scanner
    console.log('⏳ Initializing scanner...');
    const module = await import('../core/EyeOfSauronOmniscient.js');
    const { createEye } = module;

    if (!createEye) {
      throw new Error('createEye function not found in module');
    }

    const scanner = createEye();
    console.log('✅ Scanner initialized');

    // Run scan
    console.log('⏳ Starting scan...');
    const startTime = Date.now();

    const results = await scanner.scan(scanPath, 'deep');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Scan completed in ${duration}s`);

    // Show results
    console.log('\n📊 Results:');
    console.log('─'.repeat(40));

    if (results && results.summary) {
      console.log(`Files scanned: ${results.summary.filesScanned || 0}`);
      console.log(`Total issues: ${results.summary.totalIssues || 0}`);

      if (results.summary.issuesBySeverity) {
        Object.entries(results.summary.issuesBySeverity).forEach(([severity, count]) => {
          if (count > 0) {
            console.log(`${severity}: ${count}`);
          }
        });
      }
    } else {
      console.log('No summary available');
    }

    // Show file details
    if (results && results.files) {
      const filesWithIssues = Object.entries(results.files)
        .filter(([_, data]) => data.issues && data.issues.length > 0);

      if (filesWithIssues.length > 0) {
        console.log('\n📂 Files with issues:');
        filesWithIssues.slice(0, 5).forEach(([filePath, data]) => {
          const relativePath = path.relative(process.cwd(), filePath);
          console.log(`  ${relativePath} (${data.issues.length} issues)`);
        });

        if (filesWithIssues.length > 5) {
          console.log(`  ... and ${filesWithIssues.length - 5} more files`);
        }
      }
    }

    // Save results if requested
    if (outputFile) {
      await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to: ${outputFile}`);
    }

    console.log('\n🎉 Scan complete!');

  } catch (error) {
    console.error('\n❌ Scan failed:');
    console.error(`   ${error.message}`);

    if (process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

runMinimalScan();