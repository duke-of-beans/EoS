#!/usr/bin/env node
import { promises as fs } from 'fs';

console.log('🔍 Quick Post-Cleanup Verification...');

// Check some previously corrupted files
const testFiles = [
  'reporters\\SauronInsightReporter.js',
  'utils\\SauronScanOptimizer.js',
  'SauronCore.js'
];

let totalHomoglyphs = 0;

for (const file of testFiles) {
  try {
    const content = await fs.readFile(file, 'utf8');
    const cyrillicCount = (content.match(/[а-я]/gi) || []).length;
    console.log(`${file}: ${cyrillicCount} homoglyphs`);
    totalHomoglyphs += cyrillicCount;
  } catch (error) {
    console.log(`${file}: Error reading`);
  }
}

console.log(`\nTotal homoglyphs found: ${totalHomoglyphs}`);
if (totalHomoglyphs === 0) {
  console.log('🎉 SUCCESS! Cleanup was 100% effective!');
} else {
  console.log('⚠️ Some corruption remains');
}