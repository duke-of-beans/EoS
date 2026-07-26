// examine-issue-structure.cjs - Understand why issues show as "undefined"
const fs = require('fs');

console.log('🔬 Examining Issue Structure\n');

// Check quick-test-results.json
try {
    const quickResults = JSON.parse(fs.readFileSync('quick-test-results.json', 'utf8'));
    console.log('📋 quick-test-results.json:');
    console.log(`Total issues: ${quickResults.summary?.totalIssues || 0}`);

    // Find an issue with content
    let foundIssue = false;
    if (quickResults.files) {
        for (const file of quickResults.files) {
            if (file.issues && file.issues.length > 0) {
                console.log(`\nFile: ${file.filePath}`);
                console.log('First issue structure:');
                console.log(JSON.stringify(file.issues[0], null, 2));
                foundIssue = true;
                break;
            }
        }
    }

    if (!foundIssue) {
        console.log('No issues found in files array');
    }
} catch (e) {
    console.log('Error reading quick-test-results.json:', e.message);
}

// Check core-analyzer-test.json
console.log('\n' + '='.repeat(50) + '\n');
try {
    const coreResults = JSON.parse(fs.readFileSync('core-analyzer-test.json', 'utf8'));
    console.log('📋 core-analyzer-test.json:');
    console.log(`Total issues: ${coreResults.summary?.totalIssues || 0}`);

    // Check analyzer results
    if (coreResults.results) {
        console.log('\nAnalyzer results:');
        Object.entries(coreResults.results).forEach(([name, data]) => {
            console.log(`${name}: ${data.enabled ? 'ENABLED' : 'DISABLED'} - ${data.issues} issues`);
        });
    }

    // Find issues with different structures
    if (coreResults.files) {
        const issueTypes = new Map();

        coreResults.files.forEach(file => {
            if (file.issues) {
                file.issues.forEach(issue => {
                    const key = Object.keys(issue).sort().join(',');
                    if (!issueTypes.has(key)) {
                        issueTypes.set(key, { count: 0, example: issue, file: file.filePath });
                    }
                    issueTypes.get(key).count++;
                });
            }
        });

        console.log(`\nFound ${issueTypes.size} different issue structures:`);
        let i = 1;
        issueTypes.forEach((data, keys) => {
            console.log(`\n${i}. Structure (${data.count} occurrences):`);
            console.log(`   Keys: ${keys}`);
            console.log(`   Example from: ${data.file}`);
            console.log(JSON.stringify(data.example, null, 2));
            i++;
        });
    }
} catch (e) {
    console.log('Error reading core-analyzer-test.json:', e.message);
}

// Test the analyzers directly with known bad code
console.log('\n' + '='.repeat(50) + '\n');
console.log('🧪 Direct Analyzer Test:\n');

try {
    const { CharacterForensics } = require('./core/CharacterForensics.js');
    const cf = new CharacterForensics({
        enableHomoglyphDetection: true,
        enableTrailingSpaceDetection: true,
        enableSmartQuoteDetection: true,
        aggregateSimilarIssues: false
    });

    // Test with file content
    if (fs.existsSync('test-all-issues.js')) {
        const testContent = fs.readFileSync('test-all-issues.js', 'utf8');
        cf.analyze(testContent, 'test-all-issues.js').then(issues => {
            console.log(`Character Forensics found ${issues.length} issues:`);
            issues.forEach((issue, i) => {
                console.log(`\n${i + 1}. Issue structure:`);
                console.log(JSON.stringify(issue, null, 2));
            });
        }).catch(e => {
            console.error('Analyze error:', e);
        });
    } else {
        console.log('Create test-all-issues.js first to test');
    }
} catch (e) {
    console.error('Failed to test analyzer:', e.message);
}