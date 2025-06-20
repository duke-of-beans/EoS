/**
 * Purpose: Manages scan session metadata + history
 * Dependencies: Node.js std lib
 * API: SauronScanSessionManager().startSession(), endSession(), listSessions(), getSession()
 *
 * Design Notes:
 * - Duration stored as numeric milliseconds for consistency
 * - History file always serialized as JSON array (supports object format on load)
 * - Persistence errors are logged but not rethrown (non-critical failures)
 */

import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';

export class SauronScanSessionManager {
  constructor(config = {}) {
    this.historyPath = config.historyPath || null;
    this.sessions = new Map();
    this._loaded = false;
  }

  /**
   * Start a new scan session
   * @param {object} meta - Session metadata (config, scope, etc)
   * @returns {string} - Unique session ID
   */
  async startSession(meta = {}) {
    await this._ensureLoaded();

    // Generate unique session ID: timestamp + random
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    const sessionId = `sauron-${timestamp}-${random}`;

    const session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'active',
      meta: { ...meta },
      result: null,
      duration: null
    };

    this.sessions.set(sessionId, session);
    await this._persist();

    return sessionId;
  }

  /**
   * End an active scan session
   * @param {string} sessionId - Session identifier
   * @param {object} result - Scan results summary
   */
  async endSession(sessionId, result = {}) {
    await this._ensureLoaded();

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session already ended: ${sessionId}`);
    }

    const endTime = new Date();
    session.endTime = endTime.toISOString();
    session.status = 'completed';
    session.result = {
      ...result,
      timestamp: endTime.toISOString()
    };
    // Ensure consistent numeric (ms) duration
    session.duration = endTime.getTime() - new Date(session.startTime).getTime();

    await this._persist();
  }

  /**
   * List all scan sessions
   * @returns {array} - Array of session objects
   */
  async listSessions() {
    await this._ensureLoaded();

    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  /**
   * Get a specific session by ID
   * @param {string} sessionId - Session identifier
   * @returns {object|null} - Session object or null if not found
   */
  async getSession(sessionId) {
    await this._ensureLoaded();

    return this.sessions.get(sessionId) || null;
  }

  /**
   * Ensure session history is loaded from disk
   * @private
   */
  async _ensureLoaded() {
    if (this._loaded || !this.historyPath) {
      this._loaded = true;
      return;
    }

    try {
      const data = await fs.readFile(this.historyPath, 'utf8');
      const history = JSON.parse(data);

      if (Array.isArray(history)) {
        // Convert array to Map
        for (const session of history) {
          if (session && typeof session === 'object' && session.id) {
            this.sessions.set(session.id, session);
          }
        }
      } else if (history && typeof history === 'object') {
        // Handle object format
        for (const [id, session] of Object.entries(history)) {
          if (session && typeof session === 'object') {
            this.sessions.set(id, { ...session, id });
          }
        }
      }
    } catch (error) {
      // File doesn't exist or is corrupt - start fresh
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not load session history from ${this.historyPath}:`, error.message);
      }
    }

    this._loaded = true;
  }

  /**
   * Persist session history to disk
   * @private
   * NOTE: Intentionally does not rethrow errors - persistence failures
   * should not break session management. For critical persistence needs,
   * monitor console errors or implement custom error handling.
   */
  async _persist() {
    if (!this.historyPath) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.historyPath);
      await fs.mkdir(dir, { recursive: true });

      // Convert Map to array for JSON serialization
      // NOTE: Always serializes as array for consistency. Could support
      // object format in future versions if needed for key-based lookups.
      const sessions = Array.from(this.sessions.values());

      // Write atomically with temp file
      const tempPath = `${this.historyPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(sessions, null, 2), 'utf8');
      await fs.rename(tempPath, this.historyPath);
    } catch (error) {
      console.error(`Error persisting session history to ${this.historyPath}:`, error.message);
      // Don't throw - persistence failure shouldn't break session management
    }
  }
}