#!/usr/bin/env node

/**
 * Eye of Sauron Auto-Cleanup Script
 * Fixes homoglyphs and console statements found by the scanner
 *
 * Usage: node sauron-cleanup.js [options]
 *
 * Options:
 *   --dry-run     Show what would be fixed without making changes
 *   --backup      Create backup files before fixing (default: true)
 *   --console     How to handle console statements: remove|guard|skip (default: guard)
 *   --homoglyphs  Fix homoglyphs: true|false (default: true)
 *   --files       Comma-separated list of files to fix (default: all detected)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
    dryRun: process.argv.includes('--dry-run'),
    backup: !process.argv.includes('--no-backup'),
    consoleMode: getArgValue('--console', 'guard'), // remove, guard, skip
    fixHomoglyphs: !process.argv.includes('--no-homoglyphs'),
    targetFiles: getArgValue('--files', '').split(',').filter(Boolean),
    backupDir: './backups-' + new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
};

// Homoglyph mapping - dangerous lookalike characters
const HOMOGLYPH_MAP = {
    // Cyrillic to Latin
    'a': 'a', 'e': 'e', 'o': 'o', 'p': 'p', 'c': 'c', 'y': 'y', 'x': 'x',
    'A': 'A', 'B': 'B', 'E': 'E', 'K': 'K', 'M': 'M', 'H': 'H', 'O': 'O',
    'P': 'P', 'C': 'C', 'T': 'T', 'Y': 'Y', 'X': 'X',

    // Greek to Latin
    'α': 'a', 'β': 'b', 'γ': 'y', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'n',
    'θ': 'o', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'u', 'ν': 'v', 'ξ': 'e',
    'ο': 'o', 'π': 'n', 'ρ': 'p', 'σ': 'o', 'τ': 't', 'υ': 'u', 'φ': 'o',
    'χ': 'x', 'ψ': 'w', 'ω': 'w',

    // Special characters
    '‒': '-', '–': '-', '—': '-', '―': '-', // various dashes
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', // smart quotes
    '　': ' ', // full-width space
    '，': ',', '。': '.', '；': ';', '：': ':', // full-width punctuation

    // Zero-width and invisible characters
    '\u200B': '', // Zero Width Space
    '\u200C': '', // Zero Width Non-Joiner
    '\u200D': '', // Zero Width Joiner
    '\u2060': '', // Word Joiner
    '\uFEFF': '', // Zero Width No-Break Space (BOM)
    '\u00A0': ' ', // Non-Breaking Space
};

// Files to fix based on scan results
const PROBLEMATIC_FILES = [
    'EMERGENCY-CLEANUP.mjs',
    'quick-verify.mjs',
    'real-api-server.mjs',
    'simple-scanner.mjs',
    'verify-cleanup.mjs',
    'working-scanner.mjs',
    'cli-direct-test.js',
    'corrected-sauron-cli.mjs',
    'deep-investigation.js',
    'emergency-fixed-cli.mjs',
    'entrypoint.js',
    'error-logger-example.js',
    'fix-methods.js',
    'install-corrected-working-cli.js',
    'investigate.js',
    'meta-diagnostics.mjs',
    'sauron-cli.mjs',
    'SauronCore.js',
    'serve-ui.mjs',
    'server.js',
    'simple-investigate.js',
    'simple-investigate.mjs',
    'simple-manual-fix.js',
    'simple-server.js',
    'step-by-step-test.js',
    'test-integration.js',
    'working-pattern-cli.js'
];

class SauronCleanup {
    constructor() {
        this.stats = {
            filesProcessed: 0,
            homoglyphsFixed: 0,
            consolesFixed: 0,
            backupsCreated: 0,
            errors: []
        };
    }

    async run() {
        console.log('🧹 Eye of Sauron Cleanup Script Starting...\n');
        console.log('Configuration:', CONFIG);
        console.log('');

        try {
            // Create backup directory if needed
            if (CONFIG.backup && !CONFIG.dryRun) {
                await fs.mkdir(CONFIG.backupDir, { recursive: true });
                console.log(`📦 Created backup directory: ${CONFIG.backupDir}\n`);
            }

            // Get files to process
            const filesToProcess = CONFIG.targetFiles.length > 0
                ? CONFIG.targetFiles
                : PROBLEMATIC_FILES;

            // Process each file
            for (const fileName of filesToProcess) {
                await this.processFile(fileName);
            }

            // Print summary
            this.printSummary();

        } catch (error) {
            console.error('💥 Fatal error:', error.message);
            process.exit(1);
        }
    }

    async processFile(fileName) {
        try {
            console.log(`🔍 Processing: ${fileName}`);

            // Check if file exists
            const filePath = path.resolve(fileName);
            try {
                await fs.access(filePath);
            } catch {
                console.log(`   ⚠️  File not found: ${fileName}`);
                return;
            }

            // Read file content
            const originalContent = await fs.readFile(filePath, 'utf8');
            let content = originalContent;
            let changes = [];

            // Fix homoglyphs
            if (CONFIG.fixHomoglyphs) {
                const homoglyphResult = this.fixHomoglyphs(content);
                content = homoglyphResult.content;
                if (homoglyphResult.count > 0) {
                    changes.push(`${homoglyphResult.count} homoglyphs fixed`);
                    this.stats.homoglyphsFixed += homoglyphResult.count;
                }
            }

            // Fix console statements
            if (CONFIG.consoleMode !== 'skip') {
                const consoleResult = this.fixConsoleStatements(content, CONFIG.consoleMode);
                content = consoleResult.content;
                if (consoleResult.count > 0) {
                    changes.push(`${consoleResult.count} console statements ${CONFIG.consoleMode}ed`);
                    this.stats.consolesFixed += consoleResult.count;
                }
            }

            // Apply changes
            if (content !== originalContent) {
                if (CONFIG.dryRun) {
                    console.log(`   📝 Would fix: ${changes.join(', ')}`);
                } else {
                    // Create backup
                    if (CONFIG.backup) {
                        const backupPath = path.join(CONFIG.backupDir, fileName + '.backup');
                        await fs.writeFile(backupPath, originalContent, 'utf8');
                        this.stats.backupsCreated++;
                    }

                    // Write fixed content
                    await fs.writeFile(filePath, content, 'utf8');
                    console.log(`   ✅ Fixed: ${changes.join(', ')}`);
                }
            } else {
                console.log(`   ✨ No issues found`);
            }

            this.stats.filesProcessed++;

        } catch (error) {
            console.log(`   ❌ Error processing ${fileName}: ${error.message}`);
            this.stats.errors.push({ file: fileName, error: error.message });
        }

        console.log('');
    }

    fixHomoglyphs(content) {
        let fixedContent = content;
        let count = 0;

        // Replace each homoglyph
        for (const [homoglyph, replacement] of Object.entries(HOMOGLYPH_MAP)) {
            const regex = new RegExp(homoglyph, 'g');
            const matches = content.match(regex);
            if (matches) {
                fixedContent = fixedContent.replace(regex, replacement);
                count += matches.length;
            }
        }

        return { content: fixedContent, count };
    }

    fixConsoleStatements(content, mode) {
        let fixedContent = content;
        let count = 0;

        // Patterns for different console statements
        const consolePatterns = [
            /console\.log\s*\([^)]*\)\s*;?/g,
            /console\.error\s*\([^)]*\)\s*;?/g,
            /console\.warn\s*\([^)]*\)\s*;?/g,
            /console\.info\s*\([^)]*\)\s*;?/g,
            /console\.debug\s*\([^)]*\)\s*;?/g,
            /console\.trace\s*\([^)]*\)\s*;?/g
        ];

        for (const pattern of consolePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                count += matches.length;

                if (mode === 'remove') {
                    // Remove console statements completely
                    fixedContent = fixedContent.replace(pattern, '');
                } else if (mode === 'guard') {
                    // Guard with NODE_ENV check
                    fixedContent = fixedContent.replace(pattern, (match) => {
                        const indent = this.getIndentation(content, content.indexOf(match));
                        return `${indent}if (process.env.NODE_ENV === 'development') {\n${indent}  ${match.trim()}\n${indent}}`;
                    });
                }
            }
        }

        // Clean up extra blank lines
        fixedContent = fixedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

        return { content: fixedContent, count };
    }

    getIndentation(content, position) {
        const lineStart = content.lastIndexOf('\n', position) + 1;
        const line = content.slice(lineStart, position);
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    }

    printSummary() {
        console.log('📊 CLEANUP SUMMARY');
        console.log('═'.repeat(50));
        console.log(`Files processed: ${this.stats.filesProcessed}`);
        console.log(`Homoglyphs fixed: ${this.stats.homoglyphsFixed}`);
        console.log(`Console statements fixed: ${this.stats.consolesFixed}`);
        if (CONFIG.backup) {
            console.log(`Backups created: ${this.stats.backupsCreated}`);
        }
        console.log(`Errors: ${this.stats.errors.length}`);

        if (this.stats.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.stats.errors.forEach(({ file, error }) => {
                console.log(`   ${file}: ${error}`);
            });
        }

        if (CONFIG.dryRun) {
            console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
        } else if (this.stats.homoglyphsFixed > 0 || this.stats.consolesFixed > 0) {
            console.log('\n🎉 Cleanup completed! Your code is now cleaner.');
            if (CONFIG.backup) {
                console.log(`💾 Backups saved in: ${CONFIG.backupDir}`);
            }
        } else {
            console.log('\n✨ No issues found to fix!');
        }
    }
}

// Utility function to get command line argument values
function getArgValue(argName, defaultValue) {
    const argIndex = process.argv.indexOf(argName);
    if (argIndex !== -1 && argIndex + 1 < process.argv.length) {
        return process.argv[argIndex + 1];
    }
    return defaultValue;
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🧹 Eye of Sauron Auto-Cleanup Script

Usage: node sauron-cleanup.js [options]

Options:
  --dry-run          Show what would be fixed without making changes
  --no-backup        Skip creating backup files
  --console MODE     How to handle console statements:
                     - remove: Delete console statements
                     - guard: Wrap in NODE_ENV check (default)
                     - skip: Leave console statements alone
  --no-homoglyphs    Skip fixing homoglyphs
  --files LIST       Comma-separated list of files to fix
  --help, -h         Show this help

Examples:
  node sauron-cleanup.js --dry-run
  node sauron-cleanup.js --console remove
  node sauron-cleanup.js --files "file1.js,file2.mjs"
`);
    process.exit(0);
}

// Run the cleanup
const cleanup = new SauronCleanup();
cleanup.run().catch(console.error);