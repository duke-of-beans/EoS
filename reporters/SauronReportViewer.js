/**
 * Purpose: Renders Eye of Sauron scan reports to terminal or browser
 * Dependencies: Node.js std lib, chalk (optional for colorized console output)
 * Public API:
 *   - SauronReportViewer(config).renderToConsole(report) → void
 *   - SauronReportViewer(config).renderToHtml(report) → string
 */

export class SauronReportViewer {
  constructor(config = {}) {
    this.config = {
      topIssuesLimit: config.topIssuesLimit || 10,
      useColor: config.useColor !== false, // default true
      showFileDetails: config.showFileDetails !== false,
      title: config.title || 'Eye of Sauron Code Quality Analysis Report',
      // Severity mapping configuration
      severityMap: config.severityMap || {
        'APOCALYPSE': 'critical',
        'DANGER': 'major',
        'WARNING': 'minor',
        'NOTICE': 'info',
        // Fallback for standard names
        'critical': 'critical',
        'major': 'major',
        'minor': 'minor',
        'info': 'info'
      },
      // Theme configuration for HTML
      theme: config.theme || {},
      externalStylesheet: config.externalStylesheet || null
    };

    // Try to load chalk if available and color is enabled
    this.chalk = null;
    if (this.config.useColor) {
      try {
        this.chalk = await import('chalk').then(m => m.default);
      } catch {
        // Chalk not available, fallback to plain text
      }
    }
  }

  /**
   * Renders report to console with optional colorization
   * @param {object} report - Scan report object
   */
  renderToConsole(report) {
    const c = this.chalk || this._noColorFallback();

    console.log('\n' + c.bold(c.yellow('═'.repeat(60))));
    console.log(c.bold(c.yellow('║')) + c.bold(c.white('  EYE OF SAURON SCAN REPORT'.padEnd(58))) + c.bold(c.yellow('║')));
    console.log(c.bold(c.yellow('═'.repeat(60))) + '\n');

    // Summary section
    console.log(c.bold(c.cyan('📊 SUMMARY')));
    console.log(c.gray('─'.repeat(40)));
    console.log(`${c.bold('Files Scanned:')} ${report.totalFiles || 0}`);
    console.log(`${c.bold('Total Issues:')} ${this._getTotalIssues(report)}`);

    // Dynamic severity counts
    const severityCounts = this._getSeverityCounts(report);
    Object.entries(severityCounts).forEach(([severity, count]) => {
      const normalizedSeverity = this._normalizeSeverity(severity);
      const color = this._getLevelColor(normalizedSeverity, c);
      console.log(`${c.bold(`${severity} Issues:`)} ${color(count)}`);
    });

    console.log(`${c.bold('Duration:')} ${report.duration || 'N/A'}ms`);
    console.log();

    // Top issues section
    const topIssues = this._getTopIssues(report);
    if (topIssues.length > 0) {
      console.log(c.bold(c.cyan(`🔍 TOP ${Math.min(topIssues.length, this.config.topIssuesLimit)} ISSUES`)));
      console.log(c.gray('─'.repeat(40)));

      topIssues.slice(0, this.config.topIssuesLimit).forEach((issue, idx) => {
        const normalizedLevel = this._normalizeSeverity(issue.level);
        const levelColor = this._getLevelColor(normalizedLevel, c);
        console.log(`\n${c.bold(`${idx + 1}.`)} ${levelColor(issue.level.toUpperCase())} - ${issue.category}`);
        console.log(`   ${c.gray('File:')} ${issue.file}`);
        console.log(`   ${c.gray('Line:')} ${issue.line || 'N/A'}`);
        console.log(`   ${c.gray('Desc:')} ${issue.description}`);
        if (issue.suggestion) {
          console.log(`   ${c.gray('Fix:')} ${c.green(issue.suggestion)}`);
        }
      });
    } else {
      console.log(c.green('✨ No issues found!'));
    }

    // File details section (optional)
    if (this.config.showFileDetails && report.vision?.files) {
      console.log('\n' + c.bold(c.cyan('📁 FILE DETAILS')));
      console.log(c.gray('─'.repeat(40)));

      Object.entries(report.vision.files).forEach(([file, data]) => {
        const issueCount = data.issues?.length || 0;
        const statusIcon = issueCount === 0 ? c.green('✓') : c.red('✗');
        console.log(`${statusIcon} ${file} - ${issueCount} issue(s)`);
      });
    }

    console.log('\n' + c.gray('═'.repeat(60)) + '\n');
  }

