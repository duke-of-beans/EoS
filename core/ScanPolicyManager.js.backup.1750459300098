/**
 * Purpose: Enforces organizational scan policies for Eye of Sauron
 * Dependencies: Node.js standard library only
 * Public API:
 *   - new ScanPolicyManager(policies) - Creates policy manager with initial policies
 *   - validateReport(report) - Validates a scan report against policies
 *   - getPolicies() - Returns current policy configuration
 *   - setPolicy(name, value) - Updates a specific policy
 * 
 * Report Format Support:
 *   - Eye of Sauron format: report.vision.files[file].issues
 *   - Standard format: report.issues[]
 *   - Note: If both formats exist, only vision.files is processed to avoid double-counting
 */

export class ScanPolicyManager {
  constructor(policies = {}) {
    // Default policies
    this.policies = {
      maxCriticalIssues: 0,
      maxHighIssues: 5,
      maxMediumIssues: 20,
      maxLowIssues: Infinity,
      maxDuration: 300000, // 5 minutes in ms
      minCoverage: 0.8, // 80% coverage
      requiredAnalyzers: [],
      customRules: [],
      ...policies
    };
  }

  /**
   * Validates a scan report against configured policies
   * @param {object} report - Scan report object to validate
   * @returns {object} Validation result with passed status and violations
   */
  validateReport(report) {
    const violations = [];
    
    // Validate issue counts by severity
    const severityLevels = ['critical', 'high', 'medium', 'low'];
    severityLevels.forEach(severity => {
      const policyKey = `max${severity.charAt(0).toUpperCase()}${severity.slice(1)}Issues`;
      const maxAllowed = this.policies[policyKey];
      
      if (maxAllowed !== undefined && maxAllowed !== Infinity) {
        const count = this._countIssuesBySeverity(report, severity);
        if (count > maxAllowed) {
          violations.push({
            rule: policyKey,
            details: `Found ${count} ${severity} issues, maximum allowed is ${maxAllowed}`
          });
        }
      }
    });

    // Validate scan duration
    if (this.policies.maxDuration && report.metadata?.duration) {
      if (report.metadata.duration > this.policies.maxDuration) {
        violations.push({
          rule: 'maxDuration',
          details: `Scan took ${report.metadata.duration}ms, maximum allowed is ${this.policies.maxDuration}ms`
        });
      }
    }

    // Validate coverage
    if (this.policies.minCoverage && report.metadata?.coverage !== undefined) {
      if (report.metadata.coverage < this.policies.minCoverage) {
        violations.push({
          rule: 'minCoverage',
          details: `Coverage is ${(report.metadata.coverage * 100).toFixed(1)}%, minimum required is ${(this.policies.minCoverage * 100).toFixed(1)}%`
        });
      }
    }

    // Validate required analyzers
    if (this.policies.requiredAnalyzers?.length > 0 && report.metadata?.analyzersUsed) {
      const missingAnalyzers = this.policies.requiredAnalyzers.filter(
        required => !report.metadata.analyzersUsed.includes(required)
      );
      
      if (missingAnalyzers.length > 0) {
        violations.push({
          rule: 'requiredAnalyzers',
          details: `Missing required analyzers: ${missingAnalyzers.join(', ')}`
        });
      }
    }

    // Apply custom rules
    if (this.policies.customRules?.length > 0) {
      this.policies.customRules.forEach((rule, index) => {
        try {
          const result = this._evaluateCustomRule(rule, report);
          if (!result.passed) {
            const ruleName = rule.name || `customRule[${index}]`;
            violations.push({
              rule: ruleName,
              details: result.message || `Custom rule "${rule.name || index}" failed`
            });
          }
        } catch (error) {
          const ruleName = rule.name || `customRule[${index}]`;
          violations.push({
            rule: ruleName,
            details: `Error evaluating custom rule: ${error.message}`
          });
        }
      });
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Returns current policy configuration
   * @returns {object} Current policies
   */
  getPolicies() {
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.policies));
  }

  /**
   * Updates a specific policy
   * @param {string} name - Policy name to update
   * @param {any} value - New policy value
   */
  setPolicy(name, value) {
    // Validate policy name
    const validPolicies = [
      'maxCriticalIssues',
      'maxHighIssues',
      'maxMediumIssues',
      'maxLowIssues',
      'maxDuration',
      'minCoverage',
      'requiredAnalyzers',
      'customRules'
    ];

    if (!validPolicies.includes(name)) {
      throw new Error(`Invalid policy name: ${name}. Valid policies are: ${validPolicies.join(', ')}`);
    }

    // Type validation
    if (name.startsWith('max') && name !== 'maxDuration') {
      if (typeof value !== 'number' || value < 0) {
        throw new Error(`Policy ${name} must be a non-negative number`);
      }
    }

    if (name === 'maxDuration' && (typeof value !== 'number' || value <= 0)) {
      throw new Error('maxDuration must be a positive number');
    }

    if (name === 'minCoverage') {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error('minCoverage must be a number between 0 and 1');
      }
    }

    if (name === 'requiredAnalyzers' && !Array.isArray(value)) {
      throw new Error('requiredAnalyzers must be an array');
    }

    if (name === 'customRules') {
      if (!Array.isArray(value)) {
        throw new Error('customRules must be an array');
      }
      // Validate each custom rule
      value.forEach((rule, index) => {
        if (!rule.evaluate || typeof rule.evaluate !== 'function') {
          throw new Error(`customRules[${index}] must have an evaluate function`);
        }
        // Warn about missing name for better debugging
        if (!rule.name || typeof rule.name !== 'string') {
          console.warn(`Warning: customRules[${index}] should have a 'name' property for better debugging`);
        }
      });
    }

    this.policies[name] = value;
  }

  /**
   * Counts issues by severity level
   * Supports two report formats (prioritizes vision.files to avoid double-counting):
   * 1. Eye of Sauron format: report.vision.files[file].issues[]
   * 2. Standard format: report.issues[]
   * @private
   */
  _countIssuesBySeverity(report, severity) {
    let count = 0;
    
    // Priority 1: Check Eye of Sauron format (report.vision.files)
    if (report.vision?.files) {
      Object.values(report.vision.files).forEach(file => {
        if (file.issues && Array.isArray(file.issues)) {
          count += file.issues.filter(issue => issue.severity === severity).length;
        }
      });
      // Return early to avoid double-counting if top-level issues also exist
      return count;
    }
    
    // Priority 2: Check standard format (report.issues)
    if (report.issues && Array.isArray(report.issues)) {
      count = report.issues.filter(issue => issue.severity === severity).length;
    }

    return count;
  }

  /**
   * Evaluates a custom rule against a report
   * @private
   */
  _evaluateCustomRule(rule, report) {
    // Custom rules should have an evaluate function
    if (typeof rule.evaluate === 'function') {
      try {
        const result = rule.evaluate(report);
        // Handle both boolean and object return types
        if (typeof result === 'boolean') {
          return { passed: result };
        } else if (result && typeof result.passed === 'boolean') {
          return result;
        } else {
          throw new Error('Custom rule must return boolean or {passed: boolean, message?: string}');
        }
      } catch (error) {
        return {
          passed: false,
          message: `Rule evaluation error: ${error.message}`
        };
      }
    } else {
      throw new Error('Custom rule must have an evaluate function');
    }
  }
}