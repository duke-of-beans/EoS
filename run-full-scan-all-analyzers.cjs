// run-full-scan-all-analyzers.cjs - Run a COMPLETE scan with ALL analyzers
const fs = require('fs');

console.log('🚀 Running FULL Eye of Sauron Scan with ALL Analyzers\n');

async function runFullScan() {
    try {
        const { EyeOfSauronOmniscient } = require('./core/EyeOfSauronOmniscient.js');

        // Create scanner with EVERYTHING enabled
        const scanner = new EyeOfSauronOmniscient({
            // Core analyzers - FORCE ENABLE
            enableCharacterForensics: true,
            enablePatternPrecognition: true,
            enableMemoryLeakDetection: true,
            enableDependencyAnalysis: true,
            enableBuiltInAnalyzers: true,

            // Character Forensics settings
            characterForensics: {
                enabled: true,
                enableHomoglyphDetection: true,
                enableTrailingSpaceDetection: true,
                enableSmartQuoteDetection: true,
                enableInvisibleCharDetection: true,
                enableMixedEncodingDetection: true
            },

            // Pattern Precognition settings
            patternPrecognition: {
                enabled: true,
                enforceContracts: true,
                detectMemoryLeaks: true,
                detectConsoleUsage: true,
                detectSecurityPatterns: true,
                contractMode: 'strict'
            },

            // Memory Leak settings
            memoryLeakDetection: {
                enabled: true,
                checkEventListeners: true,
                checkTimers: true,
                checkClosures: true,
                checkReactComponents: true
            },

            // Dependency Analysis
            dependencyAnalysis: {
                enabled: true,
                checkVulnerabilities: true,
                checkOutdated: true,
                checkLicenses: true
            },

            // Output settings
            verbose: true,
            aggregateSimilarIssues: false,  // Show ALL issues
            showAllIssues: true,
            includeHiddenIssues: true,

            // Severity settings
            reportCriticalOnly: false,  // Show everything
            severityThreshold: 'info',  // Lowest threshold

            // Don't skip anything
            skipTests: false,
            skipComments: false,
            skipStrings: false
        });

        console.log('✅ Scanner configured with ALL analyzers enabled\n');
        console.log('🔍 Starting comprehensive scan...\n');

        // Scan the entire project
        const report = await scanner.scan('.', 'comprehensive');

        console.log('📊 COMPLETE SCAN RESULTS:');
        console.log('='.repeat(50));
        console.log(`Total Files: ${report.summary?.totalFiles || 0}`);
        console.log(`Total Issues: ${report.summary?.totalIssues || 0}`);
        console.log(`CRITICAL Issues: ${report.summary?.criticalIssues || 0} 🚨`);
        console.log(`Warning Issues: ${report.summary?.warningIssues || 0}`);
        console.log(`Info Issues: ${report.summary?.infoIssues || 0}`);

        // Analyzer breakdown
        if (report.results) {
            console.log('\n🔍 Analyzer Breakdown:');
            console.log('-'.repeat(50));
            Object.entries(report.results).forEach(([name, data]) => {
                console.log(`${name}:`);
                console.log(`  Status: ${data.enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
                console.log(`  Issues Found: ${data.issues}`);
                if (data.critical) {
                    console.log(`  Critical: ${data.critical} 🚨`);
                }
            });
        }

        // Find critical issues
        const criticalIssues = [];
        if (report.files) {
            Object.values(report.files).forEach(file => {
                if (file.issues) {
                    file.issues.forEach(issue => {
                        if (issue.severity === 'CRITICAL' || issue.severity === 'critical') {
                            criticalIssues.push({
                                file: file.path || file.filePath,
                                ...issue
                            });
                        }
                    });
                }
            });
        }

        if (criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES FOUND:');
            console.log('='.repeat(50));
            criticalIssues.forEach((issue, i) => {
                console.log(`\n${i + 1}. ${issue.file}`);
                console.log(`   Type: ${issue.type}`);
                console.log(`   Message: ${issue.message || issue.description}`);
                console.log(`   Line: ${issue.line || 'N/A'}`);
            });
        }

        // Save full report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `full-scan-all-analyzers-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        console.log(`\n💾 Full report saved to: ${filename}`);

        // Check if we found the expected pattern
        if (report.summary?.totalIssues === 15 && report.summary?.criticalIssues === 3) {
            console.log('\n🎯 FOUND THE ORIGINAL 15 ISSUES PATTERN!');
        }

    } catch (error) {
        console.error('❌ Scan failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Also test specific files
async function testSpecificIssues() {
    console.log('\n\n🧪 Testing Specific Issue Detection...\n');

    // Create test files with known issues
    const testFiles = {
        'test-homoglyph.js': `
// CRITICAL: Security risk - homoglyphs
const password = "admin123";  // Cyrillic 'p' and 'a'
const password = "admin123";   // Latin letters
`,
        'test-memory-leak.js': `
// CRITICAL: Memory leak
class LeakyComponent extends Component {
    componentDidMount() {
        this.timer = setInterval(() => this.update(), 1000);
        window.addEventListener('scroll', this.onScroll);
    }
    // Missing componentWillUnmount!
}
`,
        'test-security.js': `
// CRITICAL: Security issues
eval(userInput);  // Code injection risk
const apiKey = "sk-1234567890abcdef";  // Hardcoded secret
`
    };

    // Write test files
    Object.entries(testFiles).forEach(([filename, content]) => {
        fs.writeFileSync(filename, content);
    });

    console.log('Created test files with known critical issues');
    console.log('Run the full scan to see if they\'re detected!');
}

// Run everything
testSpecificIssues();
runFullScan();