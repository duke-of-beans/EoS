/**
 * Purpose: Multi-format report formatter for Eye of Sauron
 * Dependencies: chalk (optional), Node.js standard lib
 * Public API: OmniReportFormatter(config).format(report, outputTypes)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Attempt to load chalk for colorization, fallback gracefully
let chalk;
let chalkAvailable = false;
try {
  chalk = require('chalk');
  chalkAvailable = true;
} catch (e) {
  // Chalk not available, will use plain text
  chalk = null;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[OmniReportFormatter] Chalk not available, using plain text output');
  }
}

export class OmniReportFormatter {
  constructor(config = {}) {
    this.config = {
      maxIssuesShown: 3,
      maxPropheciesShown: 3,
      ...config
    };
    this.chalkAvailable = chalkAvailable;
  }

  /**
   * Format report into specified output types
   * @param {object} report - The complete scan report from EyeOfSauronOmniscient
   * @param {string[]} outputTypes - Array of output types (e.g., ['console', 'json'])
   * @returns {Promise<object>} Object with format keys and their outputs
   */
  async format(report, outputTypes = ['console']) {
    const outputs = {};

    for (const type of outputTypes) {
      switch (type) {
        case 'console':
          outputs.console = this._formatConsole(report);
          break;
        case 'json':
          outputs.json = this._formatJson(report);
          break;
        default:
          // Unknown format type, skip silently
          break;
      }
    }

    return outputs;
  }

  /**
   * Format report for console output with optional colorization
   * @private
   */
  _formatConsole(report) {
    const lines = [];

    // Extract summary data
    const filesScanned = Object.keys(report.files || {}).length;
    const totalCharacters = this._calculateTotalCharacters(report);
    const stats = this._calculateStats(report);

    // Header
    lines.push(this._colorize('═══════════════════════════════════════════════════════', 'gray'));
    lines.push(this._colorize('     👁️  EYE OF SAURON OMNISCIENT REPORT 👁️', 'bold'));
    lines.push(this._colorize('═══════════════════════════════════════════════════════', 'gray'));
    lines.push('');

    // Summary line
    const summaryParts = [
      `Files scanned: ${this._colorize(filesScanned, 'cyan')}`,
      `Characters: ${this._colorize(totalCharacters.toLocaleString(), 'cyan')}`,
      `Apocalypses: ${this._colorize(stats.apocalypses, stats.apocalypses > 0 ? 'red' : 'green')}`,
      `Warnings: ${this._colorize(stats.warnings, stats.warnings > 0 ? 'yellow' : 'green')}`,
      `Dangers: ${this._colorize(stats.dangers, stats.dangers > 0 ? 'magenta' : 'green')}`
    ];
    lines.push(summaryParts.join(' | '));
    lines.push('');

    // Apocalyptic issues (first 3)
    const apocalypses = this._collectIssuesBySeverity(report, 'apocalypse');
    if (apocalypses.length > 0) {
      lines.push(this._colorize('🔥 APOCALYPTIC ISSUES:', 'red'));
      lines.push(this._colorize('─────────────────────', 'gray'));

      apocalypses.slice(0, this.config.maxIssuesShown).forEach((issue, idx) => {
        lines.push(`  ${idx + 1}. ${this._colorize(issue.file, 'cyan')}:${this._colorize(issue.line, 'yellow')}`);
        lines.push(`     ${this._colorize('→', 'red')} ${issue.message}`);
        lines.push('');
      });

      if (apocalypses.length > this.config.maxIssuesShown) {
        lines.push(`  ${this._colorize(`... and ${apocalypses.length - this.config.maxIssuesShown} more apocalyptic issues`, 'gray')}`);
        lines.push('');
      }
    }

    // Prophecies (first 3)
    const prophecies = this._collectProphecies(report);
    if (prophecies.length > 0) {
      lines.push(this._colorize('🔮 PROPHECIES:', 'magenta'));
      lines.push(this._colorize('──────────────', 'gray'));

      prophecies.slice(0, this.config.maxPropheciesShown).forEach((prophecy, idx) => {
        lines.push(`  ${idx + 1}. ${prophecy.file ? this._colorize(prophecy.file, 'cyan') : 'Global'}:`);
        lines.push(`     ${this._colorize('→', 'magenta')} ${prophecy.message}`);
        lines.push('');
      });

      if (prophecies.length > this.config.maxPropheciesShown) {
        lines.push(`  ${this._colorize(`... and ${prophecies.length - this.config.maxPropheciesShown} more prophecies`, 'gray')}`);
        lines.push('');
      }
    }

    // Footer
    lines.push(this._colorize('═══════════════════════════════════════════════════════', 'gray'));

    return lines.join('\n');
  }

  /**
   * Format report as JSON with 2-space indentation
   * @private
   */
  _formatJson(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Apply color to text if chalk is available
   * @private
   */
  _colorize(text, color) {
    if (!chalk) return String(text);

    const colorMap = {
      'red': chalk.red,
      'yellow': chalk.yellow,
      'green': chalk.green,
      'cyan': chalk.cyan,
      'magenta': chalk.magenta,
      'gray': chalk.gray,
      'bold': chalk.bold
    };

    const colorFn = colorMap[color];
    return colorFn ? colorFn(text) : String(text);
  }

  /**
   * Calculate total characters across all files
   * @private
   */
  _calculateTotalCharacters(report) {
    let total = 0;

    if (report.files) {
      Object.values(report.files).forEach(fileData => {
        if (fileData.metadata && typeof fileData.metadata.characterCount === 'number') {
          total += fileData.metadata.characterCount;
        }
      });
    }

    return total;
  }

  /**
   * Calculate issue statistics
   * @private
   */
  _calculateStats(report) {
    const stats = {
      apocalypses: 0,
      warnings: 0,
      dangers: 0
    };

    if (report.files) {
      Object.values(report.files).forEach(fileData => {
        if (fileData.issues) {
          fileData.issues.forEach(issue => {
            const severity = (issue.severity || '').toLowerCase();
            switch (severity) {
              case 'apocalypse':
                stats.apocalypses++;
                break;
              case 'warning':
                stats.warnings++;
                break;
              case 'danger':
                stats.dangers++;
                break;
            }
          });
        }
      });
    }

    return stats;
  }

  /**
   * Collect issues by severity level
   * @private
   */
  _collectIssuesBySeverity(report, severity) {
    const issues = [];
    const normalizedSeverity = severity.toLowerCase();

    if (report.files) {
      Object.entries(report.files).forEach(([filepath, fileData]) => {
        if (fileData.issues) {
          fileData.issues
            .filter(issue => (issue.severity || '').toLowerCase() === normalizedSeverity)
            .forEach(issue => {
              issues.push({
                file: filepath,
                line: issue.line || 0,
                message: issue.message || 'Unknown issue',
                ...issue
              });
            });
        }
      });
    }

    // Sort by file then line number
    return issues.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return (a.line || 0) - (b.line || 0);
    });
  }

  /**
   * Collect prophecies from report
   * @private
   */
  _collectProphecies(report) {
    const prophecies = [];

    // File-specific prophecies
    if (report.files) {
      Object.entries(report.files).forEach(([filepath, fileData]) => {
        if (fileData.prophecies && Array.isArray(fileData.prophecies)) {
          fileData.prophecies.forEach(prophecy => {
            prophecies.push({
              file: filepath,
              message: prophecy.message || prophecy,
              ...prophecy
            });
          });
        }
      });
    }

    // Global prophecies
    if (report.prophecies && Array.isArray(report.prophecies)) {
      report.prophecies.forEach(prophecy => {
        prophecies.push({
          file: null,
          message: prophecy.message || prophecy,
          ...prophecy
        });
      });
    }

    return prophecies;
  }
}