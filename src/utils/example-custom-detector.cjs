/**
 * apiKeyDetector.js - Custom detector for API key patterns
 *
 * Example custom detector for Eye of Sauron Smart Auto-Patcher
 * Demonstrates how to create custom detection rules
 */

import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * Custom API key detector
 */
export default {
  name: 'apiKeyDetector',

  /**
   * Detect potential API keys in code
   *
   * @param {Object} ast - Babel AST
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @param {Object} config - Configuration object
   * @returns {Array} Array of detected issues
   */
  async detect(ast, content, filePath, config) {
    const issues = [];
    const lines = content.split('\n');

    // Common API key patterns
    const apiKeyPatterns = [
      {
        pattern: /^AIza[0-9A-Za-z\\-_]{35}$/,
        name: 'Google API Key',
        severity: 'error'
      },
      {
        pattern: /^[0-9a-f]{32}$/i,
        name: 'Generic API Key (32 char hex)',
        severity: 'warning'
      },
      {
        pattern: /^sk_live_[0-9a-zA-Z]{24,}$/,
        name: 'Stripe Live Secret Key',
        severity: 'error'
      },
      {
        pattern: /^pk_live_[0-9a-zA-Z]{24,}$/,
        name: 'Stripe Live Public Key',
        severity: 'warning'
      },
      {
        pattern: /^[A-Za-z0-9]{22}$/,
        name: 'Twitter API Key',
        severity: 'warning'
      },
      {
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        name: 'UUID (potential API key)',
        severity: 'info'
      }
    ];

    traverse.default(ast, {
      StringLiteral(path) {
        const value = path.node.value;
        const loc = path.node.loc;

        if (!loc || value.length < 16) return;

        // Check against patterns
        for (const { pattern, name, severity } of apiKeyPatterns) {
          if (pattern.test(value)) {
            // Skip if in ignore patterns
            if (config.ignorePatterns?.some(p => value.includes(p))) {
              continue;
            }

            // Get context
            let context = 'unknown';
            if (t.isVariableDeclarator(path.parent)) {
              context = path.parent.id.name;
            } else if (t.isObjectProperty(path.parent)) {
              context = path.parent.key.name || path.parent.key.value;
            }

            issues.push({
              type: 'api-key-pattern',
              filePath,
              line: loc.start.line,
              column: loc.start.column,
              endLine: loc.end.line,
              endColumn: loc.end.column,
              code: lines[loc.start.line - 1]?.trim() || '',
              message: `Potential ${name} detected`,
              severity,
              risk: severity === 'error' ? 'HIGH' : 'MEDIUM',
              confidence: 0.8,
              context: {
                keyType: name,
                variableName: context,
                pattern: pattern.toString()
              },
              fix: null, // Never auto-fix API keys
              suggestion: `Move to environment variable: process.env.${context.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`
            });

            break; // Only report first matching pattern
          }
        }
      }
    });

    return issues;
  }
};