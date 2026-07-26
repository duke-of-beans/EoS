// find-original-15-issues.cjs - Find the original scan configuration
const fs = require('fs');

console.log('🔍 Finding the Original 15 Issues (3 Critical)\n');

console.log('Original scan had:');
console.log('- Character Forensics: 3 issues');
console.log('- Pattern Precognition: 7 issues');
console.log('- Memory Leak Detection: 1 issue');
console.log('- Dependency Analysis: 0 issues');
console.log('- Total: 15 issues (3 critical)\n');

// Check all existing scan files for this pattern
const scanFiles = fs.readdirSync('.').filter(f => f.endsWith('.json'));

console.log('Searching scan files for the 15-issue configuration...\n');

scanFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(content);

        // Check if this has the 15/3 pattern
        if (data.summary?.totalIssues === 15 && data.summary?.criticalIssues === 3) {
            console.log(`✅ FOUND! ${file} has 15 issues (3 critical)`);

            if (data.results) {
                console.log('  Analyzer breakdown:');
                Object.entries(data.results).forEach(([name, info]) => {
                    console.log(`    ${name}: ${info.issues} issues (${info.enabled ? 'enabled' : 'DISABLED'})`);
                });
            }

            // Check scan configuration
            if (data.scanId) {
                console.log(`  Scan ID: ${data.scanId}`);
                console.log(`  Timestamp: ${data.timestamp}`);
                console.log(`  Mode: ${data.mode}`);
            }
        }

        // Also check for disabled analyzers with issues
        if (data.results) {
            let hasDisabledWithIssues = false;
            Object.entries(data.results).forEach(([name, info]) => {
                if (!info.enabled && info.issues > 0) {
                    hasDisabledWithIssues = true;
                }
            });

            if (hasDisabledWithIssues) {
                console.log(`\n⚠️  ${file} has DISABLED analyzers with issues detected!`);
                Object.entries(data.results).forEach(([name, info]) => {
                    if (!info.enabled && info.issues > 0) {
                        console.log(`    ${name}: ${info.issues} issues but DISABLED`);
                    }
                });
            }
        }
    } catch (e) {
        // Skip files that can't be parsed
    }
});

// Test the analyzers with specific issue types
console.log('\n\n🧪 Testing for Critical Issue Types...\n');

async function testCriticalIssues() {
    try {
        const { CharacterForensics } = require('./core/CharacterForensics.js');
        const { PatternPrecognition } = require('./core/PatternPrecognition.js');

        // Test 1: Homoglyph detection (should be CRITICAL)
        console.log('1️⃣ Testing Homoglyph Detection (Critical Security Risk)...');
        const cf = new CharacterForensics({
            enableHomoglyphDetection: true,
            enableTrailingSpaceDetection: true,
            enableSmartQuoteDetection: true
        });

        const homoglyphCode = `
// Security risk - these look identical but aren't
const password = "secret123";  // Cyrillic 'a'
const password = "secret123";   // Latin 'a'
const τest = "value";          // Greek tau
`;

        const cfIssues = await cf.analyze(homoglyphCode, 'security-test.js');
        console.log(`   Found ${cfIssues.length} character forensics issues`);

        // Check severity
        const criticalCF = cfIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'critical');
        console.log(`   Critical: ${criticalCF.length}`);

        // Test 2: Memory Leak Detection (should be CRITICAL)
        console.log('\n2️⃣ Testing Memory Leak Detection...');
        const pp = new PatternPrecognition({
            enforceContracts: true,
            detectMemoryLeaks: true,
            detectConsoleUsage: true
        });

        const memoryLeakCode = `
class BadComponent extends Component {
    componentDidMount() {
        // CRITICAL: Timer never cleared
        this.interval = setInterval(() => {
            this.setState({ count: this.state.count + 1 });
        }, 100);

        // CRITICAL: Event listener never removed
        window.addEventListener('resize', this.onResize);
    }
    // CRITICAL: Missing componentWillUnmount!
}`;

        const ppIssues = await pp.detect(memoryLeakCode, 'memory-leak-test.js');
        console.log(`   Found ${ppIssues.length} pattern issues`);

        const criticalPP = ppIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'critical');
        console.log(`   Critical: ${criticalPP.length}`);

        // Show what makes issues critical
        if (cfIssues.length > 0) {
            console.log('\n📋 Sample Character Forensics Issue:');
            console.log(JSON.stringify(cfIssues[0], null, 2));
        }

        if (ppIssues.length > 0) {
            console.log('\n📋 Sample Pattern Precognition Issue:');
            console.log(JSON.stringify(ppIssues[0], null, 2));
        }

    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

testCriticalIssues();

console.log('\n\n💡 Next Steps:');
console.log('1. The original 15 issues are in a file with all analyzers DISABLED');
console.log('2. Critical issues are likely: homoglyphs, memory leaks, missing cleanup');
console.log('3. Current scans only find trailing spaces and console usage');
console.log('4. Need to enable FULL analyzer suite to find critical issues');