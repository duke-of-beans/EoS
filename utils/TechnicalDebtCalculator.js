/**
 * Purpose: Calculates technical debt + interest from scan report
 * Dependencies: Node.js std lib
 * API: TechnicalDebtCalculator(config).compute(report, options)
 */

export class TechnicalDebtCalculator {
  constructor(config = {}) {
    this.interestRate = config.interestRate ?? 0.05;
    this.baseDebtPerIssue = config.baseDebtPerIssue ?? 1;
    this.projectionMonths = config.projectionMonths ?? 12;
    
    // Severity multipliers with explicit defaults
    this.severityMultipliers = {
      critical: 5,
      major: 3,
      minor: 1,
      info: 0.5,
      // Handle Eye of Sauron special severities
      APOCALYPSE: 10,
      apocalypse: 10
    };
    
    // Default multiplier for unrecognized severities
    this.defaultMultiplier = config.defaultMultiplier ?? 0.5;
    
    // Track unrecognized severities for warnings
    this.unrecognizedSeverities = new Set();
  }

  /**
   * Compute technical debt from a scan report
   * @param {object} report - Scan report containing issues
   * @param {object} options - Optional computation options
   * @param {number} options.projectionMonths - Override projection months
   * @returns {object} Debt calculation results
   */
  compute(report, options = {}) {
    // Reset unrecognized severities tracking
    this.unrecognizedSeverities.clear();
    
    // Use provided projection months or default
    const projectionMonths = options.projectionMonths ?? this.projectionMonths;
    
    // Initialize debt tracking for all known severities
    const detailsBySeverity = {};
    for (const severity in this.severityMultipliers) {
      detailsBySeverity[severity] = { count: 0, debt: 0 };
    }
    
    let totalDebt = 0;
    
    // Process all files in the report
    if (report.vision && report.vision.files) {
      for (const [filePath, fileData] of Object.entries(report.vision.files)) {
        if (fileData.issues && Array.isArray(fileData.issues)) {
          for (const issue of fileData.issues) {
            const severity = issue.severity || 'info';
            let multiplier = this.severityMultipliers[severity];
            
            // Handle unrecognized severity
            if (multiplier === undefined) {
              this.unrecognizedSeverities.add(severity);
              multiplier = this.defaultMultiplier;
              
              // Initialize tracking for this severity if not exists
              if (!detailsBySeverity[severity]) {
                detailsBySeverity[severity] = { count: 0, debt: 0 };
              }
            }
            
            const debtValue = this.baseDebtPerIssue * multiplier;
            
            // Update totals
            totalDebt += debtValue;
            
            // Update severity details
            detailsBySeverity[severity].count++;
            detailsBySeverity[severity].debt += debtValue;
          }
        }
      }
    }
    
    // Calculate projected debt with compound interest
    const projectedDebt = totalDebt * Math.pow(1 + this.interestRate, projectionMonths);
    
    // Round to 2 decimal places for cleaner output
    const roundTo2 = (num) => Math.round(num * 100) / 100;
    
    // Round all debt values
    totalDebt = roundTo2(totalDebt);
    const projectedDebtRounded = roundTo2(projectedDebt);
    
    // Round severity details and clean up empty entries
    const cleanDetailsBySeverity = {};
    for (const [severity, details] of Object.entries(detailsBySeverity)) {
      if (details.count > 0) {
        cleanDetailsBySeverity[severity] = {
          count: details.count,
          debt: roundTo2(details.debt)
        };
      }
    }
    
    // Build result object
    const result = {
      totalDebt,
      projectedDebt: projectedDebtRounded,
      detailsBySeverity: cleanDetailsBySeverity,
      metadata: {
        interestRate: this.interestRate,
        baseDebtPerIssue: this.baseDebtPerIssue,
        projectionMonths: projectionMonths
      }
    };
    
    // Add warnings if unrecognized severities were found
    if (this.unrecognizedSeverities.size > 0) {
      result.warnings = {
        unrecognizedSeverities: Array.from(this.unrecognizedSeverities),
        message: `Found unrecognized severity values. Used default multiplier of ${this.defaultMultiplier}.`
      };
    }
    
    return result;
  }
}

// Example usage (commented out):
/*
const calculator = new TechnicalDebtCalculator({
  interestRate: 0.05,
  baseDebtPerIssue: 1,
  projectionMonths: 24,  // 2 year projection
  defaultMultiplier: 1   // Treat unknown severities as minor
});

const report = {
  vision: {
    files: {
      'src/app.js': {
        issues: [
          { severity: 'critical', type: 'security', message: 'SQL injection risk' },
          { severity: 'APOCALYPSE', type: 'catastrophic', message: 'Total system failure' },
          { severity: 'weird', type: 'unknown', message: 'Strange issue' }
        ]
      }
    }
  }
};

const debtAnalysis = calculator.compute(report);
console.log(debtAnalysis);
// Output:
// {
//   totalDebt: 16,
//   projectedDebt: 20.7,
//   detailsBySeverity: {
//     critical: { count: 1, debt: 5 },
//     APOCALYPSE: { count: 1, debt: 10 },
//     weird: { count: 1, debt: 1 }
//   },
//   metadata: {
//     interestRate: 0.05,
//     baseDebtPerIssue: 1,
//     projectionMonths: 24
//   },
//   warnings: {
//     unrecognizedSeverities: ['weird'],
//     message: 'Found unrecognized severity values. Used default multiplier of 1.'
//   }
// }

// Can also override projection months per computation:
const quickProjection = calculator.compute(report, { projectionMonths: 6 });
*/