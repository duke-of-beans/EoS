#!/usr/bin/env node
/**
 * 🔧 DIRECT SERVER.JS LINE 115 FIX
 * Fixes the specific orphaned case statement at line 115
 */

const fs = require('fs');

class DirectServerFixer {
    constructor() {
        this.serverFile = 'server.js';
        this.backupFile = 'server.js.backup-direct';
    }

    async fixLine115() {
        console.log('🎯 Direct Fix for server.js line 115');
        
        try {
            // Read the file
            const content = fs.readFileSync(this.serverFile, 'utf8');
            const lines = content.split('\n');
            
            console.log(`📄 Total lines: ${lines.length}`);
            console.log(`🔍 Line 115: "${lines[114]?.trim()}"`); // Array is 0-indexed
            
            // Create backup
            fs.writeFileSync(this.backupFile, content);
            console.log(`💾 Backup saved: ${this.backupFile}`);
            
            // Show context around line 115
            console.log('\n📋 Context around line 115:');
            for (let i = 110; i < 120 && i < lines.length; i++) {
                const lineNum = i + 1;
                const marker = lineNum === 115 ? '>>> ' : '    ';
                console.log(`${marker}${lineNum}: ${lines[i]}`);
            }
            
            // Find the problematic case statement and fix it
            const fixedLines = this.fixOrphanedCase(lines);
            
            if (fixedLines.changed) {
                // Write the fixed content
                const fixedContent = fixedLines.lines.join('\n');
                fs.writeFileSync(this.serverFile, fixedContent);
                
                console.log('\n✅ Applied fixes:');
                fixedLines.fixes.forEach(fix => console.log(`   - ${fix}`));
                
                // Test syntax
                return await this.testSyntax();
            } else {
                console.log('\n❌ Could not automatically fix the issue');
                this.showManualFix(lines);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            return false;
        }
    }

    fixOrphanedCase(lines) {
        const result = {
            lines: [...lines],
            changed: false,
            fixes: []
        };

        // Find line 115 (index 114)
        const problemLine = 114;
        
        if (problemLine >= lines.length) {
            return result;
        }

        const line = lines[problemLine];
        if (!line.trim().startsWith('case ')) {
            return result;
        }

        // Look backwards for context to understand what should be switched on
        let switchVar = 'req.url'; // Default for API servers
        let insertIndex = problemLine;
        
        // Look for patterns that suggest what variable to switch on
        for (let i = problemLine - 10; i < problemLine; i++) {
            if (i < 0) continue;
            const contextLine = lines[i].toLowerCase();
            
            if (contextLine.includes('req.method')) {
                switchVar = 'req.method';
                break;
            } else if (contextLine.includes('pathname')) {
                switchVar = 'pathname';
                break;
            } else if (contextLine.includes('endpoint')) {
                switchVar = 'endpoint';
                break;
            }
        }

        // Look for where to insert the switch statement
        for (let i = problemLine - 1; i >= 0; i--) {
            const prevLine = lines[i].trim();
            if (prevLine === '' || prevLine.startsWith('//')) {
                continue;
            }
            insertIndex = i + 1;
            break;
        }

        // Get indentation from the case line
        const indent = this.getIndentation(line);
        
        // Find all consecutive case statements
        const caseLines = [];
        let endIndex = problemLine;
        
        for (let i = problemLine; i < lines.length; i++) {
            const currentLine = lines[i].trim();
            if (currentLine.startsWith('case ') || currentLine.startsWith('default:')) {
                caseLines.push(i);
                endIndex = i;
            } else if (currentLine === '' || currentLine.startsWith('//')) {
                // Skip empty lines and comments
                continue;
            } else if (currentLine.includes('break') || currentLine.includes('return')) {
                // Include break/return statements
                endIndex = i;
                break;
            } else if (caseLines.length > 0) {
                // End of case block
                endIndex = i - 1;
                break;
            }
        }

        // Insert switch wrapper
        const newLines = [];
        
        // Copy lines before the switch
        for (let i = 0; i < insertIndex; i++) {
            newLines.push(lines[i]);
        }
        
        // Add switch statement
        newLines.push(`${indent}switch(${switchVar}) {`);
        
        // Copy the case statements
        for (let i = insertIndex; i <= endIndex; i++) {
            newLines.push(lines[i]);
        }
        
        // Add closing brace
        newLines.push(`${indent}}`);
        
        // Copy remaining lines
        for (let i = endIndex + 1; i < lines.length; i++) {
            newLines.push(lines[i]);
        }

        result.lines = newLines;
        result.changed = true;
        result.fixes.push(`Wrapped orphaned case statements in switch(${switchVar})`);
        result.fixes.push(`Added switch block around lines ${problemLine + 1}-${endIndex + 1}`);
        
        return result;
    }

    getIndentation(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '    ';
    }

    async testSyntax() {
        console.log('\n🧪 Testing fixed syntax...');
        
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            await execAsync('node -c server.js');
            console.log('✅ Syntax check PASSED!');
            return true;
        } catch (error) {
            console.log('❌ Syntax check FAILED:');
            console.log(error.stdout || error.message);
            
            // Restore from backup
            console.log('🔄 Restoring from backup...');
            const backup = fs.readFileSync(this.backupFile, 'utf8');
            fs.writeFileSync(this.serverFile, backup);
            console.log('✅ Backup restored');
            return false;
        }
    }