  /**
   * Renders report as HTML string
   * @param {object} report - Scan report object
   * @returns {string} Complete HTML document
   */
  renderToHtml(report) {
    const totalIssues = this._getTotalIssues(report);
    const severityCounts = this._getSeverityCounts(report);
    const topIssues = this._getTopIssues(report);

    // Theme defaults with overrides
    const theme = {
      primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      criticalColor: '#dc3545',
      majorColor: '#ffc107',
      minorColor: '#17a2b8',
      infoColor: '#6c757d',
      successColor: '#28a745',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      ...this.config.theme
    };

    const inlineStyles = this.config.externalStylesheet ? '' : `
    <style>
        body {
            font-family: ${theme.fontFamily};
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: ${theme.primaryGradient};
            color: white;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { margin: 0; font-size: 2.5rem; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        .stat-label {
            color: #666;
            font-size: 0.875rem;
            text-transform: uppercase;
        }
        .critical, .APOCALYPSE { color: ${theme.criticalColor}; }
        .major, .DANGER { color: ${theme.majorColor}; }
        .minor, .WARNING { color: ${theme.minorColor}; }
        .info, .NOTICE { color: ${theme.infoColor}; }
        .success { color: ${theme.successColor}; }
        .issues-section {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            margin: 2rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .issue {
            border-left: 4px solid #dee2e6;
            padding: 1rem;
            margin: 1rem 0;
            background: #f8f9fa;
            border-radius: 0 4px 4px 0;
        }
        .issue.critical, .issue.APOCALYPSE { border-left-color: ${theme.criticalColor}; }
        .issue.major, .issue.DANGER { border-left-color: ${theme.majorColor}; }
        .issue.minor, .issue.WARNING { border-left-color: ${theme.minorColor}; }
        .issue.info, .issue.NOTICE { border-left-color: ${theme.infoColor}; }
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .issue-level {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.875rem;
        }
        .issue-file {
            color: #666;
            font-family: monospace;
            font-size: 0.875rem;
        }
        .issue-description {
            margin: 0.5rem 0;
        }
        .issue-suggestion {
            color: ${theme.successColor};
            font-style: italic;
            margin-top: 0.5rem;
        }
        .no-issues {
            text-align: center;
            padding: 3rem;
            color: ${theme.successColor};
        }
        .footer {
            text-align: center;
            color: #666;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #dee2e6;
        }
    </style>`;

    const stylesheetLink = this.config.externalStylesheet ?
      `<link rel="stylesheet" href="${this._escapeHtml(this.config.externalStylesheet)}">` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this._escapeHtml(this.config.title)}</title>
    ${stylesheetLink}
    ${inlineStyles}
</head>
<body>
    <div class="header">
        <h1>👁️ ${this._escapeHtml(this.config.title)}</h1>
        <p>Comprehensive code quality analysis</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <div class="stat-label">Files Scanned</div>
            <div class="stat-value">${report.totalFiles || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Issues</div>
            <div class="stat-value ${totalIssues === 0 ? 'success' : ''}">${totalIssues}</div>
        </div>
        ${Object.entries(severityCounts).map(([severity, count]) => `
        <div class="stat-card">
            <div class="stat-label">${this._escapeHtml(severity)}</div>
            <div class="stat-value ${severity}">${count}</div>
        </div>
        `).join('')}
        <div class="stat-card">
            <div class="stat-label">Scan Duration</div>
            <div class="stat-value">${report.duration || 0}ms</div>
        </div>
    </div>

    <div class="issues-section">
        <h2>🔍 Issues Found</h2>
        ${topIssues.length === 0 ?
            '<div class="no-issues">✨ No issues found! Your code is clean.</div>' :
            topIssues.slice(0, this.config.topIssuesLimit).map((issue, idx) => `
                <div class="issue ${issue.level}">
                    <div class="issue-header">
                        <span class="issue-level ${issue.level}">${issue.level}</span>
                        <span class="issue-file">${this._escapeHtml(issue.file)}${issue.line ? `:${issue.line}` : ''}</span>
                    </div>
                    <div class="issue-description">
                        <strong>${this._escapeHtml(issue.category)}</strong>: ${this._escapeHtml(issue.description)}
                    </div>
                    ${issue.suggestion ?
                        `<div class="issue-suggestion">💡 ${this._escapeHtml(issue.suggestion)}</div>` :
                        ''}
                </div>
            `).join('')
        }
    </div>

    <div class="footer">
        <p>Generated by Eye of Sauron • ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
  }

