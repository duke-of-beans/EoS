#!/usr/bin/env node

/**
 * Investigate Remaining Corruption
 * Analyzes the scan results to see what's causing 173,561 issues
 */

import { promises as fs } from 'fs';

async function investigateCorruption() {
  try {
    console.log('🔍 Investigating remaining corruption...\n');

    // Read the scan results
    const resultsPath = 'test-cli.json';
    const resultsContent = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);

    console.log('📊 SCAN RESULTS ANALYSIS:');
    console.log('═══════════════════════════════════════');

    // Basic stats
    console.log(`Total files scanned: ${results.files?.length || 0}`);
    console.log(`Total issues reported: ${results.summary?.totalIssues || 'N/A'}`);

    if (results.summary?.issuesBySeverity) {
      console.log('\n🚨 Issues by severity:');
      Object.entries(results.summary.issuesBySeverity).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });
    }

    // Analyze first few files with issues
    if (results.files && results.files.length > 0) {
      console.log('\n📋 Files with most issues:');

      const filesWithIssues = results.files
        .filter(file => file.issues && file.issues.length > 0)
        .sort((a, b) => b.issues.length - a.issues.length)
        .slice(0, 10);

      filesWithIssues.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.file}: ${file.issues.length} issues`);

        // Show issue types in first file
        if (index === 0) {
          console.log('    📍 Sample issue types:');
          const issueTypes = {};
          file.issues.slice(0, 20).forEach(issue => {
            issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
          });
          Object.entries(issueTypes).forEach(([type, count]) => {
            console.log(`      ${type}: ${count}`);
          });

          console.log('    📍 Sample issues:');
          file.issues.slice(0, 3).forEach(issue => {
            console.log(`      - ${issue.type}: ${issue.message}`);
          });
        }
      });
    }

    // Check for backup files being scanned
    if (results.files) {
      const backupFiles = results.files.filter(file =>
        file.file.includes('.backup.') ||
        file.file.includes('backup') ||
        file.file.includes('.bak')
      );

      if (backupFiles.length > 0) {
        console.log(`\n⚠️  FOUND ${backupFiles.length} BACKUP FILES BEING SCANNED!`);
        console.log('This is likely causing the corruption!');
        backupFiles.slice(0, 5).forEach(file => {
          console.log(`  - ${file.file} (${file.issues?.length || 0} issues)`);
        });
      }
    }

    // Check for specific homoglyph patterns
    let totalHomoglyphs = 0;
    if (results.files) {
      results.files.forEach(file => {
        if (file.issues) {
          const homoglyphIssues = file.issues.filter(issue =>
            issue.type === 'HOMOGLYPH' ||
            issue.message?.includes('CYRILLIC') ||
            issue.message?.includes('homoglyph')
          );
          totalHomoglyphs += homoglyphIssues.length;
        }
      });
    }

    console.log(`\n🎯 ANALYSIS SUMMARY:`);
    console.log(`Total homoglyph issues: ${totalHomoglyphs}`);
    console.log(`Percentage of homoglyphs: ${((totalHomoglyphs / (results.summary?.totalIssues || 1)) * 100).toFixed(1)}%`);

    if (totalHomoglyphs > 100000) {
      console.log('🚨 CRITICAL: Still massive homoglyph corruption detected!');
      console.log('');
      console.log('🔧 RECOMMENDED ACTIONS:');
      console.log('1. Exclude backup files from scanning');
      console.log('2. Clear scanner cache/temp files');
      console.log('3. Run more aggressive homoglyph cleanup');
    } else if (totalHomoglyphs > 1000) {
      console.log('⚠️  WARNING: Moderate homoglyph issues detected');
    } else {
      console.log('✅ Homoglyph levels look normal');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.log('');
    console.log('🔧 Manual investigation:');
    console.log('1. Check if test-cli.json exists');
    console.log('2. Look at file contents with: head test-cli.json');
    console.log('3. Count backup files with: ls -la *.backup.*');
  }
}

await investigateCorruption();