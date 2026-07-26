// quick-test.cjs - Simple test to check if analyzers work
const fs = require('fs');

console.log('🔍 Quick Eye of Sauron Test\n');

// First, check package.json
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`Package type: ${pkg.type || 'commonjs'}`);
    console.log(`Package name: ${pkg.name}`);
    console.log(`Version: ${pkg.version}\n`);
} catch (e) {
    console.log('Could not read package.json\n');
}

// Try to load the scanner
try {
    console.log('Loading EyeOfSauronOmniscient...');
    const { EyeOfSauronOmniscient } = require('./core/EyeOfSauronOmniscient.js');
    console.log('✅ Scanner loaded successfully!\n');

    // Create a simple test
    const scanner = new EyeOfSauronOmniscient({
        enableCharacterForensics: true,
        enablePatternPrecognition: true,
        verbose: true
    });

    console.log('Running quick scan...');
    scanner.scan('./core', 'quick').then(report => {
        console.log('\n📊 Quick Scan Results:');
        console.log(`Files: ${report.summary?.totalFiles || 0}`);
        console.log(`Issues: ${report.summary?.totalIssues || 0}`);
        console.log(`Critical: ${report.summary?.criticalIssues || 0}`);

        // Save results
        fs.writeFileSync('quick-test-results.json', JSON.stringify(report, null, 2));
        console.log('\n✅ Results saved to quick-test-results.json');
    }).catch(err => {
        console.error('❌ Scan error:', err.message);
    });

} catch (error) {
    console.error('❌ Failed to load scanner:', error.message);
    console.log('\nThis might be because:');
    console.log('1. The files are ES modules but we\'re using require()');
    console.log('2. The analyzer files don\'t exist');
    console.log('3. There\'s a syntax error in the files');
}

// Check what files exist
console.log('\n📁 Checking core files:');
const coreFiles = [
    'core/EyeOfSauronOmniscient.js',
    'core/CharacterForensics.js',
    'core/PatternPrecognition.js'
];

coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`✅ ${file} (${stats.size} bytes)`);
    } else {
        console.log(`❌ ${file} NOT FOUND`);
    }
});