  // Private helper methods
  _noColorFallback() {
    return {
      bold: (s) => s,
      red: (s) => s,
      yellow: (s) => s,
      green: (s) => s,
      blue: (s) => s,
      cyan: (s) => s,
      gray: (s) => s,
      white: (s) => s
    };
  }

  _normalizeSeverity(severity) {
    // Map scanner severities to standard levels
    return this.config.severityMap[severity] || severity.toLowerCase();
  }

  _getTotalIssues(report) {
    if (!report.vision?.files) return 0;
    return Object.values(report.vision.files)
      .reduce((total, file) => total + (file.issues?.length || 0), 0);
  }

  _getIssuesByLevel(report, level) {
    if (!report.vision?.files) return 0;
    return Object.values(report.vision.files)
      .reduce((total, file) => {
        const levelIssues = (file.issues || []).filter(i => i.level === level);
        return total + levelIssues.length;
      }, 0);
  }

  _getSeverityCounts(report) {
    if (!report.vision?.files) return {};

    const counts = {};
    Object.values(report.vision.files).forEach(file => {
      (file.issues || []).forEach(issue => {
        counts[issue.level] = (counts[issue.level] || 0) + 1;
      });
    });

    // Order by severity (using normalized values for ordering)
    const severityOrder = ['APOCALYPSE', 'critical', 'DANGER', 'major', 'WARNING', 'minor', 'NOTICE', 'info'];
    const orderedCounts = {};
    severityOrder.forEach(sev => {
      if (counts[sev]) orderedCounts[sev] = counts[sev];
    });

    // Add any unmapped severities at the end
    Object.keys(counts).forEach(sev => {
      if (!orderedCounts[sev]) orderedCounts[sev] = counts[sev];
    });

    return orderedCounts;
  }

  _getTopIssues(report) {
    if (!report.vision?.files) return [];

    const allIssues = [];
    Object.entries(report.vision.files).forEach(([file, data]) => {
      (data.issues || []).forEach(issue => {
        allIssues.push({ ...issue, file });
      });
    });

    // Sort by level priority using normalized severities
    const levelPriority = {
      critical: 4,
      major: 3,
      minor: 2,
      info: 1
    };

    return allIssues.sort((a, b) => {
      const aNorm = this._normalizeSeverity(a.level);
      const bNorm = this._normalizeSeverity(b.level);
      const priorityDiff = (levelPriority[bNorm] || 0) - (levelPriority[aNorm] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.line || 0) - (b.line || 0);
    });
  }

  _getLevelColor(level, c) {
    const normalizedLevel = this._normalizeSeverity(level);
    switch (normalizedLevel) {
      case 'critical': return c.red;
      case 'major': return c.yellow;
      case 'minor': return c.blue;
      case 'info': return c.cyan;
      default: return c.gray;
    }
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}