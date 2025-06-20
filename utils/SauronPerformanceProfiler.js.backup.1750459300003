/**
 * Purpose: Collects and reports scan performance trends across multiple Eye of Sauron runs
 * Dependencies: Node.js standard library (fs, path, crypto)
 * Public API:
 *   - new SauronPerformanceProfiler(config) - Initialize profiler with optional history persistence
 *   - recordRun(metrics) - Record metrics from a scan run
 *   - summarizeTrends() - Get statistical summary and trends
 *   - clearHistory() - Clear all recorded history
 *   - loadHistory() - Load persisted history from file (returns Promise<boolean>)
 *   - saveHistory() - Save current history to file (returns Promise<boolean>)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export class SauronPerformanceProfiler {
  constructor(config = {}) {
    this.historyPath = config.historyPath || null;
    this.history = [];
    this.maxHistorySize = config.maxHistorySize || 1000;
    this.recentRunsWindow = config.recentRunsWindow || 10;
    this.dynamicWindowAdjust = config.dynamicWindowAdjust !== false; // Default true
    this.useHashedRunIds = config.useHashedRunIds || false;
  }

  /**
   * Record performance metrics from a scan run
   * @param {Object} metrics - Performance metrics object
   * @param {number} metrics.duration - Scan duration in milliseconds
   * @param {number} metrics.memory - Memory usage in bytes
   * @param {number} metrics.cpu - CPU usage percentage
   * @param {number} metrics.fileCount - Number of files scanned
   * @param {number} metrics.issueCount - Number of issues found
   * @returns {void}
   */
  recordRun(metrics) {
    // Validate metrics
    const validatedMetrics = this._validateMetrics(metrics);
    if (!validatedMetrics) {
      console.warn('[SauronPerformanceProfiler] Invalid metrics provided, skipping record');
      return;
    }

    // Add timestamp
    const record = {
      ...validatedMetrics,
      timestamp: new Date().toISOString(),
      runId: this._generateRunId()
    };

    // Add to history with size limit
    this.history.push(record);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Summarize performance trends from recorded history
   * @returns {Object} Summary statistics and trends
   */
  summarizeTrends() {
    if (this.history.length === 0) {
      return {
        totalRuns: 0,
        metrics: {},
        recentTrend: {},
        summary: 'No performance data recorded yet'
      };
    }

    const metrics = ['duration', 'memory', 'cpu', 'fileCount', 'issueCount'];
    const summary = {
      totalRuns: this.history.length,
      metrics: {},
      recentTrend: {},
      timeRange: {
        earliest: this.history[0].timestamp,
        latest: this.history[this.history.length - 1].timestamp
      }
    };

    // Calculate statistics for each metric
    metrics.forEach(metric => {
      const values = this.history.map(run => run[metric]).filter(v => v !== undefined);
      if (values.length > 0) {
        summary.metrics[metric] = {
          average: this._calculateAverage(values),
          min: Math.min(...values),
          max: Math.max(...values),
          median: this._calculateMedian(values),
          standardDeviation: this._calculateStandardDeviation(values)
        };
      }
    });

    // Calculate recent trends with dynamic window adjustment
    const effectiveWindow = this._getEffectiveTrendWindow();
    const recentRuns = this.history.slice(-effectiveWindow);
    
    if (recentRuns.length >= 2) {
      metrics.forEach(metric => {
        const recentValues = recentRuns.map(run => run[metric]).filter(v => v !== undefined);
        if (recentValues.length >= 2) {
          const trend = this._calculateTrend(recentValues);
          summary.recentTrend[metric] = {
            direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            percentageChange: trend,
            recentAverage: this._calculateAverage(recentValues),
            windowSize: recentValues.length,
            effectiveWindow: effectiveWindow
          };
        }
      });
    }

    // Add performance insights
    summary.insights = this._generateInsights(summary);

    return summary;
  }

  /**
   * Clear all recorded history
   * @returns {void}
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Load performance history from file
   * @returns {Promise<boolean>} True if successfully loaded, false otherwise
   */
  async loadHistory() {
    if (!this.historyPath) {
      console.log('[SauronPerformanceProfiler] No history path configured, skipping load');
      return false;
    }

    try {
      const data = await fs.readFile(this.historyPath, 'utf8');
      const loadedHistory = JSON.parse(data);
      
      // Validate loaded data
      if (!Array.isArray(loadedHistory)) {
        throw new Error('Invalid history format: expected array');
      }

      // Validate each record
      const validHistory = loadedHistory.filter(record => {
        const validated = this._validateMetrics(record);
        return validated && record.timestamp && record.runId;
      });

      this.history = validHistory.slice(-this.maxHistorySize);
      console.log(`[SauronPerformanceProfiler] Loaded ${this.history.length} performance records`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[SauronPerformanceProfiler] No history file found, starting fresh');
      } else {
        console.error('[SauronPerformanceProfiler] Error loading history:', error.message);
      }
      this.history = [];
      return false;
    }
  }

  /**
   * Save performance history to file
   * @returns {Promise<boolean>} True if successfully saved, false otherwise
   */
  async saveHistory() {
    if (!this.historyPath) {
      console.log('[SauronPerformanceProfiler] No history path configured, skipping save');
      return false;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.historyPath);
      await fs.mkdir(dir, { recursive: true });

      // Save history
      await fs.writeFile(
        this.historyPath,
        JSON.stringify(this.history, null, 2),
        'utf8'
      );
      console.log(`[SauronPerformanceProfiler] Saved ${this.history.length} performance records`);
      return true;
    } catch (error) {
      console.error('[SauronPerformanceProfiler] Error saving history:', error.message);
      return false;
    }
  }

  // Private helper methods

  _validateMetrics(metrics) {
    if (!metrics || typeof metrics !== 'object') {
      return null;
    }

    const validated = {};
    const numericFields = ['duration', 'memory', 'cpu', 'fileCount', 'issueCount'];

    for (const field of numericFields) {
      if (field in metrics) {
        const value = Number(metrics[field]);
        if (!isNaN(value) && value >= 0) {
          validated[field] = value;
        }
      }
    }

    // Require at least one valid metric
    return Object.keys(validated).length > 0 ? validated : null;
  }

  _generateRunId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const baseId = `run_${timestamp}_${random}`;
    
    if (this.useHashedRunIds) {
      // Create a hash for obfuscation
      const hash = createHash('sha256')
        .update(baseId)
        .digest('hex')
        .substring(0, 16); // Use first 16 chars for reasonable length
      return `run_${hash}`;
    }
    
    return baseId;
  }

  _getEffectiveTrendWindow() {
    if (!this.dynamicWindowAdjust) {
      return this.recentRunsWindow;
    }

    // Dynamic adjustment based on history size
    const historySize = this.history.length;
    
    if (historySize < 10) {
      // Very small history: use all available data
      return Math.max(2, historySize);
    } else if (historySize < 50) {
      // Small history: use 20% of data
      return Math.max(5, Math.floor(historySize * 0.2));
    } else if (historySize < 200) {
      // Medium history: use 10% of data
      return Math.max(10, Math.floor(historySize * 0.1));
    } else {
      // Large history: use configured window or 5% of data, whichever is larger
      return Math.max(this.recentRunsWindow, Math.floor(historySize * 0.05));
    }
  }

  _calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  _calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  _calculateStandardDeviation(values) {
    const avg = this._calculateAverage(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = this._calculateAverage(squaredDiffs);
    return Math.sqrt(variance);
  }

  _calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this._calculateAverage(firstHalf);
    const secondAvg = this._calculateAverage(secondHalf);
    
    if (firstAvg === 0) return 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  _generateInsights(summary) {
    const insights = [];

    // Performance trend insights
    if (summary.recentTrend.duration) {
      const trend = summary.recentTrend.duration;
      if (trend.direction === 'increasing' && trend.percentageChange > 20) {
        insights.push(`⚠️ Scan duration has increased by ${trend.percentageChange.toFixed(1)}% recently`);
      } else if (trend.direction === 'decreasing' && trend.percentageChange < -20) {
        insights.push(`✅ Scan duration has improved by ${Math.abs(trend.percentageChange).toFixed(1)}% recently`);
      }
    }

    // Memory usage insights
    if (summary.metrics.memory) {
      const memoryMB = summary.metrics.memory.average / (1024 * 1024);
      if (memoryMB > 1000) {
        insights.push(`💾 High average memory usage: ${memoryMB.toFixed(0)}MB`);
      }
    }

    // File/issue ratio insights
    if (summary.metrics.fileCount && summary.metrics.issueCount) {
      const issuesPerFile = summary.metrics.issueCount.average / summary.metrics.fileCount.average;
      if (issuesPerFile > 5) {
        insights.push(`📊 High issue density: ${issuesPerFile.toFixed(1)} issues per file on average`);
      }
    }

    // Consistency insights
    if (summary.metrics.duration) {
      const cv = (summary.metrics.duration.standardDeviation / summary.metrics.duration.average) * 100;
      if (cv > 50) {
        insights.push(`🎲 High variability in scan duration (CV: ${cv.toFixed(0)}%)`);
      }
    }

    // Dynamic window adjustment insight
    if (this.dynamicWindowAdjust && summary.recentTrend.duration && summary.recentTrend.duration.effectiveWindow) {
      const window = summary.recentTrend.duration.effectiveWindow;
      if (window !== this.recentRunsWindow) {
        insights.push(`📊 Trend window dynamically adjusted to ${window} runs based on history size`);
      }
    }

    return insights.length > 0 ? insights : ['✨ Performance metrics appear stable'];
  }
}