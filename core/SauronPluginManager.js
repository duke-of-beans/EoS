/**
 * Purpose: Loads and manages external Sauron-compatible plugins via dynamic ES module imports
 * Dependencies: Node.js std lib (path, fs/promises, url)
 * Public API:
 *   - loadPlugin(path) - Dynamically loads a plugin module
 *   - getPlugin(name) - Retrieves a loaded plugin by name
 *   - listPlugins() - Returns array of loaded plugin names
 *   - unregisterPlugin(name) - Removes a plugin from registry
 */

import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { access } from 'fs/promises';

export class SauronPluginManager {
  constructor(options = {}) {
    this.plugins = new Map();
    this.options = {
      strictErrors: true, // throw on errors vs soft fail
      namePattern: /^[a-zA-Z0-9_-]+$/, // plugin name validation pattern
      ...options
    };
  }

  /**
   * Dynamically loads a plugin module from the specified path
   * @param {string} path - File path to the plugin module
   * @returns {Promise<void|Error>} void on success, Error on soft failure
   * @throws {Error} If plugin is invalid and strictErrors is true
   */
  async loadPlugin(path) {
    try {
      // Resolve to absolute path
      const absolutePath = resolve(path);

      // Check if file exists
      await access(absolutePath);

      // Convert to file URL for dynamic import
      const moduleURL = pathToFileURL(absolutePath).href;

      // Dynamic import of the ES module
      const pluginModule = await import(moduleURL);

      // Validate plugin shape
      if (!pluginModule.default || typeof pluginModule.default !== 'object') {
        throw new Error(`Plugin at ${path} must export a default object`);
      }

      const plugin = pluginModule.default;

      // Validate required properties
      if (!plugin.name || typeof plugin.name !== 'string') {
        throw new Error(`Plugin at ${path} must have a 'name' property (string)`);
      }

      // Validate name format
      if (!this.options.namePattern.test(plugin.name)) {
        throw new Error(`Plugin name '${plugin.name}' invalid. Must match pattern: ${this.options.namePattern.source}`);
      }

      if (!plugin.run || typeof plugin.run !== 'function') {
        throw new Error(`Plugin at ${path} must have a 'run' method`);
      }

      // Check for duplicate names
      if (this.plugins.has(plugin.name)) {
        throw new Error(`Plugin with name '${plugin.name}' already loaded`);
      }

      // Store the plugin
      this.plugins.set(plugin.name, {
        ...plugin,
        path: absolutePath,
        loadedAt: new Date().toISOString()
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        error = new Error(`Plugin file not found: ${path}`);
      }

      // Soft failure mode - return error instead of throwing
      if (!this.options.strictErrors) {
        console.error(`[SauronPluginManager] Failed to load plugin from ${path}:`, error.message);
        return error;
      }

      throw error;
    }
  }

  /**
   * Retrieves a loaded plugin by name
   * @param {string} name - Plugin name
   * @returns {object|null} Plugin object or null if not found
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Lists all loaded plugin names
   * @returns {string[]} Array of plugin names
   */
  listPlugins() {
    return Array.from(this.plugins.keys());
  }

  /**
   * Unregisters a plugin by name
   * @param {string} name - Plugin name to unregister
   * @returns {boolean} True if plugin was removed, false if not found
   */
  unregisterPlugin(name) {
    return this.plugins.delete(name);
  }
}