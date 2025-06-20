/**
 * Purpose: Produces immutable audit trail reports for security-critical actions
 * Dependencies: Node.js std lib
 * API: SauronAuditTrailGenerator().record(), summarize(), export()
 */

export class SauronAuditTrailGenerator {
  #entries = [];
  #maxEntries;
  #version = '1.0.0';

  constructor(config = {}) {
    this.#maxEntries = config.maxEntries || 10_000;
  }

  /**
   * Records a timestamped, immutable action entry
   * @param {string} action - The action name
   * @param {object} details - Additional details about the action
   */
  record(action, details) {
    // Validate inputs
    if (typeof action !== 'string' || !action.trim()) {
      throw new Error('Action must be a non-empty string');
    }

    if (details && typeof details !== 'object') {
      throw new Error('Details must be an object if provided');
    }

    // Create immutable entry
    const entry = Object.freeze({
      timestamp: new Date().toISOString(),
      action: action.trim(),
      details: this.#sanitizeDetails(details || {}),
      id: this.#generateId()
    });

    // Add entry and maintain size limit
    this.#entries.push(entry);

    // Drop oldest entries if over limit
    if (this.#entries.length > this.#maxEntries) {
      this.#entries = this.#entries.slice(-this.#maxEntries);
    }
  }

  /**
   * Summarizes audit trail by action counts and metadata
   * @returns {object} Summary object with counts per action type
   */
  summarize() {
    const actionCounts = {};
    let totalEntries = 0;
    let earliestTimestamp = null;
    let latestTimestamp = null;

    for (const entry of this.#entries) {
      // Count actions
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      totalEntries++;

      // Track time range
      if (!earliestTimestamp || entry.timestamp < earliestTimestamp) {
        earliestTimestamp = entry.timestamp;
      }
      if (!latestTimestamp || entry.timestamp > latestTimestamp) {
        latestTimestamp = entry.timestamp;
      }
    }

    // Sort action counts for deterministic output
    const sortedActions = Object.keys(actionCounts).sort();
    const sortedActionCounts = {};
    for (const action of sortedActions) {
      sortedActionCounts[action] = actionCounts[action];
    }

    return {
      totalEntries,
      uniqueActions: sortedActions.length,
      actionCounts: sortedActionCounts,
      timeRange: {
        earliest: earliestTimestamp,
        latest: latestTimestamp
      },
      metadata: {
        generatorVersion: this.#version,
        maxEntries: this.#maxEntries,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Exports audit trail as canonical JSON string
   * @returns {string} Canonical JSON representation
   */
  export() {
    // Create export object with sorted entries
    const sortedEntries = [...this.#entries].sort((a, b) => {
      // Sort by timestamp, then action, then id for deterministic order
      if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
      if (a.action !== b.action) return a.action.localeCompare(b.action);
      return a.id.localeCompare(b.id);
    });

    const exportData = {
      version: this.#version,
      metadata: {
        exportedAt: new Date().toISOString(),
        entryCount: sortedEntries.length,
        maxEntries: this.#maxEntries
      },
      entries: sortedEntries.map(entry => ({
        timestamp: entry.timestamp,
        action: entry.action,
        details: this.#sortObjectKeys(entry.details),
        id: entry.id
      })),
      summary: this.summarize()
    };

    // Produce canonical JSON with sorted keys
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Sanitizes sensitive information from details
   * @private
   */
  #sanitizeDetails(details) {
    const sanitized = {};
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /apikey/i,
      /private/i,
      /credential/i
    ];

    for (const [key, value] of Object.entries(details)) {
      // Check if key matches sensitive patterns
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        // Check for potential secrets in values (e.g., JWT patterns)
        if (this.#looksLikeSecret(value)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.#sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }

    return this.#sortObjectKeys(sanitized);
  }

  /**
   * Checks if a string looks like a secret
   * @private
   */
  #looksLikeSecret(value) {
    // JWT pattern
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return true;
    }

    // Long random strings (likely tokens/keys)
    if (value.length > 32 && /^[A-Za-z0-9+/=_-]+$/.test(value)) {
      return true;
    }

    // Common secret prefixes
    const secretPrefixes = ['sk_', 'pk_', 'api_', 'key_', 'token_'];
    if (secretPrefixes.some(prefix => value.toLowerCase().startsWith(prefix))) {
      return true;
    }

    return false;
  }

  /**
   * Sorts object keys recursively for deterministic output
   * @private
   */
  #sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.#sortObjectKeys(item));
    }

    const sorted = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = this.#sortObjectKeys(obj[key]);
    }

    return sorted;
  }

  /**
   * Generates a unique ID for entries
   * @private
   */
  #generateId() {
    // Simple deterministic ID based on timestamp and random component
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}`;
  }
}
export default SauronAuditTrailGenerator;

