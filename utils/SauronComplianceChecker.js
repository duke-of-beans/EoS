/**
 * Purpose: Cross-checks reports against compliance templates (ISO, NIST, OWASP, etc.)
 * Dependencies: Node.js std lib
 * API:
 *   - new SauronComplianceChecker(templates?)
 *   - validate(report) → { passed: boolean, violations: array }
 *   - getTemplates() → object
 *
 * Note: Critical severity issues generate violations both for specific compliance rules
 * AND as a general CRITICAL_ISSUES violation to ensure they're never overlooked.
 * This intentional double-counting ensures critical issues are always addressed.
 *
 * Future improvements:
 * - Pattern matching currently uses substring search; could upgrade to regex
 * - Consider NLP/semantic matching for more intelligent rule application
 */

export default class SauronComplianceChecker {
  constructor(templates = {}) {
    // Default compliance templates
    this.templates = {
      // OWASP Top 10 2021
      OWASP: {
        name: 'OWASP Top 10 2021',
        rules: [
          {
            id: 'A01',
            category: 'Broken Access Control',
            severity: 'critical',
            patterns: ['authentication', 'authorization', 'access control', 'privilege'],
            maxAllowed: 0
          },
          {
            id: 'A02',
            category: 'Cryptographic Failures',
            severity: 'critical',
            patterns: ['encryption', 'crypto', 'hash', 'password storage', 'ssl', 'tls'],
            maxAllowed: 0
          },
          {
            id: 'A03',
            category: 'Injection',
            severity: 'critical',
            patterns: ['sql injection', 'command injection', 'ldap injection', 'xpath', 'nosql'],
            maxAllowed: 0
          },
          {
            id: 'A04',
            category: 'Insecure Design',
            severity: 'high',
            patterns: ['design flaw', 'architecture', 'threat modeling'],
            maxAllowed: 2
          },
          {
            id: 'A05',
            category: 'Security Misconfiguration',
            severity: 'high',
            patterns: ['misconfiguration', 'default password', 'verbose error', 'unnecessary features'],
            maxAllowed: 3
          },
          {
            id: 'A06',
            category: 'Vulnerable Components',
            severity: 'high',
            patterns: ['outdated', 'vulnerable dependency', 'cve', 'known vulnerability'],
            maxAllowed: 5
          },
          {
            id: 'A07',
            category: 'Authentication Failures',
            severity: 'critical',
            patterns: ['weak password', 'session', 'brute force', 'credential stuffing'],
            maxAllowed: 0
          },
          {
            id: 'A08',
            category: 'Software and Data Integrity',
            severity: 'high',
            patterns: ['integrity', 'ci/cd', 'unsigned', 'untrusted source'],
            maxAllowed: 2
          },
          {
            id: 'A09',
            category: 'Security Logging Failures',
            severity: 'medium',
            patterns: ['logging', 'monitoring', 'audit', 'alerting'],
            maxAllowed: 5
          },
          {
            id: 'A10',
            category: 'Server-Side Request Forgery',
            severity: 'high',
            patterns: ['ssrf', 'url fetch', 'remote resource'],
            maxAllowed: 0
          }
        ]
      },

      // NIST Cybersecurity Framework
      NIST: {
        name: 'NIST Cybersecurity Framework',
        rules: [
          {
            id: 'ID.AM',
            category: 'Asset Management',
            severity: 'medium',
            patterns: ['inventory', 'asset', 'resource management'],
            maxAllowed: 10
          },
          {
            id: 'ID.RA',
            category: 'Risk Assessment',
            severity: 'high',
            patterns: ['risk', 'vulnerability', 'threat', 'impact analysis'],
            maxAllowed: 5
          },
          {
            id: 'PR.AC',
            category: 'Access Control',
            severity: 'critical',
            patterns: ['access control', 'identity', 'credential', 'privilege'],
            maxAllowed: 0
          },
          {
            id: 'PR.DS',
            category: 'Data Security',
            severity: 'critical',
            patterns: ['data protection', 'encryption', 'data loss', 'integrity'],
            maxAllowed: 0
          },
          {
            id: 'DE.CM',
            category: 'Security Monitoring',
            severity: 'high',
            patterns: ['monitoring', 'detection', 'anomaly', 'suspicious activity'],
            maxAllowed: 3
          },
          {
            id: 'RS.CO',
            category: 'Communications',
            severity: 'medium',
            patterns: ['incident response', 'communication', 'stakeholder'],
            maxAllowed: 5
          }
        ]
      },

      // ISO 27001
      ISO27001: {
        name: 'ISO/IEC 27001:2022',
        rules: [
          {
            id: 'A.5',
            category: 'Information Security Policies',
            severity: 'high',
            patterns: ['policy', 'procedure', 'guideline', 'standard'],
            maxAllowed: 3
          },
          {
            id: 'A.8',
            category: 'Asset Management',
            severity: 'medium',
            patterns: ['asset', 'classification', 'handling', 'disposal'],
            maxAllowed: 5
          },
          {
            id: 'A.9',
            category: 'Access Control',
            severity: 'critical',
            patterns: ['access', 'authentication', 'authorization', 'privilege'],
            maxAllowed: 0
          },
          {
            id: 'A.10',
            category: 'Cryptography',
            severity: 'critical',
            patterns: ['encryption', 'cryptographic', 'key management', 'certificate'],
            maxAllowed: 0
          },
          {
            id: 'A.12',
            category: 'Operations Security',
            severity: 'high',
            patterns: ['malware', 'backup', 'logging', 'vulnerability management'],
            maxAllowed: 3
          },
          {
            id: 'A.13',
            category: 'Communications Security',
            severity: 'high',
            patterns: ['network security', 'transfer', 'messaging', 'confidentiality'],
            maxAllowed: 2
          },
          {
            id: 'A.16',
            category: 'Incident Management',
            severity: 'high',
            patterns: ['incident', 'breach', 'response', 'forensics'],
            maxAllowed: 2
          }
        ]
      },

      // PCI DSS
      PCIDSS: {
        name: 'PCI DSS v4.0',
        rules: [
          {
            id: 'Req1',
            category: 'Network Security',
            severity: 'critical',
            patterns: ['firewall', 'network segmentation', 'dmz', 'router'],
            maxAllowed: 0
          },
          {
            id: 'Req2',
            category: 'Default Passwords',
            severity: 'critical',
            patterns: ['default password', 'vendor default', 'hardcoded credential'],
            maxAllowed: 0
          },
          {
            id: 'Req3',
            category: 'Cardholder Data',
            severity: 'critical',
            patterns: ['cardholder', 'pan', 'credit card', 'payment data'],
            maxAllowed: 0
          },
          {
            id: 'Req4',
            category: 'Encryption in Transit',
            severity: 'critical',
            patterns: ['transmission', 'ssl', 'tls', 'vpn', 'encrypted channel'],
            maxAllowed: 0
          },
          {
            id: 'Req6',
            category: 'Secure Development',
            severity: 'high',
            patterns: ['secure coding', 'sdlc', 'code review', 'vulnerability'],
            maxAllowed: 3
          },
          {
            id: 'Req8',
            category: 'User Authentication',
            severity: 'critical',
            patterns: ['authentication', 'mfa', 'password policy', 'user identification'],
            maxAllowed: 0
          },
          {
            id: 'Req10',
            category: 'Logging and Monitoring',
            severity: 'high',
            patterns: ['audit log', 'log review', 'monitoring', 'track access'],
            maxAllowed: 2
          },
          {
            id: 'Req11',
            category: 'Security Testing',
            severity: 'high',
            patterns: ['penetration test', 'vulnerability scan', 'security assessment'],
            maxAllowed: 5
          }
        ]
      },

      // Custom templates can be merged
      ...templates
    };
  }

