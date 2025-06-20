#!/usr/bin/env node

/**
 * EMERGENCY HOMOGLYPH CLEANUP SCRIPT
 * Generated: 2025-01-20
 * Corruption Level: APOCALYPTIC (173,410+ homoglyphs detected)
 *
 * WARNING: This script will modify 134+ files with massive corruption
 * ALWAYS creates backups before cleaning
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive Cyrillic to ASCII mapping (all known homoglyphs)
const CYRILLIC_TO_ASCII = {
  // Basic Cyrillic lowercase homoglyphs
  'a': 'a', 'e': 'e', 'o': 'o', 'p': 'p', 'c': 'c', 'x': 'x', 'y': 'y',
  'i': 'i', 'j': 'j', 's': 's', 'd': 'd', 'g': 'g', 'l': 'l', 'h': 'h',

  // Basic Cyrillic uppercase homoglyphs
  'A': 'A', 'B': 'B', 'E': 'E', 'K': 'K', 'M': 'M', 'H': 'H', 'O': 'O',
  'P': 'P', 'C': 'C', 'T': 'T', 'X': 'X', 'Y': 'Y', 'S': 'S', 'I': 'I',
  'J': 'J', 'D': 'D', 'G': 'G', 'I': 'I',

  // Greek letters that look like ASCII
  'a': 'a', 'b': 'b', 'g': 'g', 'd': 'd', 'e': 'e', 'z': 'z', 'h': 'h',
  'th': 'th', 'i': 'i', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n', 'x': 'x',
  'o': 'o', 'p': 'p', 'p': 'p', 's': 's', 't': 't', 'u': 'u', 'f': 'f',
  'x': 'x', 'ps': 'ps', 'w': 'w',

  // Greek uppercase
  'A': 'A', 'B': 'B', 'G': 'G', 'D': 'D', 'E': 'E', 'Z': 'Z', 'H': 'H',
  'TH': 'TH', 'I': 'I', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N', 'X': 'X',
  'O': 'O', 'P': 'P', 'P': 'P', 'S': 'S', 'T': 'T', 'Y': 'Y', 'F': 'F',
  'X': 'X', 'PS': 'PS', 'W': 'W',

  // Mathematical and special symbols that look like ASCII
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G',
  'H': 'H', 'I': 'I', 'J': 'J', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N',
  'O': 'O', 'P': 'P', 'Q': 'Q', 'R': 'R', 'S': 'S', 'T': 'T', 'U': 'U',
  'V': 'V', 'W': 'W', 'X': 'X', 'Y': 'Y', 'Z': 'Z',

  // Fullwidth characters
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G',
  'H': 'H', 'I': 'I', 'J': 'J', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N',
  'O': 'O', 'P': 'P', 'Q': 'Q', 'R': 'R', 'S': 'S', 'T': 'T', 'U': 'U',
  'V': 'V', 'W': 'W', 'X': 'X', 'Y': 'Y', 'Z': 'Z',
  'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f', 'g': 'g',
  'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
  'o': 'o', 'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 'u': 'u',
  'v': 'v', 'w': 'w', 'x': 'x', 'y': 'y', 'z': 'z'
};

// Invisible characters to remove
const INVISIBLE_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\uFEFF', // Byte Order Mark
  '\u2060', // Word Joiner
  '\u180E', // Mongolian Vowel Separator
  '\u061C', // Arabic Letter Mark
  '\u2066', // Left-To-Right Isolate
  '\u2067', // Right-To-Left Isolate
  '\u2068', // First Strong Isolate
  '\u2069'  // Pop Directional Isolate
];

// Files identified as most corrupted (from investigation)
const PRIORITY_CORRUPTED_FILES = [
  'reporters/SauronInsightReporter.js',
  'utils/SauronScanOptimizer.js',
  'utils/SauronReportAnalyzer.js',
  'utils/SauronThreatCorrelator.js',
  'utils/SauronDependencyAuditor.js',
  'utils/SauronDataSanitizer.js',
  'utils/SauronThreatModeler.js',
  'utils/SauronCveFetcher.js',
  'utils/SauronComplianceChecker.js',
  'utils/GitHookInstaller.js',
  'utils/SauronTrendVisualizer.js',
  'utils/SauronDependencyGraph.js',
  'reporters/SauronReportViewer.js',
  'SauronCore.js',
  'reporters/HTMLReportFormatter.js',
  'utils/SauronSecurePipelineOrchestrator.js',
  'utils/SauronSecureArchiveManager.js',
  'utils/SauronHealthDashboard.js',
  'core/EyeOfSauronOmniscient.js',
  'utils/SauronPerformanceProfiler.js'
];

// Statistics tracking
let totalFilesProcessed = 0;
let totalReplacements = 0;
let totalBackups = 0;
let totalErrors = 0;
let processingStats = {
  homoglyphs: 0,
  invisibleChars: 0,
  trailingSpaces: 0,
  mixedLineEndings: 0
};

/**
 * Clean a single file of homoglyphs and invisible characters
 */
