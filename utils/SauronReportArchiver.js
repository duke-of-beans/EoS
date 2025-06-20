/**
 * Purpose: Archives scan reports to FS or cloud
 * Dependencies: Node.js std lib (fs/promises, path)
 * API: SauronReportArchiver(config).archiveReport(id, json, html)
 *
 * Config options:
 * - localPath: string - Path for local storage (required if no s3Client)
 * - s3Client: object - S3-compatible client instance (optional)
 * - bucketName: string - S3 bucket name (required if s3Client provided)
 * - verbose: boolean - Enable/disable logging (default: true)
 */

import { promises as fs } from 'fs';
import path from 'path';

export class SauronReportArchiver {
  constructor(config = {}) {
    // Validate configuration
    if (!config.localPath && !config.s3Client) {
      throw new Error('Either localPath or s3Client must be provided');
    }

    if (config.s3Client && !config.bucketName) {
      throw new Error('bucketName is required when s3Client is provided');
    }

    this.localPath = config.localPath;
    this.s3Client = config.s3Client;
    this.bucketName = config.bucketName;
    this.verbose = config.verbose !== false; // Default to true for backward compatibility
  }

  /**
   * Archives a report in both JSON and HTML formats
   * @param {string} id - Unique identifier for the report
   * @param {object} jsonContent - Report data in JSON format
   * @param {string} htmlContent - Report in HTML format
   * @returns {Promise<void>}
   */
  async archiveReport(id, jsonContent, htmlContent) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFilename = `${id}_${timestamp}.json`;
      const htmlFilename = `${id}_${timestamp}.html`;

      if (this.s3Client) {
        await this._archiveToCloud(jsonFilename, jsonContent, htmlFilename, htmlContent);
      } else {
        await this._archiveToLocal(jsonFilename, jsonContent, htmlFilename, htmlContent);
      }

      if (this.verbose) {
        console.log(`✅ Successfully archived report ${id} at ${timestamp}`);
      }
    } catch (error) {
      console.error(`❌ Failed to archive report ${id}:`, error.message);
      // Gracefully handle error - don't throw to maintain pure function behavior
    }
  }

  /**
   * Archives report to local filesystem
   * @private
   */
  async _archiveToLocal(jsonFilename, jsonContent, htmlFilename, htmlContent) {
    try {
      // Ensure directory exists
      await fs.mkdir(this.localPath, { recursive: true });

      // Write JSON file
      const jsonPath = path.join(this.localPath, jsonFilename);
      await fs.writeFile(
        jsonPath,
        JSON.stringify(jsonContent, null, 2),
        'utf8'
      );

      // Write HTML file
      const htmlPath = path.join(this.localPath, htmlFilename);
      await fs.writeFile(htmlPath, htmlContent, 'utf8');

      if (this.verbose) {
        console.log(`📁 Archived to local: ${this.localPath}`);
      }
    } catch (error) {
      throw new Error(`Local archive failed: ${error.message}`);
    }
  }

  /**
   * Archives report to S3-compatible cloud storage
   * @private
   */
  async _archiveToCloud(jsonFilename, jsonContent, htmlFilename, htmlContent) {
    try {
      // Upload JSON file
      await this.s3Client.putObject({
        Bucket: this.bucketName,
        Key: jsonFilename,
        Body: JSON.stringify(jsonContent, null, 2),
        ContentType: 'application/json'
      }).promise();

      // Upload HTML file
      await this.s3Client.putObject({
        Bucket: this.bucketName,
        Key: htmlFilename,
        Body: htmlContent,
        ContentType: 'text/html'
      }).promise();

      if (this.verbose) {
        console.log(`☁️  Archived to cloud: s3://${this.bucketName}/`);
      }
    } catch (error) {
      // Enhanced S3-specific error context
      const s3Error = error.code ? `[${error.code}] ` : '';
      const context = error.statusCode ? ` (Status: ${error.statusCode})` : '';
      throw new Error(`S3 archive failed: ${s3Error}${error.message}${context}`);
    }
  }
}

// Update EoS-manifest.md requirement
/*
## /docs/EoS-manifest.md Update Required:

### SauronReportArchiver.js
- **Purpose**: Archives scan reports to local filesystem or S3-compatible cloud storage
- **Location**: `/eye-of-sauron/utils/SauronReportArchiver.js`
- **API**:
  - `new SauronReportArchiver(config)` - Initialize archiver with local or cloud config
    - `config.localPath` - Path for local storage (required if no S3 client)
    - `config.s3Client` - S3-compatible client instance (optional)
    - `config.bucketName` - S3 bucket name (required if s3Client provided)
    - `config.verbose` - Enable/disable logging (default: true)
  - `archiveReport(id, jsonContent, htmlContent)` - Archive report in JSON and HTML formats
- **Dependencies**: Node.js fs/promises, path
- **Integration**: Used by reporting modules to persist scan results
*/