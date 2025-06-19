/**
 * Purpose: Formats policy violations for human review
 * Dependencies: Node.js std lib (path)
 * API: PolicyViolationReporter().formatText(), formatJson()
 */

import { sep as pathSep } from 'path';

export class PolicyViolationReporter {
  constructor(config = {}) {
    this.config = {
      pretty: false,
      maxDetailLength: 100,
      includeTimestamp: true,
      ...config
    };
    
    // Define standard severity levels and their display order
    this.severityLevels = ['critical', 'high', 'medium', 'low'];
    this.severityAliases = {
      'error': 'critical',
      'warning': 'medium',
      'warn': 'medium',
      'info': 'low',
      'minor': 'low'
    };
  }

  /**
   * Format violations as human-readable text table
   * @param {Array} violations - Array of violation objects
   * @returns {string} Formatted text output
   */
  formatText(violations) {
    if (!Array.isArray(violations) || violations.length === 0) {
      return 'No policy violations found.\n';
    }

    // Calculate column widths
    const columns = {
      rule: Math.max(10, ...violations.map(v => (v.rule || '').length)),
      severity: Math.max(8, ...violations.map(v => (v.severity || '').length)),
      file: Math.max(20, ...violations.map(v => this._truncatePath(v.file || '').length)),
      details: Math.max(30, Math.min(this.config.maxDetailLength, 
        ...violations.map(v => (v.details || '').length)))
    };

    // Build header
    let output = '';
    if (this.config.includeTimestamp) {
      output += `Policy Violation Report - ${new Date().toISOString()}\n`;
      output += '═'.repeat(80) + '\n\n';
    }

    // Summary
    const severityCounts = this._countBySeverity(violations);
    output += `Total Violations: ${violations.length}\n`;
    
    // Display all severity levels, even if count is 0
    const severityLine = this.severityLevels
      .map(sev => `${this._capitalize(sev)}: ${severityCounts[sev] || 0}`)
      .join(' | ');
    output += severityLine + '\n\n';

    // Table header
    output += this._padRight('Rule', columns.rule) + ' │ ';
    output += this._padRight('Severity', columns.severity) + ' │ ';
    output += this._padRight('File', columns.file) + ' │ ';
    output += 'Details\n';
    
    output += '─'.repeat(columns.rule) + '─┼─';
    output += '─'.repeat(columns.severity) + '─┼─';
    output += '─'.repeat(columns.file) + '─┼─';
    output += '─'.repeat(columns.details) + '\n';

    // Table rows
    violations.forEach(violation => {
      const rule = this._padRight(violation.rule || 'Unknown', columns.rule);
      const severity = this._padRight(violation.severity || 'medium', columns.severity);
      const file = this._padRight(this._truncatePath(violation.file || 'N/A'), columns.file);
      const details = this._truncateDetails(violation.details || 'No details', columns.details);
      
      output += `${rule} │ ${severity} │ ${file} │ ${details}\n`;
      
      // Add line number if available
      if (violation.line) {
        output += ' '.repeat(columns.rule + columns.severity + columns.file + 9);
        output += `└─ Line: ${violation.line}\n`;
      }
    });

    return output;
  }

  /**
   * Format violations as JSON string
   * @param {Array} violations - Array of violation objects
   * @returns {string} JSON formatted output
   */
  formatJson(violations) {
    if (!Array.isArray(violations)) {
      violations = [];
    }

    const report = {
      timestamp: this.config.includeTimestamp ? new Date().toISOString() : undefined,
      summary: {
        total: violations.length,
        bySeverity: this._countBySeverity(violations)
      },
      violations: violations.map(v => ({
        rule: v.rule || 'Unknown',
        severity: v.severity || 'medium',
        file: v.file || null,
        line: v.line || null,
        column: v.column || null,
        details: v.details || null,
        category: v.category || null,
        fixable: v.fixable !== undefined ? v.fixable : false
      }))
    };

    // Remove undefined fields
    if (!report.timestamp) delete report.timestamp;

    return this.config.pretty 
      ? JSON.stringify(report, null, 2)
      : JSON.stringify(report);
  }

  // Private helper methods
  _countBySeverity(violations) {
    return violations.reduce((acc, v) => {
      const severity = (v.severity || 'medium').toLowerCase();
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
  }

  _padRight(str, length) {
    return str.length > length 
      ? str.substring(0, length - 3) + '...'
      : str.padEnd(length);
  }

  _truncatePath(path, maxLength = 30) {
    if (!path || path.length <= maxLength) return path;
    
    const parts = path.split('/');
    if (parts.length <= 2) return '...' + path.substring(path.length - maxLength + 3);
    
    const fileName = parts[parts.length - 1];
    const parentDir = parts[parts.length - 2];
    const truncated = `.../${parentDir}/${fileName}`;
    
    return truncated.length > maxLength 
      ? '...' + path.substring(path.length - maxLength + 3)
      : truncated;
  }

  _truncateDetails(details, maxLength) {
    if (!details || details.length <= maxLength) return details;
    return details.substring(0, maxLength - 3) + '...';
  }
}