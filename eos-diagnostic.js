#!/usr/bin/env node

/**
 * Eye of Sauron Diagnostic & Fix Script
 * This script will help diagnose and fix the analyzer configuration issues
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🔍 Eye of Sauron Diagnostic Tool\n');

async function findEOSDirectory() {
    // Try to find the Eye of Sauron directory
    const possiblePaths = [
        './eye-of-sauron',
        '.',
        '../eye-of-sauron',
        './node_modules/eye-of-sauron'
    ];

    for (const dir of possiblePaths) {
        try {
            const stats = await fs.stat(path.join(dir, 'core', 'EyeOfSauronOmniscient.js'));
            if (stats.isFile()) {
                console.log(`✅ Found Eye of Sauron at: ${dir}`);
                return dir;
            }
        } catch (e) {
            // Continue searching
        }
    }

    console.error('❌ Could not find Eye of Sauron installation');
    return null;
}

async function checkConfiguration(eosDir) {
    console.log('\n📋 Checking Configuration Files...\n');

    const configFiles = [
        'eos.config.json',
        'bulletproof-operational-configs.json',
        '.sauronrc.json'
    ];

    let configFound = false;

    for (const configFile of configFiles) {
        try {
            const configPath = path.join(eosDir, configFile);
            const content = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(content);

            console.log(`📄 ${configFile}:`);
            console.log(JSON.stringify(config, null, 2));
            configFound = true;

            // Check if analyzers are disabled
            if (config.analyzers || config.enableCharacterForensics !== undefined) {
                console.log('\n⚠️  Analyzer Configuration Found!');
                if (config.enableCharacterForensics === false ||
                    config.enablePatternPrecognition === false) {
                    console.log('❌ Some analyzers are DISABLED');
                }
            }
        } catch (e) {
            console.log(`❌ ${configFile}: Not found or invalid`);
        }
    }

    if (!configFound) {
        console.log('\n⚠️  No configuration files found. Creating default config...');
        await createDefaultConfig(eosDir);
    }
}

async function createDefaultConfig(eosDir) {
    const defaultConfig = {
        scanProfile: "comprehensive",
        allowConsole: false,
        skipTests: true,
        enableCharacterForensics: true,
        enablePatternPrecognition: true,
        enableMemoryLeakDetection: true,
        enableDependencyAnalysis: true,
        contractMode: "smart",
        aggregateSimilarIssues: true,
        maxSimilarIssues: 10,
        analyzers: {
            characterForensics: {
                enabled: true,
                enableHomoglyphDetection: true,
                enableTrailingSpaceDetection: true,
                enableSmartQuoteDetection: true
            },
            patternPrecognition: {
                enabled: true,
                enforceContracts: true,
                detectMemoryLeaks: true,
                detectConsoleUsage: true,
                onlyEnforceForComponents: true
            },
            memoryLeakDetection: {
                enabled: true,
                sensitivity: "high"
            },
            dependencyAnalysis: {
                enabled: true,
                checkOutdated: true,
                checkVulnerabilities: true
            }
        }
    };

    try {
        await fs.writeFile(
            path.join(eosDir, 'eos.config.json'),
            JSON.stringify(defaultConfig, null, 2)
        );
        console.log('✅ Created default configuration with all analyzers ENABLED');
    } catch (e) {
        console.error('❌ Failed to create config:', e.message);
    }
}

async function runComprehensiveScan(eosDir) {
    console.log('\n🚀 Running Comprehensive Scan...\n');

    const scanCommand = `
// Manual scan with all analyzers enabled
const { EyeOfSauronOmniscient } = require('${path.join(eosDir, 'core/EyeOfSauronOmniscient.js')}');

const scanner = new EyeOfSauronOmniscient({
    enableCharacterForensics: true,
    enablePatternPrecognition: true,
    enableMemoryLeakDetection: true,
    enableDependencyAnalysis: true,
    verbose: true,
    aggregateSimilarIssues: false // Show all issues
});

async function scan() {
    try {
        const report = await scanner.scan('${eosDir}', 'comprehensive');

        console.log('\\n📊 SCAN RESULTS:');
        console.log('Total Files:', report.summary.totalFiles);
        console.log('Total Issues:', report.summary.totalIssues);
        console.log('Critical Issues:', report.summary.criticalIssues);
        console.log('Warning Issues:', report.summary.warningIssues);

        console.log('\\n🔍 ANALYZER RESULTS:');
        Object.entries(report.results).forEach(([analyzer, data]) => {
            console.log(\`\\n\${analyzer}:\`);
            console.log('  Enabled:', data.enabled);
            console.log('  Issues Found:', data.issues);

            if (data.details && data.details.length > 0) {
                console.log('  First 5 issues:');
                data.details.slice(0, 5).forEach((issue, i) => {
                    console.log(\`    \${i + 1}. \${issue.file}: \${issue.message} (Line \${issue.line})\`);
                });
            }
        });

        // Save detailed report
        await require('fs').promises.writeFile(
            'eos-diagnostic-report.json',
            JSON.stringify(report, null, 2)
        );
        console.log('\\n✅ Full report saved to: eos-diagnostic-report.json');

    } catch (error) {
        console.error('❌ Scan failed:', error);
    }
}

scan();
`;

    console.log('📝 Scan Command:');
    console.log(scanCommand);
    console.log('\n💡 To run this scan:');
    console.log('1. Save the above code to a file (e.g., run-scan.js)');
    console.log('2. Run: node run-scan.js');
}

async function suggestCLICommands(eosDir) {
    console.log('\n🛠️  Suggested CLI Commands:\n');

    const commands = [
        {
            desc: 'Run scan with all analyzers enabled',
            cmd: 'npx sauron scan . --enable-all --verbose'
        },
        {
            desc: 'Run scan with specific analyzers',
            cmd: 'npx sauron scan . --analyzers characterForensics,patternPrecognition,memoryLeakDetection --verbose'
        },
        {
            desc: 'Run comprehensive scan with detailed output',
            cmd: 'npx sauron scan . --mode comprehensive --output detailed-report.json --format json'
        },
        {
            desc: 'Check current configuration',
            cmd: 'npx sauron config --show'
        },
        {
            desc: 'Enable all analyzers in config',
            cmd: 'npx sauron config --enable-all-analyzers'
        }
    ];

    commands.forEach(({ desc, cmd }) => {
        console.log(`📌 ${desc}:`);
        console.log(`   ${cmd}\n`);
    });
}

// Main diagnostic flow
async function main() {
    const eosDir = await findEOSDirectory();
    if (!eosDir) {
        return;
    }

    await checkConfiguration(eosDir);
    await runComprehensiveScan(eosDir);
    await suggestCLICommands(eosDir);

    console.log('\n✨ Diagnostic Complete!\n');
    console.log('🔧 Next Steps:');
    console.log('1. Ensure eos.config.json has all analyzers enabled');
    console.log('2. Run the comprehensive scan command');
    console.log('3. Check the detailed report for all issues');
    console.log('4. The 3 critical issues should appear in the detailed output');
}

// Run the diagnostic
main().catch(console.error);