async function cleanFile(filePath) {
  try {
    console.log(`🔧 Cleaning: ${filePath}`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return;
    }

    const content = await fs.readFile(filePath, 'utf8');
    let cleanContent = content;
    let fileReplacements = 0;

    // Track original content for comparison
    const originalLength = content.length;

    // 1. Replace Cyrillic homoglyphs with ASCII
    for (const [cyrillic, ascii] of Object.entries(CYRILLIC_TO_ASCII)) {
      const regex = new RegExp(cyrillic, 'g');
      const matches = cleanContent.match(regex);
      if (matches) {
        cleanContent = cleanContent.replace(regex, ascii);
        fileReplacements += matches.length;
        processingStats.homoglyphs += matches.length;
      }
    }

    // 2. Remove invisible characters
    for (const invisibleChar of INVISIBLE_CHARS) {
      const regex = new RegExp(invisibleChar, 'g');
      const matches = cleanContent.match(regex);
      if (matches) {
        cleanContent = cleanContent.replace(regex, '');
        fileReplacements += matches.length;
        processingStats.invisibleChars += matches.length;
      }
    }

    // 3. Clean trailing spaces (but preserve intentional formatting)
    const lines = cleanContent.split('\n');
    const cleanedLines = lines.map(line => {
      if (line.trimEnd() !== line) {
        processingStats.trailingSpaces++;
        return line.trimEnd();
      }
      return line;
    });
    cleanContent = cleanedLines.join('\n');

    // 4. Normalize line endings to LF (Unix style)
    if (cleanContent.includes('\r\n')) {
      cleanContent = cleanContent.replace(/\r\n/g, '\n');
      processingStats.mixedLineEndings++;
    }

    // 5. Apply any changes
    if (cleanContent !== content) {
      // Create backup with timestamp
      const timestamp = Date.now();
      const backupPath = `${filePath}.backup.${timestamp}`;
      await fs.writeFile(backupPath, content, 'utf8');
      totalBackups++;

      // Write cleaned content
      await fs.writeFile(filePath, cleanContent, 'utf8');
      totalReplacements += fileReplacements;

      const sizeDiff = originalLength - cleanContent.length;
      console.log(`  ✅ Fixed ${fileReplacements} issues (${sizeDiff} chars removed)`);

      // Log significant changes
      if (fileReplacements > 100) {
        console.log(`  🚨 HIGH CORRUPTION: ${fileReplacements} fixes in ${path.basename(filePath)}`);
      }
    } else {
      console.log(`  ✅ No corruption found`);
    }

    totalFilesProcessed++;

  } catch (error) {
    console.error(`  ❌ Error cleaning ${filePath}: ${error.message}`);
    totalErrors++;
  }
}

/**
 * Discover all JavaScript files in the project
 */
