/**
 * Purpose: Exports scan reports to external systems (Jira, GitHub, webhooks)
 * Dependencies: Node.js std lib (https, http, url)
 * API: SauronReportExporter(config).exportReport(report)
 * Config options:
 *   - destinations: Array of destination configs
 *   - defaultHeaders: Headers applied to all requests
 * Destination config:
 *   - type: 'jira' | 'github' | 'webhook'
 *   - url: Endpoint URL
 *   - token: Optional auth token
 *   - headers: Optional destination-specific headers
 */

import { URL } from 'url';
import https from 'https';
import http from 'http';

export class SauronReportExporter {
  constructor(config = {}) {
    this.destinations = config.destinations || [];
    this.defaultHeaders = config.defaultHeaders || {};
    this.validateDestinations();
  }

  /**
   * Validates destination configurations
   */
  validateDestinations() {
    const validTypes = ['jira', 'github', 'webhook'];
    
    this.destinations.forEach((dest, index) => {
      if (!dest.type || !validTypes.includes(dest.type)) {
        console.warn(`[SauronReportExporter] Invalid destination type at index ${index}: ${dest.type}`);
      }
      if (!dest.url) {
        console.warn(`[SauronReportExporter] Missing URL for destination at index ${index}`);
      }
    });
  }

  /**
   * Exports report to all configured destinations
   * @param {object} report - The scan report to export
   */
  async exportReport(report) {
    if (!report || typeof report !== 'object') {
      console.error('[SauronReportExporter] Invalid report provided');
      return;
    }

    const exportPromises = this.destinations.map(dest => 
      this.exportToDestination(dest, report)
    );

    await Promise.allSettled(exportPromises);
  }

  /**
   * Exports report to a single destination
   */
  async exportToDestination(destination, report) {
    const destInfo = `${destination.type} at ${destination.url}`;
    try {
      switch (destination.type) {
        case 'jira':
          await this.exportToJira(destination, report);
          break;
        case 'github':
          await this.exportToGitHub(destination, report);
          break;
        case 'webhook':
          await this.exportToWebhook(destination, report);
          break;
        default:
          console.warn(`[SauronReportExporter] Unknown destination type: ${destination.type}`);
      }
    } catch (error) {
      console.error(`[SauronReportExporter] Failed to export to ${destInfo}:`, error.message);
    }
  }

  /**
   * Exports report to Jira
   */
  async exportToJira(destination, report) {
    const jiraPayload = {
      fields: {
        project: { key: report.projectKey || 'SAURON' },
        summary: `Eye of Sauron Scan Report - ${new Date().toISOString()}`,
        description: this.formatJiraDescription(report),
        issuetype: { name: 'Bug' },
        priority: this.calculateJiraPriority(report),
        labels: ['eye-of-sauron', 'code-quality']
      }
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.defaultHeaders,
        ...(destination.headers || {})
      }
    };

    if (destination.token) {
      options.headers['Authorization'] = `Bearer ${destination.token}`;
    }