  /**
   * Validates a report against all configured compliance templates
   * @param {object} report - Report object with issues array
   * @returns {object} Validation result with passed status and violations
   */
  validate(report) {
    if (!report || !Array.isArray(report.issues)) {
      return {
        passed: false,
        violations: [{
          rule: 'INVALID_REPORT',
          description: 'Report must contain an issues array',
          severity: 'critical',
          template: 'SYSTEM'
        }]
      };
    }

    const violations = [];
    const templateResults = {};

    // Check each template
    for (const [templateKey, template] of Object.entries(this.templates)) {
      const templateViolations = this._validateAgainstTemplate(report.issues, template, templateKey);

      templateResults[templateKey] = {
        name: template.name,
        violations: templateViolations,
        passed: templateViolations.length === 0
      };

      // Add template key to each violation
      violations.push(...templateViolations.map(v => ({
        ...v,
        template: templateKey
      })));
    }

    return {
      passed: violations.length === 0,
      violations: violations,
      templateResults: templateResults,
      summary: {
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length,
        highViolations: violations.filter(v => v.severity === 'high').length,
        mediumViolations: violations.filter(v => v.severity === 'medium').length,
        lowViolations: violations.filter(v => v.severity === 'low').length
      }
    };
  }

  /**
   * Returns a deep clone of all compliance templates
   * @returns {object} Cloned templates object
   */
  getTemplates() {
    return JSON.parse(JSON.stringify(this.templates));
  }

