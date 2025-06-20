/**
 * Purpose: Collects + summarizes job execution metrics
 * Dependencies: Node.js std lib
 * API: SauronJobMetricsCollector().record(), summarize(), list(), clear()
 */

/**
 * Collects and summarizes metrics from executed scan jobs for diagnostic and performance analysis
 */
export class SauronJobMetricsCollector {
  /**
   * Initialize the metrics collector
   * @param {Object} config - Configuration options
   * @param {number} config.historySize - Maximum number of records to maintain (default: 100)
   * @param {number} config.precision - Decimal places for summary statistics (default: 2)
   */
  constructor(config = {}) {
    this.historySize = config.historySize || 100;
    this.precision = config.precision || 2;
    this.records = [];

    // Future enhancement: Support for configurable metric fields
    // this.customMetrics = config.customMetrics || [];
  }

  /**
   * Record metrics for a job execution
   * @param {string} jobId - Unique identifier for the job
   * @param {Object} metrics - Job metrics object
   * @param {number} metrics.duration - Execution duration in milliseconds
   * @param {number} metrics.memory - Memory usage in bytes
   * @param {number} metrics.cpu - CPU usage percentage
   * @param {number} metrics.filesProcessed - Number of files processed
   * @param {number} metrics.issuesFound - Number of issues found
   */
  record(jobId, metrics) {
    // Defensive: validate inputs
    if (!jobId || typeof jobId !== 'string') {
      console.warn('SauronJobMetricsCollector: Invalid jobId provided');
      return;
    }

    if (!metrics || typeof metrics !== 'object') {
      console.warn('SauronJobMetricsCollector: Invalid metrics object provided');
      return;
    }

    // Create sanitized record with defaults for missing/invalid values
    const record = {
      jobId,
      timestamp: Date.now(),
      duration: this._sanitizeNumber(metrics.duration, 0),
      memory: this._sanitizeNumber(metrics.memory, 0),
      cpu: this._sanitizeNumber(metrics.cpu, 0),
      filesProcessed: this._sanitizeNumber(metrics.filesProcessed, 0),
      issuesFound: this._sanitizeNumber(metrics.issuesFound, 0)
    };

    // Add record to beginning (most recent first)
    this.records.unshift(record);

    // Maintain sliding window
    if (this.records.length > this.historySize) {
      this.records = this.records.slice(0, this.historySize);
    }
  }

  /**
   * Summarize collected metrics with statistical analysis
   * @returns {Object} Summary statistics for all numeric metrics
   * Note: Standard deviation is 0 for single values (N=1)
   */
  summarize() {
    if (this.records.length === 0) {
      return {
        totalJobs: 0,
        duration: this._getEmptyStats(),
        memory: this._getEmptyStats(),
        cpu: this._getEmptyStats(),
        filesProcessed: this._getEmptyStats(),
        issuesFound: this._getEmptyStats()
      };
    }

    const metrics = ['duration', 'memory', 'cpu', 'filesProcessed', 'issuesFound'];
    const summary = {
      totalJobs: this.records.length
    };

    // Calculate statistics for each metric
    for (const metric of metrics) {
      const values = this.records.map(r => r[metric]).filter(v => v !== null && v !== undefined);

      if (values.length === 0) {
        summary[metric] = this._getEmptyStats();
        continue;
      }

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate standard deviation
      // Note: For N=1, variance and stdDev will be 0 (expected behavior)
      let stdDev = 0;
      if (values.length > 1) {
        const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
        stdDev = Math.sqrt(variance);
      }

      // Round values for display consistency
      summary[metric] = {
        average: this._round(avg),
        min: this._round(min),
        max: this._round(max),
        stdDev: this._round(stdDev),
        count: values.length
      };
    }

    return summary;
  }

  /**
   * List all raw records (most recent first)
   * @returns {Array} Array of job metric records
   */
  list() {
    // Return a copy to prevent external modification
    return [...this.records];
  }

  /**
   * Clear all collected metrics
   */
  clear() {
    this.records = [];
  }

  /**
   * Sanitize numeric input
   * @private
   */
  _sanitizeNumber(value, defaultValue = 0) {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return defaultValue;
    }

    return num;
  }

  /**
   * Get empty statistics object
   * @private
   */
  _getEmptyStats() {
    return {
      average: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      count: 0
    };
  }
}

// Example usage:
// const collector = new SauronJobMetricsCollector({ historySize: 100 });
// collector.record('job-123', {
//   duration: 1500,
//   memory: 1024 * 1024 * 100,
//   cpu: 45.5,
//   filesProcessed: 250,
//   issuesFound: 12
// });
// const summary = collector.summarize();
// const records = collector.list();
// collector.clear();
export default SauronJobMetricsCollector;

