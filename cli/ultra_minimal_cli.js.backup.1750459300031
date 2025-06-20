#!/usr/bin/env node

/**
 * Ultra Minimal CLI - Bare Essentials Only
 * If this doesn't work, we'll know it's a fundamental import issue
 */

// Try-catch around the entire script to catch silent failures
try {
  console.log('🔍 Ultra Minimal Scanner Starting...');

  // Import with explicit error handling
  const { createEye } = await import('../core/EyeOfSauronOmniscient.js').catch(error => {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  });

  console.log('✅ Import successful');

  // Create scanner
  const scanner = createEye();
  console.log('✅ Scanner created');

  // Get scan path from args or use current directory
  const scanPath = process.argv[2] || '.';
  console.log(`📁 Scanning: ${scanPath}`);

  // Run scan
  console.log('⏳ Scanning...');
  const results = await scanner.scan(scanPath, 'deep');

  // Show basic results
  console.log('📊 Results:');
  console.log(`   Files: ${results.summary?.filesScanned || 0}`);
  console.log(`   Issues: ${results.summary?.totalIssues || 0}`);

  console.log('✅ Done!');

} catch (error) {
  console.error('❌ Script failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}