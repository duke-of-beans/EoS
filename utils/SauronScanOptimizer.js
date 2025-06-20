/**
 * Purpose: Dynamically tunes scan settings based on historical patterns and performance metrics
 * Dependencies: Node.js standard library
 * Public API:
 *   - SauronScanOptimizer().analyzeHistory(reports) - Analyzes historical scan reports
 *   - SauronScanOptimizer().suggestAdjustments() - Suggests optimal scan configuration
 *
 * Future Enhancement Opportunities:
 *   - Weighted averaging for performance metrics (by file count or scan duration)
 *   - Configurable analyzer effectiveness thresholds
 *   - Customizable confidence calculation weights
 */

export default class SauronScanOptimizer {
  constructor() {
    this.historyAnalysis = null;
    this.performanceMetrics = {
      avgScanTime: 0,
      avgMemoryUsage: 0,
      avgIssuesPerFile: 0
    };
    this.analyzerEffectiveness = new Map();
    this.issuePatterns = {
      byType: new Map(),
      bySeverity: new Map(),
      byAnalyzer: new Map()
    };
  }

  /**
   * Analyzes historical scan reports to identify patterns and performance trends
   * @param {Array} reports - Array of historical scan report objects
   * @returns {Object} Analysis summary with metrics and patterns
   */
  analyzeHistory(reports) {
    if (!Array.isArray(reports) || reports.length === 0) {
      return {
        status: 'insufficient_data',
        message: 'No historical reports to analyze',
        metrics: this.performanceMetrics,
        patterns: this.issuePatterns
      };
    }

    // Reset analysis state
    this._resetAnalysisState();

    // Process each report
    reports.forEach(report => {
      this._processReport(report);
    });

    // Calculate final metrics
    this._calculateFinalMetrics(reports.length);

    // Store analysis results
    this.historyAnalysis = {
      reportsAnalyzed: reports.length,
      timeRange: this._getTimeRange(reports),
      metrics: { ...this.performanceMetrics },
      patterns: this._serializePatterns(),
      analyzerStats: this._getAnalyzerStats()
    };

    return this.historyAnalysis;
  }

  /**
   * Suggests scan configuration adjustments based on analysis
   * @returns {Object} Adjustment recommendations with explanations
   */
  suggestAdjustments() {
    if (!this.historyAnalysis) {
      return {
        status: 'no_analysis',
        message: 'Run analyzeHistory() first to generate suggestions',
        adjustments: {}
      };
    }

    const suggestions = {
      profileLevel: this._suggestProfileLevel(),
      thresholds: this._suggestThresholds(),
      analyzers: this._suggestAnalyzerConfig(),
      scanStrategy: this._suggestScanStrategy(),
      resourceAllocation: this._suggestResourceConfig()
    };

    // Calculate confidence score
    const confidence = this._calculateConfidence();

    return {
      status: 'success',
      confidence,
      adjustments: suggestions,
      summary: this._generateAdjustmentSummary(suggestions),
      reasoning: this._generateReasoning(suggestions)
    };
  }

  // Private methods

  _resetAnalysisState() {
    this.performanceMetrics = {
      avgScanTime: 0,
      avgMemoryUsage: 0,
      avgIssuesPerFile: 0,
      totalScans: 0,
      totalFiles: 0,
      totalIssues: 0
    };
    this.analyzerEffectiveness.clear();
    this.issuePatterns.byType.clear();
    this.issuePatterns.bySeverity.clear();
    this.issuePatterns.byAnalyzer.clear();
  }

  _processReport(report) {
    // Extract performance metrics
    if (report.performance) {
      this.performanceMetrics.avgScanTime += report.performance.scanTime || 0;
      this.performanceMetrics.avgMemoryUsage += report.performance.memoryUsage || 0;
      this.performanceMetrics.totalScans++;
    }

    // Process issues
    if (report.issues && Array.isArray(report.issues)) {
      this.performanceMetrics.totalIssues += report.issues.length;

      report.issues.forEach(issue => {
        // Track by type
        const type = issue.type || 'unknown';
        this.issuePatterns.byType.set(type, (this.issuePatterns.byType.get(type) || 0) + 1);

        // Track by severity
        const severity = issue.severity || 'info';
        this.issuePatterns.bySeverity.set(severity, (this.issuePatterns.bySeverity.get(severity) || 0) + 1);

        // Track by analyzer
        const analyzer = issue.analyzer || 'unknown';
        this.issuePatterns.byAnalyzer.set(analyzer, (this.issuePatterns.byAnalyzer.get(analyzer) || 0) + 1);

        // Track analyzer effectiveness
        if (!this.analyzerEffectiveness.has(analyzer)) {
          this.analyzerEffectiveness.set(analyzer, {
            issues: 0,
            falsePositives: 0,
            severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
          });
        }
        const analyzerStats = this.analyzerEffectiveness.get(analyzer);
        analyzerStats.issues++;
        analyzerStats.severity[severity] = (analyzerStats.severity[severity] || 0) + 1;

        // Track false positives if marked
        if (issue.falsePositive) {
          analyzerStats.falsePositives++;
        }
      });
    }

    // Track file count
    if (report.filesScanned) {
      this.performanceMetrics.totalFiles += report.filesScanned;
    }
  }

