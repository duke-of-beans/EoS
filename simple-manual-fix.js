#!/usr/bin/env node

/**
 * Simple Manual Fix Script
 * Directly fixes the most common issues without complex analysis
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🛠️ Simple Manual Fix Script');
console.log('═'.repeat(40));

// Define the most common fixes
const FIXES = {
  // Remove trailing whitespace
  trailingSpaces: (content) => content.replace(/[ \t]+$/gm, ''),

  // Replace smart quotes with regular quotes
  smartQuotes: (content) => {
    return content
      .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes
      .replace(/[\u201A\u201E]/g, '"')  // Low quotes
      .replace(/[\u2039\u203A]/g, "'")  // Angle quotes
      .replace(/[\u00AB\u00BB]/g, '"'); // Double angle quotes
  },

  // Replace common Cyrillic lookalikes
  homoglyphs: (content) => {
    return content
      .replace(/[a]/g, 'a')  // Cyrillic a
      .replace(/[e]/g, 'e')  // Cyrillic e
      .replace(/[o]/g, 'o')  // Cyrillic o
      .replace(/[p]/g, 'p')  // Cyrillic p
      .replace(/[c]/g, 'c')  // Cyrillic c
      .replace(/[x]/g, 'x')  // Cyrillic x
      .replace(/[y]/g, 'y')  // Cyrillic y
      .replace(/[B]/g, 'B')  // Cyrillic B
      .replace(/[E]/g, 'E')  // Cyrillic E
      .replace(/[K]/g, 'K')  // Cyrillic K
      .replace(/[M]/g, 'M')  // Cyrillic M
      .replace(/[H]/g, 'H')  // Cyrillic H
      .replace(/[O]/g, 'O')  // Cyrillic O
      .replace(/[P]/g, 'P')  // Cyrillic P
      .replace(/[C]/g, 'C')  // Cyrillic C
      .replace(/[T]/g, 'T')  // Cyrillic T
      .replace(/[X]/g, 'X'); // Cyrillic X
  },

  // Remove dangerous invisible characters
  invisibleChars: (content) => {
    return content
      .replace(/\u200B/g, '')  // Zero-width space
      .replace(/\u200C/g, '')  // Zero-width non-joiner
      .replace(/\u200D/g, '')  // Zero-width joiner
      .replace(/\u2060/g, '')  // Word joiner
      .replace(/\uFEFF/g, '')  // Zero-width no-break space
      .replace(/\u00A0/g, ' ') // Non-breaking space -> regular space
      .replace(/\u202A/g, '')  // Left-to-right embedding
      .replace(/\u202B/g, '')  // Right-to-left embedding
      .replace(/\u202C/g, '')  // Pop directional formatting
      .replace(/\u202D/g, '')  // Left-to-right override
      .replace(/\u202E/g, ''); // Right-to-left override
  }
};

/**
 * Fix a single file
 */
async function fixFile(filePath) {
  try {
    console.log(`🔧 Processing: ${path.relative(process.cwd(), filePath)}`);

    // Read file
    const originalContent = await fs.readFile(filePath, 'utf8');
    let content = originalContent;

    // Apply all fixes
    content = FIXES.trailingSpaces(content);
    content = FIXES.smartQuotes(content);
    content = FIXES.homoglyphs(content);
    content = FIXES.invisibleChars(content);

    // Check if changes were made
    if (content !== originalContent) {
      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, originalContent, 'utf8');

      // Write fixed content
      await fs.writeFile(filePath, content, 'utf8');

      console.log(`   ✅ Fixed - backup: ${path.basename(backupPath)}`);
      return 1;
    } else {
      console.log(`   ℹ️  No changes needed`);
      return 0;
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return 0;
  }
}

/**
 * Find files to fix
 */
async function findFiles(dir = '.', extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md']) {
  const files = [];

  async function scanDir(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip common directories
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Cannot scan ${currentDir}: ${error.message}`);
    }
  }

  await scanDir(dir);
  return files;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('📂 Finding files to fix...');

    const files = await findFiles();
    console.log(`   Found ${files.length} files to process`);

    if (files.length === 0) {
      console.log('❌ No files found to fix');
      return;
    }

    // Ask for confirmation
    const autoFix = process.argv.includes('--auto-fix');
    if (!autoFix) {
      console.log(`\n🤔 Process ${files.length} files?`);
      console.log('   This will fix: trailing spaces, smart quotes, homoglyphs, invisible chars');
      console.log('   Backups will be created for all modified files');
      console.log('');
      console.log('💡 To proceed automatically, run:');
      console.log('   node simple-manual-fix.js --auto-fix');
      return;
    }

    console.log('\n🛠️ Applying fixes...');

    let filesFixed = 0;
    for (const filePath of files) {
      const fixed = await fixFile(filePath);
      filesFixed += fixed;
    }

    console.log(`\n🎉 Manual fix complete!`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files modified: ${filesFixed}`);
    console.log(`   Files unchanged: ${files.length - filesFixed}`);

    if (filesFixed > 0) {
      console.log(`\n🔄 Next steps:`);
      console.log(`   1. Review the changes with git diff`);
      console.log(`   2. Run scanner again to verify fixes:`);
      console.log(`      node cli/simple-cli.js --output post-fix-scan.json`);
      console.log(`   3. Commit the fixes if satisfied`);
    }

  } catch (error) {
    console.error('❌ Manual fix failed:', error.message);
    process.exit(1);
  }
}

main();