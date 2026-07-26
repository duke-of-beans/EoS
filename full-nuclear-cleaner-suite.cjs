// full-nuclear-cleaner-suite.js
// Master cleaner: homoglyph sanitization + console comment-out + trailing space removal

const fs = require('fs');
const path = require('path');

const HOMOGLYPH_MAP = {
    '\u0430': 'a', // CYRILLIC SMALL LETTER A
    '\u0435': 'e', // CYRILLIC SMALL LETTER IE
    '\u043E': 'o', // CYRILLIC SMALL LETTER O
    '\u0440': 'p', // CYRILLIC SMALL LETTER ER
    '\u0441': 'c', // CYRILLIC SMALL LETTER ES
    '\u0445': 'x', // CYRILLIC SMALL LETTER HA
    '\u0443': 'y', // CYRILLIC SMALL LETTER U
    '\u0410': 'A', // CYRILLIC CAPITAL LETTER A
    '\u0415': 'E', // CYRILLIC CAPITAL LETTER IE
    '\u041E': 'O', // CYRILLIC CAPITAL LETTER O
    '\u0420': 'P', // CYRILLIC CAPITAL LETTER ER
    '\u0421': 'C', // CYRILLIC CAPITAL LETTER ES
    '\u0425': 'X', // CYRILLIC CAPITAL LETTER HA
    '\u0423': 'Y'  // CYRILLIC CAPITAL LETTER U
};

function walk(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walk(filepath, filelist);
        } else if (/\.(js|cjs|mjs|json|md)$/i.test(filepath)) {
            filelist.push(filepath);
        }
    });
    return filelist;
}

function cleanFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    // Homoglyph replacement
    content = content.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 0x0400 && code <= 0x04FF) {
            const mapped = HOMOGLYPH_MAP['\\u' + code.toString(16).padStart(4, '0')];
            return mapped || ''; // strip if no safe mapping
        }
        return char;
    }).join('');

    // Console cleanup
    content = content.replace(/(^|\s)(console\.(log|error|warn)\s*\()/g, '$1// $2');

    // Trailing space removal
    content = content.split('\n').map(line => line.replace(/\s+$/g, '')).join('\n');

    if (content !== original) {
        fs.writeFileSync(filepath + '.pre-nuclear', original, 'utf8');
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Cleaned: ${filepath}`);
    }
}

function runCleaner(root) {
    const files = walk(root);
    console.log(`🔍 Scanning ${files.length} files...`);
    files.forEach(cleanFile);
    console.log('🎯 Nuclear cleaning complete. Run your scanner again to verify.');
}

// Run
const targetDir = process.argv[2] || process.cwd();
runCleaner(targetDir);
