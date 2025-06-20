/**
 * resultsRenderer.js
 * Purpose: Renders Eye of Sauron scan results to DOM in a browser-safe manner
 * Dependencies: None (pure browser JavaScript)
 * Public API: renderScanResults(report, containerId)
 */

class ResultsRenderer {
  constructor() {
    this.issueTypeIcons = {
      'invisible-char': '👻',
      'homoglyph': '🎭',
      'smart-quote': '📝',
      'tab-space': '⚡',
      'excessive-newlines': '📏',
      'memory-leak': '💧',
      'listener-leak': '🔊',
      'missing-method': '❌',
      'contract-violation': '📜',
      'dependency-risk': '🔗',
      'technical-debt': '💰',
      'security-risk': '🔒'
    };

    this.severityColors = {
      'critical': '#dc2626',
      'high': '#ea580c',
      'medium': '#f59e0b',
      'low': '#84cc16',
      'info': '#06b6d4'
    };
  }

  /**
   * Main render function - updates DOM with scan results
   * @param {Object} report - Scan report from EyeOfSauronOmniscient
   * @param {string} containerId - ID of container element
   */
  renderScanResults(report, containerId = 'results-container') {
    const container = document.getElementById(containerId);
    if (!container) {

      return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Add results wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'scan-results-wrapper';

    // Render summary
    wrapper.appendChild(this.renderSummary(report));

    // Render file issues
    if (report.vision && report.vision.files) {
      wrapper.appendChild(this.renderFileIssues(report.vision.files));
    }

    // Render metrics if available
    if (report.metrics) {
      wrapper.appendChild(this.renderMetrics(report.metrics));
    }

    container.appendChild(wrapper);
  }

  /**
   * Renders scan summary section
   */
  renderSummary(report) {
    const summary = document.createElement('div');
    summary.className = 'scan-summary';

    const totalIssues = this.countTotalIssues(report);
    const fileCount = report.vision?.files ? Object.keys(report.vision.files).length : 0;

    summary.innerHTML = `
      <h2>👁️ Scan Summary</h2>
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${fileCount}</div>
          <div class="stat-label">Files Scanned</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalIssues}</div>
          <div class="stat-label">Issues Found</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${report.profile || 'standard'}</div>
          <div class="stat-label">Scan Profile</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.formatDuration(report.duration)}</div>
          <div class="stat-label">Scan Duration</div>
        </div>
      </div>
    `;

    return summary;
  }

  /**
   * Renders file issues section
   */
  renderFileIssues(files) {
    const section = document.createElement('div');
    section.className = 'file-issues-section';

    const header = document.createElement('h2');
    header.textContent = '📁 File Issues';
    section.appendChild(header);

    const fileList = document.createElement('div');
    fileList.className = 'file-list';

    // Sort files by issue count (descending)
    const sortedFiles = Object.entries(files).
    sort((a, b) => (b[1].issues?.length || 0) - (a[1].issues?.length || 0));

    sortedFiles.forEach(([filePath, fileData]) => {
      if (fileData.issues && fileData.issues.length > 0) {
        fileList.appendChild(this.renderFileCard(filePath, fileData));
      }
    });

    if (fileList.children.length === 0) {
      const noIssues = document.createElement('div');
      noIssues.className = 'no-issues';
      noIssues.textContent = '✅ No issues found!';
      fileList.appendChild(noIssues);
    }

    section.appendChild(fileList);
    return section;
  }

  /**
   * Renders individual file card with issues
   */
  renderFileCard(filePath, fileData) {
    const card = document.createElement('div');
    card.className = 'file-card';

    // File header
    const header = document.createElement('div');
    header.className = 'file-header';
    header.innerHTML = `
      <span class="file-path">${this.escapeHtml(filePath)}</span>
      <span class="issue-count">${fileData.issues.length} issue${fileData.issues.length !== 1 ? 's' : ''}</span>
    `;
    card.appendChild(header);

    // Issues list
    const issuesList = document.createElement('div');
    issuesList.className = 'issues-list';

    // Group issues by type
    const groupedIssues = this.groupIssuesByType(fileData.issues);

    Object.entries(groupedIssues).forEach(([type, issues]) => {
      const group = document.createElement('div');
      group.className = 'issue-group';

      const groupHeader = document.createElement('div');
      groupHeader.className = 'issue-group-header';
      groupHeader.innerHTML = `
        <span class="issue-type">
          ${this.issueTypeIcons[type] || '⚠️'} ${this.formatIssueType(type)}
        </span>
        <span class="issue-type-count">${issues.length}</span>
      `;
      group.appendChild(groupHeader);

      const issueItems = document.createElement('div');
      issueItems.className = 'issue-items';

      issues.forEach((issue) => {
        issueItems.appendChild(this.renderIssue(issue));
      });

      group.appendChild(issueItems);
      issuesList.appendChild(group);
    });

    card.appendChild(issuesList);
    return card;
  }

  /**
   * Renders individual issue
   */
  renderIssue(issue) {
    const item = document.createElement('div');
    item.className = 'issue-item';

    const severity = issue.severity || 'medium';
    item.style.borderLeftColor = this.severityColors[severity];

    let locationInfo = '';
    if (issue.line !== undefined) {
      locationInfo = `<span class="issue-location">Line ${issue.line}`;
      if (issue.column !== undefined) {
        locationInfo += `:${issue.column}`;
      }
      locationInfo += '</span>';
    }

    item.innerHTML = `
      <div class="issue-header">
        <span class="issue-severity severity-${severity}">${severity.toUpperCase()}</span>
        ${locationInfo}
      </div>
      <div class="issue-message">${this.escapeHtml(issue.message)}</div>
      ${issue.suggestion ? `<div class="issue-suggestion">💡 ${this.escapeHtml(issue.suggestion)}</div>` : ''}
    `;

    return item;
  }

  /**
   * Renders metrics section
   */
  renderMetrics(metrics) {
    const section = document.createElement('div');
    section.className = 'metrics-section';

    const header = document.createElement('h2');
    header.textContent = '📊 Scan Metrics';
    section.appendChild(header);

    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';

    const metricItems = [
    { label: 'Files Processed', value: metrics.filesProcessed || 0 },
    { label: 'Total Lines', value: metrics.totalLines || 0 },
    { label: 'Processing Rate', value: `${metrics.filesPerSecond || 0} files/sec` },
    { label: 'Memory Used', value: this.formatBytes(metrics.memoryUsed || 0) }];


    metricItems.forEach((metric) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <div class="metric-value">${metric.value}</div>
        <div class="metric-label">${metric.label}</div>
      `;
      metricsGrid.appendChild(card);
    });

    section.appendChild(metricsGrid);
    return section;
  }

  // Utility functions

  countTotalIssues(report) {
    if (!report.vision?.files) return 0;

    return Object.values(report.vision.files).reduce((total, file) => {
      return total + (file.issues?.length || 0);
    }, 0);
  }

  groupIssuesByType(issues) {
    const grouped = {};
    issues.forEach((issue) => {
      const type = issue.type || 'unknown';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(issue);
    });
    return grouped;
  }

  formatIssueType(type) {
    return type.
    split('-').
    map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
    join(' ');
  }

  formatDuration(ms) {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor(ms % 60000 / 1000)}s`;
  }

  formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResultsRenderer;
}

// Create global instance for browser use
if (typeof window !== 'undefined') {
  window.ResultsRenderer = ResultsRenderer;

  // Convenience function for direct use
  window.renderScanResults = function (report, containerId) {
    const renderer = new ResultsRenderer();
    renderer.renderScanResults(report, containerId);
  };
}