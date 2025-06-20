/**
 * Purpose: Saves and restores full scan state snapshot for Eye of Sauron analysis
 * Dependencies: Node.js std lib (fs/promises, path)
 * API:
 *   - new KaizenSnapshot(snapshotPath)
 *   - async save(vision, config, metadata) → void
 *   - async load() → { vision, config, metadata } | null
 */

import { promises as fs } from 'fs';
import path from 'path';

export class KaizenSnapshot {
  constructor(snapshotPath) {
    if (!snapshotPath || typeof snapshotPath !== 'string') {
      throw new Error('KaizenSnapshot requires a valid snapshot path');
    }
    this.snapshotPath = snapshotPath;
  }

  /**
   * Saves the complete scan state to a JSON snapshot file
   * @param {object} vision - The vision object containing scan results
   * @param {object} config - The configuration used for the scan
   * @param {object} metadata - Additional metadata about the scan
   * @returns {Promise<void>}
   */
  async save(vision, config, metadata) {
    try {
      // Validate inputs
      if (!vision || typeof vision !== 'object') {
        throw new Error('Invalid vision object provided');
      }
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid config object provided');
      }
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Invalid metadata object provided');
      }

      // Create snapshot structure
      const snapshot = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        vision: this._deepClone(vision),
        config: this._deepClone(config),
        metadata: this._deepClone(metadata)
      };

      // Ensure directory exists
      const dir = path.dirname(this.snapshotPath);
      await fs.mkdir(dir, { recursive: true });

      // Write snapshot to file
      const jsonContent = JSON.stringify(snapshot, null, 2);
      await fs.writeFile(this.snapshotPath, jsonContent, 'utf8');

    } catch (error) {
      console.error(`[KaizenSnapshot] Failed to save snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Loads a previously saved snapshot from disk
   * @returns {Promise<{vision: object, config: object, metadata: object} | null>}
   */
  async load() {
    try {
      // Check if file exists
      await fs.access(this.snapshotPath);

      // Read and parse snapshot
      const jsonContent = await fs.readFile(this.snapshotPath, 'utf8');
      const snapshot = JSON.parse(jsonContent);

      // Validate snapshot structure
      if (!snapshot.vision || !snapshot.config || !snapshot.metadata) {
        console.warn('[KaizenSnapshot] Invalid snapshot structure, missing required fields');
        return null;
      }

      // Return structured data
      return {
        vision: this._deepClone(snapshot.vision),
        config: this._deepClone(snapshot.config),
        metadata: this._deepClone(snapshot.metadata)
      };

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`[KaizenSnapshot] Snapshot file not found: ${this.snapshotPath}`);
      } else if (error instanceof SyntaxError) {
        console.error(`[KaizenSnapshot] Corrupted snapshot file: ${error.message}`);
      } else {
        console.error(`[KaizenSnapshot] Failed to load snapshot: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Creates a deep clone of an object to prevent reference pollution
   * @private
   * @param {any} obj - Object to clone
   * @returns {any} Deep cloned object
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this._deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    // Fallback for any unmatched types
    return obj;
  }
}

// Update /docs/EoS-manifest.md with:
// KaizenSnapshot.js - Utility for capturing and restoring full scan state snapshots
// API: new KaizenSnapshot(path).save(vision, config, metadata), .load() → snapshot