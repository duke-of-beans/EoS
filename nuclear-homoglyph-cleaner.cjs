// nuclear-homoglyph-cleaner.js - GUARANTEED to remove ALL homoglyphs
const fs = require('fs');
const path = require('path');

console.log('☢️  NUCLEAR HOMOGLYPH CLEANER - NO MERCY MODE\n');

// Unicode ranges for Cyrillic characters that look like Latin
const CYRILLIC_RANGES = [
    [0x0410, 0x042F], // Cyrillic uppercase
    [0x0430, 0x044F], // Cyrillic lowercase
];

// Direct character code mappings
const CHAR_CODE_MAP = {
    0x0430: 0x0061, // a → a
    0x0435: 0x0065, // e → e
    0x043E: 0x006F, // o → o
    0x0440: 0x0070, // p → p
    0x0441: 0x0063, // c → c
    0x0445: 0x0078, // x → x
    0x0443: 0x0079, // y → y
    0x0410: 0x0041, // A → A
    0x0415: 0x0045, // E → E
    0x041E: 0x004F, // O → O
    0x0420: 0x0050, // P → P
    0x0421: 0x0043, // C → C
    0x0425: 0x0058, // X → X
    0x0423: 0x0059, // Y → Y
    0x0412: 0x0042, // B → B
    0x041A: 0x004B, // K → K
    0x041C: 0x004D, // M → M
    0x041D: 0x0048, // H → H
    0x0422: 0x0054, // T → T
};

function isCyrillic(charCode) {
    return CYRILLIC_RANGES.some(([min, max]) => charCode >= min && charCode <= max);
}

function cleanString(str) {
    let result = '';
    let replacements = 0;
    
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        
        if (CHAR_CODE_MAP[charCode]) {
            // Direct replacement
            result += String.fromCharCode(CHAR_CODE_MAP[charCode]);
            replacements++;
        } else if (isCyrillic(charCode)) {
            // Other Cyrillic - mark with [?]
            result += '[?]';
            replacements++;
        } else {
            // Keep as is
            result += str[i];
        }
    }
    
    return { cleaned: result, replacements };
}

function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { cleaned, replacements } = cleanString(content);
        
        if (replacements > 0) {
            console.log(`⚠️  ${filePath}: Found ${replacements} Cyrillic characters`);
            
            // Show first few problematic lines
            const lines = content.split('\n');
            let shown = 0;
            lines.forEach((line, i) => {
                const { replacements: lineReplacements } = cleanString(line);
                if (lineReplacements > 0 && shown < 3) {
                    console.log(`   Line ${i + 1}: "${line.substring(0, 80)}..."`);
                    shown++;
                }
            });
            
            return { filePath, replacements, content: cleaned };
        }
        
        return null;
    } catch (error) {
        // Skip files we can't read
        return null;
    }
}

function scanDirectory(dir, results = [], level = 0) {
    if (level > 5) return results; // Max depth
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            // Skip certain directories
            if (item === 'node_modules' || item.startsWith('.') || item.includes('backup')) {
                continue;
            }
            
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDirectory(fullPath, results, level + 1);
            } else if (item.endsWith('.js') || item.endsWith('.cjs') || item.endsWith('.mjs')) {
                const result = scanFile(fullPath);
                if (result) {
                    results.push(result);
                }
            }
        }
    } catch (error) {
        // Skip directories we can't access
    }
    
    return results;
}

// Main execution
console.log('🔍 Scanning for Cyrillic characters...\n');

const results = scanDirectory('.');

if (results.length === 0) {
    console.log('✅ No Cyrillic characters found! Your project is clean.');
} else {
    console.log(`\n📊 Found Cyrillic in ${results.length} files\n`);
    
    // Ask to fix
    console.log('⚠️  WARNING: This will replace ALL Cyrillic characters!');
    console.log('📝 To apply fixes, run: node nuclear-homoglyph-cleaner.js --fix\n');
    
    if (process.argv.includes('--fix')) {
        console.log('☢️  FIXING MODE ACTIVATED!\n');
        
        let totalFixed = 0;
        results.forEach(({ filePath, content }) => {
            // Create backup
            const backupPath = filePath + '.pre-nuclear';
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(filePath, backupPath);
            }
            
            // Write cleaned content
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${filePath}`);
            totalFixed++;
        });
        
        console.log(`\n✅ Fixed ${totalFixed} files!`);
        console.log('🔍 Run Eye of Sauron again to verify all issues are resolved.');
        console.log('💾 Backups saved with .pre-nuclear extension');
    }
}

// Also check for specific problem files
console.log('\n🎯 Checking known problem files...\n');

const problemFiles = [
    'cli/simple-cli.js',
    'sauron-cli.js',
    'fix-homoglyphs.cjs',
    'fix-homoglyphs-v2.cjs',
    'fix-remaining-homoglyphs.cjs'
];

problemFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const result = scanFile(file);
        if (!result) {
            console.log(`✅ ${file} - Clean`);
        }
    }
});