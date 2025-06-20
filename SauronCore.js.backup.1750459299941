/**
 * Purpose: Master orchestrator glue for full Sauron secure pipeline suite
 * Dependencies: All Sauron utils, Node.js std lib
 * API: SauronCore(config).process(report, uploadUrl) → unified result object
 * API: SauronCore().getSummary() → latest run summary
 */

import { createHash } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Import all Sauron utilities
import { SauronSecurePipelineOrchestrator } from './utils/SauronSecurePipelineOrchestrator.js';
import { SauronSecurePipelineValidator } from './utils/SauronSecurePipelineValidator.js';
import { SauronSecurePipelineSummarizer } from './utils/SauronSecurePipelineSummarizer.js';
import { SauronSecureArchiveManager } from './utils/SauronSecureArchiveManager.js';
import { SauronReportIntegrityVerifier } from './utils/SauronReportIntegrityVerifier.js';
import { SauronSecurityPolicyEnforcer } from './utils/SauronSecurityPolicyEnforcer.js';
import { SauronAuditTrailGenerator } from './utils/SauronAuditTrailGenerator.js';
import { SauronAnomalyDetector } from './utils/SauronAnomalyDetector.js';
import { SauronTrendVisualizer } from './utils/SauronTrendVisualizer.js';
import { SauronThreatCorrelator } from './utils/SauronThreatCorrelator.js';

const TOOL_VERSION = 'Sauron v1.0.0';
const MAX_REPORT_SIZE = 50 * 1024 * 1024; // 50MB cap
const PIPELINE_TIMEOUT_MS = 300000; // 5 minute timeout

export class SauronCore {
  constructor(config = {}) {
    // Merge config with defaults
    this.config = {
      maxReportSize: MAX_REPORT_SIZE,
      pipelineTimeoutMs: PIPELINE_TIMEOUT_MS,
      archivePath: './sauron-archives',
      auditPath: './sauron-audit',
      encryptionKey: process.env.SAURON_ENCRYPTION_KEY || 'default-dev-key',
      signingKey: process.env.SAURON_SIGNING_KEY || 'default-signing-key',
      enforceStrictPolicy: true,
      detectAnomalies: true,
      correlateThreats: true,
      ...config
    };

    // Generate config hash for deterministic tracking
    this.configHash = createHash('sha256')
      .update(JSON.stringify(this.config, Object.keys(this.config).sort()))
      .digest('hex')
      .slice(0, 12);

    // Initialize all utilities
    this.orchestrator = new SauronSecurePipelineOrchestrator(this.config);
    this.validator = new SauronSecurePipelineValidator(this.config);
    this.summarizer = new SauronSecurePipelineSummarizer(this.config);
    this.archiveManager = new SauronSecureArchiveManager(this.config);
    this.integrityVerifier = new SauronReportIntegrityVerifier(this.config);
    this.policyEnforcer = new SauronSecurityPolicyEnforcer(this.config);
    this.auditGenerator = new SauronAuditTrailGenerator(this.config);
    this.anomalyDetector = new SauronAnomalyDetector(this.config);
    this.trendVisualizer = new SauronTrendVisualizer(this.config);
    this.threatCorrelator = new SauronThreatCorrelator(this.config);

    // Track latest run summary
    this.latestSummary = null;

    // Update manifest on initialization
    this._updateManifest().catch(err =>
      console.error('[SauronCore] Failed to update manifest:', err.message)
    );
  }

