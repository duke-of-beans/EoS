/**
 * SauronScanAnonymizer.js
 * Purpose: Removes/obfuscates sensitive data from scan reports
 * Dependencies: Node.js std lib (crypto)
 * API: SauronScanAnonymizer().anonymize(report)
 */

import { createHash } from 'crypto';

export class SauronScanAnonymizer {
  constructor(config = {}) {
    this.config = {
      fieldsToStrip: config.fieldsToStrip || ['filePath', 'codeSnippet'],
      obfuscateStrings: config.obfuscateStrings !== false, // default true
      obfuscationMethod: config.obfuscationMethod || 'sha256-short',
      maxObfuscatedLength: config.maxObfuscatedLength || 64,
      addMetadata: config.addMetadata !== false, // default true
      preserveStructure: config.preserveStructure !== false, // default true
      stringFieldsToObfuscate: config.stringFieldsToObfuscate || ['path', 'content', 'snippet', 'code'],
      logStats: config.logStats || false
    };

    this.stats = {
      fieldsStripped: 0,
      stringsObfuscated: 0,
      circularRefsDetected: 0,
      errors: []
    };

    // Track visited objects for circular reference detection
    this.visitedObjects = new WeakSet();
  }

  /**
   * Anonymize a scan report by removing/obfuscating sensitive data
   * @param {object} report - The scan report to anonymize
   * @returns {object} - Anonymized deep clone of the report
   */
  anonymize(report) {
    if (!report || typeof report !== 'object') {
      return report;
    }

    // Reset stats for this anonymization
    this.stats = {
      fieldsStripped: 0,
      stringsObfuscated: 0,
      circularRefsDetected: 0,
      errors: []
    };

    // Clear visited objects tracker
    this.visitedObjects = new WeakSet();

    try {
      // Deep clone and anonymize
      const anonymized = this._deepAnonymize(report);

      // Add anonymization metadata if configured
      if (this.config.addMetadata && anonymized && typeof anonymized === 'object') {
        anonymized._anonymizationMetadata = {
          timestamp: new Date().toISOString(),
          fieldsStripped: this.stats.fieldsStripped,
          stringsObfuscated: this.stats.stringsObfuscated,
          circularRefsDetected: this.stats.circularRefsDetected,
          config: {
            fieldsToStrip: this.config.fieldsToStrip,
            obfuscateStrings: this.config.obfuscateStrings,
            obfuscationMethod: this.config.obfuscationMethod
          }
        };
      }

      // Log stats if configured
      if (this.config.logStats) {

      }

      return anonymized;
    } catch (error) {
      this.stats.errors.push(error.message);
      if (this.config.logStats) {
        console.error('[SauronScanAnonymizer] Anonymization failed:', error);
      }
      // Return empty object on critical failure
      return {};
    }
  }

  /**
   * Deep anonymize an object/array recursively
   * @private
   */
  _deepAnonymize(obj, path = '') {
    // Handle primitives
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      // Obfuscate strings if configured
      if (typeof obj === 'string' && this.config.obfuscateStrings) {
        const fieldName = path.split('.').pop();
        if (this._shouldObfuscateField(fieldName)) {
          this.stats.stringsObfuscated++;
          return this._obfuscateString(obj);
        }
      }
      return obj;
    }

    // Detect circular references
    if (this.visitedObjects.has(obj)) {
      this.stats.circularRefsDetected++;
      return '[Circular Reference]';
    }

