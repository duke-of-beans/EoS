/*
 * Purpose: Sends POST webhook notifications for Eye of Sauron scan results
 * Dependencies: Node.js std lib (https, http, url)
 * API: WebhookNotifier(config).send(url, payload)
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * WebhookNotifier - Utility for sending scan results to webhooks
 * Supports Slack, Teams, Discord, and generic webhook endpoints
 */
export class WebhookNotifier {
  /**
   * Initialize webhook notifier with configuration
   * @param {Object} config - Configuration options
   * @param {number} config.timeout - Request timeout in ms (default: 5000)
   * @param {string} config.userAgent - User-Agent header (default: 'EyeOfSauron/1.0')
   * @param {Object} config.headers - Additional headers to include in requests
   * @param {boolean} config.captureResponse - Whether to return response body (default: false)
   */
  constructor(config = {}) {
    this.timeout = config.timeout || 5000;
    this.userAgent = config.userAgent || 'EyeOfSauron/1.0';
    this.customHeaders = config.headers || {};
    this.captureResponse = config.captureResponse || false;
  }

  /**
   * Send payload to webhook endpoint
   * @param {string} webhookUrl - Full webhook URL (http/https)
   * @param {Object|string} payload - Data to send (object will be JSON stringified)
   * @returns {Promise<void|{status: number, body: string}>} - Resolves with response if captureResponse=true
   */
  async send(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
      try {
        // Parse and validate URL
        const parsedUrl = new URL(webhookUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const transport = isHttps ? https : http;

        // Prepare payload
        const isObject = typeof payload === 'object' && payload !== null;
        const body = isObject ? JSON.stringify(payload) : String(payload);

        // Request options
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': isObject ? 'application/json' : 'text/plain',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': this.userAgent,
            ...this.customHeaders  // Merge custom headers (they can override defaults)
          },
          timeout: this.timeout
        };

        // Create request
        const req = transport.request(options, (res) => {
          let responseBody = '';

          // Capture or consume response data
          res.on('data', (chunk) => {
            if (this.captureResponse) {
              responseBody += chunk.toString();
            }
            // Data is consumed either way to free up memory
          });

          res.on('end', () => {
            // Consider 2xx status codes as success
            if (res.statusCode >= 200 && res.statusCode < 300) {
              if (this.captureResponse) {
                resolve({ status: res.statusCode, body: responseBody });
              } else {
                resolve();
              }
            } else {
              const errorMsg = `Webhook request failed with status ${res.statusCode}`;
              const error = new Error(errorMsg);
              error.status = res.statusCode;
              error.body = this.captureResponse ? responseBody : undefined;
              reject(error);
            }
          });
        });

        // Handle errors
        req.on('error', (error) => {
          reject(new Error(`Webhook request failed: ${error.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Webhook request timed out after ${this.timeout}ms`));
        });

        // Send request
        req.write(body);
        req.end();

      } catch (error) {
        reject(new Error(`Invalid webhook configuration: ${error.message}`));
      }
    });
  }
}

// Example usage:
// const notifier = new WebhookNotifier({
//   timeout: 10000,
//   headers: { 'X-Custom-Header': 'EyeOfSauron' },
//   captureResponse: true
// });
//
// const response = await notifier.send('https://hooks.slack.com/services/...', {
//   text: 'Eye of Sauron scan complete',
//   blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Found 42 issues' }}]
// });
// console.log('Webhook responded:', response); // { status: 200, body: 'ok' }