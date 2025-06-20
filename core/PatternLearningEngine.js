/**
 * Purpose: Learns patterns of issues for future detection enhancement
 * Dependencies: Node.js std lib
 * API: PatternLearningEngine().learn(report).getLearnedPatterns().reset()
 */

export class PatternLearningEngine {
  constructor() {
    // Model structure: { issueType: { count: number, files: Set<string> } }
    this.patternModel = {};
  }

  /**
   * Learn patterns from a scan report
   * @param {object} report - Scan report with vision.files structure
   * @returns {void}
   */
  learn(report) {
    // Validate report structure
    if (!report || !report.vision || !report.vision.files) {
      return;
    }

    // Process each file in the report
    Object.entries(report.vision.files).forEach(([filePath, fileData]) => {
      if (!fileData.issues || !Array.isArray(fileData.issues)) {
        return;
      }

      // Process each issue in the file
      fileData.issues.forEach(issue => {
        // Handle missing type by categorizing as 'unknown'
        const issueType = issue.type || 'unknown';

        // Initialize pattern entry if new
        if (!this.patternModel[issueType]) {
          this.patternModel[issueType] = {
            count: 0,
            files: new Set()
          };
        }

        // Update pattern statistics
        this.patternModel[issueType].count++;
        this.patternModel[issueType].files.add(filePath);
      });
    });
  }

  /**
   * Get learned patterns as a deep clone
   * @returns {object} Deep clone of pattern model
   */
  getLearnedPatterns() {
    // Create deep clone with Sets converted to Arrays
    const clone = {};

    Object.entries(this.patternModel).forEach(([issueType, data]) => {
      clone[issueType] = {
        count: data.count,
        files: Array.from(data.files)
      };
    });

    return clone;
  }

  /**
   * Reset the pattern model for new sessions or projects
   * @returns {void}
   */
  reset() {
    this.patternModel = {};
  }
}

// Example usage:
// const engine = new PatternLearningEngine();
// engine.learn(scanReport1);
// engine.learn(scanReport2);
// const patterns = engine.getLearnedPatterns();
// console.log(patterns);
// Output: {
//   'naming-convention': { count: 45, files: ['file1.js', 'file2.js'] },
//   'missing-jsdoc': { count: 23, files: ['utils.js', 'helpers.js'] },
//   'unknown': { count: 3, files: ['legacy.js'] }
// }
// engine.reset(); // Clear for new project