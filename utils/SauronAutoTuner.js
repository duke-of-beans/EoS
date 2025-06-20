/**
 * Purpose: Adjusts scan configs dynamically during runtime based on performance metrics
 * Dependencies: Node.js std lib
 * Public API:
 *   - new SauronAutoTuner(config) - Initialize with threshold configuration
 *   - tune(metrics) - Returns recommended config adjustments based on metrics
 */

export class SauronAutoTuner {
  constructor(config = {}) {
    this.thresholds = {
      maxDurationMs: 5000,
      maxMemoryMb: 500,
      maxFileSize: 1024 * 1024, // 1MB
      maxComplexity: 100,
      ...config.thresholds
    };

    // Profile levels from least to most aggressive
    // Can be overridden via config.profileLevels
    this.profileLevels = config.profileLevels || [
      'minimal',    // Fastest, least thorough
      'basic',      // Basic checks only
      'standard',   // Default balanced mode
      'thorough',   // Comprehensive analysis
      'maximum'     // All analyzers, deep inspection
    ];

    // Analyzer cost rankings (lower = cheaper)
    this.analyzerCosts = {
      'CharacterForensics': 1,
      'PatternPrecognition': 2,
      'ScanProfiler': 1,
      'EyeOfSauronOmniscient': 3,
      'DeepCodeAnalyzer': 4,
      'SecurityScanner': 3,
      'PerformanceAnalyzer': 2,
      ...config.analyzerCosts // Allow override/extension
    };

    // Default cost for unknown analyzers
    this.defaultAnalyzerCost = config.defaultAnalyzerCost || 2;

    // Performance headroom calculation weights
    this.headroomWeights = {
      duration: 0.4,
      memory: 0.4,
      fileSize: 0.1,
      complexity: 0.1,
      ...config.headroomWeights
    };

    // Critical analyzers that should be enabled for complex code
    this.criticalAnalyzers = config.criticalAnalyzers || [
      'SecurityScanner',
      'DeepCodeAnalyzer'
    ];
  }

  /**
   * Analyzes metrics and returns recommended configuration adjustments
   * @param {Object} metrics - Current scan metrics
   * @param {number} metrics.durationMs - Time taken for last scan
   * @param {number} metrics.memoryMb - Memory usage during scan
   * @param {number} metrics.fileSize - Size of file being scanned
   * @param {number} metrics.complexity - Complexity score of code
   * @param {string} metrics.currentProfile - Current profile level
   * @param {Array} metrics.enabledAnalyzers - Currently enabled analyzers
   * @returns {Object} Recommended adjustments with reasoning
   */
  tune(metrics) {
    // Reset warning state
    this._unknownAnalyzersWarning = null;
    this._profileWarning = null;

    // Validate current profile
    const currentProfile = this._validateProfile(metrics.currentProfile);

    const adjustments = {
      profile: currentProfile,
      enabledAnalyzers: metrics.enabledAnalyzers || [],
      changes: [],
      reasoning: [],
      warnings: []
    };

    // Add profile warning if any
    if (this._profileWarning) {
      adjustments.warnings.push(this._profileWarning);
    }

    // Check duration threshold
    if (metrics.durationMs > this.thresholds.maxDurationMs) {
      const reduction = this._recommendProfileReduction(adjustments.profile);
      if (reduction) {
        adjustments.profile = reduction;
        adjustments.changes.push(`Profile reduced from ${adjustments.profile} to ${reduction}`);
        adjustments.reasoning.push(
          `Scan duration (${metrics.durationMs}ms) exceeded threshold (${this.thresholds.maxDurationMs}ms)`
        );
      }

      // Also consider disabling expensive analyzers
      const expensiveAnalyzers = this._getExpensiveAnalyzers(metrics.enabledAnalyzers);
      if (expensiveAnalyzers.length > 0) {
        adjustments.enabledAnalyzers = metrics.enabledAnalyzers.filter(
          a => !expensiveAnalyzers.includes(a)
        );
        adjustments.changes.push(`Disabled expensive analyzers: ${expensiveAnalyzers.join(', ')}`);
        adjustments.reasoning.push('Removing high-cost analyzers to improve performance');
      }

      // Add unknown analyzer warning if any
      if (this._unknownAnalyzersWarning) {
        adjustments.warnings.push(this._unknownAnalyzersWarning);
      }
    }

    // Check memory threshold
    if (metrics.memoryMb > this.thresholds.maxMemoryMb) {
      const reduction = this._recommendProfileReduction(adjustments.profile);
      if (reduction && reduction !== adjustments.profile) {
        adjustments.profile = reduction;
        adjustments.changes.push(`Profile further reduced to ${reduction} due to memory usage`);
        adjustments.reasoning.push(
          `Memory usage (${metrics.memoryMb}MB) exceeded threshold (${this.thresholds.maxMemoryMb}MB)`
        );
      }
    }

    // Check file size - large files need lighter scanning
    if (metrics.fileSize > this.thresholds.maxFileSize) {
      const sizeRatio = metrics.fileSize / this.thresholds.maxFileSize;
      if (sizeRatio > 2) {
        adjustments.profile = this.profileLevels[0]; // Use first (minimal) profile
        adjustments.changes.push(`Profile set to ${this.profileLevels[0]} for very large file`);
        adjustments.reasoning.push(
          `File size (${(metrics.fileSize / 1024 / 1024).toFixed(2)}MB) is ${sizeRatio.toFixed(1)}x larger than threshold`
        );
      }
    }

    // Check complexity - complex code might need more thorough analysis
    if (metrics.complexity > this.thresholds.maxComplexity) {
      // For complex code, we might want to keep certain analyzers even if slow
      const missingCritical = this.criticalAnalyzers.filter(
        a => !adjustments.enabledAnalyzers.includes(a)
      );

      if (missingCritical.length > 0 && metrics.durationMs < this.thresholds.maxDurationMs * 0.8) {
        adjustments.enabledAnalyzers = [...adjustments.enabledAnalyzers, ...missingCritical];
        adjustments.changes.push(`Enabled critical analyzers for complex code: ${missingCritical.join(', ')}`);
        adjustments.reasoning.push(
          `Code complexity (${metrics.complexity}) exceeds threshold, enabling security analyzers`
        );
      }
    }

    // Performance is good - consider increasing profile
    const performanceHeadroom = this._calculatePerformanceHeadroom(metrics);
    if (performanceHeadroom > 0.5) {
      const increase = this._recommendProfileIncrease(adjustments.profile);
      if (increase) {
        adjustments.profile = increase;
        adjustments.changes.push(`Profile increased to ${increase} due to good performance`);
        adjustments.reasoning.push(
          `Performance headroom available (${(performanceHeadroom * 100).toFixed(0)}% below thresholds)`
        );
      }
    }

    // If no changes were made, indicate stable configuration
    if (adjustments.changes.length === 0) {
      adjustments.changes.push('No adjustments needed');
      adjustments.reasoning.push('Current configuration is within all thresholds');
    }

    return {
      recommendedProfile: adjustments.profile,
      recommendedAnalyzers: adjustments.enabledAnalyzers,
      changes: adjustments.changes,
      reasoning: adjustments.reasoning,
      warnings: adjustments.warnings,
      metrics: {
        durationRatio: metrics.durationMs / this.thresholds.maxDurationMs,
        memoryRatio: metrics.memoryMb / this.thresholds.maxMemoryMb,
        fileSizeRatio: metrics.fileSize / this.thresholds.maxFileSize,
        complexityRatio: metrics.complexity / this.thresholds.maxComplexity,
        performanceHeadroom: performanceHeadroom
      }
    };
  }

