/**
 * Purpose: Analyzes Eye of Sauron scan reports for trends, anomalies, and insights
 * Dependencies: Node.js standard library
 * API: SauronReportAnalyzer(config?) → instance; instance.analyze(reports) → analysis object
 * Config options:
 *   - trendThresholds: { rising: 10, falling: -10 } (% change thresholds)
 *   - performanceThresholds: { scanDurationStdDev: 2, throughputDropRatio: 0.5 }
 *   - significanceWeights: { consistency: 0.4, magnitude: 0.3, recency: 0.3 }
 */

export class SauronReportAnalyzer {
  constructor(config = {}) {
    // Configurable thresholds with sensible defaults
    this.config = {
      // Trend detection thresholds
      trendThresholds: {
        rising: config.trendThresholds?.rising || 10,    // % change to consider rising
        falling: config.trendThresholds?.falling || -10  // % change to consider falling
      },
      // Performance anomaly thresholds
      performanceThresholds: {
        scanDurationStdDev: config.performanceThresholds?.scanDurationStdDev || 2,  // std deviations for spike
        throughputDropRatio: config.performanceThresholds?.throughputDropRatio || 0.5  // ratio below avg for drop
      },
      // Significance calculation weights
      significanceWeights: {
        consistency: config.significanceWeights?.consistency || 0.4,
        magnitude: config.significanceWeights?.magnitude || 0.3,
        recency: config.significanceWeights?.recency || 0.3
      }
    };
  }

  /**
   * Analyzes multiple scan reports for trends and anomalies
   * @param {Array} reports - Array of scan report objects
   * @returns {Object} Analysis results with trends, stats, and anomalies
   */
  analyze(reports) {
    if (!Array.isArray(reports) || reports.length === 0) {
      return {
        securityTrends: [],
        coverageStats: {
          totalReports: 0,
          averageCoverage: 0,
          coverageTrend: 'insufficient_data'
        },
        performanceAnomalies: [],
        summary: 'No reports to analyze'
      };
    }

    const securityTrends = this._analyzeSecurityTrends(reports);
    const coverageStats = this._analyzeCoverageStats(reports);
    const performanceAnomalies = this._detectPerformanceAnomalies(reports);
    const summary = this._generateSummary(securityTrends, coverageStats, performanceAnomalies);

    return {
      securityTrends,
      coverageStats,
      performanceAnomalies,
      summary
    };
  }

  /**
   * Analyzes security trends across reports
   * @private
   */
  _analyzeSecurityTrends(reports) {
    const trends = [];
    const severityCounts = [];

    // Extract severity counts from each report
    reports.forEach((report, index) => {
      const counts = {
        timestamp: report.timestamp || new Date().toISOString(),
        reportIndex: index,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      };

      // Count issues by severity
      if (report.vision && report.vision.files) {
        Object.values(report.vision.files).forEach(fileData => {
          if (fileData.issues) {
            fileData.issues.forEach(issue => {
              const severity = (issue.severity || 'low').toLowerCase();
              if (counts.hasOwnProperty(severity)) {
                counts[severity]++;
              }
              counts.total++;
            });
          }
        });
      }

      severityCounts.push(counts);
    });

    // Detect trends
    if (severityCounts.length >= 2) {
      // Check for rising critical issues
      const criticalTrend = this._calculateTrend(
        severityCounts.map(c => c.critical)
      );
      if (criticalTrend.direction === 'rising' && criticalTrend.significance > 0.5) {
        trends.push({
          type: 'security_degradation',
          severity: 'critical',
          trend: criticalTrend,
          message: `Critical security issues rising by ${criticalTrend.percentChange.toFixed(1)}%`
        });
      }

      // Check overall security trend
      const totalTrend = this._calculateTrend(
        severityCounts.map(c => c.total)
      );
      trends.push({
        type: 'overall_security',
        trend: totalTrend,
        message: `Overall security issues ${totalTrend.direction} by ${Math.abs(totalTrend.percentChange).toFixed(1)}%`
      });
    }

    // Add severity distribution insight
    const latestCounts = severityCounts[severityCounts.length - 1];
    if (latestCounts.total > 0) {
      trends.push({
        type: 'severity_distribution',
        distribution: {
          critical: ((latestCounts.critical / latestCounts.total) * 100).toFixed(1),
          high: ((latestCounts.high / latestCounts.total) * 100).toFixed(1),
          medium: ((latestCounts.medium / latestCounts.total) * 100).toFixed(1),
          low: ((latestCounts.low / latestCounts.total) * 100).toFixed(1)
        },
        message: `Latest severity distribution: ${latestCounts.critical} critical, ${latestCounts.high} high, ${latestCounts.medium} medium, ${latestCounts.low} low`
      });
    }

    return trends;
  }

