/**
 * Purpose: Loads and merges configuration from file/env/defaults for Eye of Sauron
 * Dependencies: Node.js std lib (fs/promises, path, process)
 * Public API:
 *   - new SauronConfigLoader(defaults = {}, options = {})
 *   - load(configPath: string) → Promise<object>
 *   - mergeWithEnv(config: object) → object
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SauronConfigLoader {
  /**
   * Initialize configuration loader
   * @param {object} defaults - Default configuration values
   * @param {object} options - Loader options
   * @param {boolean} options.suppressWarnings - Suppress unknown key warnings (default: false)
   * @param {string} options.arrayMergeStrategy - How to merge arrays: 'replace' (default) or 'concat'
   */
  constructor(defaults = {}, options = {}) {
    this.defaults = this._deepClone(defaults);
    this.knownKeys = this._extractKnownKeys(defaults);
    this.options = {
      suppressWarnings: false,
      arrayMergeStrategy: 'replace', // 'replace' or 'concat'
      ...options
    };
  }

  /**
   * Load configuration from a file path (JSON or JS) - fully async
   * @param {string} configPath - Path to configuration file
   * @returns {Promise<object>} Loaded and merged configuration
   */
  async load(configPath) {
    let fileConfig = {};

    try {
      const absolutePath = path.resolve(configPath);
      const ext = path.extname(absolutePath).toLowerCase();

      // Check if file exists (async)
      try {
        await fs.access(absolutePath);
      } catch {
        this._warn(`Config file not found: ${absolutePath}`);
        return this._deepClone(this.defaults);
      }

      if (ext === '.json') {
        // Read JSON file asynchronously
        const content = await fs.readFile(absolutePath, 'utf8');
        fileConfig = JSON.parse(content);
      } else if (ext === '.js' || ext === '.mjs') {
        // Dynamic import for JS modules
        const module = await import(absolutePath);
        fileConfig = module.default || module.config || module;
      } else {
        this._error(`Unsupported config file type: ${ext}`);
        return this._deepClone(this.defaults);
      }

      // Validate loaded config
      this._validateConfig(fileConfig, 'file');

    } catch (error) {
      this._error(`Error loading config file: ${error.message}`);
      return this._deepClone(this.defaults);
    }

    // Merge defaults with file config
    const merged = this._deepMerge(this.defaults, fileConfig);

    // Apply environment variables
    return this.mergeWithEnv(merged);
  }

  /**
   * Merge configuration with environment variables
   * @param {object} config - Current configuration object
   * @returns {object} Configuration merged with env vars
   */
  mergeWithEnv(config) {
    const envConfig = this._parseEnvVars();

    // Validate env config
    this._validateConfig(envConfig, 'environment');

    // Deep merge with env vars taking precedence
    return this._deepMerge(config, envConfig);
  }

  /**
   * Parse environment variables with SAURON_ prefix
   * @private
   * @returns {object} Parsed environment configuration
   */
  _parseEnvVars() {
    const envConfig = {};
    const prefix = 'SAURON_';

    Object.entries(process.env).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        const configKey = key.substring(prefix.length);
        const path = configKey.toLowerCase().split('_');

        // Convert value to appropriate type
        const parsedValue = this._parseEnvValue(value);

        // Build nested object structure
        this._setNestedValue(envConfig, path, parsedValue);
      }
    });

    return envConfig;
  }

  /**
   * Parse environment variable value to appropriate type
   * @private
   * @param {string} value - Raw environment variable value
   * @returns {*} Parsed value
   */
  _parseEnvValue(value) {
    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);

    // Array (comma-separated)
    if (value.includes(',')) {
      return value.split(',').map(item => this._parseEnvValue(item.trim()));
    }

    // JSON object
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // If JSON parse fails, return as string
      }
    }

    // String (default)
    return value;
  }

  /**
   * Set a value in a nested object structure
   * @private
   * @param {object} obj - Target object
   * @param {string[]} path - Path segments
   * @param {*} value - Value to set
   */
  _setNestedValue(obj, path, value) {
    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[path[path.length - 1]] = value;
  }

  /**
   * Validate configuration against known keys
   * @private
   * @param {object} config - Configuration to validate
   * @param {string} source - Source of configuration (file/environment)
   */
  _validateConfig(config, source) {
    const unknownKeys = this._findUnknownKeys(config, this.knownKeys);

    if (unknownKeys.length > 0 && !this.options.suppressWarnings) {
      this._warn(`Unknown configuration keys from ${source}: ${unknownKeys.join(', ')}`);
    }
  }

  /**
   * Extract known keys from defaults recursively
   * @private
   * @param {object} obj - Object to extract keys from
   * @param {string} prefix - Current path prefix
   * @returns {Set} Set of known key paths
   */
  _extractKnownKeys(obj, prefix = '') {
    const keys = new Set();

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedKeys = this._extractKnownKeys(value, fullKey);
        nestedKeys.forEach(k => keys.add(k));
      }
    });

    return keys;
  }

  /**
   * Find unknown keys in configuration
   * @private
   * @param {object} config - Configuration to check
   * @param {Set} knownKeys - Set of known keys
   * @param {string} prefix - Current path prefix
   * @returns {string[]} Array of unknown key paths
   */
  _findUnknownKeys(config, knownKeys, prefix = '') {
    const unknownKeys = [];

    Object.entries(config).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Check if this key or any parent key is known
      let isKnown = false;
      const pathParts = fullKey.split('.');
      for (let i = 1; i <= pathParts.length; i++) {
        const partialPath = pathParts.slice(0, i).join('.');
        if (knownKeys.has(partialPath)) {
          isKnown = true;
          break;
        }
      }

      if (!isKnown) {
        unknownKeys.push(fullKey);
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        unknownKeys.push(...this._findUnknownKeys(value, knownKeys, fullKey));
      }
    });

    return unknownKeys;
  }

  /**
   * Deep merge two objects
   * @private
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @returns {object} Merged object
   *
   * Note: Arrays are handled according to arrayMergeStrategy option:
   * - 'replace': source arrays replace target arrays (default)
   * - 'concat': source arrays are concatenated to target arrays
   */
  _deepMerge(target, source) {
    const result = this._deepClone(target);

    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Handle array merge strategy
          if (this.options.arrayMergeStrategy === 'concat' && Array.isArray(result[key])) {
            result[key] = [...result[key], ...value];
          } else {
            // Default 'replace' strategy
            result[key] = this._deepClone(value);
          }
        } else {
          // Object merging
          if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
            result[key] = this._deepMerge(result[key], value);
          } else {
            result[key] = this._deepClone(value);
          }
        }
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Deep clone an object
   * @private
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

    const cloned = {};
    Object.entries(obj).forEach(([key, value]) => {
      cloned[key] = this._deepClone(value);
    });

    return cloned;
  }

  /**
   * Log warning message
   * @private
   * @param {string} message - Warning message
   */
  _warn(message) {
    if (!this.options.suppressWarnings) {
      console.warn(`[SauronConfigLoader] ${message}`);
    }
  }

  /**
   * Log error message
   * @private
   * @param {string} message - Error message
   */
  _error(message) {
    console.error(`[SauronConfigLoader] ${message}`);
  }
}

// Example usage (commented out for production):
/*
// With options for warning suppression and array concatenation
const loader = new SauronConfigLoader({
  analysis: {
    maxDepth: 10,
    enableCache: true,
    patterns: ['*.js']
  },
  output: {
    format: 'json',
    verbose: false
  }
}, {
  suppressWarnings: true,
  arrayMergeStrategy: 'concat'
});

// Async load from file
const config = await loader.load('./sauron.config.json');
console.log('Loaded config:', config);

// If sauron.config.json has patterns: ['*.ts']
// and SAURON_ANALYSIS_PATTERNS=*.tsx,*.jsx
// Result with 'concat': patterns: ['*.js', '*.ts', '*.tsx', '*.jsx']
// Result with 'replace': patterns: ['*.tsx', '*.jsx']
*/