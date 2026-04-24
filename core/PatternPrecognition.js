/**
 * Purpose: Contract + risk pattern analyzer for Eye of Sauron
 * Dependencies: Node.js standard lib only
 * Public API: PatternPrecognition(config).detect(content, filePath)
 *
 * Limitations:
 * - Pattern matching uses regex which may not capture all edge cases in complex nested code
 * - Event type extraction assumes simple string literals (no template literals or computed values)
 */

export class PatternPrecognition {
  constructor(config = {}) {
    this.config = config;

    // Define required Tribunal contract methods
    this.requiredMethods = ['render', 'destroy', 'attachTo', 'toJSON'];

    // Pattern definitions
    this.patterns = {
      setInterval: /setInterval\s*\(/g,
      clearInterval: /clearInterval\s*\(/g,
      addEventListener: /addEventListener\s*\([^)]+\)/g,
      removeEventListener: /removeEventListener\s*\([^)]+\)/g,
      methodDefinition: /(?:(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)\s*{|(\w+)\s*:\s*(?:async\s+)?function\s*\([^)]*\)\s*{|(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>|(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)/g
    };
  }

  /**
   * Detect pattern violations and contract issues in content
   * @param {string} content - File content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Promise<Array>} Array of issue objects
   */
  async detect(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    // Detect memory leak patterns
    const memoryLeakIssues = this._detectMemoryLeaks(content, lines, filePath);
    issues.push(...memoryLeakIssues);

    // Detect event listener leaks
    const eventListenerIssues = this._detectEventListenerLeaks(content, lines, filePath);
    issues.push(...eventListenerIssues);

    // Detect missing Tribunal contract methods
    const contractIssues = this._detectMissingContractMethods(content, filePath);
    issues.push(...contractIssues);

    return issues;
  }

  /**
   * Detect setInterval without corresponding clearInterval
   * @private
   */
  _detectMemoryLeaks(content, lines, filePath) {
    const issues = [];
    const intervals = [];
    const clears = [];

    // Find all setInterval calls
    let match;
    this.patterns.setInterval.lastIndex = 0; // Reset regex state
    while ((match = this.patterns.setInterval.exec(content)) !== null) {
      const lineNum = this._getLineNumber(content, match.index);
      intervals.push({ index: match.index, line: lineNum });
    }

    // Find all clearInterval calls
    this.patterns.clearInterval.lastIndex = 0; // Reset regex state
    while ((match = this.patterns.clearInterval.exec(content)) !== null) {
      clears.push(match.index);
    }

    // Check if we have uncleared intervals
    if (intervals.length > 0 && clears.length === 0) {
      intervals.forEach(interval => {
        issues.push({
          type: 'MEMORY_LEAK',
          severity: 'DANGER',
          file: filePath,
          line: interval.line,
          message: 'setInterval detected without corresponding clearInterval',
          fix: 'Store interval ID and call clearInterval() in cleanup/destroy method'
        });
      });
    }

    return issues;
  }

  /**
   * Detect addEventListener without corresponding removeEventListener
   * Note: Event type extraction uses simple regex pattern matching,
   * may not capture all cases in complex nested code structures
   * @private
   */
  _detectEventListenerLeaks(content, lines, filePath) {
    const issues = [];
    const listeners = [];
    const removals = [];

    // Find all addEventListener calls with their event types
    let match;
    this.patterns.addEventListener.lastIndex = 0; // Reset regex state
    while ((match = this.patterns.addEventListener.exec(content)) !== null) {
      const lineNum = this._getLineNumber(content, match.index);
      // Simple pattern - may not handle complex nested quotes or template literals
      const eventMatch = match[0].match(/addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/);
      const eventType = eventMatch ? eventMatch[1] : 'unknown';
      listeners.push({
        index: match.index,
        line: lineNum,
        eventType,
        fullMatch: match[0]
      });
    }

    // Find all removeEventListener calls
    this.patterns.removeEventListener.lastIndex = 0; // Reset regex state
    while ((match = this.patterns.removeEventListener.exec(content)) !== null) {
      const eventMatch = match[0].match(/removeEventListener\s*\(\s*['"`]([^'"`]+)['"`]/);
      const eventType = eventMatch ? eventMatch[1] : 'unknown';
      removals.push({ eventType });
    }

    // Check for listeners without removal
    const removalEventTypes = new Set(removals.map(r => r.eventType));

    listeners.forEach(listener => {
      if (!removalEventTypes.has(listener.eventType)) {
        issues.push({
          type: 'MEMORY_LEAK',
          severity: 'DANGER',
          file: filePath,
          line: listener.line,
          message: `addEventListener('${listener.eventType}') without corresponding removeEventListener`,
          fix: `Add removeEventListener('${listener.eventType}', handler) in cleanup/destroy method`
        });
      }
    });

    return issues;
  }

  /**
   * Detect missing Tribunal contract methods
   * @private
   */
  _detectMissingContractMethods(content, filePath) {
    const issues = [];

    // Skip Tribunal contract checks when flag is set (e.g. React functional components)
    if (this.config.skipTribunalContract === true) {
      return issues;
    }

    const foundMethods = new Set();

    // Check if this looks like a class/component file
    const isComponentFile = /class\s+\w+|export\s+(?:default\s+)?(?:class|function)|\.prototype\./i.test(content);

    if (!isComponentFile) {
      return issues; // Skip non-component files
    }

    // Find all method definitions
    let match;
    this.patterns.methodDefinition.lastIndex = 0; // Reset regex state
    while ((match = this.patterns.methodDefinition.exec(content)) !== null) {
      // Extract method name from various capture groups
      const methodName = match[1] || match[2] || match[3] || match[4];
      if (methodName) {
        foundMethods.add(methodName);
      }
    }

    // Check for missing required methods
    const missingMethods = this.requiredMethods.filter(method => !foundMethods.has(method));

    if (missingMethods.length > 0) {
      // Determine severity based on number of missing methods
      const severity = missingMethods.length === this.requiredMethods.length ? 'APOCALYPSE' :
                      missingMethods.length >= 2 ? 'DANGER' : 'WARNING';

      issues.push({
        type: 'MISSING_METHOD',
        severity,
        file: filePath,
        line: 1, // Contract violations apply to whole file
        message: `Missing required Tribunal contract methods: ${missingMethods.join(', ')}`,
        fix: `Implement the following methods: ${missingMethods.map(m => `${m}()`).join(', ')}`
      });
    }

    return issues;
  }

  /**
   * Get line number for a character index
   * @private
   */
  _getLineNumber(content, index) {
    const substring = content.substring(0, index);
    return substring.split('\n').length;
  }
}