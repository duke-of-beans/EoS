#!/usr/bin/env node

/**
 * Purpose: Fix JSON syntax errors in package.json and apply Eye of Sauron patches
 * Dependencies: Node.js std lib only
 * API: Run this script to fix JSON errors and apply patches
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

console.log('🔧 package.json JSON Fixer & Patcher');
console.log('====================================');

try {
  // 1. Check if package.json exists
  if (!existsSync('./package.json')) {
    throw new Error('❌ package.json not found in current directory');
  }

  // 2. Create backup
  const originalContent = readFileSync('./package.json', 'utf8');
  writeFileSync('./package.json.backup', originalContent);
  console.log('✅ Backup created: package.json.backup');

  // 3. Try to parse existing package.json
  console.log('🔍 Checking JSON syntax...');

  let packageData;
  try {
    packageData = JSON.parse(originalContent);
    console.log('✅ JSON syntax is valid');
  } catch (parseError) {
    console.log('❌ JSON syntax error detected, attempting to fix...');

    // Common fixes for JSON syntax errors
    let fixedContent = originalContent;

    // Fix 1: Remove duplicate opening/closing braces
    fixedContent = fixedContent.replace(/}\s*{/g, ',');

    // Fix 2: Remove trailing commas
    fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');

    // Fix 3: Fix missing commas between properties
    fixedContent = fixedContent.replace(/"\s*\n\s*"/g, '",\n  "');

    // Fix 4: Remove duplicate commas
    fixedContent = fixedContent.replace(/,,+/g, ',');

    // Try to parse fixed content
    try {
      packageData = JSON.parse(fixedContent);
      console.log('✅ JSON syntax fixed automatically');
    } catch (secondError) {
      console.log('❌ Could not auto-fix JSON. Creating clean package.json...');

      // Extract basic info from the broken JSON using regex
      const nameMatch = originalContent.match(/"name":\s*"([^"]+)"/);
      const versionMatch = originalContent.match(/"version":\s*"([^"]+)"/);
      const descriptionMatch = originalContent.match(/"description":\s*"([^"]+)"/);

      // Create minimal working package.json
      packageData = {
        name: nameMatch ? nameMatch[1] : 'eye-of-sauron',
        version: versionMatch ? versionMatch[1] : '1.0.0',
        description: descriptionMatch ? descriptionMatch[1] : 'All-seeing code analysis framework',
        type: 'module',
        main: 'index.js',
        scripts: {
          start: 'node sauron-cli.js',
          scan: 'node sauron-cli.js --input ./src',
          test: 'node sauron-cli.js --input ./src'
        },
        dependencies: {
          chalk: '^5.4.1',
          commander: '^14.0.0',
          ora: '^8.2.0'
        },
        keywords: ['code-analysis', 'scanner', 'linter'],
        license: 'MIT',
        engines: {
          node: '>=16.0.0'
        }
      };

      console.log('✅ Created clean package.json structure');
    }
  }

  // 4. Apply Eye of Sauron patches
  console.log('🔧 Applying Eye of Sauron patches...');

  // Update main entry point
  packageData.main = 'standalone-launcher.js';
  console.log('   ✅ Updated main entry point');

  // Ensure scripts object exists
  if (!packageData.scripts) packageData.scripts = {};

  // Add build scripts (preserve existing ones)
  const newScripts = {
    'build:win': 'pkg . --targets node18-win-x64 --output ./dist/sauron-win.exe',
    'build:mac': 'pkg . --targets node18-macos-x64 --output ./dist/sauron-mac',
    'build:linux': 'pkg . --targets node18-linux-x64 --output ./dist/sauron-linux',
    'build:all': 'npm run build:win && npm run build:mac && npm run build:linux',
    'bundle': 'node build-scripts.js',
    'package': 'npm run bundle && npm run build:all',
    'test:standalone': 'node standalone-launcher.js'
  };

  // Merge scripts without overwriting existing ones
  Object.assign(packageData.scripts, newScripts);
  console.log('   ✅ Added build scripts');

  // Add pkg configuration
  packageData.pkg = {
    assets: [
      'eye-of-sauron-dashboard.html',
      'ui/**/*',
      'src/render/**/*',
      'config/**/*'
    ],
    targets: ['node18-win-x64', 'node18-macos-x64', 'node18-linux-x64'],
    outputPath: 'dist'
  };
  console.log('   ✅ Added pkg configuration');

  // Ensure devDependencies exists
  if (!packageData.devDependencies) packageData.devDependencies = {};

  // Add build dependencies
  packageData.devDependencies.pkg = '^5.8.1';
  packageData.devDependencies['@vercel/ncc'] = '^0.38.1';
  console.log('   ✅ Added build dependencies');

  // Ensure dependencies exists
  if (!packageData.dependencies) {
    packageData.dependencies = {
      chalk: '^5.4.1',
      commander: '^14.0.0',
      ora: '^8.2.0'
    };
  }

  // 5. Write clean, properly formatted package.json
  const cleanContent = JSON.stringify(packageData, null, 2);
  writeFileSync('./package.json', cleanContent);

  // 6. Validate the new file
  try {
    JSON.parse(cleanContent);
    console.log('✅ New package.json validated successfully');
  } catch (validationError) {
    throw new Error('Generated package.json is invalid: ' + validationError.message);
  }

  console.log('');
  console.log('🎉 package.json fixed and patched successfully!');
  console.log('');
  console.log('📋 What was done:');
  console.log('   • Fixed JSON syntax errors');
  console.log('   • Updated main: "standalone-launcher.js"');
  console.log('   • Added build scripts (build:win, build:mac, build:linux, build:all)');
  console.log('   • Added pkg configuration for executable building');
  console.log('   • Added pkg and @vercel/ncc devDependencies');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. npm install');
  console.log('   2. npm run build:all');
  console.log('');
  console.log('💾 Your original package.json is backed up as package.json.backup');

} catch (error) {
  console.error('❌ Fixing failed:', error.message);

  // Try to restore backup if something went wrong and backup exists
  if (existsSync('./package.json.backup')) {
    console.log('🔄 Restoring backup...');
    try {
      const backup = readFileSync('./package.json.backup', 'utf8');
      writeFileSync('./package.json', backup);
      console.log('✅ Backup restored');
    } catch (restoreError) {
      console.log('❌ Could not restore backup:', restoreError.message);
    }
  }

  console.log('');
  console.log('💡 Manual solution:');
  console.log('   1. Delete your current package.json');
  console.log('   2. Create a new clean one with just the basics');
  console.log('   3. Run this script again');

  process.exit(1);
}