/**
 * SauronHealthDashboard.js
 * Purpose: Provides API-ready scanner health summary for dashboards and monitoring
 * Dependencies: Node.js std lib
 * API: SauronHealthDashboard(moduleRegistry, profiler, config).getSummary()
 */

export class SauronHealthDashboard {
  constructor(moduleRegistry, profiler, config = {}) {
    this.moduleRegistry = moduleRegistry || {};
    this.profiler = profiler || {};

    // Configuration with defaults
    this.config = {
      errorThresholds: {
        warning: config.errorThresholds?.warning || 1,
        error: config.errorThresholds?.error || 10
      },
      allowedStatuses: config.allowedStatuses || ['healthy', 'warning', 'error', 'unknown'],
      includeMetricStats: config.includeMetricStats !== false // default true
    };
  }

  /**
   * Get comprehensive health summary of all scanner components
   * @returns {object} JSON-safe health summary object
   */
  getSummary() {
    const timestamp = new Date().toISOString();

    // Aggregate module statuses
    const modules = this._getModuleStatuses();

    // Aggregate profiler metrics
    const metrics = this._getProfilerMetrics();

    // Aggregate policy statuses if available
    const policyStatus = this._getPolicyStatus();

    // Build summary object
    const summary = {
      modules,
      metrics,
      timestamp
    };

    // Only include policyStatus if it exists
    if (policyStatus && Object.keys(policyStatus).length > 0) {
      summary.policyStatus = policyStatus;
    }

    return summary;
  }

  /**
   * Extract module statuses from registry
   * @private
   * @returns {Array} Array of module status objects
   */
  _getModuleStatuses() {
    const modules = [];

    try {
      // Iterate through module registry
      for (const [moduleName, moduleData] of Object.entries(this.moduleRegistry)) {
        const status = {
          name: moduleName,
          enabled: this._isModuleEnabled(moduleData),
          lastRun: this._getLastRunTime(moduleData),
          errorCount: this._getErrorCount(moduleData),
          status: this._determineModuleStatus(moduleData)
        };

        modules.push(status);
      }
    } catch (error) {
      // Return empty array on error to maintain pure function behavior
      return [];
    }

    return modules;
  }

  /**
   * Extract recent profiler metrics
   * @private
   * @returns {object} Aggregated metrics object
   */
  _getProfilerMetrics() {
    const metrics = {
      totalScans: 0,
      averageTime: 0,
      totalIssues: 0,
      memoryUsage: null,
      cpuUsage: null
    };

    try {
      // Extract total scans
      if (this.profiler.totalScans !== undefined) {
        metrics.totalScans = Number(this.profiler.totalScans) || 0;
      }

      // Calculate scan time statistics
      if (this.profiler.scanTimes && Array.isArray(this.profiler.scanTimes)) {
        const times = this.profiler.scanTimes.filter(t => typeof t === 'number' && t >= 0);
        if (times.length > 0) {
          metrics.averageTime = times.reduce((a, b) => a + b, 0) / times.length;

          // Add extended statistics if configured
          if (this.config.includeMetricStats) {
            metrics.scanTimeStats = this._calculateTimeStatistics(times);
          }
        }
      }

      // Extract total issues found
      if (this.profiler.totalIssues !== undefined) {
        metrics.totalIssues = Number(this.profiler.totalIssues) || 0;
      }

      // Extract resource usage if available
      if (this.profiler.memoryUsage !== undefined) {
        metrics.memoryUsage = this._formatMemoryUsage(this.profiler.memoryUsage);
      }

      if (this.profiler.cpuUsage !== undefined) {
        metrics.cpuUsage = this._formatCpuUsage(this.profiler.cpuUsage);
      }

    } catch (error) {
      // Return default metrics on error
      return metrics;
    }

    return metrics;
  }

  /**
   * Calculate detailed statistics for scan times
   * @private
   * @param {Array<number>} times Array of scan times
   * @returns {object} Statistics object with min, max, stddev
   */
  _calculateTimeStatistics(times) {
    if (!times || times.length === 0) {
      return null;
    }

    const stats = {
      min: Math.min(...times),
      max: Math.max(...times),
      average: times.reduce((a, b) => a + b, 0) / times.length,
      count: times.length
    };

    // Calculate standard deviation
    if (times.length > 1) {
      const variance = times.reduce((sum, time) => {
        return sum + Math.pow(time - stats.average, 2);
      }, 0) / times.length;
      stats.stddev = Math.sqrt(variance);
    } else {
      stats.stddev = 0;
    }

    // Round all values to 2 decimal places
    Object.keys(stats).forEach(key => {
      if (typeof stats[key] === 'number' && key !== 'count') {
        stats[key] = Math.round(stats[key] * 100) / 100;
      }
    });

    return stats;
  }

