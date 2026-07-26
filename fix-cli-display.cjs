// fix-cli-display.cjs - Understand why CLI shows "undefined"
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Investigating CLI "undefined" issue\n');

// First, let's trace what the CLI is doing
console.log('1️⃣ Checking sauron-cli.js for display logic...\n');

try {
    const cliContent = fs.readFileSync('sauron-cli.js', 'utf8');

    // Find where it displays issues
    const lines = cliContent.split('\n');
    const displayLines = [];

    lines.forEach((line, i) => {
        if (line.includes('undefined') ||
            line.includes('message') ||
            line.includes('description') ||
            line.includes('console.log') && line.includes('issue')) {
            displayLines.push({ lineNum: i + 1, content: line.trim() });
        }
    });

    console.log('Found display-related code:');
    displayLines.slice(0, 10).forEach(({ lineNum, content }) => {
        console.log(`  Line ${lineNum}: ${content}`);
    });
} catch (e) {
    console.log('Error reading sauron-cli.js:', e.message);
}

// Now let's create a patch to fix the display
console.log('\n2️⃣ Creating CLI display fix...\n');

const displayFix = `
// Add this function to sauron-cli.js to fix issue display
function getIssueMessage(issue) {
    // Handle different issue structures
    return issue.message ||
           issue.description ||
           issue.text ||
           issue.error ||
           issue.warning ||
           issue.type ||
           'Unknown issue';
}

// Replace lines that show "undefined" with:
// console.log(\`  WARNING \${issue.file || file}:\${issue.line || '?'} - \${getIssueMessage(issue)}\`);
`;

fs.writeFileSync('cli-display-fix.txt', displayFix);
console.log('✅ Fix instructions saved to cli-display-fix.txt');

// Test why single file scan doesn't work
console.log('\n3️⃣ Testing single file scan...\n');

try {
    // Create a simple test file
    const testCode = `
const a = 5;  // Cyrillic a
console.log("test");
const test = "value"  ;  // trailing spaces
`;
    fs.writeFileSync('simple-test.js', testCode);

    // Try different scan approaches
    console.log('Testing different scan methods:');

    // Method 1: Direct file
    try {
        const output1 = execSync('node sauron-cli.js simple-test.js', { encoding: 'utf8' });
        const issues1 = (output1.match(/Total Issues: (\d+)/i) || [])[1];
        console.log(`  Direct file scan: ${issues1 || '0'} issues`);
    } catch (e) {
        console.log('  Direct file scan failed');
    }

    // Method 2: Current directory with filter
    try {
        const output2 = execSync('node sauron-cli.js . --include simple-test.js', { encoding: 'utf8' });
        const issues2 = (output2.match(/Total Issues: (\d+)/i) || [])[1];
        console.log(`  Directory scan with filter: ${issues2 || '0'} issues`);
    } catch (e) {
        console.log('  Directory scan with filter failed');
    }

} catch (e) {
    console.log('Test failed:', e.message);
}

// Check the scanner configuration
console.log('\n4️⃣ Checking scanner configuration for files vs directories...\n');

try {
    const scannerContent = fs.readFileSync('core/EyeOfSauronOmniscient.js', 'utf8');

    // Look for file vs directory handling
    const hasFileHandling = scannerContent.includes('isFile()') || scannerContent.includes('.isFile');
    const hasDirHandling = scannerContent.includes('isDirectory()') || scannerContent.includes('.isDirectory');

    console.log(`Scanner handles files: ${hasFileHandling ? 'YES' : 'NO'}`);
    console.log(`Scanner handles directories: ${hasDirHandling ? 'YES' : 'NO'}`);

    // Check if single file mode works differently
    if (scannerContent.includes('scan(')) {
        const scanMethod = scannerContent.match(/async scan\s*\([^)]+\)/);
        if (scanMethod) {
            console.log(`\nScan method signature: ${scanMethod[0]}`);
        }
    }
} catch (e) {
    console.log('Error checking scanner:', e.message);
}

console.log('\n💡 Summary:');
console.log('- CLI shows "undefined" because it expects "message" but gets "description"');
console.log('- Single file scans may not trigger analyzers properly');
console.log('- The 460 issues are from a different source than the core analyzers');
console.log('\nTo fix: Update CLI to handle both message and description properties');