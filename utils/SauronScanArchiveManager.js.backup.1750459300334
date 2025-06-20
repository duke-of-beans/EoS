/**
 * Purpose: Manages versioned storage of scan archives
 * Dependencies: Node.js std lib (fs/promises, zlib)
 * API: SauronScanArchiveManager().save(), load(), list()
 */

import { promises as fs } from 'fs';
import { promisify } from 'util';
import { gzip, gunzip, brotliCompress, brotliDecompress } from 'zlib';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

export class SauronScanArchiveManager {
  constructor(config = {}) {
    if (!config.archiveDir) {
      throw new Error('SauronScanArchiveManager: archiveDir is required in config');
    }

    this.archiveDir = config.archiveDir;
    this.format = config.format || 'json'; // json|gzip|brotli

    if (!['json', 'gzip', 'brotli'].includes(this.format)) {
      throw new Error(`SauronScanArchiveManager: Invalid format "${this.format}". Must be json|gzip|brotli`);
    }
  }

  /**
   * Save a scan report to the archive
   * @param {Object} report - The scan report object to archive
   * @returns {Promise<string>} - The unique archiveId for the saved report
   */
  async save(report) {
    try {
      // Ensure archive directory exists
      await this._ensureArchiveDir();

      // Generate unique archiveId (timestamp + random)
      const timestamp = Date.now();
      const randomSuffix = randomBytes(4).toString('hex');
      const archiveId = `scan_${timestamp}_${randomSuffix}`;

      // Serialize the report
      const jsonData = JSON.stringify(report, null, 2);

      // Compress based on format
      let fileData;
      let fileExtension;

      switch (this.format) {
        case 'gzip':
          fileData = await gzipAsync(jsonData);
          fileExtension = '.json.gz';
          break;
        case 'brotli':
          fileData = await brotliCompressAsync(jsonData);
          fileExtension = '.json.br';
          break;
        default: // json
          fileData = jsonData;
          fileExtension = '.json';
      }

      // Write to file
      const filePath = join(this.archiveDir, archiveId + fileExtension);
      await fs.writeFile(filePath, fileData);

      return archiveId;
    } catch (error) {
      throw new Error(`SauronScanArchiveManager.save failed: ${error.message}`);
    }
  }

  /**
   * Load a scan report from the archive
   * @param {string} archiveId - The unique archiveId of the report to load
   * @returns {Promise<Object|null>} - The loaded report object or null if not found
   */
  async load(archiveId) {
    try {
      // Find the file with any supported extension
      const extensions = ['.json', '.json.gz', '.json.br'];
      let filePath = null;
      let actualExtension = null;

      for (const ext of extensions) {
        const testPath = join(this.archiveDir, archiveId + ext);
        try {
          await fs.access(testPath);
          filePath = testPath;
          actualExtension = ext;
          break;
        } catch {
          // File doesn't exist with this extension, continue
        }
      }

      if (!filePath) {
        return null; // Archive not found
      }

      // Read file
      const fileData = await fs.readFile(filePath);

      // Decompress based on extension
      let jsonData;

      switch (actualExtension) {
        case '.json.gz':
          jsonData = await gunzipAsync(fileData);
          break;
        case '.json.br':
          jsonData = await brotliDecompressAsync(fileData);
          break;
        default: // .json
          jsonData = fileData;
      }

      // Parse JSON
      const report = JSON.parse(jsonData.toString());

      return report;
    } catch (error) {
      // Return null for any errors (malformed data, parse errors, etc.)
      console.error(`SauronScanArchiveManager.load error for ${archiveId}: ${error.message}`);
      return null;
    }
  }

  /**
   * List all available archive IDs
   * @returns {Promise<Array<string>>} - Array of archiveId strings
   */
  async list() {
    try {
      // Ensure archive directory exists
      await this._ensureArchiveDir();

      // Read directory contents
      const files = await fs.readdir(this.archiveDir);

      // Extract archiveIds from filenames
      const archiveIds = new Set();
      const supportedExtensions = ['.json', '.json.gz', '.json.br'];

      for (const file of files) {
        // Check if file matches our archive pattern
        if (file.startsWith('scan_')) {
          // Remove extension to get archiveId
          let archiveId = file;
          for (const ext of supportedExtensions) {
            if (file.endsWith(ext)) {
              archiveId = file.slice(0, -ext.length);
              archiveIds.add(archiveId);
              break;
            }
          }
        }
      }

      // Return sorted array of unique archiveIds
      return Array.from(archiveIds).sort((a, b) => {
        // Sort by timestamp (newer first)
        const timestampA = parseInt(a.split('_')[1], 10);
        const timestampB = parseInt(b.split('_')[1], 10);
        return timestampB - timestampA;
      });
    } catch (error) {
      // Return empty array on any error
      console.error(`SauronScanArchiveManager.list error: ${error.message}`);
      return [];
    }
  }

  /**
   * Ensure the archive directory exists
   * @private
   */
  async _ensureArchiveDir() {
    try {
      await fs.mkdir(this.archiveDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create archive directory: ${error.message}`);
    }
  }
}
export default SauronScanArchiveManager;