  _calculateFinalMetrics(reportCount) {
    // TODO: Future enhancement - consider weighted averaging by file count or scan duration
    // Example: weight = report.filesScanned / totalFilesAcrossAllReports
    if (reportCount > 0) {
      this.performanceMetrics.avgScanTime /= reportCount;
      this.performanceMetrics.avgMemoryUsage /= reportCount;
    }

    if (this.performanceMetrics.totalFiles > 0) {
      this.performanceMetrics.avgIssuesPerFile =
        this.performanceMetrics.totalIssues / this.performanceMetrics.totalFiles;
    }
  }

  _getTimeRange(reports) {
    if (reports.length === 0) return { start: null, end: null };

    const timestamps = reports
      .map(r => r.timestamp)
      .filter(t => t)
      .sort();

    return {
      start: timestamps[0] || null,
      end: timestamps[timestamps.length - 1] || null
    };
  }

  _serializePatterns() {
    return {
      byType: Object.fromEntries(this.issuePatterns.byType),
      bySeverity: Object.fromEntries(this.issuePatterns.bySeverity),
      byAnalyzer: Object.fromEntries(this.issuePatterns.byAnalyzer)
    };
  }

  _getAnalyzerStats() {
    const stats = {};
    this.analyzerEffectiveness.forEach((data, analyzer) => {
      stats[analyzer] = {
        totalIssues: data.issues,
        falsePositiveRate: data.issues > 0 ? data.falsePositives / data.issues : 0,
        severityDistribution: data.severity,
        effectiveness: this._calculateAnalyzerEffectiveness(data)
      };
    });
    return stats;
  }

  _calculateAnalyzerEffectiveness(data) {
    // Weight by severity and false positive rate
    const severityWeights = { critical: 10, high: 5, medium: 2, low: 1, info: 0.5 };
    let weightedScore = 0;

    Object.entries(data.severity).forEach(([severity, count]) => {
      weightedScore += (severityWeights[severity] || 0) * count;
    });

    // Penalize for false positives
    const falsePositivePenalty = 1 - (data.falsePositives / Math.max(data.issues, 1));

    return weightedScore * falsePositivePenalty;
  }

  _suggestProfileLevel() {
    const avgIssues = this.performanceMetrics.avgIssuesPerFile;
    const criticalCount = this.issuePatterns.bySeverity.get('critical') || 0;
    const highCount = this.issuePatterns.bySeverity.get('high') || 0;

    // High severity issues warrant more aggressive scanning
    if (criticalCount > 10 || highCount > 50) {
      return {
        level: 'aggressive',
        reason: 'High number of critical/high severity issues detected'
      };
    }

    // Many issues per file suggests need for thorough scanning
    if (avgIssues > 5) {
      return {
        level: 'thorough',
        reason: 'High average issue density per file'
      };
    }

    // Low issue count allows for balanced scanning
    if (avgIssues < 1) {
      return {
        level: 'balanced',
        reason: 'Low issue density suggests stable codebase'
      };
    }

    return {
      level: 'standard',
      reason: 'Moderate issue density across scans'
    };
  }

