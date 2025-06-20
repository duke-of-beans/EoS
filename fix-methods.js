#!/usr/bin/env node

/**
 * Fix CLI Method Names
 * Changes scanPath() calls to scan() calls
 */

const fs = require('fs').promises;

async function fixMethodNames() {
  const files = [
    'sauron-cli.mjs',
    'cli/simple-cli.js'
  ];

  for (const filePath of files) {
    try {
      console.log(`🔧 Fixing method names in ${filePath}...`);

      const content = await fs.readFile(filePath, 'utf8');

      // Fix the method call: scanPath → scan
      const fixedContent = content.replace(
        /\.scanPath\(/g,
        '.scan('
      );

      if (content !== fixedContent) {
        await fs.writeFile(filePath, fixedContent);
        console.log(`✅ Fixed ${filePath} - changed scanPath() to scan()`);
      } else {
        console.log(`ℹ️  ${filePath} - no changes needed`);
      }

    } catch (error) {
      console.log(`⚠️  Could not fix ${filePath}: ${error.message}`);
    }
  }

  console.log('\n🎯 All CLI method names fixed!');
  console.log('Test with:');
  console.log('  node sauron-cli.mjs . --output test-root.json');
  console.log('  node cli/simple-cli.js . --output test-cli.json');
}

fixMethodNames().catch(console.error);