  /**
   * Validates and normalizes profile name
   * @private
   */
  _validateProfile(profile) {
    if (!profile) {
      return this.profileLevels[2]; // Default to 'standard' (middle level)
    }

    if (!this.profileLevels.includes(profile)) {
      // Unknown profile - default to middle level and warn
      const defaultProfile = this.profileLevels[Math.floor(this.profileLevels.length / 2)];
      this._profileWarning = `Unknown profile '${profile}' - using '${defaultProfile}'`;
      return defaultProfile;
    }

    return profile;
  }

  /**
   * Recommends a lower profile level
   * @private
   */
  _recommendProfileReduction(currentProfile) {
    const currentIndex = this.profileLevels.indexOf(currentProfile);
    if (currentIndex > 0) {
      return this.profileLevels[currentIndex - 1];
    }
    return null;
  }

  /**
   * Recommends a higher profile level
   * @private
   */
  _recommendProfileIncrease(currentProfile) {
    const currentIndex = this.profileLevels.indexOf(currentProfile);
    if (currentIndex < this.profileLevels.length - 1 && currentIndex !== -1) {
      return this.profileLevels[currentIndex + 1];
    }
    return null;
  }

  /**
   * Identifies expensive analyzers from the enabled list
   * @private
   */
  _getExpensiveAnalyzers(enabledAnalyzers) {
    const unknownAnalyzers = [];

    const analyzersWithCosts = enabledAnalyzers.map(analyzer => {
      let cost = this.analyzerCosts[analyzer];
      if (cost === undefined) {
        cost = this.defaultAnalyzerCost;
        unknownAnalyzers.push(analyzer);
      }
      return { analyzer, cost };
    });

    // Log warning for unknown analyzers (pure function - returns info instead of logging)
    if (unknownAnalyzers.length > 0) {
      // Include unknown analyzer info in return for caller to handle
      this._unknownAnalyzersWarning = `Unknown analyzers encountered (using default cost ${this.defaultAnalyzerCost}): ${unknownAnalyzers.join(', ')}`;
    }

    return analyzersWithCosts
      .filter(({ cost }) => cost >= 3)
      .sort((a, b) => b.cost - a.cost)
      .map(({ analyzer }) => analyzer);
  }

  /**
   * Calculates how much performance headroom is available
   * @private
   */
  _calculatePerformanceHeadroom(metrics) {
    // Calculate usage ratios for each metric
    const usageRatios = {
      duration: metrics.durationMs / this.thresholds.maxDurationMs,
      memory: metrics.memoryMb / this.thresholds.maxMemoryMb,
      fileSize: metrics.fileSize / this.thresholds.maxFileSize,
      complexity: metrics.complexity / this.thresholds.maxComplexity
    };

    // Calculate weighted average usage
    let totalWeight = 0;
    let weightedUsage = 0;

    for (const [metric, ratio] of Object.entries(usageRatios)) {
      const weight = this.headroomWeights[metric] || 0;
      totalWeight += weight;
      weightedUsage += ratio * weight;
    }

    // Normalize and calculate headroom
    const averageUsage = totalWeight > 0 ? weightedUsage / totalWeight : 0;
    const headroom = Math.max(0, 1 - averageUsage);

    // Also consider the maximum usage to prevent any single metric from being ignored
    const maxUsage = Math.max(...Object.values(usageRatios));
    const conservativeHeadroom = Math.max(0, 1 - maxUsage);

    // Return the more conservative estimate
    return Math.min(headroom, conservativeHeadroom);
  }
}