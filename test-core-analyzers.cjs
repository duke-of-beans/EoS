const fs = require('fs').promises;
const path = require('path');

console.log('🔬 Testing Eye of Sauron Core Analyzers\n');

async function testAnalyzers() {
    try {
        // Test 1: Character Forensics
        console.log('1️⃣ Testing Character Forensics...');
        try {
            const { CharacterForensics } = require('./core/CharacterForensics.js');
            const cf = new CharacterForensics({
                enableHomoglyphDetection: true,
                enableTrailingSpaceDetection: true,
                enableSmartQuoteDetection: true
            });

            // Test with problematic code
            const testCode1 = 'const a = 5; // Cyrillic "a"';
            const testCode2 = 'const test = "value"  ; // trailing spaces';
            const testCode3 = 'const quote = "smart quotes"';

            const issues1 = await cf.analyze(testCode1, 'test1.js');
            const issues2 = await cf.analyze(testCode2, 'test2.js');
            const issues3 = await cf.analyze(testCode3, 'test3.js');

            console.log('   ✅ Character Forensics loaded');
            console.log(`   Found ${issues1.length + issues2.length + issues3.length} issues in test code`);

        } catch (e) {
            console.log('   ❌ Character Forensics error:', e.message);
        }

        // Test 2: Pattern Precognition
        console.log('\n2️⃣ Testing Pattern Precognition...');
        try {
            const { PatternPrecognition } = require('./core/PatternPrecognition.js');
            const pp = new PatternPrecognition({
                enforceContracts: true,
                detectMemoryLeaks: true,
                detectConsoleUsage: true
            });

            // Test with component code
            const componentCode = `
class MyComponent extends Component {
    componentDidMount() {
        console.log('Component mounted');
        this.timer = setInterval(() => {}, 1000);
    }
    // Missing componentWillUnmount - memory leak!
}`;

            const issues = await pp.detect(componentCode, 'component.js');
            console.log('   ✅ Pattern Precognition loaded');
            console.log(`   Found ${issues.length} pattern issues`);

        } catch (e) {
            console.log('   ❌ Pattern Precognition error:', e.message);
        }

        // Test 3: Run full scan with core
        console.log('\n3️⃣ Testing EyeOfSauronOmniscient...');
        try {
            const { EyeOfSauronOmniscient } = require('./core/EyeOfSauronOmniscient.js');

            // Create scanner with explicit configuration
            const scanner = new EyeOfSauronOmniscient({
                // Force enable all analyzers
                enableCharacterForensics: true,
                enablePatternPrecognition: true,
                enableMemoryLeakDetection: true,
                enableDependencyAnalysis: true,

                // Verbose output
                verbose: true,
                aggregateSimilarIssues: false,

                // Don't scan node_modules or test files
                exclude: ['node_modules', '**/*.test.js', '**/test/**'],

                // Specific file types
                include: ['**/*.js', '**/*.jsx']
            });

            console.log('   ✅ Scanner created successfully');
            console.log('   Running limited scan on core directory...\n');

            const report = await scanner.scan('./core', 'comprehensive');

            console.log('📊 Scan Results:');
            console.log(`   Total Files: ${report.summary?.totalFiles || 0}`);
            console.log(`   Total Issues: ${report.summary?.totalIssues || 0}`);
            console.log(`   Critical Issues: ${report.summary?.criticalIssues || 0}`);

            // Check analyzer status
            if (report.results) {
                console.log('\n🔍 Analyzer Status:');
                Object.entries(report.results).forEach(([name, data]) => {
                    console.log(`   ${name}: ${data.enabled ? 'ENABLED' : 'DISABLED'} - ${data.issues} issues`);
                });
            }

            // Save the report
            await fs.writeFile('core-analyzer-test.json', JSON.stringify(report, null, 2));
            console.log('\n💾 Full report saved to: core-analyzer-test.json');

            // Show some actual issues
            if (report.files && report.files.length > 0) {
                console.log('\n📋 Sample Issues:');
                let issueCount = 0;
                report.files.forEach(file => {
                    if (file.issues && file.issues.length > 0) {
                        file.issues.slice(0, 2).forEach(issue => {
                            issueCount++;
                            if (issueCount <= 5) {
                                console.log(`   ${issue.severity || 'INFO'}: ${file.path} - ${issue.message || issue.type}`);
                            }
                        });
                    }
                });
            }

        } catch (e) {
            console.log('   ❌ Scanner error:', e.message);
            console.log('   Stack:', e.stack);
        }

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

// Test individual analyzer files exist
async function checkAnalyzerFiles() {
    console.log('\n📁 Checking analyzer files...');
    const files = [
        './core/CharacterForensics.js',
        './core/PatternPrecognition.js',
        './core/EyeOfSauronOmniscient.js',
        './core/MemoryLeakDetector.js'
    ];

    for (const file of files) {
        try {
            await fs.access(file);
            console.log(`   ✅ ${file} exists`);
        } catch (e) {
            console.log(`   ❌ ${file} NOT FOUND`);
        }
    }
}

// Run all tests
checkAnalyzerFiles()
    .then(() => testAnalyzers())
    .catch(console.error);