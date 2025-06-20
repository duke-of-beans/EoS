/**
 * Purpose: Generates structured compliance audit reports
 * Dependencies: Node.js std lib
 * API: SauronComplianceReporter().generate(scanReport, dependencyAudit)
 */

export default class SauronComplianceReporter {
  constructor(config = {}) {
    this.standards = config.standards || ['OWASP', 'NIST'];
    this.includeSummary = config.includeSummary !== false;
    this.includeDetails = config.includeDetails !== false;
    this.toolVersion = '1.0.0';

    // Compliance rules mapping
    this.complianceRules = {
      OWASP: {
        A01: {
          name: 'Broken Access Control',
          patterns: ['authz', 'permission', 'rbac', 'acl'],
          reference: 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/'
        },
        A02: {
          name: 'Cryptographic Failures',
          patterns: ['crypto', 'encryption', 'hash', 'ssl', 'tls'],
          reference: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/'
        },
        A03: {
          name: 'Injection',
          patterns: ['sql', 'nosql', 'ldap', 'injection', 'xss', 'xxe'],
          reference: 'https://owasp.org/Top10/A03_2021-Injection/'
        },
        A04: {
          name: 'Insecure Design',
          patterns: ['design', 'threat model', 'architecture'],
          reference: 'https://owasp.org/Top10/A04_2021-Insecure_Design/'
        },
        A05: {
          name: 'Security Misconfiguration',
          patterns: ['config', 'hardening', 'default', 'expose'],
          reference: 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/'
        },
        A06: {
          name: 'Vulnerable Components',
          patterns: ['dependency', 'vulnerability', 'cve', 'outdated'],
          reference: 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/'
        },
        A07: {
          name: 'Authentication Failures',
          patterns: ['auth', 'password', 'session', 'mfa', 'credential'],
          reference: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/'
        },
        A08: {
          name: 'Software and Data Integrity',
          patterns: ['integrity', 'signature', 'tamper', 'ci/cd'],
          reference: 'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/'
        },
        A09: {
          name: 'Security Logging Failures',
          patterns: ['logging', 'monitoring', 'audit', 'alert'],
          reference: 'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/'
        },
        A10: {
          name: 'Server-Side Request Forgery',
          patterns: ['ssrf', 'request', 'url', 'webhook'],
          reference: 'https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_(SSRF)/'
        }
      },
      NIST: {
        AC: {
          name: 'Access Control',
          patterns: ['access', 'permission', 'privilege', 'authorization'],
          reference: 'https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home'
        },
        IA: {
          name: 'Identification and Authentication',
          patterns: ['identity', 'authentication', 'credential', 'mfa'],
          reference: 'https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home'
        },
        SC: {
          name: 'System and Communications Protection',
          patterns: ['encryption', 'boundary', 'network', 'communication'],
          reference: 'https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home'
        },
        SI: {
          name: 'System and Information Integrity',
          patterns: ['integrity', 'vulnerability', 'malware', 'patch'],
          reference: 'https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home'
        },
        AU: {
          name: 'Audit and Accountability',
          patterns: ['audit', 'log', 'record', 'trail'],
          reference: 'https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home'
        }
      }
    };
  }

  generate(scanReport, dependencyAudit) {
    try {
      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          toolVersion: this.toolVersion,
          standards: this.standards
        },
        summary: {},
        details: []
      };

      // Initialize summary
      if (this.includeSummary) {
        for (const standard of this.standards) {
          report.summary[standard] = { passed: 0, failed: 0, total: 0 };
        }
      }

      // Process scan report issues
      const scanViolations = this._processScanReport(scanReport);

      // Process dependency audit
      const dependencyViolations = this._processDependencyAudit(dependencyAudit);

      // Combine violations
      const allViolations = [...scanViolations, ...dependencyViolations];

      // Map violations to compliance rules
      for (const violation of allViolations) {
        const mappedRules = this._mapToComplianceRules(violation);

        for (const rule of mappedRules) {
          if (this.standards.includes(rule.standard)) {
            report.details.push(rule);

            if (this.includeSummary) {
              report.summary[rule.standard].failed++;
              report.summary[rule.standard].total++;
            }
          }
        }
      }

      // Calculate passed rules (total rules - failed)
      if (this.includeSummary) {
        for (const standard of this.standards) {
          const totalRules = Object.keys(this.complianceRules[standard] || {}).length;
          const failedRules = new Set(
            report.details
              .filter(d => d.standard === standard)
              .map(d => d.rule)
          ).size;

          report.summary[standard].passed = totalRules - failedRules;
          report.summary[standard].total = totalRules;
        }
      }