  /**
   * Process a scan report through the full secure pipeline
   * @param {object} report - Scan report object
   * @param {string} uploadUrl - Target URL for secure upload
   * @returns {object} Unified result object
   */
  async process(report, uploadUrl) {
    const startTime = Date.now();
    const metadata = {
      generatedAt: new Date().toISOString(),
      toolVersion: TOOL_VERSION,
      configHash: this.configHash
    };

    try {
      // Validate report size
      const reportSize = JSON.stringify(report).length;
      if (reportSize > this.config.maxReportSize) {
        throw new Error(`Report size ${reportSize} exceeds maximum ${this.config.maxReportSize}`);
      }

      // 1. Run secure pipeline: Compress → Encrypt → Sign → Upload
      const pipelineResult = await this._runWithTimeout(
        this.orchestrator.process(report, uploadUrl),
        this.config.pipelineTimeoutMs,
        'Pipeline processing'
      );

      // 2. Archive locally
      const archiveResult = await this._runWithTimeout(
        this.archiveManager.archive(report, pipelineResult),
        30000,
        'Archive operation'
      );

      // 3. Generate audit trail entry
      const auditResult = await this._runWithTimeout(
        this.auditGenerator.generateEntry({
          action: 'pipeline_process',
          report: report,
          pipeline: pipelineResult,
          archive: archiveResult,
          timestamp: metadata.generatedAt
        }),
        10000,
        'Audit generation'
      );

      // 4. Validate pipeline artifacts
      const validationResult = await this._runWithTimeout(
        this.validator.validate(pipelineResult),
        20000,
        'Pipeline validation'
      );

      // 5. Verify integrity
      const verificationResult = await this._runWithTimeout(
        this.integrityVerifier.verify(report, pipelineResult),
        15000,
        'Integrity verification'
      );

      // 6. Enforce security policies
      const policyResult = await this._runWithTimeout(
        this.policyEnforcer.enforce(report, pipelineResult),
        20000,
        'Policy enforcement'
      );

      // 7. Detect anomalies
      const anomalyResult = this.config.detectAnomalies
        ? await this._runWithTimeout(
            this.anomalyDetector.detect(report),
            30000,
            'Anomaly detection'
          )
        : { anomalies: [], metadata: { skipped: true } };

      // 8. Correlate threats
      const threatResult = this.config.correlateThreats
        ? await this._runWithTimeout(
            this.threatCorrelator.correlate(report, anomalyResult),
            30000,
            'Threat correlation'
          )
        : { totalRisks: 0, criticalRisks: 0, metadata: { skipped: true } };

      // 9. Generate summary
      const summaryResult = await this._runWithTimeout(
        this.summarizer.summarize({
          report,
          pipeline: pipelineResult,
          validation: validationResult,
          policy: policyResult,
          anomalies: anomalyResult,
          threats: threatResult
        }),
        10000,
        'Summary generation'
      );

      // Build unified result
      const result = {
        success: true,
        pipeline: {
          success: pipelineResult.success,
          size: pipelineResult.compressedSize || reportSize,
          durationMs: pipelineResult.durationMs || 0,
          stages: pipelineResult.stages || {}
        },
        archive: {
          saved: archiveResult.saved,
          id: archiveResult.archiveId,
          path: archiveResult.path
        },
        verification: {
          success: verificationResult.success,
          signatureMatch: verificationResult.signatureValid,
          integrityCheck: verificationResult.integrityValid
        },
        policy: {
          passedCount: policyResult.passed?.length || 0,
          failedCount: policyResult.failed?.length || 0,
          violations: policyResult.violations || []
        },
        audit: {
          entries: auditResult.entriesCreated || 1,
          auditId: auditResult.auditId
        },
        anomalies: {
          anomalies: anomalyResult.anomalies || [],
          metadata: anomalyResult.metadata || {}
        },
        threats: {
          totalRisks: threatResult.totalRisks || 0,
          criticalRisks: threatResult.criticalRisks || 0,
          correlations: threatResult.correlations || []
        },
        summary: {
          runs: summaryResult.totalRuns || 1,
          successes: summaryResult.successfulRuns || 1,
          failures: summaryResult.failedRuns || 0,
          insights: summaryResult.insights || []
        },
        metadata
      };

      // Store latest summary
      this.latestSummary = result;

      // Update manifest with latest run
      await this._updateManifest();

      return result;

    } catch (error) {
      // Safe fallback for any error
      console.error('[SauronCore] Pipeline error:', error.message);

      const errorResult = {
        success: false,
        pipeline: { success: false, error: error.message },
        archive: { saved: false },
        verification: { success: false },
        policy: { passedCount: 0, failedCount: 0 },
        audit: { entries: 0 },
        anomalies: { anomalies: [] },
        threats: { totalRisks: 0, criticalRisks: 0 },
        summary: { runs: 1, successes: 0, failures: 1 },
        metadata: {
          ...metadata,
          error: this._sanitizeError(error)
        }
      };

      this.latestSummary = errorResult;
      return errorResult;
    }
  }

  /**
   * Get the latest run summary
   * @returns {object} Latest summary or null
   */
  getSummary() {
    return this.latestSummary || {
      success: false,
      message: 'No runs processed yet',
      metadata: {
        generatedAt: new Date().toISOString(),
        toolVersion: TOOL_VERSION,
        configHash: this.configHash
      }
    };
  }

  /**
   * Run an async operation with timeout
   * @private
   */
  async _runWithTimeout(promise, timeoutMs, operation) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sanitize error for safe output
   * @private
   */
  _sanitizeError(error) {
    return {
      message: error.message || 'Unknown error',
      type: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  /**
   * Update EoS-manifest.md with SauronCore status
   * @private
   */
  async _updateManifest() {
    try {
      const manifestPath = join(process.cwd(), 'docs', 'EoS-manifest.md');
      let content = '';

      try {
        content = await readFile(manifestPath, 'utf8');
      } catch {
        // Create new manifest if doesn't exist
        content = '# Eye of Sauron Manifest\n\n';
      }

      // Update or append SauronCore section
      const coreSection = `
### SauronCore.js
- Purpose: Master orchestrator glue for full Sauron secure pipeline suite
- API: SauronCore(config).process(report, uploadUrl) → unified result object
- API: SauronCore().getSummary() → latest run summary
- Status: Active (v${TOOL_VERSION})
- Last Updated: ${new Date().toISOString()}
- Config Hash: ${this.configHash}
- Integrations: ${Object.getOwnPropertyNames(this)
  .filter(p => p !== 'config' && p !== 'latestSummary' && p !== 'configHash')
  .join(', ')}
`;

      if (content.includes('### SauronCore.js')) {
        // Replace existing section
        content = content.replace(
          /### SauronCore\.js[\s\S]*?(?=###|$)/,
          coreSection + '\n'
        );
      } else {
        // Append new section
        content += '\n' + coreSection;
      }

      await writeFile(manifestPath, content, 'utf8');
    } catch (error) {
      // Non-critical, log and continue
      console.warn('[SauronCore] Manifest update failed:', error.message);
    }
  }
}

/**
 * CLI Hook Example:
 *
 * import { SauronCore } from './SauronCore.js';
 * const core = new SauronCore({ enforceStrictPolicy: true });
 * const result = await core.process(scanReport, 'https://api.example.com/upload');
 * console.log(JSON.stringify(result, null, 2));
 *
 * Server Hook Example:
 *
 * app.post('/api/sauron/process', async (req, res) => {
 *   const core = new SauronCore(req.body.config);
 *   const result = await core.process(req.body.report, req.body.uploadUrl);
 *   res.json(result);
 * });
 */