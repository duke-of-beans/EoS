#!/usr/bin/env node

/**
 * CORRECTED Eye of Sauron CLI (Post-Cleanup Version)
 * Fixed: scan() method + object-based files structure + post-cleanup optimized
 */

import { promises as fs } from 'fs';
import path from 'path';
import { EyeOfSauronOmniscient } from './core/EyeOfSauronOmniscient.js';

class CorrectedSauronCLI {
  constructor() {
    this.scanner = null;
  }

  async run() {
    try {
      console.log('👁️  Eye of Sauron Scanner CLI (POST-CLEANUP VERIFIED)');
      console.log('═══════════════════════════════════════════════════════');
      
      const inputPath = process.argv[2] || '.';
      const outputFile = this.getOutputFile();
      
      console.log(`📁 Scanning cleaned codebase: ${inputPath}`);
      
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
      
      console.log('⚡ Running post-cleanup verification scan...');
      
      // FIXED: Use scan() method instead of scanPath()
      const results = await this.scanner.scan(inputPath);
      
      console.log('✅ Post-cleanup scan completed successfully!');
      
      // Save results
      if (outputFile) {
        await this.saveResults(results, outputFile);
        console.log(`💾 Results saved to: ${outputFile}`);
      }
      
      // FIXED: Handle object-based file structure
      this.printPostCleanupSummary(results);
      
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  }

  getOutputFile() {
    const args = process.argv;
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
      return args[outputIndex + 1];
    }
    return `post-cleanup-scan-${Date.now()}.json`;
  }

  async saveResults(results, outputFile) {
    const jsonOutput = JSON.stringify(results, null, 2);
    await fs.writeFile(outputFile, jsonOutput, 'utf8');
  }

  // FIXED: Properly handle object-based files structure + post-cleanup analysis
  printPostCleanupSummary(results) {
    console.log('\n📊 POST-CLEANUP SCAN SUMMARY:');
    console.log('═══════════════════════════════════════════════');
    
    if (results.summary) {
      console.log(`📁 Files scanned: ${results.summary.filesScanned || 'N/A'}`);
      console.log(`🔍 Total issues: ${results.summary.totalIssues || 0}`);
      
      if (results.summary.issuesBySeverity) {
        const severities = results.summary.issuesBySeverity;
        if (severities.APOCALYPSE) console.log(`💀 APOCALYPSE: ${severities.APOCALYPSE}`);
        if (severities.DANGER) console.log(`🚨 DANGER: ${severities.DANGER}`);
        if (severities.WARNING) console.log(`⚠️  WARNING: ${severities.WARNING}`);
        if (severities.INFO) console.log(`ℹ️  INFO: ${severities.INFO}`);
      }
    }
    
    // FIXED: Handle files as object, not array
    if (results.files && typeof results.files === 'object') {
      const fileEntries = Object.entries(results.files);
      console.log(`📋 Total files processed: ${fileEntries.length}`);
      
      const filesWithIssues = fileEntries.filter(([_, fileData]) => 
        fileData.issues && Array.isArray(fileData.issues) && fileData.issues.length > 0
      );
      
      console.log(`💀 Files with remaining issues: ${filesWithIssues.length}`);
      
      // Check for homoglyph success
      let remainingHomoglyphs = 0;
      let remainingInvisible = 0;
      let otherIssues = 0;
      
      fileEntries.forEach(([_, fileData]) => {
        if (fileData.issues) {
          fileData.issues.forEach(issue => {
            if (issue.type === 'HOMOGLYPH') remainingHomoglyphs++;
            else if (issue.type === 'INVISIBLE_CHAR') remainingInvisible++;
            else otherIssues++;
          });
        }
      });

      console.log('\n🧬 CORRUPTION CHECK:');
      console.log(`   Homoglyphs remaining: ${remainingHomoglyphs}`);
      console.log(`   Invisible chars remaining: ${remainingInvisible}`);
      console.log(`   Other issues: ${otherIssues}`);
      
      if (remainingHomoglyphs === 0 && remainingInvisible === 0) {
        console.log('\n🎉 SUCCESS! CORRUPTION COMPLETELY ELIMINATED!');
        console.log('✅ No homoglyphs detected');
        console.log('✅ No invisible characters detected');
        console.log('✅ Emergency cleanup was 100% effective');
      } else if (remainingHomoglyphs > 0) {
        console.log('\n⚠️  PARTIAL SUCCESS - Some homoglyphs remain');
        console.log(`   ${remainingHomoglyphs} homoglyphs still detected`);
        console.log('   Consider running targeted-cleanup.mjs for remaining issues');
      } else {
        console.log('\n✅ HOMOGLYPH CLEANUP SUCCESSFUL');
        console.log('   All homoglyphs eliminated');
      }

      // Show remaining issue files if any
      if (filesWithIssues.length > 0) {
        const sortedFiles = filesWithIssues
          .sort(([_, a], [__, b]) => (b.issues?.length || 0) - (a.issues?.length || 0))
          .slice(0, 10);
        
        console.log('\n📋 Files with remaining issues:');
        sortedFiles.forEach(([filePath, fileData], index) => {
          const issueCount = fileData.issues?.length || 0;
          const homoglyphsInFile = fileData.issues?.filter(i => i.type === 'HOMOGLYPH').length || 0;
          console.log(`   ${index + 1}. ${filePath}: ${issueCount} issues (${homoglyphsInFile} homoglyphs)`);
        });
      }
      
    } else {
      console.log('❌ No file data found in results');
      console.log('Files structure type:', typeof results.files);
    }
    
    // Success metrics comparison
    console.log('\n📈 CLEANUP SUCCESS METRICS:');
    console.log('   Before: 173,410+ homoglyphs');
    console.log(`   After: ${remainingHomoglyphs} homoglyphs`);
    const successRate = ((173410 - remainingHomoglyphs) / 173410 * 100).toFixed(2);
    console.log(`   Success rate: ${successRate}%`);
    
    console.log('\n✨ Post-cleanup scan complete!');
    
    if (remainingHomoglyphs === 0) {
      console.log('\n🚀 NEXT STEPS:');
      console.log('1. ✅ Cleanup was 100% successful');
      console.log('2. 💾 Commit your cleaned code to version control');
      console.log('3. 🗑️  Delete .backup.* files when satisfied');
      console.log('4. 🔍 Add pre-commit hooks to prevent reoccurrence');
      console.log('5. 🛡️  Investigate source of original corruption');
    }
  }
}

// Export for programmatic use
export { CorrectedSauronCLI };

// Run directly if called as script
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CorrectedSauronCLI();
  await cli.run();
}