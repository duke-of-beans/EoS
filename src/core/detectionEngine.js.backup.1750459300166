/**
 * Detection Engine - Core engine that orchestrates all detectors
 * Dependencies: fs, path, all detectors, config loader
 * Public API: scan(rootPath, options)
 */

const fs = require('fs').promises;
const path = require('path');
const { Worker } = require('worker_threads');
const os = require('os');

// Import detectors
const ConsoleDetector = require('../detectors/consoleDetector');
const APIKeyDetector = require('../detectors/apiKeyDetector');
const EventListenerDetector = require('../detectors/eventListenerDetector');
const PropTypesDetector = require('../detectors/propTypesDetector');
const WebpackDetector = require('../detectors/webpackDetector');
const EOSConfigLoader = require('../config/eosConfigLoader');

class DetectionEngine {
  constructor() {
    this.configLoader = new EOSConfigLoader();
    this.detectors = {
      console: new ConsoleDetector(),
      apiKey: new APIKeyDetector(),
      eventListener: new EventListenerDetector(),
      propTypes: new PropTypesDetector(),
      webpack: new WebpackDetector()
    };
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      timeElapsed: 0,
      errors: []
    };
  }

  async scan(rootPath = '.', options = {}) {
    const startTime = Date.now();

    // Load configuration
    const config = this.configLoader.load(options.configPath, options);

    // Reset stats
    this.resetStats();

    try {
      // Discover files to scan
      const files = await this.discoverFiles(rootPath, config);

      // Run detectors on all files
      const allIssues = await this.runDetectors(files, config);

      // Calculate stats
      this.stats.timeElapsed = Date.now() - startTime;
      this.stats.issuesFound = allIssues.length;

      // Build final report
      const report = this.buildReport(allIssues, config);

      return report;
    } catch (error) {
      this.stats.errors.push({
        type: 'scan-error',
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  resetStats() {
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      timeElapsed: 0,
      errors: []
    };
  }

  async discoverFiles(rootPath, config) {
    const files = [];
    const seen = new Set();

    async function walk(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(rootPath, fullPath);

          // Skip excluded paths
          if (config.exclude.some(pattern =>
            relativePath.includes(pattern) || entry.name.startsWith('.'))) {
            continue;
          }

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            // Check if file matches include patterns
            const shouldInclude = config.include.some(pattern => {
              const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
              return regex.test(relativePath);
            });

            if (shouldInclude && !seen.has(fullPath)) {
              seen.add(fullPath);
              const stats = await fs.stat(fullPath);

              // Skip files that are too large
              if (stats.size <= config.maxFileSize) {
                files.push(fullPath);
              }
            }
          }
        }
      } catch (error) {
        this.stats.errors.push({
          type: 'file-discovery-error',
          path: dir,
          message: error.message
        });
      }
    }

    try {
  await walk(rootPath);
} catch (err) {
  console.error('Failed to walk rootPath:', err);
}
    return files;
  }

  async runDetectors(files, config) {
    const allIssues = [];
    const concurrency = Math.min(config.maxConcurrency, os.cpus().length);
    const chunks = this.chunkArray(files, Math.ceil(files.length / concurrency));

    const promises = chunks.map(chunk =>
      this.processFileChunk(chunk, config)
    );

    let results;
try {
  results = await Promise.all(promises);
} catch (err) {
  console.error('Failed to process promises:', err);
}
    results.forEach(chunkIssues => {
      allIssues.push(...chunkIssues);
    });

    return allIssues;
  }

  async processFileChunk(files, config) {
    const issues = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fileIssues = await this.scanFile(content, file, config);
        issues.push(...fileIssues);
        this.stats.filesScanned++;
      } catch (error) {
        this.stats.errors.push({
          type: 'file-read-error',
          file: file,
          message: error.message
        });
      }
    }

    return issues;
  }

  async scanFile(content, filePath, config) {
    const issues = [];
    const enabledDetectors = Object.entries(this.detectors)
      .filter(([name]) => !config.disabledDetectors.includes(name));

    for (const [name, detector] of enabledDetectors) {
      try {
        const detectorIssues = await detector.detect(content, filePath, config);
        issues.push(...detectorIssues);
      } catch (error) {
        this.stats.errors.push({
          type: 'detector-error',
          detector: name,
          file: filePath,
          message: error.message
        });
      }
    }

    // Filter by severity threshold
    const severityLevels = {
      info: 0,
      warning: 1,
      error: 2,
      critical: 3
    };

    const threshold = severityLevels[config.severityThreshold];
    return issues.filter(issue =>
      severityLevels[issue.severity] >= threshold
    );
  }

  buildReport(issues, config) {
    // Group issues by file
    const byFile = {};
    issues.forEach(issue => {
      if (!byFile[issue.file]) {
        byFile[issue.file] = [];
      }
      byFile[issue.file].push(issue);
    });

    // Sort files by number of issues (descending)
    const sortedFiles = Object.keys(byFile).sort((a, b) =>
      byFile[b].length - byFile[a].length
    );

    // Count by type and severity
    const summary = {
      total: issues.length,
      byType: {},
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0
      }
    };

    issues.forEach(issue => {
      summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
      summary.bySeverity[issue.severity]++;
    });

    return {
      timestamp: new Date().toISOString(),
      rootPath: process.cwd(),
      config: {
        allowConsole: config.allowConsole,
        skipPropTypesCheck: config.skipPropTypesCheck,
        webpackVersion: config.webpackVersion,
        severityThreshold: config.severityThreshold
      },
      summary,
      stats: this.stats,
      files: sortedFiles.reduce((acc, file) => {
        acc[file] = byFile[file];
        return acc;
      }, {}),
      issues
    };
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = DetectionEngine;