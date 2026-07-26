#!/usr/bin/env node
/**
 * 🔧 EOS SERVER SYNTAX FIXER
 * Fixes common switch/case syntax errors in server.js
 */

const fs = require('fs');
const path = require('path');

class ServerSyntaxFixer {
    constructor() {
        this.serverFile = 'server.js';
        this.backupFile = 'server.js.backup';
    }

    async fixServer() {
        console.log('🔧 EOS Server Syntax Fixer');
        console.log('🎯 Target:', this.serverFile);
        
        try {
            // Check if server.js exists
            if (!fs.existsSync(this.serverFile)) {
                console.log('❌ server.js not found!');
                return false;
            }

            // Create backup
            console.log('💾 Creating backup...');
            fs.copyFileSync(this.serverFile, this.backupFile);
            console.log(`✅ Backup saved as: ${this.backupFile}`);

            // Read the file
            const content = fs.readFileSync(this.serverFile, 'utf8');
            const lines = content.split('\n');

            console.log(`📄 File has ${lines.length} lines`);

            // Find and fix syntax errors
            const fixed = this.fixSwitchCaseErrors(lines);
            
            if (fixed.changed) {
                // Write the fixed content
                fs.writeFileSync(this.serverFile, fixed.content);
                console.log(`✅ Fixed ${fixed.fixes} syntax error(s)`);
                console.log('🎯 Fixes applied:');
                fixed.fixDescriptions.forEach(desc => console.log(`   - ${desc}`));
                
                // Test the syntax
                await this.testSyntax();
                return true;
            } else {
                console.log('✅ No syntax errors found!');
                return true;
            }

        } catch (error) {
            console.error('❌ Error fixing server:', error.message);
            return false;
        }
    }

    fixSwitchCaseErrors(lines) {
        const result = {
            content: '',
            changed: false,
            fixes: 0,
            fixDescriptions: []
        };

        const fixedLines = [];
        let inFunction = false;
        let braceLevel = 0;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Track brace levels
            braceLevel += (line.match(/{/g) || []).length;
            braceLevel -= (line.match(/}/g) || []).length;

            // Common fix patterns
            if (this.needsSwitchFix(line, i, lines)) {
                const fix = this.applySwitchFix(lines, i);
                fixedLines.push(...fix.lines);
                i += fix.skipLines;
                result.changed = true;
                result.fixes++;
                result.fixDescriptions.push(fix.description);
            } else {
                fixedLines.push(line);
                i++;
            }
        }

        result.content = fixedLines.join('\n');
        return result;
    }

    needsSwitchFix(line, index, lines) {
        const trimmed = line.trim();
        
        // Check for orphaned case statements
        if (trimmed.startsWith('case ') && index > 0) {
            // Look backward for switch statement
            for (let i = index - 1; i >= Math.max(0, index - 10); i--) {
                const prevLine = lines[i].trim();
                if (prevLine.includes('switch')) {
                    // Check if switch has opening brace
                    if (!prevLine.includes('{') && !lines[i + 1]?.trim().startsWith('{')) {
                        return true;
                    }
                }
            }
        }

        // Check for switch without opening brace
        if (trimmed.includes('switch') && trimmed.includes('(') && trimmed.includes(')')) {
            if (!trimmed.includes('{') && !lines[index + 1]?.trim().startsWith('{')) {
                return true;
            }
        }

        return false;
    }

    applySwitchFix(lines, index) {
        const line = lines[index];
        const trimmed = line.trim();

        // Fix orphaned case by adding switch wrapper
        if (trimmed.startsWith('case ')) {
            // Look for the variable this case should switch on
            const caseValue = trimmed.match(/case\s+['"`]([^'"`]+)['"`]:/);
            
            if (caseValue) {
                const switchVar = this.inferSwitchVariable(lines, index);
                const indent = this.getIndentation(line);
                
                return {
                    lines: [
                        `${indent}switch(${switchVar}) {`,
                        line,
                        ...this.collectCaseStatements(lines, index + 1),
                        `${indent}}`
                    ],
                    skipLines: this.countCaseStatements(lines, index),
                    description: `Added switch(${switchVar}) wrapper for orphaned case statements`
                };
            }
        }

        // Fix switch without opening brace
        if (trimmed.includes('switch')) {
            const indent = this.getIndentation(line);
            return {
                lines: [
                    line + ' {',
                ],
                skipLines: 0,
                description: 'Added missing opening brace to switch statement'
            };
        }

        return {
            lines: [line],
            skipLines: 0,
            description: 'No fix needed'
        };
    }

    inferSwitchVariable(lines, index) {
        // Common patterns for API routes
        const commonVars = ['req.method', 'req.url', 'pathname', 'route', 'endpoint'];
        
        // Look for variable declarations nearby
        for (let i = Math.max(0, index - 20); i < index; i++) {
            const line = lines[i];
            for (const varName of commonVars) {
                if (line.includes(varName)) {
                    return varName;
                }
            }
        }

        // Default for API servers
        return 'req.url';
    }

    collectCaseStatements(lines, startIndex) {
        const caseLines = [];
        let braceLevel = 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (trimmed.startsWith('case ') || trimmed.startsWith('default:')) {
                caseLines.push(line);
            } else if (trimmed === '' || trimmed.startsWith('//')) {
                caseLines.push(line);
            } else if (braceLevel === 0 && !trimmed.startsWith('break') && !trimmed.startsWith('return')) {
                break;
            } else {
                caseLines.push(line);
                if (trimmed.includes('break') || trimmed.includes('return')) {
                    break;
                }
            }
        }
        
        return caseLines;
    }

    countCaseStatements(lines, startIndex) {
        let count = 0;
        for (let i = startIndex + 1; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('case ') || trimmed === '' || trimmed.startsWith('//')) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    getIndentation(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    }

    async testSyntax() {
        console.log('🧪 Testing syntax...');
        
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            await execAsync('node -c server.js');
            console.log('✅ Syntax check passed!');
            return true;
        } catch (error) {
            console.log('❌ Syntax check failed:');
            console.log(error.stdout || error.message);
            
            // Restore backup
            console.log('🔄 Restoring backup...');
            fs.copyFileSync(this.backupFile, this.serverFile);
            console.log('✅ Backup restored');
            return false;
        }
    }

    // Quick fix for common API route patterns
    createApiServerTemplate() {
        return `const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api', (req, res, next) => {
    console.log(\`API Request: \${req.method} \${req.url}\`);
    next();
});

// EOS API Routes
app.get('/api/scan', (req, res) => {
    res.json({ message: 'EOS Scan endpoint ready' });
});

app.post('/api/scan', (req, res) => {
    // Scan logic here
    res.json({ success: true, message: 'Scan completed' });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve dashboards
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'eye-of-sauron-dashboard.html'));
});

app.get('/ui', (req, res) => {
    res.sendFile(path.join(__dirname, 'eye-of-sauron-ui.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(\`🎯 EOS API Server running on http://localhost:\${PORT}\`);
    console.log(\`📊 Dashboard: http://localhost:\${PORT}\`);
    console.log(\`🔧 Advanced UI: http://localhost:\${PORT}/ui\`);
});

module.exports = app;`;
    }
}

// Run the fixer
async function main() {
    const fixer = new ServerSyntaxFixer();
    const success = await fixer.fixServer();
    
    if (success) {
        console.log('\n🚀 Ready to start server:');
        console.log('   node server.js');
    } else {
        console.log('\n🔄 If issues persist, create new server:');
        console.log('   mv server.js server.js.broken');
        console.log('   # Then copy the template from this script');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ServerSyntaxFixer;