  /**
   * Private method to validate issues against a specific template
   * @private
   */
  _validateAgainstTemplate(issues, template, templateKey) {
    const violations = [];

    for (const rule of template.rules) {
      // Count issues matching this rule's patterns
      const matchingIssues = issues.filter(issue => {
        const issueText = `${issue.type} ${issue.description} ${issue.evidence || ''}`.toLowerCase();

        // Simple substring matching - could be enhanced with regex or NLP
        return rule.patterns.some(pattern => {
          const patternLower = pattern.toLowerCase();
          // TODO: Future enhancement - support regex patterns like /sql\s+injection/i
          return issueText.includes(patternLower);
        });
      });

      // Check if count exceeds allowed maximum
      if (matchingIssues.length > rule.maxAllowed) {
        violations.push({
          rule: `${rule.id}: ${rule.category}`,
          description: `Found ${matchingIssues.length} issues related to "${rule.category}", maximum allowed is ${rule.maxAllowed}`,
          severity: rule.severity,
          count: matchingIssues.length,
          maxAllowed: rule.maxAllowed,
          matchedIssues: matchingIssues.map(issue => {
            // Include all relevant fields from the original issue
            const matchedIssue = {
              type: issue.type,
              description: issue.description,
              filePath: issue.filePath,
              line: issue.line
            };

            // Include optional fields if present
            if (issue.column !== undefined) matchedIssue.column = issue.column;
            if (issue.rule !== undefined) matchedIssue.rule = issue.rule;
            if (issue.severity !== undefined) matchedIssue.severity = issue.severity;
            if (issue.evidence !== undefined) matchedIssue.evidence = issue.evidence;

            return matchedIssue;
          })
        });
      }
    }

    // Check for critical severity issues regardless of compliance rules
    // NOTE: This is intentional double-counting - critical issues appear both in
    // specific compliance rule violations AND as a general critical violation
    const criticalIssues = issues.filter(issue =>
      issue.severity === 'critical' || issue.priority === 'critical'
    );

    if (criticalIssues.length > 0) {
      violations.push({
        rule: 'CRITICAL_ISSUES',
        description: `Found ${criticalIssues.length} critical severity issues that must be addressed`,
        severity: 'critical',
        count: criticalIssues.length,
        maxAllowed: 0,
        matchedIssues: criticalIssues.map(issue => {
          // Include all relevant fields from the original issue
          const matchedIssue = {
            type: issue.type,
            description: issue.description,
            filePath: issue.filePath,
            line: issue.line
          };

          // Include optional fields if present
          if (issue.column !== undefined) matchedIssue.column = issue.column;
          if (issue.rule !== undefined) matchedIssue.rule = issue.rule;
          if (issue.severity !== undefined) matchedIssue.severity = issue.severity;
          if (issue.evidence !== undefined) matchedIssue.evidence = issue.evidence;

          return matchedIssue;
        })
      });
    }

    return violations;
  }

  /**
   * Private method to add a custom template
   * @private
   */
  _addTemplate(key, template) {
    if (!template.name || !Array.isArray(template.rules)) {
      throw new Error('Template must have name and rules array');
    }

    // Validate rule structure
    for (const rule of template.rules) {
      if (!rule.id || !rule.category || !rule.severity ||
          !Array.isArray(rule.patterns) || typeof rule.maxAllowed !== 'number') {
        throw new Error('Invalid rule structure in template');
      }
    }

    this.templates[key] = JSON.parse(JSON.stringify(template));
  }
}

// Example usage:
// const checker = new SauronComplianceChecker();
// const report = {
//   issues: [
//     {
//       type: 'security',
//       description: 'SQL injection vulnerability',
//       severity: 'critical',
//       filePath: '/src/api/users.js',
//       line: 45,
//       column: 12,
//       rule: 'no-sql-injection',
//       evidence: 'Unsanitized user input in query'
//     },
//     {
//       type: 'security',
//       description: 'Weak password policy',
//       severity: 'high',
//       filePath: '/src/auth/config.js',
//       line: 8
//     }
//   ]
// };
// const result = checker.validate(report);
// console.log(result.passed); // false
// console.log(result.violations); // Array includes both OWASP A01/A07 AND CRITICAL_ISSUES violations
// console.log(result.violations[0].matchedIssues); // Preserves all fields including column, rule, evidence