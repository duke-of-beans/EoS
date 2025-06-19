// Production-ready example with proper error handling

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SauronTelemetryReporter } from './utils/SauronTelemetryReporter.js';

/**
 * Safely loads version from package.json with fallback
 * @returns {string} Version string
 */
function getAppVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    console.warn('[Telemetry] Could not load version from package.json:', error.message);
    // The SauronTelemetryReporter will auto-detect, but we can provide a fallback
    return null; // Let the reporter auto-detect
  }
}

/**
 * Creates a telemetry reporter with production configurations
 * @returns {SauronTelemetryReporter} Configured reporter instance
 */
export function createTelemetryReporter() {
  const config = {
    endpoint: process.env.TELEMETRY_ENDPOINT,
    token: process.env.TELEMETRY_TOKEN,
    enabled: process.env.ENABLE_TELEMETRY === 'true',
    timeout: parseInt(process.env.TELEMETRY_TIMEOUT) || 10000,
    version: getAppVersion(), // Will use auto-detection if this returns null
    
    // Production-ready anonymizer extensions with error handling
    anonymizerExtensions: {
      // Safe Node.js version extraction
      nodeVersion: (summary) => {
        try {
          return process.version;
        } catch {
          return 'unknown';
        }
      },
      
      // Safe platform extraction
      platform: (summary) => {
        try {
          return process.platform;
        } catch {
          return 'unknown';
        }
      },
      
      // Safe architecture extraction
      arch: (summary) => {
        try {
          return process.arch;
        } catch {
          return 'unknown';
        }
      },
      
      // Safe environment indicator
      environment: (summary) => {
        return process.env.NODE_ENV || 'production';
      },
      
      // Scan performance category
      performanceCategory: (summary) => {
        const duration = summary.scanDuration || 0;
        if (duration < 1000) return 'fast';
        if (duration < 5000) return 'normal';
        if (duration < 30000) return 'slow';
        return 'very-slow';
      },
      
      // Issue density metric
      issueDensity: (summary) => {
        const files = summary.filesScanned || 1;
        const issues = summary.totalIssues || 0;
        return Math.round((issues / files) * 100) / 100;
      },
      
      // Most common issue type
      topIssueType: (summary) => {
        if (!summary.issuesByType || typeof summary.issuesByType !== 'object') {
          return 'none';
        }
        
        let maxType = 'none';
        let maxCount = 0;
        
        for (const [type, count] of Object.entries(summary.issuesByType)) {
          if (count > maxCount) {
            maxCount = count;
            maxType = type;
          }
        }
        
        return maxType;
      }
    }
  };
  
  // Validate required configuration
  if (!config.endpoint) {
    console.error('[Telemetry] TELEMETRY_ENDPOINT environment variable is required');
    // Return a disabled reporter that won't send data
    return new SauronTelemetryReporter({ 
      endpoint: 'https://localhost', 
      enabled: false 
    });
  }
  
  return new SauronTelemetryReporter(config);
}

// Create singleton instance
const telemetryReporter = createTelemetryReporter();

/**
 * Sends telemetry with error inspection and logging
 * @param {object} scanResults - Scan results to report
 */
export async function reportScanTelemetry(scanResults) {
  try {
    const summary = {
      scanDuration: scanResults.duration || 0,
      filesScanned: scanResults.totalFiles || 0,
      totalIssues: scanResults.issues?.length || 0,
      issuesBySeverity: scanResults.severityCounts || {},
      issuesByType: scanResults.typeCounts || {},
      performanceMetrics: {
        avgFileProcessingTime: scanResults.avgProcessingTime || 0,
        peakMemoryUsage: process.memoryUsage().heapUsed
      },
      // Additional data for anonymizer extensions
      complexityMetrics: scanResults.complexity,
      filesByType: scanResults.fileTypes
    };
    
    await telemetryReporter.send(summary);
    
    // Check for anonymizer errors in development/debug mode
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TELEMETRY) {
      const errors = telemetryReporter.getAnonymizerErrors();
      if (errors.length > 0) {
        console.log('[Telemetry] Anonymizer errors:', JSON.stringify(errors, null, 2));
        // Optionally report these errors to a monitoring service
        telemetryReporter.clearAnonymizerErrors();
      }
    }
  } catch (error) {
    // Even telemetry reporting errors shouldn't crash the application
    console.error('[Telemetry] Unexpected error in telemetry reporting:', error);
  }
}

export { telemetryReporter };