    showManualFix(lines) {
        console.log('\n📋 MANUAL FIX INSTRUCTIONS:');
        console.log('The issue is an orphaned case statement. Here\'s how to fix it:');
        console.log('\n1. Find line 115 in server.js');
        console.log('2. Look for the case statement without a switch wrapper');
        console.log('3. Add a switch statement before it, like this:');
        console.log('\n   // BEFORE (broken):');
        console.log('   case \'/summary\':');
        console.log('       // code');
        console.log('       break;');
        console.log('\n   // AFTER (fixed):');
        console.log('   switch(req.url) {');
        console.log('       case \'/summary\':');
        console.log('           // code');
        console.log('           break;');
        console.log('   }');
        console.log('\n🔧 OR create a completely new server.js file');
    }

    createCleanServer() {
        const template = `const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API Routes - FIXED SWITCH STRUCTURE
app.use('/api', (req, res, next) => {
    console.log(\`📡 API: \${req.method} \${req.url}\`);
    
    // Route handling with proper switch
    switch(req.url) {
        case '/status':
            res.json({ 
                status: 'running',
                timestamp: new Date().toISOString(),
                server: 'EOS API v1.0'
            });
            break;
            
        case '/scan':
            if (req.method === 'POST') {
                // Handle scan request
                res.json({ 
                    success: true, 
                    message: 'Scan initiated',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.json({ message: 'EOS Scan endpoint ready' });
            }
            break;
            
        case '/summary':
            res.json({
                message: 'EOS Summary endpoint',
                totalScans: 42,
                lastScan: new Date().toISOString()
            });
            break;
            
        default:
            next(); // Continue to other routes
    }
});

// Dashboard routes
app.get('/', (req, res) => {
    const dashboardPath = path.join(__dirname, 'eye-of-sauron-dashboard.html');
    if (fs.existsSync(dashboardPath)) {
        res.sendFile(dashboardPath);
    } else {
        res.json({ message: 'EOS Dashboard not found', path: dashboardPath });
    }
});

app.get('/ui', (req, res) => {
    const uiPath = path.join(__dirname, 'eye-of-sauron-ui.html');
    if (fs.existsSync(uiPath)) {
        res.sendFile(uiPath);
    } else {
        res.json({ message: 'EOS UI not found', path: uiPath });
    }
});

// Static files
app.use(express.static('.', { 
    extensions: ['html', 'js', 'css', 'json'],
    index: false 
}));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('🚨 Server Error:', error);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(\`🎯 EOS API Server running on http://localhost:\${PORT}\`);
    console.log(\`📊 Dashboard: http://localhost:\${PORT}\`);
    console.log(\`🔧 Advanced UI: http://localhost:\${PORT}/ui\`);
    console.log(\`🌐 API Status: http://localhost:\${PORT}/api/status\`);
    console.log('\\n👁️  The Eye of Sauron sees all... Server ready!');
});

module.exports = app;`;

        fs.writeFileSync('server-clean.js', template);
        console.log('\n✅ Created clean server template: server-clean.js');
        console.log('🔄 To use it: mv server-clean.js server.js');
    }
}

// Run the direct fixer
async function main() {
    const fixer = new DirectServerFixer();
    const success = await fixer.fixLine115();
    
    if (!success) {
        console.log('\n🔄 Creating clean server as backup...');
        fixer.createCleanServer();
        console.log('\n💡 To use the clean server:');
        console.log('   mv server.js server.js.broken');
        console.log('   mv server-clean.js server.js');
        console.log('   node server.js');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DirectServerFixer;