  /**
   * Analyzes coverage statistics across reports
   * @private
   */
  _analyzeCoverageStats(reports) {
    const coverageData = [];

    reports.forEach((report, index) => {
      const stats = {
        timestamp: report.timestamp || new Date().toISOString(),
        reportIndex: index,
        filesScanned: 0,
        filesWithIssues: 0,
        coverage: 0
      };

      if (report.vision && report.vision.files) {
        stats.filesScanned = Object.keys(report.vision.files).length;
        stats.filesWithIssues = Object.values(report.vision.files)
          .filter(fileData => fileData.issues && fileData.issues.length > 0)
          .length;

        if (stats.filesScanned > 0) {
          stats.coverage = (stats.filesWithIssues / stats.filesScanned) * 100;
        }
      }

      coverageData.push(stats);
    });

    // Calculate aggregate stats
    const totalFiles = coverageData.reduce((sum, d) => sum + d.filesScanned, 0);
    const averageCoverage = coverageData.length > 0
      ? coverageData.reduce((sum, d) => sum + d.coverage, 0) / coverageData.length
      : 0;

    // Determine coverage trend
    let coverageTrend = 'stable';
    if (coverageData.length >= 2) {
      const trend = this._calculateTrend(coverageData.map(d => d.filesScanned));
      coverageTrend = trend.direction;
    }

    return {
      totalReports: reports.length,
      totalFilesScanned: totalFiles,
      averageCoverage: averageCoverage.toFixed(2),
      coverageTrend,
      recentCoverage: coverageData.length > 0
        ? coverageData[coverageData.length - 1].coverage.toFixed(2)
        : 0,
      details: coverageData
    };
  }

