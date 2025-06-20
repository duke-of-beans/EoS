/**
 * Purpose: Provides QA/testing harness for Eye of Sauron scans
 * Dependencies: Node.js std lib
 * API: SauronTestHarness(scanner).simulateRun(), stressTest()
 *
 * Scanner Requirements:
 * - Must have scan() method that accepts: { targetPath, options }
 * - For synthetic mode, scanner should handle options.synthetic = true
 * - Scanner can optionally use options.syntheticFiles array if provided
 *
 * Usage:
 *   const harness = new SauronTestHarness(scanner, { seed: 12345 }); // Reproducible
 *   const harness = new SauronTestHarness(scanner); // Random seed
 */

export class SauronTestHarness {
  constructor(scannerInstance, config = {}) {
    if (!scannerInstance || typeof scannerInstance.scan !== 'function') {
      throw new Error('SauronTestHarness requires scanner instance with scan() method');
    }

    this.scanner = scannerInstance;
    this.config = {
      verbose: false,
      defaultTestSize: 'medium',
      syntheticDataSeed: config.seed || Date.now(),
      ...config
    };

    // Initialize pseudo-random generator with seed
    this._random = this._createSeededRandom(this.config.syntheticDataSeed);
  }

  /**
   * Simulates a scan run with synthetic inputs
   * @param {object} options - Simulation options
   * @returns {object} Scan report
   *
   * Note: Scanner must accept { targetPath, options } format where
   * options.synthetic = true indicates synthetic mode
   */
  async simulateRun(options = {}) {
    const startTime = Date.now();

    const simulationOptions = {
      testSize: 'medium',
      issueCount: 10,
      fileCount: 5,
      complexityLevel: 'moderate',
      ...options
    };

    // Generate synthetic scan context
    const syntheticContext = this._generateSyntheticContext(simulationOptions);

    if (this.config.verbose) {
      console.log('[SauronTestHarness] Starting simulated run:', {
        testSize: simulationOptions.testSize,
        fileCount: syntheticContext.targetPath ? syntheticContext.files.length : 0,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Run scanner with synthetic context
      const report = await this.scanner.scan(syntheticContext);

      const duration = Date.now() - startTime;

      if (this.config.verbose) {
        console.log('[SauronTestHarness] Simulated run complete:', {
          duration: `${duration}ms`,
          issuesFound: report.summary?.totalIssues || 0,
          filesScanned: report.summary?.filesScanned || 0
        });
      }

      // Inject test metadata
      return {
        ...report,
        testMetadata: {
          simulated: true,
          duration,
          options: simulationOptions,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (this.config.verbose) {
        console.error('[SauronTestHarness] Simulation error:', error.message);
      }

      return {
        success: false,
        error: error.message,
        testMetadata: {
          simulated: true,
          duration: Date.now() - startTime,
          options: simulationOptions,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Runs multiple simulated scans for stress testing
   * @param {number} iterations - Number of scans to run
   * @param {number} delayMs - Delay between scans in milliseconds
   * @returns {array} Array of scan reports
   */
  async stressTest(iterations, delayMs) {
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new Error('Iterations must be positive integer');
    }

    if (!Number.isInteger(delayMs) || delayMs < 0) {
      throw new Error('DelayMs must be non-negative integer');
    }

    const reports = [];
    const startTime = Date.now();

    if (this.config.verbose) {
      console.log('[SauronTestHarness] Starting stress test:', {
        iterations,
        delayMs,
        timestamp: new Date().toISOString()
      });
    }

    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();

      // Vary test parameters for each iteration
      const options = this._generateStressTestOptions(i, iterations);

      try {
        const report = await this.simulateRun(options);
        reports.push({
          ...report,
          stressTestMetadata: {
            iteration: i + 1,
            totalIterations: iterations
          }
        });
      } catch (error) {
        reports.push({
          success: false,
          error: error.message,
          stressTestMetadata: {
            iteration: i + 1,
            totalIterations: iterations
          }
        });
      }

      // Apply delay if not last iteration
      if (i < iterations - 1 && delayMs > 0) {
        await this._delay(delayMs);
      }

      if (this.config.verbose && (i + 1) % Math.ceil(iterations / 10) === 0) {
        console.log(`[SauronTestHarness] Progress: ${i + 1}/${iterations} iterations complete`);
      }
    }

    const totalDuration = Date.now() - startTime;

    if (this.config.verbose) {
      const successCount = reports.filter(r => r.success !== false).length;
      console.log('[SauronTestHarness] Stress test complete:', {
        totalDuration: `${totalDuration}ms`,
        avgDuration: `${Math.round(totalDuration / iterations)}ms`,
        successRate: `${((successCount / iterations) * 100).toFixed(1)}%`,
        totalReports: reports.length
      });
    }

    return reports;
  }

  // Private helper methods

  _generateSyntheticContext(options) {
    const { testSize, issueCount, fileCount, complexityLevel } = options;

    // Generate synthetic file structure
    const files = this._generateSyntheticFiles(fileCount, complexityLevel);

    // Create synthetic scan context in standard scanner format
    // Scanner should recognize options.synthetic and handle accordingly
    return {
      targetPath: '/synthetic/test/path',
      options: {
        synthetic: true,
        syntheticFiles: files,  // Optional: scanner can use if it supports synthetic files
        testSize,
        expectedIssues: issueCount,
        seed: this.config.syntheticDataSeed
      }
    };
  }

  _generateSyntheticFiles(count, complexity) {
    const files = [];
    const complexityMap = {
      simple: { minLines: 50, maxLines: 200 },
      moderate: { minLines: 200, maxLines: 500 },
      complex: { minLines: 500, maxLines: 1000 }
    };

    const { minLines, maxLines } = complexityMap[complexity] || complexityMap.moderate;

    for (let i = 0; i < count; i++) {
      files.push({
        path: `/synthetic/file${i + 1}.js`,
        content: this._generateSyntheticContent(minLines, maxLines),
        size: Math.floor(this._random() * (maxLines - minLines) + minLines) * 80,
        type: 'javascript'
      });
    }

    return files;
  }

  _generateSyntheticContent(minLines, maxLines) {
    const lineCount = Math.floor(this._random() * (maxLines - minLines) + minLines);
    const patterns = [
      '// TODO: Implement this feature',
      'console.log("Debug:", data);',
      'if (condition) { /* complex logic */ }',
      'function processData(input) { return input; }',
      '// FIXME: Performance issue here',
      'const result = await someAsyncOperation();'
    ];

    let content = '';
    for (let i = 0; i < lineCount; i++) {
      content += patterns[Math.floor(this._random() * patterns.length)] + '\n';
    }

    return content;
  }

  _generateStressTestOptions(iteration, total) {
    // Vary parameters based on iteration
    const progress = iteration / total;

    return {
      testSize: progress < 0.33 ? 'small' : progress < 0.66 ? 'medium' : 'large',
      issueCount: Math.floor(this._random() * 20) + 5,
      fileCount: Math.floor(this._random() * 10) + 2,
      complexityLevel: progress < 0.5 ? 'simple' : 'complex'
    };
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a seeded pseudo-random number generator
   * @param {number} seed - Initial seed value
   * @returns {function} Random number generator function (0-1)
   */
  _createSeededRandom(seed) {
    let state = seed;
    return () => {
      // Linear congruential generator (simple but adequate for testing)
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }
}