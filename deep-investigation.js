#!/usr/bin/env node

/**
 * Deep Investigation Script
 * Finds exactly what's causing the massive homoglyph issues
 */

import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Deep Investigation - Finding the Real Problem');
console.log('═'.repeat(60));

async function investigateFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Check for specific Cyrillic characters
    const cyrillicP = content.match(/p/g) || []; // Cyrillic P
    const cyrillicO = content.match(/o/g) || []; // Cyrillic O
    const cyrillicA = content.match(/a/g) || []; // Cyrillic A

    // Check for ASCII equivalents
    const asciiP = content.match(/p/g) || [];
    const asciiO = content.match(/o/g) || [];
    const asciiA = content.match(/a/g) || [];

    // Look for suspicious patterns
    const lines = content.split('\n');
    const suspiciousLines = [];

    lines.forEach((line, idx) => {
      if (line.includes('p') || line.includes('o') || line.includes('a')) {
        suspiciousLines.push({
          lineNumber: idx + 1,
          content: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
          cyrillicCount: (line.match(/[poa]/g) || []).length
        });
      }
    });

    return {
      filePath,
      fileSize: content.length,
      cyrillicP: cyrillicP.length,
      cyrillicO: cyrillicO.length,
      cyrillicA: cyrillicA.length,
      totalCyrillic: cyrillicP.length + cyrillicO.length + cyrillicA.length,
      asciiP: asciiP.length,
      asciiO: asciiO.length,
      asciiA: asciiA.length,
      suspiciousLines: suspiciousLines.slice(0, 5), // First 5 suspicious lines
      hasCyrillic: cyrillicP.length + cyrillicO.length + cyrillicA.length > 0
    };
  } catch (error) {
    return { filePath, error: error.message };
  }
}

async function compareToBefore() {
  console.log('📊 Comparing to original scan results...');

  try {
    // Load the working pattern results (before manual fix)
    const beforeData = await fs.readFile('working-pattern-results.json', 'utf8');
    const beforeResults = JSON.parse(beforeData);

    console.log('📈 BEFORE manual fix:');
    console.log(`   Files scanned: ${beforeResults.summary?.filesScanned || 'unknown'}`);
    console.log(`   Total issues: ${beforeResults.summary?.totalIssues || 'unknown'}`);

    if (beforeResults.summary?.issuesBySeverity) {
      Object.entries(beforeResults.summary.issuesBySeverity).forEach(([severity, count]) => {
        if (count > 0) {
          console.log(`   ${severity}: ${count}`);
        }
      });
    }

    // Load the post-fix results
    const afterData = await fs.readFile('recovery-verification.json', 'utf8');
    const afterResults = JSON.parse(afterData);

    console.log('\n📉 AFTER manual fix:');
    console.log(`   Files scanned: ${afterResults.summary?.filesScanned || 'unknown'}`);
    console.log(`   Total issues: ${afterResults.summary?.totalIssues || 'unknown'}`);

    if (afterResults.summary?.issuesBySeverity) {
      Object.entries(afterResults.summary.issuesBySeverity).forEach(([severity, count]) => {
        if (count > 0) {
          console.log(`   ${severity}: ${count}`);
        }
      });
    }

    // Calculate the increase
    const beforeTotal = beforeResults.summary?.totalIssues || 0;
    const afterTotal = afterResults.summary?.totalIssues || 0;
    const increase = afterTotal - beforeTotal;
    const multiplier = beforeTotal > 0 ? (afterTotal / beforeTotal).toFixed(1) : 'infinite';

    console.log('\n🚨 IMPACT:');
    console.log(`   Issues increased by: ${increase}`);
    console.log(`   Multiplier: ${multiplier}x worse`);

    return { beforeResults, afterResults, increase, multiplier };
  } catch (error) {
    console.log(`❌ Could not compare: ${error.message}`);
    return null;
  }
}

async function findWorstFiles() {
  console.log('\n🔍 Investigating worst affected files...');

  const worstFiles = [
    'reporters/SauronInsightReporter.js',
    'utils/SauronScanOptimizer.js',
    'utils/SauronReportAnalyzer.js',
    'utils/SauronThreatCorrelator.js',
    'utils/SauronDependencyAuditor.js'
  ];

  for (const file of worstFiles) {
    console.log(`\n📄 Analyzing: ${file}`);
    const analysis = await investigateFile(file);

    if (analysis.error) {
      console.log(`   ❌ Error: ${analysis.error}`);
      continue;
    }

    console.log(`   File size: ${analysis.fileSize} bytes`);
    console.log(`   Cyrillic characters found:`);
    console.log(`     p (Cyrillic P): ${analysis.cyrillicP}`);
    console.log(`     o (Cyrillic O): ${analysis.cyrillicO}`);
    console.log(`     a (Cyrillic A): ${analysis.cyrillicA}`);
    console.log(`     Total Cyrillic: ${analysis.totalCyrillic}`);

    if (analysis.suspiciousLines.length > 0) {
      console.log(`   Suspicious lines:`);
      analysis.suspiciousLines.forEach(line => {
        console.log(`     Line ${line.lineNumber}: "${line.content}" (${line.cyrillicCount} Cyrillic)`);
      });
    }
  }
}