  /**
   * Detects performance anomalies in scan execution
   * @private
   */
  _detectPerformanceAnomalies(reports) {
    const anomalies = [];
    const performanceData = [];

    // Extract performance metrics
    reports.forEach((report, index) => {
      const metrics = {
        reportIndex: index,
        timestamp: report.timestamp || new Date().toISOString(),
        scanDuration: 0,
        filesPerSecond: 0
      };

      if (report.metadata) {
        // Calculate scan duration if start/end times available
        if (report.metadata.scanStartTime && report.metadata.scanEndTime) {
          const start = new Date(report.metadata.scanStartTime);
          const end = new Date(report.metadata.scanEndTime);
          metrics.scanDuration = (end - start) / 1000; // seconds
        }

        // Calculate files per second
        if (report.vision && report.vision.files && metrics.scanDuration > 0) {
          const fileCount = Object.keys(report.vision.files).length;
          metrics.filesPerSecond = fileCount / metrics.scanDuration;
        }
      }

      performanceData.push(metrics);
    });

    // Detect anomalies using statistical methods
    if (performanceData.length >= 3) {
      // Check for scan duration spikes
      const durations = performanceData
        .filter(d => d.scanDuration > 0)
        .map(d => d.scanDuration);

      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const stdDev = this._calculateStdDev(durations);
        const threshold = this.config.performanceThresholds.scanDurationStdDev;

        performanceData.forEach((data, index) => {
          if (data.scanDuration > avgDuration + (threshold * stdDev)) {
            anomalies.push({
              type: 'scan_duration_spike',
              reportIndex: index,
              timestamp: data.timestamp,
              value: data.scanDuration,
              deviation: ((data.scanDuration - avgDuration) / avgDuration * 100).toFixed(1),
              message: `Scan duration ${data.scanDuration.toFixed(2)}s is ${((data.scanDuration - avgDuration) / avgDuration * 100).toFixed(1)}% above average`
            });
          }
        });
      }

      // Check for throughput drops
      const throughputs = performanceData
        .filter(d => d.filesPerSecond > 0)
        .map(d => d.filesPerSecond);

      if (throughputs.length > 0) {
        const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
        const dropThreshold = this.config.performanceThresholds.throughputDropRatio;

        performanceData.forEach((data, index) => {
          if (data.filesPerSecond > 0 && data.filesPerSecond < avgThroughput * dropThreshold) {
            anomalies.push({
              type: 'throughput_drop',
              reportIndex: index,
              timestamp: data.timestamp,
              value: data.filesPerSecond,
              message: `Throughput ${data.filesPerSecond.toFixed(2)} files/sec is significantly below average ${avgThroughput.toFixed(2)} files/sec`
            });
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculates trend direction and magnitude with configurable thresholds
   * @private
   */
  _calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'stable', percentChange: 0, significance: 0 };
    }

    const firstValue = values[0] || 0;
    const lastValue = values[values.length - 1] || 0;
    const percentChange = firstValue !== 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : lastValue > 0 ? 100 : 0;

    // Use configurable thresholds for trend direction
    let direction = 'stable';
    if (percentChange > this.config.trendThresholds.rising) direction = 'rising';
    else if (percentChange < this.config.trendThresholds.falling) direction = 'falling';

    // Calculate multi-factor significance (0-1)
    const significance = this._calculateSignificance(values, percentChange);

    return { direction, percentChange, significance };
  }

  /**
   * Calculates trend significance using multiple factors
   * @private
   */
  _calculateSignificance(values, percentChange) {
    if (values.length < 2) return 0;

    const weights = this.config.significanceWeights;
    let scores = {
      consistency: 0,
      magnitude: 0,
      recency: 0
    };

    // 1. Consistency score: How consistent is the trend direction?
    if (values.length >= 3) {
      let consistentSteps = 0;
      let totalSteps = values.length - 1;

      for (let i = 1; i < values.length; i++) {
        const localChange = values[i] - values[i - 1];
        const overallDirection = percentChange > 0;

        if ((overallDirection && localChange >= 0) || (!overallDirection && localChange <= 0)) {
          consistentSteps++;
        }
      }

      scores.consistency = consistentSteps / totalSteps;
    } else {
      scores.consistency = 0.5; // Neutral for insufficient data
    }

    // 2. Magnitude score: How large is the change?
    const magnitudeThreshold = Math.max(
      Math.abs(this.config.trendThresholds.rising),
      Math.abs(this.config.trendThresholds.falling)
    );
    scores.magnitude = Math.min(Math.abs(percentChange) / (magnitudeThreshold * 3), 1);

    // 3. Recency score: Is the trend accelerating recently?
    if (values.length >= 4) {
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midPoint);
      const secondHalf = values.slice(midPoint);

      const firstHalfChange = this._calculatePercentChange(
        firstHalf[0],
        firstHalf[firstHalf.length - 1]
      );
      const secondHalfChange = this._calculatePercentChange(
        secondHalf[0],
        secondHalf[secondHalf.length - 1]
      );

      // Higher score if recent change is more pronounced
      if (Math.sign(firstHalfChange) === Math.sign(secondHalfChange)) {
        scores.recency = Math.abs(secondHalfChange) > Math.abs(firstHalfChange) ? 0.8 : 0.4;
      } else {
        scores.recency = 0.2; // Trend reversal
      }
    } else {
      scores.recency = 0.5; // Neutral for insufficient data
    }

    // Calculate weighted significance
    const significance =
      (scores.consistency * weights.consistency) +
      (scores.magnitude * weights.magnitude) +
      (scores.recency * weights.recency);

    return Math.min(significance, 1);
  }

  /**
   * Helper to calculate percent change
   * @private
   */
  _calculatePercentChange(initial, final) {
    if (initial === 0) return final > 0 ? 100 : 0;
    return ((final - initial) / initial) * 100;
  }

  /**
   * Calculates standard deviation
   * @private
   */
  _calculateStdDev(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Generates human-readable summary
   * @private
   */
  _generateSummary(securityTrends, coverageStats, performanceAnomalies) {
    const parts = [];

    // Security summary
    const criticalTrend = securityTrends.find(t => t.severity === 'critical');
    if (criticalTrend) {
      parts.push(criticalTrend.message);
    }

    // Coverage summary
    parts.push(`Analyzed ${coverageStats.totalReports} reports covering ${coverageStats.totalFilesScanned} files`);
    parts.push(`Coverage trend: ${coverageStats.coverageTrend}`);

    // Performance summary
    if (performanceAnomalies.length > 0) {
      parts.push(`Detected ${performanceAnomalies.length} performance anomalies`);
    }

    // Overall assessment
    const hasSecurityConcerns = securityTrends.some(t =>
      t.type === 'security_degradation' ||
      (t.type === 'overall_security' && t.trend.direction === 'rising')
    );

    if (hasSecurityConcerns && performanceAnomalies.length > 0) {
      parts.push('⚠️ Action needed: Both security and performance issues detected');
    } else if (hasSecurityConcerns) {
      parts.push('⚠️ Security concerns require attention');
    } else if (performanceAnomalies.length > 0) {
      parts.push('⚠️ Performance optimization recommended');
    } else {
      parts.push('✅ System operating within normal parameters');
    }

    return parts.join('. ');
  }
}