/**
 * SauronSecurePipelineSummarizer.js
 * Purpose: Aggregates + reports on multiple pipeline runs for trend analysis
 * Dependencies: Node.js std lib
 * API: SauronSecurePipelineSummarizer().record(), summarize(), export()
 */

export class SauronSecurePipelineSummarizer {
  constructor(config = {}) {
    this.maxRuns = config.maxRuns || 1000;
    this.runs = [];
    this.toolVersion = '1.0.0';
  }

  /**
   * Records a pipeline run summary
   * @param {object} runSummary - Summary object from pipeline run
   * @returns {void}
   */
  record(runSummary) {
    try {
      if (!runSummary || typeof runSummary !== 'object') {
        console.warn('Invalid run summary provided, skipping');
        return;
      }

      // Redact sensitive information
      const sanitized = this._sanitizeRunSummary(runSummary);

      // Add timestamp if not present
      if (!sanitized.timestamp) {
        sanitized.timestamp = new Date().toISOString();
      }

      // Add to runs array
      this.runs.push(sanitized);

      // Cap at maxRuns (remove oldest)
      if (this.runs.length > this.maxRuns) {
        const removed = this.runs.shift();
        , removed oldest run from ${removed.timestamp}`);
      }

      // Log key metrics
      if (sanitized.duration) {

      }
      if (sanitized.totalSize) {

      }
    } catch (error) {
      console.error('Error recording run summary:', error.message);
    }
  }

  /**
   * Generates aggregated summary of all recorded runs
   * @returns {object} Aggregated summary with statistics
   */
  summarize() {
    try {
      if (this.runs.length === 0) {
        return this._getEmptySummary();
      }

      const summary = {
        metadata: {
          generatedAt: new Date().toISOString(),
          toolVersion: this.toolVersion,
          totalRuns: this.runs.length
        },
        statistics: {
          success: {
            count: 0,
            percentage: 0
          },
          failure: {
            count: 0,
            percentage: 0
          },
          sizes: {
            min: Infinity,
            max: 0,
            avg: 0,
            total: 0
          },
          durations: {
            min: Infinity,
            max: 0,
            avg: 0
          },
          uploadResults: {},
          signatureMatches: {
            matched: 0,
            notMatched: 0,
            matchRate: 0
          }
        },
        timeRange: {
          earliest: null,
          latest: null
        }
      };

      let totalSize = 0;
      let totalDuration = 0;
      let durationCount = 0;

      // Aggregate data
      for (const run of this.runs) {
        // Success/failure counts
        if (run.success === true) {
          summary.statistics.success.count++;
        } else if (run.success === false) {
          summary.statistics.failure.count++;
        }

        // Size statistics
        if (typeof run.totalSize === 'number' && run.totalSize >= 0) {
          summary.statistics.sizes.min = Math.min(summary.statistics.sizes.min, run.totalSize);
          summary.statistics.sizes.max = Math.max(summary.statistics.sizes.max, run.totalSize);
          totalSize += run.totalSize;
        }

        // Duration statistics
        if (typeof run.duration === 'number' && run.duration >= 0) {
          summary.statistics.durations.min = Math.min(summary.statistics.durations.min, run.duration);
          summary.statistics.durations.max = Math.max(summary.statistics.durations.max, run.duration);
          totalDuration += run.duration;
          durationCount++;
        }

        // Upload result codes
        if (run.uploadResult) {
          const code = String(run.uploadResult);
          summary.statistics.uploadResults[code] = (summary.statistics.uploadResults[code] || 0) + 1;
        }

        // Signature matches
        if (run.signatureMatch === true) {
          summary.statistics.signatureMatches.matched++;
        } else if (run.signatureMatch === false) {
          summary.statistics.signatureMatches.notMatched++;
        }

        // Time range
        if (run.timestamp) {
          if (!summary.timeRange.earliest || run.timestamp < summary.timeRange.earliest) {
            summary.timeRange.earliest = run.timestamp;
          }
          if (!summary.timeRange.latest || run.timestamp > summary.timeRange.latest) {
            summary.timeRange.latest = run.timestamp;
          }
        }
      }

      // Calculate percentages and averages
      const totalRuns = summary.statistics.success.count + summary.statistics.failure.count;
      if (totalRuns > 0) {
        summary.statistics.success.percentage = Math.round((summary.statistics.success.count / totalRuns) * 100);
        summary.statistics.failure.percentage = Math.round((summary.statistics.failure.count / totalRuns) * 100);
      }

      if (totalSize > 0 && this.runs.length > 0) {
        summary.statistics.sizes.avg = Math.round(totalSize / this.runs.length);
        summary.statistics.sizes.total = totalSize;
      }

      if (durationCount > 0) {
        summary.statistics.durations.avg = Math.round(totalDuration / durationCount);
      }

      const totalSignatureChecks = summary.statistics.signatureMatches.matched + summary.statistics.signatureMatches.notMatched;
      if (totalSignatureChecks > 0) {
        summary.statistics.signatureMatches.matchRate = Math.round((summary.statistics.signatureMatches.matched / totalSignatureChecks) * 100);
      }

      // Clean up infinity values
      if (summary.statistics.sizes.min === Infinity) {
        summary.statistics.sizes.min = 0;
      }
      if (summary.statistics.durations.min === Infinity) {
        summary.statistics.durations.min = 0;
      }

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error.message);
      return this._getEmptySummary();
    }
  }

  /**
   * Exports summary as canonical JSON string
   * @returns {string} JSON string with sorted keys
   */
  export() {
    try {
      const summary = this.summarize();
      return this._toCanonicalJSON(summary);
    } catch (error) {
      console.error('Error exporting summary:', error.message);
      return this._toCanonicalJSON(this._getEmptySummary());
    }
  }

  /**
   * Sanitizes run summary to remove sensitive information
   * @private
   */
  _sanitizeRunSummary(runSummary) {
    const sanitized = {};
    const allowedKeys = [
      'success', 'timestamp', 'duration', 'totalSize',
      'uploadResult', 'signatureMatch', 'fileCount',
      'errorCount', 'warningCount'
    ];

    for (const key of allowedKeys) {
      if (key in runSummary) {
        sanitized[key] = runSummary[key];
      }
    }

    // Ensure no sensitive paths or credentials
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        // Remove potential file paths
        sanitized[key] = sanitized[key].replace(/\/[^\s]+\.(js|json|txt|log)/gi, '[REDACTED]');
        // Remove potential credentials
        sanitized[key] = sanitized[key].replace(/[a-zA-Z0-9]{20,}/g, '[REDACTED]');
      }
    }

    return sanitized;
  }

  /**
   * Returns empty summary structure
   * @private
   */
  _getEmptySummary() {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        toolVersion: this.toolVersion,
        totalRuns: 0
      },
      statistics: {
        success: { count: 0, percentage: 0 },
        failure: { count: 0, percentage: 0 },
        sizes: { min: 0, max: 0, avg: 0, total: 0 },
        durations: { min: 0, max: 0, avg: 0 },
        uploadResults: {},
        signatureMatches: { matched: 0, notMatched: 0, matchRate: 0 }
      },
      timeRange: {
        earliest: null,
        latest: null
      }
    };
  }

  /**
   * Converts object to canonical JSON with sorted keys
   * @private
   */
  _toCanonicalJSON(obj) {
    const sortKeys = (o) => {
      if (Array.isArray(o)) {
        return o.map(sortKeys);
      } else if (o !== null && typeof o === 'object') {
        return Object.keys(o)
          .sort()
          .reduce((result, key) => {
            result[key] = sortKeys(o[key]);
            return result;
          }, {});
      }
      return o;
    };

    const sorted = sortKeys(obj);
    return JSON.stringify(sorted, null, 2);
  }
}
export default SauronSecurePipelineSummarizer;

