/**
 * Purpose: Generates synthetic scan reports for testing/QA
 * Dependencies: Node.js std lib
 * Public API: SauronScanSimulator().generateReport()
 */

class SauronScanSimulator {
  constructor(config = {}) {
    this.config = {
      issueDistribution: config.issueDistribution || this._getDefaultDistribution(),
      fileCount: config.fileCount || 10,
      seed: config.seed || null
    };

    // Initialize random number generator
    this.rng = this.config.seed ? this._createSeededRNG(this.config.seed) : Math.random;
  }

  /**
   * Generates synthetic scan report matching real report format
   * @returns {object} Complete scan report with files, issues, and metrics
   */
  generateReport() {
    const startTime = Date.now();
    const files = this._generateFileList();
    const scanResults = this._generateScanResults(files);
    const endTime = Date.now();

    return {
      metadata: {
        scanId: this._generateId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        simulator: true
      },
      summary: {
        totalFiles: files.length,
        totalIssues: scanResults.totalIssues,
        issuesBySeverity: scanResults.issuesBySeverity,
        issuesByType: scanResults.issuesByType
      },
      files: scanResults.files,
      timing: {
        startTime,
        endTime,
        duration: endTime - startTime,
        avgTimePerFile: Math.round(((endTime - startTime) / files.length) * 100) / 100
      },
      resources: {
        memoryUsage: this._simulateMemoryUsage(),
        cpuUsage: this._simulateCpuUsage()
      }
    };
  }

  _generateFileList() {
    const files = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
    const directories = ['src/', 'lib/', 'components/', 'utils/', 'services/', 'hooks/'];

    for (let i = 0; i < this.config.fileCount; i++) {
      const dir = this._randomChoice(directories);
      const name = this._generateFileName();
      const ext = this._randomChoice(extensions);
      files.push(`${dir}${name}${ext}`);
    }

    return files;
  }

  _generateScanResults(files) {
    const results = {
      files: {},
      totalIssues: 0,
      issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      issuesByType: {}
    };

    files.forEach(filePath => {
      const fileIssues = this._generateFileIssues(filePath);
      results.files[filePath] = {
        path: filePath,
        issues: fileIssues,
        metrics: this._generateFileMetrics()
      };

      // Update aggregates
      fileIssues.forEach(issue => {
        results.totalIssues++;
        results.issuesBySeverity[issue.severity]++;
        results.issuesByType[issue.type] = (results.issuesByType[issue.type] || 0) + 1;
      });
    });

    return results;
  }

  _generateFileIssues(filePath) {
    const issues = [];
    const issueCount = this._getIssueCount();
    const issueTypes = Object.keys(this.config.issueDistribution);

    for (let i = 0; i < issueCount; i++) {
      const type = this._weightedRandomChoice(issueTypes, this.config.issueDistribution);
      issues.push(this._createIssue(type, filePath));
    }

    return issues.sort((a, b) => a.line - b.line);
  }

  _createIssue(type, filePath) {
    // TODO: Future enhancement - allow external template configuration
    // via config.issueTemplates to override these defaults
    const issueTemplates = {
      duplicateLogic: {
        severities: ['medium', 'high'],
        messages: [
          'Duplicate implementation detected',
          'Similar logic found in multiple locations',
          'Potential code duplication'
        ]
      },
      complexity: {
        severities: ['high', 'critical'],
        messages: [
          'Cyclomatic complexity exceeds threshold',
          'Function too complex to maintain',
          'Excessive branching detected'
        ]
      },
      pattern: {
        severities: ['low', 'medium'],
        messages: [
          'Inconsistent pattern usage',
          'Pattern deviation detected',
          'Non-standard implementation approach'
        ]
      },
      performance: {
        severities: ['medium', 'high'],
        messages: [
          'Potential performance bottleneck',
          'Inefficient algorithm detected',
          'Resource-intensive operation'
        ]
      },
      security: {
        severities: ['high', 'critical'],
        messages: [
          'Potential security vulnerability',
          'Unsafe operation detected',
          'Input validation missing'
        ]
      },
      maintainability: {
        severities: ['low', 'medium'],
        messages: [
          'Code difficult to maintain',
          'Missing documentation',
          'Unclear variable naming'
        ]
      }
    };

    const template = issueTemplates[type] || {
      severities: ['low', 'medium'],
      messages: ['Generic issue detected']
    };

    return {
      id: this._generateId(),
      type,
      severity: this._randomChoice(template.severities),
      filePath, // Preserved as required
      line: Math.floor(this.rng() * 500) + 1,
      column: Math.floor(this.rng() * 120) + 1,
      endLine: null,
      endColumn: null,
      message: this._randomChoice(template.messages),
      rule: `${type}-${Math.floor(this.rng() * 100)}`,
      evidence: this._generateCodeSnippet(),
      fix: this.rng() > 0.7 ? this._generateFix() : null
    };
  }

