/**
 * Purpose: Configuration loader and merger for Eye of Sauron
 * Dependencies: Node.js standard library (fs, path, url, module)
 * Public API:
 *   - Config.load(customConfigPath: string | null, overrides: object = {}) → Promise<object>
 *     Loads and merges configuration from defaults, custom file, and overrides
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';

export class Config {
  static #defaults = {
    mode: 'deep',
    parallel: 4,
    maxFileSize: 10 * 1024 * 1024,
    cacheDir: '.sauron-cache',
    ignorePaths: ['node_modules', '.git', 'dist', 'build'],
    fileExtensions: ['.js', '.ts', '.jsx', '.tsx'],
    enableCache: true,
    reportFormats: ['console', 'json']
  };

  /**
   * Loads configuration by merging defaults, custom config file, and overrides
   * @param {string|null} customConfigPath - Path to custom config file (optional)
   * @param {object} overrides - Override values to apply on top (optional)
   * @returns {Promise<object>} Merged configuration object
   */
  static async load(customConfigPath = null, overrides = {}) {
    let config = this.#deepClone(this.#defaults);

    // Load custom config if path provided
    if (customConfigPath) {
      const customConfig = await this.#loadCustomConfig(customConfigPath);
      if (customConfig) {
        config = this.#deepMerge(config, customConfig);
      }
    }

    // Apply overrides
    if (overrides && typeof overrides === 'object') {
      config = this.#deepMerge(config, overrides);
    }

    // Validate and sanitize final config
    return this.#validateConfig(config);
  }

  /**
   * Loads custom configuration from file
   * @private
   */
  static async #loadCustomConfig(configPath) {
    try {
      // Resolve path safely
      const resolvedPath = isAbsolute(configPath)
        ? configPath
        : resolve(process.cwd(), configPath);

      // Check if file exists
      if (!existsSync(resolvedPath)) {
        console.warn(`Config file not found: ${configPath}`);
        return null;
      }

      // Determine file type and load accordingly
      if (resolvedPath.endsWith('.json')) {
        const content = readFileSync(resolvedPath, 'utf8');
        return JSON.parse(content);
      } else if (resolvedPath.endsWith('.mjs')) {
        // ES modules use dynamic import
        const fileUrl = pathToFileURL(resolvedPath).href;
        const module = await import(fileUrl);
        return module.default || module;
      } else {
        // Try CommonJS require for .js and other extensions
        try {
          const require = createRequire(import.meta.url);
          return require(resolvedPath);
        } catch (requireError) {
          // If require fails for .js, try dynamic import as it might be ES module
          if (resolvedPath.endsWith('.js')) {
            try {
              const fileUrl = pathToFileURL(resolvedPath).href;
              const module = await import(fileUrl);
              return module.default || module;
            } catch (importError) {
              throw requireError; // Throw original require error
            }
          }
          throw requireError;
        }
      }
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error.message);
      return null;
    }
  }

  /**
   * Deep clones an object
   * @private
   */
  static #deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.#deepClone(item));
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.#deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep merges two objects
   * @private
   */
  static #deepMerge(target, source) {
    const output = this.#deepClone(target);

    if (!source || typeof source !== 'object') return output;

    Object.keys(source).forEach(key => {
      if (source[key] === undefined) return;

      if (source[key] === null) {
        output[key] = null;
      } else if (Array.isArray(source[key])) {
        output[key] = this.#deepClone(source[key]);
      } else if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (typeof output[key] === 'object' && !Array.isArray(output[key])) {
          output[key] = this.#deepMerge(output[key], source[key]);
        } else {
          output[key] = this.#deepClone(source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });

    return output;
  }

  /**
   * Validates and sanitizes configuration
   * @private
   */
  static #validateConfig(config) {
    // Ensure mode is valid
    if (!['deep', 'shallow'].includes(config.mode)) {
      config.mode = 'deep';
    }

    // Ensure parallel is positive integer
    config.parallel = Math.max(1, parseInt(config.parallel) || 4);

    // Ensure maxFileSize is positive
    config.maxFileSize = Math.max(1024, parseInt(config.maxFileSize) || 10485760);

    // Ensure arrays are arrays
    if (!Array.isArray(config.ignorePaths)) {
      config.ignorePaths = this.#defaults.ignorePaths;
    }

    if (!Array.isArray(config.fileExtensions)) {
      config.fileExtensions = this.#defaults.fileExtensions;
    }

    if (!Array.isArray(config.reportFormats)) {
      config.reportFormats = this.#defaults.reportFormats;
    }

    // Ensure boolean values
    config.enableCache = Boolean(config.enableCache);

    // Ensure cacheDir is string
    if (typeof config.cacheDir !== 'string') {
      config.cacheDir = this.#defaults.cacheDir;
    }

    return config;
  }
}