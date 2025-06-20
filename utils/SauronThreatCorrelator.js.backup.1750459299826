/**
 * Purpose: Correlates scan/audit/pipeline/anomaly data to highlight compound risks
 * Dependencies: Node.js std lib
 * API: SauronThreatCorrelator().correlate(scanReport, auditTrail, pipelineSummary, anomalyData) → object
 */

class SauronThreatCorrelator {
  constructor(config = {}) {
    this.config = {
      maxCorrelations: config.maxCorrelations || 500,
      sensitivePatterns: config.sensitivePatterns || [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /credential/i,
        /auth/i
      ],
      severityWeights: config.severityWeights || {
        critical: 10,
        high: 7,
        medium: 4,
        low: 1
      },
      ...config
    };
  }

  /**
   * Correlates multiple data sources to identify compound risks
   * @param {object} scanReport - Code scan results
   * @param {object} auditTrail - Security audit trail data
   * @param {object} pipelineSummary - CI/CD pipeline summary
   * @param {object} anomalyData - Anomaly detection results
   * @returns {object} Correlated risk analysis
   */
  correlate(scanReport, auditTrail, pipelineSummary, anomalyData) {
    try {
      const startTime = Date.now();

      // Validate inputs
      const validatedInputs = this._validateInputs({
        scanReport,
        auditTrail,
        pipelineSummary,
        anomalyData
      });

      // Extract risk indicators from each source
      const scanRisks = this._extractScanRisks(validatedInputs.scanReport);
      const auditRisks = this._extractAuditRisks(validatedInputs.auditTrail);
      const pipelineRisks = this._extractPipelineRisks(validatedInputs.pipelineSummary);
      const anomalyRisks = this._extractAnomalyRisks(validatedInputs.anomalyData);

      // Correlate risks across sources
      const correlatedRisks = this._correlateCrossSource({
        scanRisks,
        auditRisks,
        pipelineRisks,
        anomalyRisks
      });

      // Apply correlation limits and prioritization
      const prioritizedRisks = this._prioritizeAndLimit(correlatedRisks);

      // Generate summary metrics
      const summary = this._generateSummary(prioritizedRisks, startTime);

      // Log correlation metrics
      this._logCorrelationMetrics(summary);

      return {
        correlatedRisks: prioritizedRisks,
        summary
      };

    } catch (error) {
      return this._safeFallback(error);
    }
  }

  /**
   * Exports correlation results in canonical JSON format
   * @param {object} correlationResult - Result from correlate()
   * @returns {string} Canonical JSON string
   */
  toCanonicalJson(correlationResult) {
    try {
      // Sort risks by severity and type for deterministic output
      const sortedRisks = [...correlationResult.correlatedRisks].sort((a, b) => {
        const severityA = this.config.severityWeights[a.severity] || 0;
        const severityB = this.config.severityWeights[b.severity] || 0;

        if (severityA !== severityB) {
          return severityB - severityA; // Higher severity first
        }

        return a.type.localeCompare(b.type); // Alphabetical by type
      });

      const canonicalResult = {
        ...correlationResult,
        correlatedRisks: sortedRisks
      };

      return JSON.stringify(canonicalResult, null, 2);
    } catch (error) {
      return JSON.stringify({ error: 'Failed to generate canonical JSON', reason: error.message });
    }
  }

  /**
   * Validates and normalizes input data
   * @private
   */
  _validateInputs(inputs) {
    const validated = {};

    validated.scanReport = inputs.scanReport || { files: {}, summary: {} };
    validated.auditTrail = inputs.auditTrail || { events: [], summary: {} };
    validated.pipelineSummary = inputs.pipelineSummary || { stages: [], summary: {} };
    validated.anomalyData = inputs.anomalyData || { anomalies: [], summary: {} };

    return validated;
  }

  /**
   * Extracts risk indicators from scan report
   * @private
   */
  _extractScanRisks(scanReport) {
    const risks = [];

    try {
      // Extract issues from scan files
      if (scanReport.files) {
        Object.entries(scanReport.files).forEach(([filePath, fileData]) => {
          if (fileData.issues && Array.isArray(fileData.issues)) {
            fileData.issues.forEach(issue => {
              risks.push({
                source: 'scan',
                type: 'code_issue',
                severity: issue.severity || 'medium',
                description: this._redactSensitiveData(issue.message || issue.description || 'Code issue detected'),
                location: this._redactSensitiveData(filePath),
                metadata: {
                  rule: issue.rule,
                  category: issue.category,
                  line: issue.line
                }
              });
            });
          }
        });
      }

      // Extract high-level scan risks
      if (scanReport.summary && scanReport.summary.technicalDebt) {
        const debt = scanReport.summary.technicalDebt;
        if (debt.total > 1000) { // Arbitrary threshold
          risks.push({
            source: 'scan',
            type: 'technical_debt',
            severity: debt.total > 5000 ? 'high' : 'medium',
            description: `High technical debt detected: ${debt.total} debt points`,
            metadata: { debtPoints: debt.total }
          });
        }
      }

    } catch (error) {
      // Log error but don't fail
      console.warn('Error extracting scan risks:', error.message);
    }

    return risks;
  }

