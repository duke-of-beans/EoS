/**
 * Purpose: Generates + dispatches alert notifications
 * Dependencies: Node.js std lib (https, http, url)
 * API: SauronAlertNotifier().sendAlerts(report)
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

export class SauronAlertNotifier {
  constructor(config = {}) {
    this.destinations = config.destinations || [];
  }

  /**
   * Sends alert notifications to all configured destinations
   * @param {Object} report - The scan report containing vision data
   * @returns {Promise<void>}
   */
  async sendAlerts(report) {
    if (!report || !report.vision) {
      console.log('[SauronAlertNotifier] No valid report to process');
      return;
    }

    const alertPayload = this._generateAlertPayload(report);

    if (!alertPayload.hasIssues) {
      console.log('[SauronAlertNotifier] No critical issues to alert on');
      return;
    }

    const sendPromises = this.destinations.map(destination =>
      this._sendToDestination(destination, alertPayload)
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Generates alert payload from report data
   * @private
   */
  _generateAlertPayload(report) {
    const issues = this._collectAllIssues(report.vision);
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');

    // Group issues by type
    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    // Group issues by file
    const issuesByFile = issues.reduce((acc, issue) => {
      if (issue.file) {
        acc[issue.file] = (acc[issue.file] || 0) + 1;
      }
      return acc;
    }, {});

    // Get top offenders
    const topFileOffenders = Object.entries(issuesByFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count]) => ({ file, count }));

    const topTypeOffenders = Object.entries(issuesByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Generate recommendations
    const recommendations = this._generateRecommendations(issues, topTypeOffenders);

    return {
      hasIssues: issues.length > 0,
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: issues.length,
        criticalIssues: criticalIssues.length,
        highIssues: issues.filter(i => i.severity === 'high').length,
        mediumIssues: issues.filter(i => i.severity === 'medium').length,
        lowIssues: issues.filter(i => i.severity === 'low').length
      },
      topOffenders: {
        files: topFileOffenders,
        types: topTypeOffenders
      },
      recommendations,
      criticalDetails: criticalIssues.slice(0, 10).map(issue => ({
        file: issue.file,
        type: issue.type,
        message: issue.message,
        line: issue.line
      }))
    };
  }

  /**
   * Collects all issues from vision files
   * @private
   */
  _collectAllIssues(vision) {
    const issues = [];

    if (vision && vision.files) {
      Object.entries(vision.files).forEach(([filePath, fileData]) => {
        if (fileData.issues && Array.isArray(fileData.issues)) {
          fileData.issues.forEach(issue => {
            issues.push({
              ...issue,
              file: filePath
            });
          });
        }
      });
    }

    return issues;
  }

  /**
   * Generates recommendations based on issues
   * @private
   */
  _generateRecommendations(issues, topTypeOffenders) {
    const recommendations = [];

    if (issues.some(i => i.severity === 'critical')) {
      recommendations.push('🚨 Address critical issues immediately - they pose security or stability risks');
    }

    topTypeOffenders.forEach(({ type, count }) => {
      if (count > 10) {
        switch (type) {
          case 'pattern_violation':
            recommendations.push(`📋 ${count} pattern violations detected - review coding standards`);
            break;
          case 'consistency_issue':
            recommendations.push(`🔧 ${count} consistency issues - consider automated formatting`);
            break;
          case 'naming_violation':
            recommendations.push(`📝 ${count} naming violations - enforce naming conventions`);
            break;
          case 'structure_issue':
            recommendations.push(`🏗️ ${count} structure issues - refactor for better organization`);
            break;
          default:
            recommendations.push(`⚠️ ${count} ${type} issues detected - investigate root cause`);
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ Code quality is good - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Sends alert to a specific destination
   * @private
   */
  async _sendToDestination(destination, payload) {
    try {
      const url = new URL(destination.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const data = JSON.stringify({
        source: 'eye-of-sauron',
        alert: payload
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      if (destination.token) {
        options.headers['Authorization'] = `Bearer ${destination.token}`;
      }

      return new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[SauronAlertNotifier] Alert sent successfully to ${destination.type} (${res.statusCode})`);
              resolve({ success: true, destination: destination.type, status: res.statusCode });
            } else {
              console.error(`[SauronAlertNotifier] Failed to send alert to ${destination.type}: ${res.statusCode} - ${responseData}`);
              resolve({ success: false, destination: destination.type, status: res.statusCode, error: responseData });
            }
          });
        });

        req.on('error', (error) => {
          console.error(`[SauronAlertNotifier] Network error sending to ${destination.type}:`, error.message);
          resolve({ success: false, destination: destination.type, error: error.message });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          console.error(`[SauronAlertNotifier] Timeout sending to ${destination.type}`);
          resolve({ success: false, destination: destination.type, error: 'Request timeout' });
        });

        req.write(data);
        req.end();
      });
    } catch (error) {
      console.error(`[SauronAlertNotifier] Error preparing request to ${destination.type}:`, error.message);
      return { success: false, destination: destination.type, error: error.message };
    }
  }
}

export default SauronAlertNotifier;