  _generateFileMetrics() {
    return {
      lines: Math.floor(this.rng() * 1000) + 50,
      functions: Math.floor(this.rng() * 20) + 1,
      classes: Math.floor(this.rng() * 5),
      imports: Math.floor(this.rng() * 15),
      exports: Math.floor(this.rng() * 10) + 1,
      complexity: Math.floor(this.rng() * 50) + 1
    };
  }

  _generateCodeSnippet() {
    const snippets = [
      'if (condition && anotherCondition || thirdCondition) {',
      'function processData(data) { return data.map(x => x * 2); }',
      'const result = await fetch(url).then(r => r.json());',
      'for (let i = 0; i < items.length; i++) { process(items[i]); }',
      'Object.keys(obj).forEach(key => { obj[key] = transform(obj[key]); });'
    ];
    return this._randomChoice(snippets);
  }

  _generateFix() {
    return {
      description: 'Suggested fix for the issue',
      diff: {
        before: 'old code',
        after: 'new code'
      }
    };
  }

  _generateFileName() {
    const prefixes = ['user', 'product', 'order', 'auth', 'api', 'data', 'config'];
    const suffixes = ['Service', 'Controller', 'Utils', 'Helper', 'Manager', 'Handler'];
    return this._randomChoice(prefixes) + this._randomChoice(suffixes);
  }

  _getIssueCount() {
    // Simulate realistic distribution
    const rand = this.rng();
    if (rand < 0.3) return 0; // 30% files have no issues
    if (rand < 0.6) return Math.floor(this.rng() * 3) + 1; // 30% have 1-3 issues
    if (rand < 0.85) return Math.floor(this.rng() * 5) + 3; // 25% have 3-7 issues
    return Math.floor(this.rng() * 10) + 5; // 15% have many issues
  }

  _simulateMemoryUsage() {
    // Scale memory usage based on file count
    const baseMemory = 50 * 1024 * 1024; // 50MB base
    const perFileMemory = 2 * 1024 * 1024; // 2MB per file
    const variability = this.rng() * 50 * 1024 * 1024; // 0-50MB random variance

    const heapUsed = baseMemory + (this.config.fileCount * perFileMemory) + variability;
    const heapTotal = Math.max(256 * 1024 * 1024, heapUsed * 1.5); // At least 256MB, or 1.5x used

    return {
      heapUsed: Math.floor(heapUsed),
      heapTotal: Math.floor(heapTotal),
      external: Math.floor((10 + this.rng() * 20) * 1024 * 1024),
      rss: Math.floor(heapTotal + (20 + this.rng() * 30) * 1024 * 1024)
    };
  }

  _simulateCpuUsage() {
    // Scale CPU usage based on file count
    const baseUser = 100;
    const perFileUser = 20;
    const baseSystem = 20;
    const perFileSystem = 5;

    return {
      user: Math.floor(baseUser + (this.config.fileCount * perFileUser) + (this.rng() * 200)),
      system: Math.floor(baseSystem + (this.config.fileCount * perFileSystem) + (this.rng() * 50)),
      percent: Math.floor(20 + (this.config.fileCount * 0.5) + (this.rng() * 30))
    };
  }

  _getDefaultDistribution() {
    return {
      duplicateLogic: 0.25,
      complexity: 0.20,
      pattern: 0.20,
      performance: 0.15,
      security: 0.10,
      maintainability: 0.10
    };
  }

  _randomChoice(array) {
    return array[Math.floor(this.rng() * array.length)];
  }

  _weightedRandomChoice(choices, weights) {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = this.rng() * total;

    for (const choice of choices) {
      random -= weights[choice];
      if (random <= 0) return choice;
    }

    return choices[choices.length - 1];
  }

  _generateId() {
    return 'sim_' + Date.now().toString(36) + '_' + Math.floor(this.rng() * 1000).toString(36);
  }

  _createSeededRNG(seed) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}

export { SauronScanSimulator };