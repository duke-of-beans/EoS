/**
 * EOS Config Loader - Loads and merges configuration from multiple sources
 * Dependencies: fs, path
 * Public API: load(customPath, overrides)
 */

const fs = require('fs');
const path = require('path');

class EOSConfigLoader {
  constructor() {
    this.defaultConfig = {
      // Console detection
      allowConsole: false,

      // PropTypes detection
      skipPropTypesCheck: false,

      // API key detection
      ignorePatterns: [],

      // Webpack detection
      webpackVersion: null,

      // General settings
      exclude: [
        'node_modules',
        'dist',
        'build',
        'coverage',
        '.git',
        'vendor',
        'public/assets'
      ],

      // File patterns to scan
      include: [
        '**/*.js',
        '**/*.jsx',
        '**/*.ts',
        '**/*.tsx',
        '**/*.mjs',
        '**/*.cjs'
      ],

      // Severity thresholds
      severityThreshold: 'info', // info, warning, error, critical

      // Output settings
      output: {
        format: 'json', // json, console, html
        file: null,
        quiet: false,
        verbose: false
      },

      // Performance settings
      maxConcurrency: 4,
      maxFileSize: 1048576, // 1MB

      // Custom detectors
      customDetectors: [],
      disabledDetectors: []
    };
  }

  load(customPath = null, overrides = {}) {
    let config = { ...this.defaultConfig };

    // Load from environment variables
    config = this.mergeWithEnv(config);

    // Load from config file
    const configFile = this.findConfigFile(customPath);
    if (configFile) {
      const fileConfig = this.loadConfigFile(configFile);
      config = this.deepMerge(config, fileConfig);
    }

    // Apply command line overrides
    config = this.deepMerge(config, overrides);

    // Validate configuration
    this.validateConfig(config);

    return config;
  }

  findConfigFile(customPath) {
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    const configNames = [
      'eos.config.json',
      'eos.config.js',
      '.eosrc.json',
      '.eosrc.js',
      '.eosrc',
      'package.json'
    ];

    const cwd = process.cwd();

    for (const name of configNames) {
      const configPath = path.join(cwd, name);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  loadConfigFile(filePath) {
    const ext = path.extname(filePath);

    if (ext === '.js') {
      // Clear require cache for hot reloading
      delete require.cache[require.resolve(filePath)];
      return require(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');

    if (path.basename(filePath) === 'package.json') {
      const pkg = JSON.parse(content);
      return pkg.eosConfig || {};
    }

    return JSON.parse(content);
  }

  mergeWithEnv(config) {
    const envConfig = { ...config };

    // EOS_ALLOW_CONSOLE
    if (process.env.EOS_ALLOW_CONSOLE !== undefined) {
      envConfig.allowConsole = process.env.EOS_ALLOW_CONSOLE === 'true';
    }

    // EOS_SKIP_PROPTYPES
    if (process.env.EOS_SKIP_PROPTYPES !== undefined) {
      envConfig.skipPropTypesCheck = process.env.EOS_SKIP_PROPTYPES === 'true';
    }

    // EOS_WEBPACK_VERSION
    if (process.env.EOS_WEBPACK_VERSION) {
      envConfig.webpackVersion = process.env.EOS_WEBPACK_VERSION;
    }

    // EOS_IGNORE_PATTERNS
    if (process.env.EOS_IGNORE_PATTERNS) {
      envConfig.ignorePatterns = process.env.EOS_IGNORE_PATTERNS.split(',').map(p => p.trim());
    }

    // EOS_EXCLUDE
    if (process.env.EOS_EXCLUDE) {
      envConfig.exclude = process.env.EOS_EXCLUDE.split(',').map(p => p.trim());
    }

    return envConfig;
  }

  deepMerge(target, source) {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else if (Array.isArray(source[key])) {
          output[key] = [...source[key]];
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  validateConfig(config) {
    const validSeverities = ['info', 'warning', 'error', 'critical'];
    if (!validSeverities.includes(config.severityThreshold)) {
      throw new Error(`Invalid severity threshold: ${config.severityThreshold}`);
    }

    const validFormats = ['json', 'console', 'html'];
    if (!validFormats.includes(config.output.format)) {
      throw new Error(`Invalid output format: ${config.output.format}`);
    }

    if (config.maxConcurrency < 1) {
      throw new Error('maxConcurrency must be at least 1');
    }

    if (config.webpackVersion && !/^\d+\.\d+\.\d+$/.test(config.webpackVersion)) {
      throw new Error(`Invalid webpack version format: ${config.webpackVersion}`);
    }
  }
}

module.exports = EOSConfigLoader;