async function discoverJavaScriptFiles(dir = '.') {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip common ignore directories
        if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
          const subFiles = await discoverJavaScriptFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // Include JavaScript files
        if (['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
  }

  return files;
}

/**
 * Main cleanup function
 */
async function runEmergencyCleanup() {
  console.log('🚨🚨🚨 EMERGENCY HOMOGLYPH CLEANUP STARTING 🚨🚨🚨');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`⚠️  CORRUPTION LEVEL: APOCALYPTIC (173,410+ homoglyphs)`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log(`💾 Backups will be created for all modified files`);
  console.log('═══════════════════════════════════════════════════════');

  // 1. Clean priority files first (most corrupted)
  console.log('\n🔥 PHASE 1: Cleaning priority corrupted files...');
  let priorityFilesFound = 0;

  for (const file of PRIORITY_CORRUPTED_FILES) {
    // Try both Unix and Windows path separators
    const unixPath = file;
    const windowsPath = file.replace(/\//g, '\\');

    let foundPath = null;
    try {
      await fs.access(unixPath);
      foundPath = unixPath;
    } catch {
      try {
        await fs.access(windowsPath);
        foundPath = windowsPath;
      } catch {
        // File doesn't exist in either format
      }
    }

    if (foundPath) {
      await cleanFile(foundPath);
      priorityFilesFound++;
    } else {
      console.log(`  ⚠️  Priority file not found: ${file}`);
    }
  }

  console.log(`✅ Priority phase complete: ${priorityFilesFound}/${PRIORITY_CORRUPTED_FILES.length} files processed`);

  // 2. Discover and clean all JavaScript files
  console.log('\n🔍 PHASE 2: Discovering all JavaScript files...');
  const allFiles = await discoverJavaScriptFiles('.');
  const remainingFiles = allFiles.filter(file => {
    // Skip files already processed in priority phase
    const normalizedFile = file.replace(/\\/g, '/');
    return !PRIORITY_CORRUPTED_FILES.some(pf =>
      normalizedFile.endsWith(pf) || normalizedFile === pf
    );
  });

  console.log(`📊 Found ${allFiles.length} total JS files, ${remainingFiles.length} remaining to process`);

  if (remainingFiles.length > 0) {
    console.log('\n🧹 PHASE 3: Cleaning remaining files...');

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < remainingFiles.length; i += batchSize) {
      const batch = remainingFiles.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(remainingFiles.length/batchSize)}...`);

      await Promise.all(batch.map(file => cleanFile(file)));
    }
  }

  // 3. Final statistics and summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 EMERGENCY CLEANUP COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`📊 Files processed: ${totalFilesProcessed}`);
  console.log(`🔧 Total fixes applied: ${totalReplacements}`);
  console.log(`💾 Backups created: ${totalBackups}`);
  console.log(`❌ Errors encountered: ${totalErrors}`);
  console.log(`🕐 Completed: ${new Date().toISOString()}`);

  console.log('\n📈 DETAILED STATISTICS:');
  console.log(`   🧬 Homoglyphs fixed: ${processingStats.homoglyphs}`);
  console.log(`   👻 Invisible chars removed: ${processingStats.invisibleChars}`);
  console.log(`   📏 Trailing spaces cleaned: ${processingStats.trailingSpaces}`);
  console.log(`   📝 Line endings normalized: ${processingStats.mixedLineEndings}`);

  console.log('\n⚠️  NEXT STEPS:');
  console.log('1. 🧪 Test your application thoroughly');
  console.log('2. 🔍 Run scanner again: node corrected-sauron-cli.mjs .');
  console.log('3. 📊 Verify cleanup: node verify-cleanup.mjs');
  console.log('4. ✅ If satisfied, delete .backup.* files');
  console.log('5. 💾 Commit clean code to version control');
  console.log('6. 🔍 Investigate source of corruption');

  if (totalReplacements > 100000) {
    console.log('\n🚨 MASSIVE CORRUPTION WAS DETECTED AND CLEANED!');
    console.log('🔍 URGENT: Investigate how this corruption occurred');
    console.log('🛡️  Consider scanning all development machines');
    console.log('🔒 Add pre-commit hooks to prevent reoccurrence');
  }

  console.log('\n💪 Your codebase should now be clean of homoglyph attacks!');
}

// Create verification script
async function createVerificationScript() {
  const verifyScript = `#!/usr/bin/env node
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
].map(f => f.replace(/\\//g, '\\\\'));

console.log('🔍 Quick verification of cleanup...');

let totalIssuesFound = 0;

for (const file of testFiles) {
  try {
    // Try both path formats
    let content;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      content = await fs.readFile(file.replace(/\\\\\\\\/g, '/'), 'utf8');
    }

    const cyrillicCount = (content.match(/[a-я]/gi) || []).length;
    const invisibleCount = (content.match(/[\\u200B\\u200C\\u200D\\uFEFF]/g) || []).length;
    const homoglyphCount = cyrillicCount + invisibleCount;

    totalIssuesFound += homoglyphCount;

    if (homoglyphCount === 0) {
      console.log(\`✅ \${file} - Clean\`);
    } else {
      console.log(\`❌ \${file} - Still corrupted (\${cyrillicCount} Cyrillic, \${invisibleCount} invisible)\`);
    }
  } catch (error) {
    console.log(\`❌ \${file} - Error: \${error.message}\`);
  }
}

console.log(\`\\n📊 Total issues remaining: \${totalIssuesFound}\`);

if (totalIssuesFound === 0) {
  console.log('🎉 CLEANUP SUCCESSFUL! No corruption detected.');
} else {
  console.log('⚠️  Some corruption remains. Run cleanup again or investigate manually.');
}
`;

  await fs.writeFile('verify-cleanup.mjs', verifyScript);
  console.log('✅ Created verification script: verify-cleanup.mjs');
}

// Run the emergency cleanup
try {
  await runEmergencyCleanup();
  await createVerificationScript();
} catch (error) {
  console.error('💥 EMERGENCY CLEANUP FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}