    await this.makeRequest(destination.url, options, jiraPayload);
    console.log(`[SauronReportExporter] Successfully exported to Jira: ${destination.url}`);
  }

  /**
   * Formats report for Jira description
   */
  formatJiraDescription(report) {
    let description = `h2. Eye of Sauron Scan Report\n\n`;
    description += `*Scan Date:* ${report.timestamp || new Date().toISOString()}\n`;
    description += `*Total Issues:* ${report.totalIssues || 0}\n\n`;

    if (report.summary) {
      description += `h3. Summary\n${report.summary}\n\n`;
    }

    if (report.files) {
      description += `h3. Files Analyzed\n`;
      Object.entries(report.files).forEach(([file, data]) => {
        description += `* ${file}: ${data.issues?.length || 0} issues\n`;
      });
    }

    return description;
  }

  /**
   * Calculates Jira priority based on report severity
   */
  calculateJiraPriority(report) {
    const criticalCount = report.criticalIssues || 0;
    const highCount = report.highSeverityIssues || 0;
    
    if (criticalCount > 0) return { name: 'Critical' };
    if (highCount > 5) return { name: 'High' };
    if (highCount > 0) return { name: 'Medium' };
    return { name: 'Low' };
  }

  /**
   * Exports report to GitHub
   */
  async exportToGitHub(destination, report) {
    const githubPayload = {
      title: `Eye of Sauron Scan Report - ${new Date().toISOString()}`,
      body: this.formatGitHubBody(report),
      labels: ['eye-of-sauron', 'automated-scan', 'code-quality']
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Eye-of-Sauron-Scanner',
        ...this.defaultHeaders,
        ...(destination.headers || {})
      }
    };

    if (destination.token) {
      options.headers['Authorization'] = `token ${destination.token}`;
    }

    await this.makeRequest(destination.url, options, githubPayload);
    console.log(`[SauronReportExporter] Successfully exported to GitHub: ${destination.url}`);
  }

  /**
   * Formats report for GitHub issue body
   */
  formatGitHubBody(report) {
    let body = `## Eye of Sauron Scan Report\n\n`;
    body += `**Scan Date:** ${report.timestamp || new Date().toISOString()}\n`;
    body += `**Total Issues:** ${report.totalIssues || 0}\n\n`;

    if (report.summary) {
      body += `### Summary\n${report.summary}\n\n`;
    }

    if (report.files) {
      body += `### Files Analyzed\n`;
      Object.entries(report.files).forEach(([file, data]) => {
        body += `- \`${file}\`: ${data.issues?.length || 0} issues\n`;
        
        if (data.issues && data.issues.length > 0) {
          body += `  <details>\n  <summary>View issues</summary>\n\n`;
          data.issues.forEach(issue => {
            body += `  - **${issue.type}** (Line ${issue.line}): ${issue.message}\n`;
          });
          body += `  </details>\n`;
        }
      });
    }

    if (report.recommendations) {
      body += `\n### Recommendations\n`;
      report.recommendations.forEach(rec => {
        body += `- ${rec}\n`;
      });
    }

    return body;
  }

  /**
   * Exports report to generic webhook
   */
  async exportToWebhook(destination, report) {
    const webhookPayload = {
      type: 'eye-of-sauron-report',
      timestamp: new Date().toISOString(),
      report: report
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...(destination.headers || {})
      }
    };

    if (destination.token) {
      options.headers['Authorization'] = `Bearer ${destination.token}`;
    }

    await this.makeRequest(destination.url, options, webhookPayload);
    console.log(`[SauronReportExporter] Successfully exported to webhook: ${destination.url}`);
  }

  /**
   * Makes HTTP/HTTPS request using async/await
   */
  async makeRequest(urlString, options, payload) {
    const url = new URL(urlString);
    const protocol = url.protocol === 'https:' ? https : http;
    
    options.hostname = url.hostname;
    options.port = url.port || (url.protocol === 'https:' ? 443 : 80);
    options.path = url.pathname + url.search;

    return new Promise((resolve, reject) => {
      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (payload) {
        req.write(JSON.stringify(payload));
      }

      req.end();
    });
  }
}

// Example usage:
/*
const exporter = new SauronReportExporter({
  defaultHeaders: {
    'X-Scanner-Version': '1.0.0',
    'X-Custom-Header': 'value'
  },
  destinations: [
    {
      type: 'jira',
      url: 'https://company.atlassian.net/rest/api/2/issue',
      token: 'your-jira-token',
      headers: {
        'X-Atlassian-Token': 'no-check'
      }
    },
    {
      type: 'github',
      url: 'https://api.github.com/repos/owner/repo/issues',
      token: 'your-github-token'
    },
    {
      type: 'webhook',
      url: 'https://your-webhook-endpoint.com/sauron-reports',
      headers: {
        'X-Webhook-Secret': 'your-secret'
      }
    }
  ]
});

const scanReport = {
  timestamp: new Date().toISOString(),
  totalIssues: 42,
  criticalIssues: 3,
  highSeverityIssues: 8,
  summary: 'Multiple code quality issues detected',
  files: {
    'src/index.js': {
      issues: [
        { type: 'syntax', line: 10, message: 'Missing semicolon' },
        { type: 'style', line: 25, message: 'Inconsistent indentation' }
      ]
    }
  },
  recommendations: [
    'Enable ESLint in CI pipeline',
    'Add pre-commit hooks for code formatting'
  ]
};

await exporter.exportReport(scanReport);
*/