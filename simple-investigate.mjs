#!/usr/bin/env node

/**
 * Simple Investigation Script (ES Module Compatible)
 * Handles object-based file structure correctly
 */

import { promises as fs } from 'fs';

async function investigateCorruption() {
  try {
    console.log('🔍 Investigating corruption in test-cli.json...');

    // Read the scan results
    const data = await fs.readFile('./test-cli.json', 'utf8');
    const results = JSON.parse(data);

    console.log('\n📊 INVESTIGATION RESULTS:');
    console.log('═══════════════════════════════════════');

    // Basic structure info
    console.log('Keys in results:', Object.keys(results));
    console.log('Type of files:', typeof results.files);

    if (results.summary) {
      console.log(`📁 Files scanned: ${results.summary.filesScanned || 'N/A'}`);
      console.log(`🔥 Total issues: ${results.summary.totalIssues || 0}`);
    }

    // FIXED: Handle files as object, not array
    if (results.files && typeof results.files === 'object') {
      const fileEntries = Object.entries(results.files);
      console.log(`📋 Files in results: ${fileEntries.length}`);

      // Count corruption types
      let corruptionStats = {
        HOMOGLYPH: 0,
        INVISIBLE_CHAR: 0,
        TRAILING_SPACE: 0,
        MIXED_QUOTES: 0,
        OTHER: 0
      };

      let mostCorrupted = [];

      fileEntries.forEach(([filePath, fileData]) => {
        if (fileData.issues && Array.isArray(fileData.issues)) {
          let fileHomoglyphs = 0;

          fileData.issues.forEach(issue => {
            if (issue.type === 'HOMOGLYPH') {
              corruptionStats.HOMOGLYPH++;
              fileHomoglyphs++;
            } else if (issue.type === 'INVISIBLE_CHAR') {
              corruptionStats.INVISIBLE_CHAR++;
            } else if (issue.type === 'TRAILING_SPACE') {
              corruptionStats.TRAILING_SPACE++;
            } else if (issue.type === 'MIXED_QUOTES') {
              corruptionStats.MIXED_QUOTES++;
            } else {
              corruptionStats.OTHER++;
            }
          });

          mostCorrupted.push({
            file: filePath,
            totalIssues: fileData.issues.length,
            homoglyphs: fileHomoglyphs
          });
        }
      });

      console.log('\n🧬 CORRUPTION BREAKDOWN:');
      console.log(`   Homoglyphs: ${corruptionStats.HOMOGLYPH}`);
      console.log(`   Invisible chars: ${corruptionStats.INVISIBLE_CHAR}`);
      console.log(`   Trailing spaces: ${corruptionStats.TRAILING_SPACE}`);
      console.log(`   Mixed quotes: ${corruptionStats.MIXED_QUOTES}`);
      console.log(`   Other issues: ${corruptionStats.OTHER}`);

      // Show most corrupted files
      const sortedCorrupted = mostCorrupted
        .sort((a, b) => b.totalIssues - a.totalIssues)
        .slice(0, 15);

      console.log('\n💀 MOST CORRUPTED FILES:');
      sortedCorrupted.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.file}: ${file.totalIssues} issues (${file.homoglyphs} homoglyphs)`);
      });

      // Threat assessment
      const totalHomoglyphs = corruptionStats.HOMOGLYPH;
      console.log('\n🚨 THREAT ASSESSMENT:');

      if (totalHomoglyphs > 100000) {
        console.log('   💀 APOCALYPTIC - Entire codebase compromised!');
        console.log('   🛑 IMMEDIATE ACTION REQUIRED');
      } else if (totalHomoglyphs > 10000) {
        console.log('   🚨 CRITICAL - Major corruption detected');
      } else if (totalHomoglyphs > 1000) {
        console.log('   ⚠️  WARNING - Moderate corruption');
      } else {
        console.log('   ✅ MANAGEABLE - Limited corruption');
      }

      // Investigation conclusions
      console.log('\n🔍 INVESTIGATION CONCLUSIONS:');
      console.log('✅ Data structure is correctly object-based');
      console.log(`✅ Successfully processed ${fileEntries.length} files`);
      console.log(`✅ Found ${corruptionStats.HOMOGLYPH + corruptionStats.INVISIBLE_CHAR} corruption issues`);

      // Recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('1. Use emergency-fixed-cli.mjs for proper scanning');
      console.log('2. Run EMERGENCY-CLEANUP.mjs to fix corruption');
      console.log('3. Use corrected-sauron-cli.mjs for future scans');
      console.log('4. Investigate source of homoglyph injection');

    } else {
      console.log('❌ Files structure is not object-based');
      console.log('Actual type:', typeof results.files);
      console.log('Content preview:', JSON.stringify(results.files).slice(0, 200));
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  }
}

// Run the investigation
await investigateCorruption();