/**
 * Purpose: Collects + summarizes errors for diagnostics
 * Dependencies: Node.js std lib
 * API: SauronErrorAggregator().record(), summarize(), list()
 */

export class SauronErrorAggregator {
  constructor() {
    // Map to store unique errors with counts
    // Key format: "origin:::message" for deduplication
    this._errorMap = new Map();
    // Track total error count (including duplicates)
    this._totalCount = 0;
    // Track errors by origin for summary
    this._originCounts = new Map();
  }

  /**
   * Records an error, incrementing count if duplicate
   * @param {object|string} error - Error object or string message
   * @returns {void}
   */
  record(error) {
    this._totalCount++;
    
    let message, origin;
    
    if (typeof error === 'string') {
      message = error;
      origin = 'unknown';
    } else if (error && typeof error === 'object') {
      message = error.message || error.error || String(error);
      origin = error.origin || error.source || error.module || 'unknown';
    } else {
      message = String(error);
      origin = 'unknown';
    }
    
    // Create unique key for deduplication
    const key = `${origin}:::${message}`;
    
    // Update error map
    if (this._errorMap.has(key)) {
      const existing = this._errorMap.get(key);
      existing.count++;
    } else {
      this._errorMap.set(key, {
        message,
        origin,
        count: 1,
        firstSeen: new Date().toISOString()
      });
    }
    
    // Update origin counts
    this._originCounts.set(origin, (this._originCounts.get(origin) || 0) + 1);
  }

  /**
   * Provides summary statistics of collected errors
   * @returns {object} Summary with total, unique, and by-origin counts
   */
  summarize() {
    const byOrigin = {};
    for (const [origin, count] of this._originCounts) {
      byOrigin[origin] = count;
    }
    
    return {
      total: this._totalCount,
      unique: this._errorMap.size,
      byOrigin,
      topErrors: this._getTopErrors(5)
    };
  }

  /**
   * Lists all unique errors with occurrence counts
   * @returns {array} Array of error objects sorted by count (descending)
   */
  list() {
    const errors = Array.from(this._errorMap.values());
    
    // Sort by count descending, then by firstSeen ascending
    return errors.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.firstSeen.localeCompare(b.firstSeen);
    });
  }

  /**
   * Gets the top N most frequent errors
   * @private
   * @param {number} n - Number of top errors to return
   * @returns {array} Top N errors by count
   */
  _getTopErrors(n) {
    return this.list().slice(0, n).map(err => ({
      message: err.message,
      origin: err.origin,
      count: err.count
    }));
  }
}

// Update manifest documentation
const manifestEntry = `
## SauronErrorAggregator.js
**Purpose:** Utility class that collects, deduplicates, and summarizes errors from multiple modules or scans for unified diagnostics.

**API:**
- \`new SauronErrorAggregator()\` - Creates new error aggregator instance
- \`record(error: object|string)\` - Records an error (object with message/origin or string)
- \`summarize()\` - Returns summary object with total, unique, by-origin counts, and top errors
- \`list()\` - Returns array of unique errors sorted by frequency with occurrence counts

**Integration:** Used by all analyzer modules to aggregate errors for unified reporting in EyeOfSauronOmniscient.
`;