/**
 * Purpose: Compresses and decompresses Eye of Sauron scan reports using gzip or brotli
 * Dependencies: Node.js standard library (zlib)
 * Public API:
 *   - new SauronReportCompressor(config) - Creates compressor with optional config
 *   - compress(report) - Compresses report object to Buffer
 *   - decompress(buffer) - Decompresses Buffer to report object
 */

import { promisify } from 'util';
import zlib from 'zlib';

// Promisify compression/decompression functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export class SauronReportCompressor {
  constructor(config = {}) {
    this.level = config.level ?? 6;
    this.format = config.format ?? 'gzip';

    // Validate compression level
    if (this.format === 'gzip' && (this.level < 0 || this.level > 9)) {
      throw new Error('Gzip compression level must be between 0 and 9');
    }
    if (this.format === 'brotli' && (this.level < 0 || this.level > 11)) {
      throw new Error('Brotli compression level must be between 0 and 11');
    }

    // Validate format
    if (!['gzip', 'brotli'].includes(this.format)) {
      throw new Error('Compression format must be either "gzip" or "brotli"');
    }
  }

  /**
   * Compresses a report object into a Buffer
   * @param {Object} report - The report object to compress
   * @returns {Promise<Buffer>} - Compressed data as Buffer
   */
  async compress(report) {
    try {
      // Validate input
      if (!report || typeof report !== 'object') {
        throw new Error('Report must be a valid object');
      }

      // Convert report to JSON string
      const jsonString = JSON.stringify(report);
      const buffer = Buffer.from(jsonString, 'utf-8');

      // Compress based on format
      if (this.format === 'gzip') {
        return await gzip(buffer, { level: this.level });
      } else if (this.format === 'brotli') {
        return await brotliCompress(buffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: this.level
          }
        });
      }
    } catch (error) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Decompresses a Buffer back into a report object
   * @param {Buffer} buffer - The compressed data buffer
   * @returns {Promise<Object>} - Decompressed report object
   */
  async decompress(buffer) {
    try {
      // Validate input
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Input must be a Buffer');
      }

      let decompressed;

      // Try to decompress based on format
      if (this.format === 'gzip') {
        decompressed = await gunzip(buffer);
      } else if (this.format === 'brotli') {
        decompressed = await brotliDecompress(buffer);
      }

      // Convert buffer back to string and parse JSON
      const jsonString = decompressed.toString('utf-8');
      const report = JSON.parse(jsonString);

      // Validate that we got an object back
      if (!report || typeof report !== 'object') {
        throw new Error('Decompressed data is not a valid report object');
      }

      return report;
    } catch (error) {
      // If decompression fails, try the other format as fallback
      // Check for various decompression error codes that indicate wrong format
      const isDecompressionError =
        error.code === 'Z_DATA_ERROR' ||
        error.code === 'ERR_PADDING_1' ||
        error.code === 'Z_BUF_ERROR' ||
        error.message?.includes('incorrect header check') ||
        error.message?.includes('invalid block type') ||
        error.message?.includes('invalid distance');

      if (isDecompressionError) {
        try {
          // Try alternate format
          const altFormat = this.format === 'gzip' ? 'brotli' : 'gzip';
          let decompressed;

          if (altFormat === 'gzip') {
            decompressed = await gunzip(buffer);
          } else {
            decompressed = await brotliDecompress(buffer);
          }

          const jsonString = decompressed.toString('utf-8');
          const report = JSON.parse(jsonString);

          if (!report || typeof report !== 'object') {
            throw new Error('Decompressed data is not a valid report object');
          }

          // Log successful fallback for debugging
          console.log(`Successfully decompressed using fallback format: ${altFormat}`);

          return report;
        } catch (altError) {
          // Both formats failed - provide comprehensive error message
          throw new Error(
            `Decompression failed with both formats. ` +
            `Primary format (${this.format}): ${error.message}. ` +
            `Fallback format (${this.format === 'gzip' ? 'brotli' : 'gzip'}): ${altError.message}`
          );
        }
      }

      throw new Error(`Decompression failed: ${error.message}`);
    }
  }
}

// Future Enhancement: Stream Support
// For extremely large reports (100MB+), consider implementing stream-based compression:
// - compressStream(inputStream) → outputStream
// - decompressStream(inputStream) → outputStream
// This would allow processing huge reports without loading entire content into memory

// Update manifest documentation
export const manifestEntry = `
### SauronReportCompressor
- **Location**: eye-of-sauron/utils/SauronReportCompressor.js
- **Purpose**: Compresses and decompresses Eye of Sauron scan reports using gzip or brotli compression
- **API**:
  - \`new SauronReportCompressor(config)\` - Creates compressor instance
    - \`config.level\`: Compression level (0-9 for gzip, 0-11 for brotli, default: 6)
    - \`config.format\`: Compression format ('gzip' or 'brotli', default: 'gzip')
  - \`async compress(report)\` - Compresses report object to Buffer
  - \`async decompress(buffer)\` - Decompresses Buffer to report object
- **Integration**: Used by EyeOfSauronOmniscient to compress large scan reports for storage/transmission
`;