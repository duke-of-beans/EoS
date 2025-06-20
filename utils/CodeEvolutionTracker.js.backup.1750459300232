/**
 * Purpose: Tracks issue evolution between scans
 * Dependencies: Node.js std lib
 * API: CodeEvolutionTracker().compareReports(prev, current)
 */

export class CodeEvolutionTracker {
  constructor() {
    // No initialization needed for this pure utility
  }

  /**
   * Compares two scan reports to track issue evolution
   * @param {Object} previous - Previous scan report with vision.files structure
   * @param {Object} current - Current scan report with vision.files structure
   * @returns {Object} Evolution analysis with newIssues, resolvedIssues, unchangedIssues
   */
  compareReports(previous, current) {
    const previousIssues = this._extractAllIssues(previous);
    const currentIssues = this._extractAllIssues(current);
    
    // Create maps for easier lookup
    const previousMap = new Map(previousIssues.map(issue => [issue.key, issue]));
    const currentMap = new Map(currentIssues.map(issue => [issue.key, issue]));
    
    const newIssues = currentIssues.filter(issue => !previousMap.has(issue.key));
    const resolvedIssues = previousIssues.filter(issue => !currentMap.has(issue.key));
    
    // For unchanged issues, merge properties to show evolution
    const unchangedIssues = currentIssues
      .filter(issue => previousMap.has(issue.key))
      .map(currentIssue => {
        const previousIssue = previousMap.get(currentIssue.key);
        return {
          ...currentIssue,
          _previous: previousIssue,
          _hasChanged: this._detectPropertyChanges(previousIssue, currentIssue)
        };
      });
    
    return {
      newIssues,
      resolvedIssues,
      unchangedIssues,
      summary: {
        totalNew: newIssues.length,
        totalResolved: resolvedIssues.length,
        totalUnchanged: unchangedIssues.length,
        netChange: newIssues.length - resolvedIssues.length
      }
    };
  }

  /**
   * Extracts all issues from a report into a flat array with keys
   * @private
   * @param {Object} report - Scan report with vision.files structure
   * @returns {Array} Flat array of all issues with keys
   */
  _extractAllIssues(report) {
    const issues = [];
    
    if (!report?.vision?.files) {
      return issues;
    }
    
    for (const [filePath, fileData] of Object.entries(report.vision.files)) {
      if (!fileData?.issues || !Array.isArray(fileData.issues)) {
        continue;
      }
      
      for (const issue of fileData.issues) {
        // Validate and normalize issue fields
        const normalizedIssue = this._normalizeIssue(issue);
        
        // Create a unique key for each issue based on file, type, and line
        const key = this._generateIssueKey(filePath, normalizedIssue);
        
        issues.push({
          ...normalizedIssue,
          filePath,
          key
        });
      }
    }
    
    return issues;
  }

  /**
   * Generates a unique key for an issue based on file, type, and line
   * @private
   * @param {string} filePath - Path to the file containing the issue
   * @param {Object} issue - Issue object with type and line properties
   * @returns {string} Unique key for the issue
   */
  _generateIssueKey(filePath, issue) {
    // Use file path, issue type, and line number as minimal unique identifier
    const type = issue.type || 'unknown';
    const line = issue.line || 0;
    
    return `${filePath}::${type}::${line}`;
  }

  /**
   * Normalizes and validates issue fields for consistency
   * @private
   * @param {Object} issue - Raw issue object
   * @returns {Object} Normalized issue with validated fields
   */
  _normalizeIssue(issue) {
    return {
      ...issue,
      type: this._validateType(issue.type),
      line: this._validateLine(issue.line),
      severity: this._validateSeverity(issue.severity),
      message: this._validateMessage(issue.message),
      rule: issue.rule || null,
      timestamp: issue.timestamp || new Date().toISOString()
    };
  }

  /**
   * Validates issue type field
   * @private
   */
  _validateType(type) {
    if (!type || typeof type !== 'string') {
      return 'unknown';
    }
    return type.trim().toLowerCase();
  }

  /**
   * Validates line number field
   * @private
   */
  _validateLine(line) {
    const parsed = parseInt(line, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }

  /**
   * Validates severity field
   * @private
   */
  _validateSeverity(severity) {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!severity || typeof severity !== 'string') {
      return 'medium';
    }
    const normalized = severity.trim().toLowerCase();
    return validSeverities.includes(normalized) ? normalized : 'medium';
  }

  /**
   * Validates message field
   * @private
   */
  _validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return 'No message provided';
    }
    return message.trim();
  }

  /**
   * Detects property changes between two versions of an issue
   * @private
   * @param {Object} previous - Previous version of the issue
   * @param {Object} current - Current version of the issue
   * @returns {Object} Object describing which properties changed
   */
  _detectPropertyChanges(previous, current) {
    const changes = {};
    const ignoreKeys = ['key', 'filePath', '_previous', '_hasChanged', 'timestamp'];
    
    // Check all keys from both objects
    const allKeys = new Set([
      ...Object.keys(previous),
      ...Object.keys(current)
    ]);
    
    for (const key of allKeys) {
      if (ignoreKeys.includes(key)) continue;
      
      if (!(key in previous)) {
        changes[key] = { added: true, newValue: current[key] };
      } else if (!(key in current)) {
        changes[key] = { removed: true, oldValue: previous[key] };
      } else if (previous[key] !== current[key]) {
        changes[key] = {
          modified: true,
          oldValue: previous[key],
          newValue: current[key]
        };
      }
    }
    
    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Groups issues by type for summary statistics
   * @param {Array} issues - Array of issues to group
   * @returns {Object} Issues grouped by type with counts
   */
  groupByType(issues) {
    const grouped = {};
    
    for (const issue of issues) {
      const type = issue.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = {
          count: 0,
          issues: []
        };
      }
      grouped[type].count++;
      grouped[type].issues.push(issue);
    }
    
    return grouped;
  }

  /**
   * Groups issues by file for summary statistics
   * @param {Array} issues - Array of issues to group
   * @returns {Object} Issues grouped by file with counts
   */
  groupByFile(issues) {
    const grouped = {};
    
    for (const issue of issues) {
      const filePath = issue.filePath || 'unknown';
      if (!grouped[filePath]) {
        grouped[filePath] = {
          count: 0,
          issues: []
        };
      }
      grouped[filePath].count++;
      grouped[filePath].issues.push(issue);
    }
    
    return grouped;
  }

  /**
   * Generates a detailed evolution report with statistics
   * @param {Object} previous - Previous scan report
   * @param {Object} current - Current scan report
   * @returns {Object} Detailed evolution report with statistics
   */
  generateEvolutionReport(previous, current) {
    const comparison = this.compareReports(previous, current);
    
    return {
      ...comparison,
      statistics: {
        newByType: this.groupByType(comparison.newIssues),
        resolvedByType: this.groupByType(comparison.resolvedIssues),
        unchangedByType: this.groupByType(comparison.unchangedIssues),
        newByFile: this.groupByFile(comparison.newIssues),
        resolvedByFile: this.groupByFile(comparison.resolvedIssues),
        unchangedByFile: this.groupByFile(comparison.unchangedIssues)
      },
      timestamp: new Date().toISOString()
    };
  }
}