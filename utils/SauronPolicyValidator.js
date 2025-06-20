/**
 * Purpose: Validates scan results against security policies
 * Dependencies: Node.js std lib
 * API: SauronPolicyValidator().validate(scanReport)
 */

export class SauronPolicyValidator {
  constructor(config = {}) {
    // Default security policies
    const defaultPolicies = [
      {
        rule: 'noCriticalIssues',
        condition: report => report.summary?.critical === 0,
        description: 'No critical issues allowed'
      },
      {
        rule: 'maxHighIssues',
        condition: report => report.summary?.high <= 5,
        description: 'High issues <= 5'
      }
    ];

    this.policies = config.policies || defaultPolicies;
    this.version = '1.0.0';
    this.maxResults = 100; // Safety limit for output
  }

  /**
   * Validates a scan report against configured policies
   * @param {object} scanReport - The scan report to validate
   * @returns {object} Validation results with passed/failed policies
   */
  validate(scanReport) {
    const timestamp = new Date().toISOString();

    // Handle malformed or missing report
    if (!scanReport || typeof scanReport !== 'object') {
      return this._createErrorResult(timestamp, 'Invalid or missing scan report');
    }

    const passed = [];
    const failed = [];

    // Process each policy
    for (const policy of this.policies) {
      try {
        const result = this._evaluatePolicy(policy, scanReport);

        if (result.passed) {
          passed.push({
            rule: result.rule,
            description: result.description
          });
        } else {
          failed.push({
            rule: result.rule,
            description: result.description,
            reason: result.reason
          });
        }

        // Apply safety limits
        if (passed.length + failed.length >= this.maxResults) {
          break;
        }
      } catch (error) {
        // Handle policy evaluation errors gracefully
        failed.push({
          rule: policy.rule || 'unknown',
          description: policy.description || 'Unknown policy',
          reason: `Policy evaluation error: ${error.message}`
        });
      }
    }

    return {
      passed: passed.slice(0, this.maxResults),
      failed: failed.slice(0, this.maxResults),
      metadata: {
        timestamp,
        version: this.version,
        totalPolicies: this.policies.length,
        evaluatedPolicies: Math.min(passed.length + failed.length, this.maxResults)
      }
    };
  }

  /**
   * Evaluates a single policy against the report
   * @private
   */
  _evaluatePolicy(policy, scanReport) {
    // Validate policy structure
    if (!policy || !policy.rule) {
      throw new Error('Invalid policy structure');
    }

    const rule = policy.rule;
    const description = policy.description || rule;

    // Handle both function and string-based conditions
    let conditionResult = false;
    let reason = 'Condition not met';

    if (typeof policy.condition === 'function') {
      try {
        conditionResult = Boolean(policy.condition(scanReport));
        if (!conditionResult) {
          // Generate reason based on common patterns
          reason = this._generateFailureReason(policy, scanReport);
        }
      } catch (error) {
        reason = `Condition evaluation failed: ${error.message}`;
      }
    } else if (typeof policy.condition === 'string') {
      // Support string-based conditions (simple property checks)
      try {
        conditionResult = this._evaluateStringCondition(policy.condition, scanReport);
        if (!conditionResult) {
          reason = `String condition '${policy.condition}' not satisfied`;
        }
      } catch (error) {
        reason = `String condition evaluation failed: ${error.message}`;
      }
    } else {
      reason = 'Invalid condition type';
    }

    return {
      rule,
      description,
      passed: conditionResult,
      reason: conditionResult ? null : reason
    };
  }

  /**
   * Generates human-readable failure reasons
   * @private
   */
  _generateFailureReason(policy, scanReport) {
    const rule = policy.rule;
    const summary = scanReport.summary || {};

    // Generate specific reasons for known rules
    switch (rule) {
      case 'noCriticalIssues':
        return `Found ${summary.critical || 0} critical issues`;

      case 'maxHighIssues':
        return `Found ${summary.high || 0} high issues (max allowed: 5)`;

      case 'maxMediumIssues':
        return `Found ${summary.medium || 0} medium issues`;

      case 'maxLowIssues':
        return `Found ${summary.low || 0} low issues`;

      case 'totalIssuesLimit':
        const total = (summary.critical || 0) + (summary.high || 0) +
                     (summary.medium || 0) + (summary.low || 0);
        return `Total issues: ${total}`;

      default:
        return 'Policy condition not satisfied';
    }
  }

  /**
   * Evaluates simple string-based conditions
   * @private
   */
  _evaluateStringCondition(condition, scanReport) {
    // Simple property existence check
    if (condition.startsWith('has:')) {
      const property = condition.substring(4);
      return this._hasProperty(scanReport, property);
    }

    // Simple equality check (e.g., "status:passed")
    if (condition.includes(':')) {
      const [property, value] = condition.split(':', 2);
      return this._getPropertyValue(scanReport, property) === value;
    }

    // Default: check if property is truthy
    return Boolean(this._getPropertyValue(scanReport, condition));
  }

  /**
   * Safely checks if nested property exists
   * @private
   */
  _hasProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    return true;
  }

  /**
   * Safely gets nested property value
   * @private
   */
  _getPropertyValue(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Creates an error result for invalid inputs
   * @private
   */
  _createErrorResult(timestamp, errorMessage) {
    return {
      passed: [],
      failed: [{
        rule: 'validation_error',
        description: 'Policy validation error',
        reason: errorMessage
      }],
      metadata: {
        timestamp,
        version: this.version,
        totalPolicies: this.policies.length,
        evaluatedPolicies: 0,
        error: true
      }
    };
  }
}

// Example usage:
// const validator = new SauronPolicyValidator({
//   policies: [
//     {
//       rule: 'noCriticalIssues',
//       condition: report => report.summary?.critical === 0,
//       description: 'No critical issues allowed'
//     },
//     {
//       rule: 'customRule',
//       condition: report => report.filesScanned > 0,
//       description: 'Must scan at least one file'
//     },
//     {
//       rule: 'hasTimestamp',
//       condition: 'has:timestamp',
//       description: 'Report must have timestamp'
//     }
//   ]
// });
//
// const result = validator.validate(scanReport);
//
//
export default SauronPolicyValidator;

