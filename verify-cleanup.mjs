#!/usr/bin/env node
/**
 * Quick verification script after emergency cleanup
 */
import { promises as fs } from 'fs';

const testFiles = [
  'reporters/SauronInsightReporter.js',
  'utils/SauronScanOptimizer.js', 
  'utils/SauronReportAnalyzer.js',
  'SauronCore.js',
  'core/EyeOfSauronOmniscient.js'
].map(f => f.replace(/\//g, '\\'));

console.log('🔍 Quick verification of cleanup...');

let totalIssuesFound = 0;

for (const file of testFiles) {
  try {
    // Try both path formats
    let content;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      content = await fs.readFile(file.replace(/\\\\/g, '/'), 'utf8');
    }
    
    const cyrillicCount = (content.match(/[а-я]/gi) || []).length;
    const invisibleCount = (content.match(/[\u200B\u200C\u200D\uFEFF]/g) || []).length;
    const homoglyphCount = cyrillicCount + invisibleCount;
    
    totalIssuesFound += homoglyphCount;
    
    if (homoglyphCount === 0) {
      console.log(`✅ ${file} - Clean`);
    } else {
      console.log(`❌ ${file} - Still corrupted (${cyrillicCount} Cyrillic, ${invisibleCount} invisible)`);
    }
  } catch (error) {
    console.log(`❌ ${file} - Error: ${error.message}`);
  }
}

console.log(`\n📊 Total issues remaining: ${totalIssuesFound}`);

if (totalIssuesFound === 0) {
  console.log('🎉 CLEANUP SUCCESSFUL! No corruption detected.');
} else {
  console.log('⚠️  Some corruption remains. Run cleanup again or investigate manually.');
}