  _suggestThresholds() {
    const suggestions = {};

    // Complexity threshold based on issue correlation
    const complexityIssues = this.issuePatterns.byType.get('complexity') || 0;
    if (complexityIssues > 100) {
      suggestions.complexity = {
        value: 15,
        reason: 'High complexity-related issues, tighten threshold'
      };
    } else if (complexityIssues < 10) {
      suggestions.complexity = {
        value: 25,
        reason: 'Low complexity issues, can relax threshold'
      };
    }

    // Duplication threshold
    const duplicationIssues = this.issuePatterns.byType.get('duplication') || 0;
    if (duplicationIssues > 50) {
      suggestions.duplication = {
        value: 3,
        reason: 'Significant duplication detected, lower threshold'
      };
    }

    // Performance thresholds based on scan times
    if (this.performanceMetrics.avgScanTime > 60000) { // > 1 minute
      suggestions.fileSize = {
        value: 500000, // 500KB
        reason: 'Long scan times, limit file size for performance'
      };
    }

    return suggestions;
  }

  _suggestAnalyzerConfig() {
    const suggestions = {
      enable: [],
      disable: [],
      adjust: []
    };

    // TODO: Future enhancement - make these thresholds configurable
    const EFFECTIVENESS_THRESHOLDS = {
      disable: { effectiveness: 1, falsePositiveRate: 0.5 },
      adjust: { falsePositiveRate: 0.2 },
      enable: { effectiveness: 10 }
    };

    this.analyzerEffectiveness.forEach((stats, analyzer) => {
      // Disable ineffective analyzers
      if (stats.effectiveness < EFFECTIVENESS_THRESHOLDS.disable.effectiveness ||
          stats.falsePositiveRate > EFFECTIVENESS_THRESHOLDS.disable.falsePositiveRate) {
        suggestions.disable.push({
          analyzer,
          reason: `Low effectiveness (${stats.effectiveness.toFixed(2)}) or high false positive rate (${(stats.falsePositiveRate * 100).toFixed(1)}%)`
        });
      }
      // Suggest adjustments for moderate performers
      else if (stats.falsePositiveRate > EFFECTIVENESS_THRESHOLDS.adjust.falsePositiveRate) {
        suggestions.adjust.push({
          analyzer,
          adjustment: 'increase_threshold',
          reason: `Moderate false positive rate (${(stats.falsePositiveRate * 100).toFixed(1)}%)`
        });
      }
      // Enable highly effective analyzers
      else if (stats.effectiveness > EFFECTIVENESS_THRESHOLDS.enable.effectiveness) {
        suggestions.enable.push({
          analyzer,
          reason: `High effectiveness score (${stats.effectiveness.toFixed(2)})`
        });
      }
    });

    return suggestions;
  }

  _suggestScanStrategy() {
    const fileCount = this.performanceMetrics.totalFiles / Math.max(this.performanceMetrics.totalScans, 1);
    const scanTime = this.performanceMetrics.avgScanTime;

    // Large codebases need incremental scanning
    if (fileCount > 1000 || scanTime > 120000) {
      return {
        strategy: 'incremental',
        reason: 'Large codebase or long scan times benefit from incremental scanning',
        config: {
          batchSize: 100,
          parallelism: 4,
          caching: true
        }
      };
    }

    // Medium codebases can use targeted scanning
    if (fileCount > 100) {
      return {
        strategy: 'targeted',
        reason: 'Medium-sized codebase suitable for targeted scanning',
        config: {
          focusAreas: ['recent_changes', 'high_complexity'],
          parallelism: 2
        }
      };
    }

    // Small codebases can use full scanning
    return {
      strategy: 'full',
      reason: 'Small codebase allows for comprehensive scanning',
      config: {
        parallelism: 1,
        deepAnalysis: true
      }
    };
  }

  _suggestResourceConfig() {
    const avgMemory = this.performanceMetrics.avgMemoryUsage;
    const avgTime = this.performanceMetrics.avgScanTime;

    const config = {
      memory: 'standard',
      timeout: 300000, // 5 minutes default
      workers: 2
    };

    // Adjust based on historical usage
    if (avgMemory > 1024 * 1024 * 1024) { // > 1GB
      config.memory = 'high';
      config.workers = 1; // Reduce parallelism to save memory
    } else if (avgMemory < 256 * 1024 * 1024) { // < 256MB
      config.memory = 'low';
      config.workers = 4; // Can afford more parallelism
    }

    // Adjust timeout based on scan times
    if (avgTime > 180000) { // > 3 minutes
      config.timeout = avgTime * 2; // Double the average for safety
    }

    return {
      config,
      reason: `Based on average memory usage (${(avgMemory / 1024 / 1024).toFixed(0)}MB) and scan time (${(avgTime / 1000).toFixed(1)}s)`
    };
  }