  /**
   * Extracts risk indicators from audit trail
   * @private
   */
  _extractAuditRisks(auditTrail) {
    const risks = [];

    try {
      if (auditTrail.events && Array.isArray(auditTrail.events)) {
        auditTrail.events.forEach(event => {
          // Look for security-related events
          if (event.type && (
            event.type.includes('security') ||
            event.type.includes('vulnerability') ||
            event.type.includes('breach')
          )) {
            risks.push({
              source: 'audit',
              type: 'security_event',
              severity: event.severity || 'medium',
              description: this._redactSensitiveData(event.description || 'Security event detected'),
              metadata: {
                eventType: event.type,
                timestamp: event.timestamp
              }
            });
          }

          // Look for access violations
          if (event.action && event.action.includes('unauthorized')) {
            risks.push({
              source: 'audit',
              type: 'access_violation',
              severity: 'high',
              description: 'Unauthorized access attempt detected',
              metadata: {
                action: event.action,
                timestamp: event.timestamp
              }
            });
          }
        });
      }
    } catch (error) {
      console.warn('Error extracting audit risks:', error.message);
    }

    return risks;
  }

  /**
   * Extracts risk indicators from pipeline summary
   * @private
   */
  _extractPipelineRisks(pipelineSummary) {
    const risks = [];

    try {
      if (pipelineSummary.stages && Array.isArray(pipelineSummary.stages)) {
        pipelineSummary.stages.forEach(stage => {
          // Failed security stages
          if (stage.name && stage.name.includes('security') && stage.status === 'failed') {
            risks.push({
              source: 'pipeline',
              type: 'security_stage_failure',
              severity: 'high',
              description: `Security pipeline stage failed: ${stage.name}`,
              metadata: {
                stage: stage.name,
                duration: stage.duration
              }
            });
          }

          // Failed test stages
          if (stage.name && stage.name.includes('test') && stage.status === 'failed') {
            risks.push({
              source: 'pipeline',
              type: 'test_failure',
              severity: 'medium',
              description: `Test pipeline stage failed: ${stage.name}`,
              metadata: {
                stage: stage.name,
                failureCount: stage.failureCount
              }
            });
          }
        });
      }

      // Overall pipeline health
      if (pipelineSummary.summary && pipelineSummary.summary.successRate < 0.8) {
        risks.push({
          source: 'pipeline',
          type: 'pipeline_instability',
          severity: 'medium',
          description: `Low pipeline success rate: ${(pipelineSummary.summary.successRate * 100).toFixed(1)}%`,
          metadata: {
            successRate: pipelineSummary.summary.successRate
          }
        });
      }

    } catch (error) {
      console.warn('Error extracting pipeline risks:', error.message);
    }

    return risks;
  }

  /**
   * Extracts risk indicators from anomaly data
   * @private
   */
  _extractAnomalyRisks(anomalyData) {
    const risks = [];

    try {
      if (anomalyData.anomalies && Array.isArray(anomalyData.anomalies)) {
        anomalyData.anomalies.forEach(anomaly => {
          risks.push({
            source: 'anomaly',
            type: 'anomaly_detected',
            severity: this._mapAnomalySeverity(anomaly.score || 0),
            description: this._redactSensitiveData(anomaly.description || 'Anomalous behavior detected'),
            metadata: {
              score: anomaly.score,
              category: anomaly.category,
              timestamp: anomaly.timestamp
            }
          });
        });
      }
    } catch (error) {
      console.warn('Error extracting anomaly risks:', error.message);
    }

    return risks;
  }

  /**
   * Correlates risks across different sources
   * @private
   */
  _correlateCrossSource({ scanRisks, auditRisks, pipelineRisks, anomalyRisks }) {
    const allRisks = [
      ...scanRisks,
      ...auditRisks,
      ...pipelineRisks,
      ...anomalyRisks
    ];

    const correlatedRisks = [];

    // Group risks by similar characteristics
    const riskGroups = this._groupSimilarRisks(allRisks);

    // Create correlated risk entries
    riskGroups.forEach(group => {
      if (group.risks.length > 1) {
        // Multiple sources indicate compound risk
        const severity = this._calculateCompoundSeverity(group.risks);

        correlatedRisks.push({
          type: group.type,
          sources: group.risks.map(r => r.source),
          severity,
          description: this._generateCompoundDescription(group.risks),
          compoundFactors: group.risks.length,
          metadata: {
            individualRisks: group.risks.map(r => ({
              source: r.source,
              severity: r.severity,
              type: r.type
            }))
          }
        });
      } else {
        // Single source risk
        const risk = group.risks[0];
        correlatedRisks.push({
          type: risk.type,
          sources: [risk.source],
          severity: risk.severity,
          description: risk.description,
          compoundFactors: 1,
          metadata: risk.metadata || {}
        });
      }
    });

    return correlatedRisks;
  }