      // Sort and limit details
      if (this.includeDetails) {
        report.details = report.details
          .sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
            return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
          })
          .slice(0, 1000); // Limit to top 1000 violations
      } else {
        delete report.details;
      }

      return report;
    } catch (error) {
      // Defensive: Return minimal valid report on error
      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          toolVersion: this.toolVersion,
          standards: this.standards,
          error: error.message
        },
        summary: this._getEmptySummary(),
        details: []
      };
    }
  }

  _processScanReport(scanReport) {
    const violations = [];

    if (!scanReport || typeof scanReport !== 'object') {
      return violations;
    }

    // Extract issues from various scan report structures
    const files = scanReport.files || scanReport.vision?.files || {};

    for (const [filePath, fileData] of Object.entries(files)) {
      const issues = fileData.issues || [];

      for (const issue of issues) {
        violations.push({
          type: issue.type || 'scan_issue',
          message: issue.message || issue.description || 'Unknown issue',
          severity: this._normalizeSeverity(issue.severity || issue.level),
          file: filePath,
          line: issue.line,
          category: issue.category || issue.type
        });
      }
    }

    // Check for global issues
    const globalIssues = scanReport.issues || scanReport.globalIssues || [];
    for (const issue of globalIssues) {
      violations.push({
        type: issue.type || 'scan_issue',
        message: issue.message || issue.description || 'Unknown issue',
        severity: this._normalizeSeverity(issue.severity || issue.level),
        category: issue.category || issue.type
      });
    }

    return violations;
  }

  _processDependencyAudit(dependencyAudit) {
    const violations = [];

    if (!dependencyAudit || typeof dependencyAudit !== 'object') {
      return violations;
    }

    // Handle npm audit format
    if (dependencyAudit.vulnerabilities) {
      for (const [pkg, vulns] of Object.entries(dependencyAudit.vulnerabilities)) {
        if (Array.isArray(vulns)) {
          for (const vuln of vulns) {
            violations.push({
              type: 'dependency_vulnerability',
              message: `${pkg}: ${vuln.title || vuln.overview || 'Vulnerability detected'}`,
              severity: this._normalizeSeverity(vuln.severity),
              category: 'vulnerable_dependency',
              cve: vuln.cve,
              package: pkg
            });
          }
        }
      }
    }

    // Handle generic vulnerability list
    if (Array.isArray(dependencyAudit.dependencies)) {
      for (const dep of dependencyAudit.dependencies) {
        if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
          for (const vuln of dep.vulnerabilities) {
            violations.push({
              type: 'dependency_vulnerability',
              message: `${dep.name}@${dep.version}: ${vuln.title || 'Vulnerability detected'}`,
              severity: this._normalizeSeverity(vuln.severity),
              category: 'vulnerable_dependency',
              cve: vuln.cve,
              package: dep.name
            });
          }
        }
      }
    }

    return violations;
  }

  _mapToComplianceRules(violation) {
    const mappedRules = [];
    const violationText = `${violation.message} ${violation.type} ${violation.category}`.toLowerCase();

    for (const standard of this.standards) {
      const rules = this.complianceRules[standard] || {};

      for (const [ruleId, ruleData] of Object.entries(rules)) {
        const isMatch = ruleData.patterns.some(pattern =>
          violationText.includes(pattern.toLowerCase())
        );

        if (isMatch) {
          mappedRules.push({
            rule: ruleId,
            standard: standard,
            severity: violation.severity,
            message: `${ruleData.name}: ${violation.message}`,
            reference: ruleData.reference,
            source: {
              file: violation.file,
              line: violation.line,
              type: violation.type
            }
          });
        }
      }
    }

    // If no rules matched, create a generic compliance violation
    if (mappedRules.length === 0 && violation.severity !== 'info') {
      for (const standard of this.standards) {
        mappedRules.push({
          rule: 'GENERIC',
          standard: standard,
          severity: violation.severity,
          message: violation.message,
          reference: standard === 'OWASP'
            ? 'https://owasp.org/www-project-top-ten/'
            : 'https://csrc.nist.gov/projects/cprt/catalog',
          source: {
            file: violation.file,
            line: violation.line,
            type: violation.type
          }
        });
      }
    }

    return mappedRules;
  }

  _normalizeSeverity(severity) {
    const severityMap = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'moderate': 'medium',
      'low': 'low',
      'info': 'info',
      'informational': 'info'
    };

    return severityMap[String(severity).toLowerCase()] || 'medium';
  }

  _getEmptySummary() {
    const summary = {};

    for (const standard of this.standards) {
      summary[standard] = { passed: 0, failed: 0, total: 0 };
    }

    return summary;
  }
}