  /**
   * Extract policy check statuses if available
   * @private
   * @returns {object} Policy status object
   */
  _getPolicyStatus() {
    const policyStatus = {};

    try {
      // Check for policy module in registry
      const policyModule = this.moduleRegistry.PolicyModule ||
                          this.moduleRegistry.policyChecker ||
                          this.moduleRegistry.policy;

      if (!policyModule) {
        return policyStatus;
      }

      // Extract policy violations
      if (policyModule.violations !== undefined) {
        policyStatus.violations = Number(policyModule.violations) || 0;
      }

      // Extract policy compliance percentage
      if (policyModule.complianceRate !== undefined) {
        policyStatus.complianceRate = Number(policyModule.complianceRate) || 0;
      }

      // Extract last policy check time
      if (policyModule.lastCheck) {
        policyStatus.lastCheck = String(policyModule.lastCheck);
      }

      // Extract enabled policies count
      if (policyModule.enabledPolicies !== undefined) {
        policyStatus.enabledPolicies = Number(policyModule.enabledPolicies) || 0;
      }

    } catch (error) {
      // Return empty object on error
      return {};
    }

    return policyStatus;
  }

  /**
   * Determine if module is enabled
   * @private
   * @param {object} moduleData Module data from registry
   * @returns {boolean} Whether module is enabled
   */
  _isModuleEnabled(moduleData) {
    if (!moduleData || typeof moduleData !== 'object') {
      return false;
    }

    // Check various possible enabled indicators
    return moduleData.enabled === true ||
           moduleData.active === true ||
           moduleData.status === 'active' ||
           moduleData.status === 'enabled';
  }

  /**
   * Get last run time for module
   * @private
   * @param {object} moduleData Module data from registry
   * @returns {string|null} ISO timestamp or null
   */
  _getLastRunTime(moduleData) {
    if (!moduleData || typeof moduleData !== 'object') {
      return null;
    }

    // Check various possible timestamp fields
    const timestamp = moduleData.lastRun ||
                     moduleData.lastExecution ||
                     moduleData.lastScan ||
                     moduleData.timestamp;

    if (!timestamp) {
      return null;
    }

    // Ensure valid date format
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get error count for module
   * @private
   * @param {object} moduleData Module data from registry
   * @returns {number} Error count
   */
  _getErrorCount(moduleData) {
    if (!moduleData || typeof moduleData !== 'object') {
      return 0;
    }

    // Check various possible error count fields
    const errorCount = moduleData.errorCount ||
                      moduleData.errors ||
                      moduleData.failureCount ||
                      0;

    return Number(errorCount) || 0;
  }

  /**
   * Determine overall module status
   * @private
   * @param {object} moduleData Module data from registry
   * @returns {string} Status string: 'healthy', 'warning', 'error', or 'unknown'
   */
  _determineModuleStatus(moduleData) {
    if (!moduleData || typeof moduleData !== 'object') {
      return 'unknown';
    }

    // Check explicit status field and normalize to allowed values
    if (moduleData.status && typeof moduleData.status === 'string') {
      const status = moduleData.status.toLowerCase();

      // If status is in allowed list, use it
      if (this.config.allowedStatuses.includes(status)) {
        return status;
      }

      // Map common status variations to allowed statuses
      const statusMap = {
        'ok': 'healthy',
        'good': 'healthy',
        'active': 'healthy',
        'running': 'healthy',
        'success': 'healthy',
        'green': 'healthy',
        'warn': 'warning',
        'caution': 'warning',
        'yellow': 'warning',
        'degraded': 'warning',
        'fail': 'error',
        'failed': 'error',
        'failure': 'error',
        'critical': 'error',
        'red': 'error',
        'inactive': 'unknown',
        'disabled': 'unknown',
        'stopped': 'unknown',
        'pending': 'unknown'
      };

      if (statusMap[status]) {
        return statusMap[status];
      }
    }

    // Determine status based on error count with configurable thresholds
    const errorCount = this._getErrorCount(moduleData);
    if (errorCount >= this.config.errorThresholds.error) {
      return 'error';
    } else if (errorCount >= this.config.errorThresholds.warning) {
      return 'warning';
    }

    // Check if module is enabled
    if (!this._isModuleEnabled(moduleData)) {
      return 'unknown';
    }

    return 'healthy';
  }

  /**
   * Format memory usage for output
   * @private
   * @param {number|object} memoryUsage Memory usage data
   * @returns {object|null} Formatted memory usage
   */
  _formatMemoryUsage(memoryUsage) {
    if (typeof memoryUsage === 'number') {
      return {
        bytes: memoryUsage,
        mb: Math.round(memoryUsage / (1024 * 1024) * 100) / 100
      };
    }

    if (typeof memoryUsage === 'object' && memoryUsage !== null) {
      return {
        rss: memoryUsage.rss || null,
        heapTotal: memoryUsage.heapTotal || null,
        heapUsed: memoryUsage.heapUsed || null,
        external: memoryUsage.external || null
      };
    }

    return null;
  }

  /**
   * Format CPU usage for output
   * @private
   * @param {number|object} cpuUsage CPU usage data
   * @returns {number|object|null} Formatted CPU usage
   */
  _formatCpuUsage(cpuUsage) {
    if (typeof cpuUsage === 'number') {
      return Math.round(cpuUsage * 100) / 100;
    }

    if (typeof cpuUsage === 'object' && cpuUsage !== null) {
      return {
        user: cpuUsage.user || null,
        system: cpuUsage.system || null,
        percent: cpuUsage.percent || null
      };
    }

    return null;
  }
}