// capture-cli-output.cjs - Capture and analyze CLI output
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🎯 Capturing Eye of Sauron CLI Output\n');

// Run the CLI and capture output
const cli = spawn('node', ['sauron-cli.js', '.', '--verbose'], {
    cwd: process.cwd(),
    shell: true
});

let output = '';
let errorOutput = '';

cli.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text); // Also show in console
});

cli.stderr.on('data', (data) => {
    const text = data.toString();
    errorOutput += text;
    process.stderr.write(text);
});

cli.on('close', (code) => {
    console.log(`\n\nCLI exited with code ${code}`);

    // Save raw output
    fs.writeFileSync('cli-raw-output.txt', output + '\n\nSTDERR:\n' + errorOutput);
    console.log('📄 Raw output saved to: cli-raw-output.txt');

    // Try to extract JSON data
    console.log('\n🔍 Analyzing output...');

    // Count issues mentioned
    const issueMatches = output.match(/(\d+)\s+issues?/gi);
    if (issueMatches) {
        console.log('Issue counts found:');
        issueMatches.forEach(match => console.log(`  - ${match}`));
    }

    // Look for undefined messages
    const undefinedCount = (output.match(/undefined/g) || []).length;
    console.log(`\nFound ${undefinedCount} occurrences of "undefined"`);

    // Extract issue lines
    const lines = output.split('\n');
    const issueLines = lines.filter(line =>
        line.includes('WARNING') ||
        line.includes('ERROR') ||
        line.includes('CRITICAL') ||
        line.includes('undefined')
    );

    console.log(`\nFound ${issueLines.length} issue lines`);

    // Save issue lines
    if (issueLines.length > 0) {
        fs.writeFileSync('cli-issues.txt', issueLines.join('\n'));
        console.log('📄 Issue lines saved to: cli-issues.txt');

        // Show first few
        console.log('\nFirst 10 issues:');
        issueLines.slice(0, 10).forEach(line => {
            console.log(`  ${line.trim()}`);
        });
    }
});