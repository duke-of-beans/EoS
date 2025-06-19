/**
 * Purpose: Merges multiple scan reports into one normalized report with deduplication
 * Dependencies: Node.js std lib
 * Public API: 
 *   - new SauronScanMerger()
 *   - merge(reports) - Merges array of scan reports into single normalized report
 */

export default class SauronScanMerger {
  constructor() {
    this.seenIssues = new Set();
  }

  /**
   * Merges multiple scan reports into a single normalized report
   * @param {Array<Object>} reports - Array of scan report objects
   * @returns {Object} Merged and normalized report
   */
  merge(reports) {
    // Handle empty or invalid input
    if (!Array.isArray(reports) || reports.length === 0) {
      return this._createEmptyReport();
    }

    // Filter out malformed reports
    const validReports = reports.filter(report => 
      report && typeof report === 'object'
    );

    if (validReports.length === 0) {
      return this._createEmptyReport();
    }

    // Initialize merged report structure
    const merged = {
      timestamp: new Date().toISOString(),
      scanType: 'merged',
      files: {},
      summary: {
        totalFiles: 0,
        totalIssues: 0,
        issuesBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        issuesByType: {}
      }
    };

    // Reset seen issues for this merge
    this.seenIssues.clear();

    // Process each report
    for (const report of validReports) {
      this._mergeReport(merged, report);
    }

    // Calculate final totals
    merged.summary.totalFiles = Object.keys(merged.files).length;

    // Return deep clone to prevent external modifications
    return this._deepClone(merged);
  }

  /**
   * Merges a single report into the accumulated merged report
   * @private
   */
  _mergeReport(merged, report) {
    // Merge files
    if (report.files && typeof report.files === 'object') {
      for (const [filePath, fileData] of Object.entries(report.files)) {
        if (!merged.files[filePath]) {
          merged.files[filePath] = {
            path: filePath,
            issues: []
          };
        }

        // Merge issues for this file
        if (Array.isArray(fileData.issues)) {
          for (const issue of fileData.issues) {
            this._mergeIssue(merged, filePath, issue);
          }
        }
      }
    }

    // Merge summary stats if available
    if (report.summary && typeof report.summary === 'object') {
      this._mergeSummary(merged.summary, report.summary);
    }
  }

  /**
   * Merges a single issue with deduplication
   * @private
   */
  _mergeIssue(merged, filePath, issue) {
    // Validate issue structure
    if (!issue || typeof issue !== 'object') {
      return;
    }

    // Create unique key for deduplication
    const issueKey = this._createIssueKey(filePath, issue);
    
    // Skip if we've already seen this issue
    if (this.seenIssues.has(issueKey)) {
      return;
    }

    this.seenIssues.add(issueKey);

    // Normalize issue structure
    const normalizedIssue = {
      type: issue.type || 'unknown',
      severity: issue.severity || 'medium',
      line: issue.line || 0,
      column: issue.column || 0,
      message: issue.message || '',
      rule: issue.rule || '',
      file: filePath
    };

    // Add to merged report
    merged.files[filePath].issues.push(normalizedIssue);
    merged.summary.totalIssues++;

    // Update severity counts
    const severity = normalizedIssue.severity.toLowerCase();
    if (merged.summary.issuesBySeverity.hasOwnProperty(severity)) {
      merged.summary.issuesBySeverity[severity]++;
    }

    // Update type counts
    const type = normalizedIssue.type;
    merged.summary.issuesByType[type] = (merged.summary.issuesByType[type] || 0) + 1;
  }

  /**
   * Creates a unique key for issue deduplication
   * @private
   */
  _createIssueKey(filePath, issue) {
    const type = issue.type || 'unknown';
    const line = issue.line || 0;
    const column = issue.column || 0;
    const message = (issue.message || '').substring(0, 50); // Use first 50 chars
    
    return `${filePath}:${type}:${line}:${column}:${message}`;
  }

  /**
   * Merges summary statistics
   * @private
   */
  _mergeSummary(targetSummary, sourceSummary) {
    // Note: File and issue counts are recalculated from actual data
    // This method is for merging any additional summary data
    
    // Merge any custom fields that might exist
    for (const [key, value] of Object.entries(sourceSummary)) {
      if (key !== 'totalFiles' && 
          key !== 'totalIssues' && 
          key !== 'issuesBySeverity' && 
          key !== 'issuesByType') {
        // Preserve custom summary fields
        if (typeof value === 'number' && typeof targetSummary[key] === 'number') {
          targetSummary[key] = (targetSummary[key] || 0) + value;
        } else if (!targetSummary[key]) {
          targetSummary[key] = this._deepClone(value);
        }
      }
    }
  }

  /**
   * Creates an empty report structure
   * @private
   */
  _createEmptyReport() {
    return {
      timestamp: new Date().toISOString(),
      scanType: 'merged',
      files: {},
      summary: {
        totalFiles: 0,
        totalIssues: 0,
        issuesBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        issuesByType: {}
      }
    };
  }

  /**
   * Deep clones an object to prevent external modifications
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this._deepClone(item));
    }

    if (obj instanceof Set) {
      return new Set([...obj].map(item => this._deepClone(item)));
    }

    if (obj instanceof Map) {
      const cloned = new Map();
      for (const [key, value] of obj) {
        cloned.set(this._deepClone(key), this._deepClone(value));
      }
      return cloned;
    }

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }

    return cloned;
  }
}