/**
 * Purpose: Suggests optimal scan profile for speed vs depth based on prior run metrics
 * Dependencies: Node.js standard library only
 * Public API:
 *   - TimeEffortOptimizer().suggestProfile(metrics) - Analyze metrics and suggest scan profile
 */

class TimeEffortOptimizer {
  constructor() {
    // No initialization needed for stateless optimizer
  }

  /**
   * Suggest optimal scan profile based on metrics
   * @param {object} metrics - Metrics object containing:
   *   - duration: number (seconds)
   *   - issueCount: number
   *   - fileCount: number
   *   - criticalIssues: number (optional)
   * @returns {string} Suggested profile: 'quick', 'deep', or 'quantum'
   */
  suggestProfile(metrics) {
    if (!metrics || typeof metrics !== 'object') {
      return 'quick'; // Default to quick scan if no metrics provided
    }

    const {
      duration = 0,
      issueCount = 0,
      fileCount = 0,
      criticalIssues = 0
    } = metrics;

    // Calculate issue density (issues per file)
    const issueDensity = fileCount > 0 ? issueCount / fileCount : 0;

    // Priority 1: Critical issues always trigger quantum scan
    if (criticalIssues > 0) {
      return 'quantum';
    }

    // Priority 2: Long duration scans should be optimized for speed
    if (duration > 60) {
      // Only suggest quick if issue density is also low
      if (issueDensity < 0.5) {
        return 'quick';
      }
      // For long scans with higher density, still prefer quick to save time
      return 'quick';
    }

    // Priority 3: Fast scans with high issue density warrant deeper analysis
    if (duration < 30 && issueDensity > 2) {
      return 'deep';
    }

    // Priority 4: High absolute issue count needs thorough analysis
    if (issueCount > 50) {
      return 'deep';
    }

    // Default to balanced deep scan for everything else
    return 'deep';
  }
}

export { TimeEffortOptimizer };