const fs = require('fs').promises;
const path = require('path');

console.log('🔍 Finding where CLI saves its 416 issues...\n');

async function findRecentFiles() {
    // Get all JSON files modified in the last hour
    const files = await fs.readdir('.');
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    console.log('📄 Recent JSON files (last hour):');

    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const stats = await fs.stat(file);
                if (stats.mtime.getTime() > oneHourAgo) {
                    const content = await fs.readFile(file, 'utf8');
                    const data = JSON.parse(content);

                    // Check if this might be the 416 issue file
                    const issueCount = data.summary?.totalIssues ||
                                     data.totalIssues ||
                                     data.issues?.length ||
                                     (data.files ? data.files.reduce((sum, f) => sum + (f.issues?.length || 0), 0) : 0);

                    console.log(`\n${file}:`);
                    console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
                    console.log(`  Size: ${stats.size} bytes`);
                    console.log(`  Issues: ${issueCount}`);

                    // If it has many issues, investigate further
                    if (issueCount > 100) {
                        console.log('  ⚠️  This might be the CLI output!');

                        // Check for undefined messages
                        let undefinedCount = 0;
                        if (data.files) {
                            data.files.forEach(f => {
                                if (f.issues) {
                                    f.issues.forEach(issue => {
                                        if (!issue.message || issue.message === 'undefined') {
                                            undefinedCount++;
                                        }
                                    });
                                }
                            });
                        }
                        if (undefinedCount > 0) {
                            console.log(`  🔍 Found ${undefinedCount} undefined messages!`);
                        }
                    }
                }
            } catch (e) {
                // Skip files that can't be parsed
            }
        }
    }
}

async function checkCliCode() {
    console.log('\n📝 Checking CLI code for output location...');

    try {
        const cliContent = await fs.readFile('sauron-cli.js', 'utf8');

        // Look for where it saves files
        const lines = cliContent.split('\n');
        const outputLines = lines.filter(line =>
            line.includes('writeFile') ||
            line.includes('output') ||
            line.includes('.json') ||
            line.includes('report')
        );

        console.log('\nFound output-related code:');
        outputLines.slice(0, 10).forEach(line => {
            console.log(`  ${line.trim()}`);
        });

    } catch (e) {
        console.log('Could not read sauron-cli.js');
    }
}

async function checkLogFiles() {
    console.log('\n📋 Checking for log files...');

    const possibleLogs = [
        'sauron.log',
        'eye-of-sauron.log',
        'scan.log',
        '.sauron-scan-cache.json',
        'debug.log'
    ];

    for (const logFile of possibleLogs) {
        try {
            const stats = await fs.stat(logFile);
            console.log(`  ✅ Found ${logFile} (${stats.size} bytes)`);
        } catch (e) {
            // File doesn't exist
        }
    }
}

// Run all checks
Promise.all([
    findRecentFiles(),
    checkCliCode(),
    checkLogFiles()
]).then(() => {
    console.log('\n💡 Next Steps:');
    console.log('1. Run the test-core-analyzers.cjs script to test analyzers directly');
    console.log('2. Check if any of the files above contain the 416 issues');
    console.log('3. The CLI might be outputting to console only (not saving to file)');
}).catch(console.error);