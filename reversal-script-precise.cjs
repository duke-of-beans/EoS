// reversal-script-precise.js
// Reverses console comment-out and flags suspicious lines

const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walk(filepath, filelist);
        } else if (/\.(js|cjs|mjs)$/i.test(filepath)) {
            filelist.push(filepath);
        }
    });
    return filelist;
}

function reverseFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    let changed = false;

    // Uncomment console lines
    content = content.replace(/(^|\s)\/\/\s*(console\.(log|error|warn)\s*\()/g, '$1$2');
    if (content !== original) {
        changed = true;
        console.log(`✅ Restored console statements in: ${filepath}`);
    }

    // Scan for suspicious lines (likely homoglyph stripped lines or damage)
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (/  /.test(line) || line.trim() === '') {
            console.log(`⚠️ Suspicious line ${idx + 1} in ${filepath}: ${line}`);
        }
    });

    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
    }
}

function runReversal(root) {
    const files = walk(root);
    console.log(`🔍 Processing ${files.length} files...`);
    files.forEach(reverseFile);
    console.log('🎯 Reversal complete. Please review flagged lines manually.');
}

// Run
const targetDir = process.argv[2] || process.cwd();
runReversal(targetDir);