  /**
   * Groups similar risks for correlation analysis
   * @private
   */
  _groupSimilarRisks(risks) {
    const groups = new Map();

    risks.forEach(risk => {
      // Create grouping key based on risk characteristics
      let groupKey = risk.type;

      // Group security-related risks together
      if (risk.type.includes('security') || risk.type.includes('vulnerability')) {
        groupKey = 'security_compound';
      }

      // Group test/quality risks together
      if (risk.type.includes('test') || risk.type.includes('code_issue')) {
        groupKey = 'quality_compound';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { type: groupKey, risks: [] });
      }

      groups.get(groupKey).risks.push(risk);
    });

    return Array.from(groups.values());
  }

  /**
   * Calculates compound severity from multiple risks
   * @private
   */
  _calculateCompoundSeverity(risks) {
    const severityScores = risks.map(r => this.config.severityWeights[r.severity] || 0);
    const totalScore = severityScores.reduce((sum, score) => sum + score, 0);
    const avgScore = totalScore / risks.length;

    // Boost severity for compound risks
    const compoundMultiplier = Math.min(1.5, 1 + (risks.length - 1) * 0.2);
    const finalScore = avgScore * compoundMultiplier;

    if (finalScore >= 8) return 'critical';
    if (finalScore >= 6) return 'high';
    if (finalScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Generates description for compound risks
   * @private
   */
  _generateCompoundDescription(risks) {
    const sources = [...new Set(risks.map(r => r.source))];
    const types = [...new Set(risks.map(r => r.type))];

    return `Compound risk detected across ${sources.join(', ')} sources: ${types.join(', ')} (${risks.length} factors)`;
  }

  /**
   * Prioritizes and limits correlation results
   * @private
   */
  _prioritizeAndLimit(correlatedRisks) {
    // Sort by severity and compound factors
    const sorted = correlatedRisks.sort((a, b) => {
      const severityA = this.config.severityWeights[a.severity] || 0;
      const severityB = this.config.severityWeights[b.severity] || 0;

      if (severityA !== severityB) {
        return severityB - severityA;
      }

      return b.compoundFactors - a.compoundFactors;
    });

    // Apply limit
    return sorted.slice(0, this.config.maxCorrelations);
  }

  /**
   * Generates summary metrics
   * @private
   */
  _generateSummary(correlatedRisks, startTime) {
    const endTime = Date.now();
    const severityCounts = {};

    correlatedRisks.forEach(risk => {
      severityCounts[risk.severity] = (severityCounts[risk.severity] || 0) + 1;
    });

    return {
      totalRisks: correlatedRisks.length,
      criticalRisks: severityCounts.critical || 0,
      highRisks: severityCounts.high || 0,
      mediumRisks: severityCounts.medium || 0,
      lowRisks: severityCounts.low || 0,
      compoundRisks: correlatedRisks.filter(r => r.compoundFactors > 1).length,
      metadata: {
        correlationTimeMs: endTime - startTime,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Maps anomaly score to severity level
   * @private
   */
  _mapAnomalySeverity(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Redacts sensitive data from text
   * @private
   */
  _redactSensitiveData(text) {
    if (typeof text !== 'string') return text;

    let redacted = text;

    this.config.sensitivePatterns.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });

    // Redact potential file paths with sensitive info
    redacted = redacted.replace(/\/[^\/]*(?:secret|key|password|token)[^\/]*\//gi, '/[REDACTED]/');

    return redacted;
  }

  /**
   * Logs correlation metrics
   * @private
   */
  _logCorrelationMetrics(summary) {
     in ${summary.metadata.correlationTimeMs}ms`);
  }

  /**
   * Provides safe fallback on error
   * @private
   */
  _safeFallback(error) {
    console.error('SauronThreatCorrelator error:', error.message);

    return {
      correlatedRisks: [],
      summary: {
        totalRisks: 0,
        criticalRisks: 0,
        error: true,
        errorReason: error.message,
        metadata: {
          timestamp: new Date().toISOString(),
          fallbackUsed: true
        }
      }
    };
  }
}

module.exports = SauronThreatCorrelator;
export default SauronThreatCorrelator;