    // Mark as visited
    this.visitedObjects.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      const result = [];
      for (let i = 0; i < obj.length; i++) {
        result.push(this._deepAnonymize(obj[i], `${path}[${i}]`));
      }
      this.visitedObjects.delete(obj); // Clean up after processing
      return result;
    }

    // Handle objects
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newPath = path ? `${path}.${key}` : key;

        // Check if field should be stripped
        if (this._shouldStripField(key)) {
          this.stats.fieldsStripped++;
          if (this.config.preserveStructure) {
            result[key] = '[REDACTED]';
          }
          // Skip to next field
          continue;
        }

        // Recursively anonymize
        try {
          result[key] = this._deepAnonymize(obj[key], newPath);
        } catch (error) {
          this.stats.errors.push(`Error at ${newPath}: ${error.message}`);
          result[key] = '[ERROR]';
        }
      }
    }

    // Clean up visited tracking
    this.visitedObjects.delete(obj);

    return result;
  }

  /**
   * Check if a field should be stripped
   * @private
   */
  _shouldStripField(fieldName) {
    return this.config.fieldsToStrip.some(field => {
      // Support wildcard matching
      if (field.includes('*')) {
        const regex = new RegExp('^' + field.replace(/\*/g, '.*') + '$', 'i');
        return regex.test(fieldName);
      }
      // Case-insensitive exact match
      return field.toLowerCase() === fieldName.toLowerCase();
    });
  }

  /**
   * Check if a field should be obfuscated
   * @private
   */
  _shouldObfuscateField(fieldName) {
    if (!fieldName) return false;

    return this.config.stringFieldsToObfuscate.some(field => {
      // Support wildcard matching
      if (field.includes('*')) {
        const regex = new RegExp('^' + field.replace(/\*/g, '.*') + '$', 'i');
        return regex.test(fieldName);
      }
      // Case-insensitive partial match
      return fieldName.toLowerCase().includes(field.toLowerCase());
    });
  }

  /**
   * Obfuscate a string value
   * @private
   */
  _obfuscateString(str) {
    if (!str || typeof str !== 'string') {
      return str;
    }

    // Limit string length for safety
    const truncated = str.length > this.config.maxObfuscatedLength
      ? str.substring(0, this.config.maxObfuscatedLength)
      : str;

    switch (this.config.obfuscationMethod) {
      case 'sha256-short':
        // Default: SHA-256 first 8 chars
        const hash = createHash('sha256').update(truncated).digest('hex');
        return hash.substring(0, 8);

      case 'sha256':
        // Full SHA-256 hash
        return createHash('sha256').update(truncated).digest('hex');

      case 'md5':
        // MD5 hash (less secure but shorter)
        return createHash('md5').update(truncated).digest('hex');

      case 'mask':
        // Simple masking (preserve length indication)
        if (str.length <= 4) {
          return '****';
        }
        return str.substring(0, 2) + '*'.repeat(Math.min(str.length - 4, 10)) + str.substring(str.length - 2);

      case 'type':
        // Replace with type indicator
        return `[STRING:${str.length}]`;

      default:
        // Fallback to SHA-256 short
        const defaultHash = createHash('sha256').update(truncated).digest('hex');
        return defaultHash.substring(0, 8);
    }
  }

  /**
   * Get anonymization statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  /**
   * Utility: Anonymize just file paths in a report
   */
  anonymizePaths(report) {
    const originalConfig = { ...this.config };
    this.config.fieldsToStrip = ['filePath', 'path', 'file'];
    this.config.obfuscateStrings = true;
    this.config.stringFieldsToObfuscate = ['path', 'filePath', 'file', 'directory', 'folder'];

    const result = this.anonymize(report);
    this.config = originalConfig;
    return result;
  }

  /**
   * Utility: Strip all code content from report
   */
  stripCode(report) {
    const originalConfig = { ...this.config };
    this.config.fieldsToStrip = ['codeSnippet', 'code', 'content', 'snippet', 'source'];
    this.config.obfuscateStrings = false;

    const result = this.anonymize(report);
    this.config = originalConfig;
    return result;
  }

  /**
   * Utility: Maximum anonymization (strip and obfuscate everything)
   */
  maximumAnonymize(report) {
    const originalConfig = { ...this.config };
    this.config.fieldsToStrip = ['filePath', 'path', 'codeSnippet', 'code', 'content', 'snippet', 'source', 'file'];
    this.config.obfuscateStrings = true;
    this.config.stringFieldsToObfuscate = ['*']; // Obfuscate all strings
    this.config.obfuscationMethod = 'sha256';

    const result = this.anonymize(report);
    this.config = originalConfig;
    return result;
  }
}

// Update manifest documentation
const updateManifest = `
### SauronScanAnonymizer.js
- Purpose: Removes/obfuscates sensitive data from scan reports for safe sharing
- API: SauronScanAnonymizer(config).anonymize(report) → object
- Features: Configurable field stripping, string obfuscation, circular ref handling
- Dependencies: Node.js crypto module
- Integration: Used by archiver, exporter, and API for safe report sharing
`;
export default SauronScanAnonymizer;