  _calculateConfidence() {
    // TODO: Future enhancement - make confidence factor weights configurable
    // Could accept custom weights via constructor options or method parameter
    const CONFIDENCE_WEIGHTS = {
      sufficientReports: { threshold: 10, weight: 0.3, fallback: 0.1 },
      sufficientFiles: { threshold: 100, weight: 0.2, fallback: 0.1 },
      sufficientIssues: { threshold: 50, weight: 0.2, fallback: 0.1 },
      sufficientAnalyzers: { threshold: 5, weight: 0.2, fallback: 0.1 },
      hasTimeRange: { weight: 0.1, fallback: 0 }
    };

    const factors = [
      this.historyAnalysis.reportsAnalyzed >= CONFIDENCE_WEIGHTS.sufficientReports.threshold
        ? CONFIDENCE_WEIGHTS.sufficientReports.weight
        : CONFIDENCE_WEIGHTS.sufficientReports.fallback,
      this.performanceMetrics.totalFiles > CONFIDENCE_WEIGHTS.sufficientFiles.threshold
        ? CONFIDENCE_WEIGHTS.sufficientFiles.weight
        : CONFIDENCE_WEIGHTS.sufficientFiles.fallback,
      this.performanceMetrics.totalIssues > CONFIDENCE_WEIGHTS.sufficientIssues.threshold
        ? CONFIDENCE_WEIGHTS.sufficientIssues.weight
        : CONFIDENCE_WEIGHTS.sufficientIssues.fallback,
      this.analyzerEffectiveness.size > CONFIDENCE_WEIGHTS.sufficientAnalyzers.threshold
        ? CONFIDENCE_WEIGHTS.sufficientAnalyzers.weight
        : CONFIDENCE_WEIGHTS.sufficientAnalyzers.fallback,
      this.historyAnalysis.timeRange.start
        ? CONFIDENCE_WEIGHTS.hasTimeRange.weight
        : CONFIDENCE_WEIGHTS.hasTimeRange.fallback
    ];

    return Math.min(factors.reduce((sum, f) => sum + f, 0), 1);
  }

  _generateAdjustmentSummary(suggestions) {
    const changes = [];

    if (suggestions.profileLevel.level !== 'standard') {
      changes.push(`Switch to ${suggestions.profileLevel.level} profile`);
    }

    const thresholdCount = Object.keys(suggestions.thresholds).length;
    if (thresholdCount > 0) {
      changes.push(`Adjust ${thresholdCount} threshold${thresholdCount > 1 ? 's' : ''}`);
    }

    const analyzerChanges =
      suggestions.analyzers.enable.length +
      suggestions.analyzers.disable.length +
      suggestions.analyzers.adjust.length;
    if (analyzerChanges > 0) {
      changes.push(`Modify ${analyzerChanges} analyzer configuration${analyzerChanges > 1 ? 's' : ''}`);
    }

    if (suggestions.scanStrategy.strategy !== 'full') {
      changes.push(`Use ${suggestions.scanStrategy.strategy} scanning strategy`);
    }

    return changes.length > 0 ? changes.join(', ') : 'No significant changes recommended';
  }

  _generateReasoning(suggestions) {
    const reasoning = [];

    // Profile reasoning
    reasoning.push({
      category: 'Profile Level',
      recommendation: suggestions.profileLevel.level,
      rationale: suggestions.profileLevel.reason,
      impact: 'Affects depth and breadth of analysis'
    });

    // Threshold reasoning
    if (Object.keys(suggestions.thresholds).length > 0) {
      Object.entries(suggestions.thresholds).forEach(([threshold, config]) => {
        reasoning.push({
          category: 'Threshold Adjustment',
          recommendation: `${threshold}: ${config.value}`,
          rationale: config.reason,
          impact: `Controls ${threshold} detection sensitivity`
        });
      });
    }

    // Analyzer reasoning
    if (suggestions.analyzers.disable.length > 0) {
      reasoning.push({
        category: 'Analyzer Optimization',
        recommendation: `Disable ${suggestions.analyzers.disable.length} analyzer(s)`,
        rationale: 'Low effectiveness or high false positive rates',
        impact: 'Reduces noise and improves scan performance'
      });
    }

    // Strategy reasoning
    reasoning.push({
      category: 'Scan Strategy',
      recommendation: suggestions.scanStrategy.strategy,
      rationale: suggestions.scanStrategy.reason,
      impact: 'Optimizes scan coverage and performance'
    });

    return reasoning;
  }
}