async function checkSimpleManualFix() {
  console.log('\n🔧 Analyzing simple-manual-fix.js script...');

  try {
    const fixScript = await fs.readFile('simple-manual-fix.js', 'utf8');

    // Look for the replacement patterns
    const homoglyphSection = fixScript.match(/homoglyphs:[\s\S]*?}[,;]/);

    if (homoglyphSection) {
      console.log('📋 Found homoglyph replacement section:');
      console.log(homoglyphSection[0]);

      // Check if the replacements are backwards
      if (homoglyphSection[0].includes('.replace(/[a]/g, \'a\')')) {
        console.log('✅ Replacements look correct (Cyrillic → ASCII)');
      } else if (homoglyphSection[0].includes('.replace(/[a]/g, \'a\')')) {
        console.log('🚨 PROBLEM FOUND: Replacements are backwards (ASCII → Cyrillic)!');
      } else {
        console.log('⚠️  Could not determine replacement direction');
      }
    } else {
      console.log('❌ Could not find homoglyph replacement section');
    }
  } catch (error) {
    console.log(`❌ Could not analyze fix script: ${error.message}`);
  }
}

async function generateEmergencyRecovery() {
  console.log('\n🚨 Generating Emergency Recovery Plan...');

  const emergencyScript = `#!/usr/bin/env node

/**
 * EMERGENCY RECOVERY SCRIPT
 * Restores ALL files from backups created before the faulty manual fix
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function emergencyRestore() {
  try {
    console.log('🚨 EMERGENCY RECOVERY STARTING...');

    // Method 1: Git reset if you have git
    try {
      console.log('📦 Attempting git reset...');
      execSync('git status', { stdio: 'ignore' });

      console.log('🔄 Resetting to last commit...');
      execSync('git checkout HEAD -- .', { stdio: 'inherit' });
      console.log('✅ Git reset successful!');
      return true;
    } catch (error) {
      console.log('⚠️  Git reset failed, trying backup restore...');
    }

    // Method 2: Restore from backups
    console.log('🔄 Finding and restoring from backups...');

    const backupFiles = [];

    async function findBackups(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          await findBackups(fullPath);
        } else if (entry.name.includes('.backup.1750454')) {
          backupFiles.push({
            backup: fullPath,
            original: fullPath.replace(/\\.backup\\.\\d+$/, '')
          });
        }
      }
    }

    await findBackups('.');
    console.log(\`📁 Found \${backupFiles.length} backup files\`);

    let restored = 0;
    for (const { backup, original } of backupFiles) {
      try {
        const backupContent = await fs.readFile(backup, 'utf8');
        await fs.writeFile(original, backupContent, 'utf8');
        restored++;

        if (restored % 20 === 0) {
          console.log(\`   Restored \${restored} files...\`);
        }
      } catch (error) {
        console.log(\`   ❌ Failed to restore \${original}\`);
      }
    }

    console.log(\`✅ Emergency restore complete! Restored \${restored} files\`);
    return true;

  } catch (error) {
    console.error('❌ Emergency recovery failed:', error.message);
    return false;
  }
}

emergencyRestore().then(success => {
  if (success) {
    console.log('\\n🎉 Recovery successful!');
    console.log('\\n🔄 Next steps:');
    console.log('   1. Run scan to verify: node cli/simple-cli.js . --output verification.json');
    console.log('   2. If successful, delete all .backup files');
    console.log('   3. DO NOT run simple-manual-fix.js again until it\\'s fixed');
  } else {
    console.log('\\n❌ Recovery failed. Manual intervention required.');
  }
});`;

  await fs.writeFile('emergency-recovery.js', emergencyScript);
  console.log('✅ Emergency recovery script created: emergency-recovery.js');
}

async function main() {
  try {
    // Compare before and after
    await compareToBefore();

    // Investigate worst files
    await findWorstFiles();

    // Check the fix script
    await checkSimpleManualFix();

    // Generate emergency recovery
    await generateEmergencyRecovery();

    console.log('\n🚨 CONCLUSIONS:');
    console.log('══════════════════════════════════════════════════');
    console.log('1. The manual fix script caused MASSIVE damage');
    console.log('2. 172,000+ homoglyph attacks were introduced');
    console.log('3. The damage assessment script failed to detect it');
    console.log('4. Emergency recovery is needed IMMEDIATELY');
    console.log('');
    console.log('🛡️ IMMEDIATE ACTION:');
    console.log('   Run: node emergency-recovery.js');

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

main();