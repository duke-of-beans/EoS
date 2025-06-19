/**
 * Purpose: Collects scan metrics + timing for profiling (with comprehensive memory tracking)
 * Dependencies: Node.js std lib
 * API: SauronScanProfiler().start(), end(), getMetrics()
 */

export class SauronScanProfiler {
  constructor() {
    this.startTime = null;
    this.endTime = null;
    this.startMemory = null;
    this.endMemory = null;
    this.metrics = null;
  }

  /**
   * Starts profiling by recording current time and memory usage
   * @returns {void}
   */
  start() {
    this.startTime = process.hrtime.bigint();
    this.startMemory = process.memoryUsage();
    this.endTime = null;
    this.endMemory = null;
    this.metrics = null;
  }

  /**
   * Ends profiling and calculates metrics
   * @param {Object} options - Optional counts to include in metrics
   * @param {number} [options.fileCount] - Number of files processed
   * @param {number} [options.issueCount] - Number of issues found
   * @returns {Object} Profile metrics
   */
  end(options = {}) {
    if (!this.startTime) {
      throw new Error('Profiler not started. Call start() before end()');
    }

    this.endTime = process.hrtime.bigint();
    this.endMemory = process.memoryUsage();

    // Calculate duration in milliseconds
    const durationNs = this.endTime - this.startTime;
    const durationMs = Number(durationNs) / 1e6;

    // Calculate memory deltas in megabytes
    const bytesToMb = (bytes) => Math.round((bytes / (1024 * 1024)) * 100) / 100;
    
    // Build metrics object with comprehensive memory tracking
    this.metrics = {
      durationMs: Math.round(durationMs * 100) / 100, // Round to 2 decimal places
      memory: {
        heapUsedDeltaMb: bytesToMb(this.endMemory.heapUsed - this.startMemory.heapUsed),
        heapTotalDeltaMb: bytesToMb(this.endMemory.heapTotal - this.startMemory.heapTotal),
        rssDeltaMb: bytesToMb(this.endMemory.rss - this.startMemory.rss),
        externalDeltaMb: bytesToMb(this.endMemory.external - this.startMemory.external)
      }
    };

    // Add optional counts if provided
    if (typeof options.fileCount === 'number') {
      this.metrics.fileCount = options.fileCount;
    }
    if (typeof options.issueCount === 'number') {
      this.metrics.issueCount = options.issueCount;
    }

    return this.getMetrics(); // Return via getMetrics() to ensure cloning
  }

  /**
   * Returns the most recent metrics collected
   * @returns {Object|null} Deep clone of profile metrics or null if not yet profiled
   */
  getMetrics() {
    if (!this.metrics) {
      return null;
    }
    
    // Return deep clone to prevent external mutation
    return JSON.parse(JSON.stringify(this.metrics));
  }
}