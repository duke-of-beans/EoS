/**
 * Purpose: Parallel file processing utility for Eye of Sauron
 * Dependencies: Node.js std lib
 * API: BatchProcessor(maxWorkers).process(items, processor) → Promise<{results, errors}>
 */

export class BatchProcessor {
  constructor(maxWorkers = 4) {
    if (typeof maxWorkers !== 'number' || maxWorkers < 1) {
      throw new Error('maxWorkers must be a positive number');
    }
    this.maxWorkers = maxWorkers;
  }

  /**
   * Process items in parallel batches
   * @param {string[]} items - Array of items to process
   * @param {Function} processor - Async function to process each item
   * @returns {Promise<{results: Array, errors: Array}>} Results and errors
   */
  async process(items, processor) {
    if (!Array.isArray(items)) {
      throw new Error('items must be an array');
    }
    if (typeof processor !== 'function') {
      throw new Error('processor must be a function');
    }

    if (items.length === 0) {
      return { results: [], errors: [] };
    }

    // Calculate chunk size based on maxWorkers
    const chunkSize = Math.ceil(items.length / this.maxWorkers);
    const chunks = [];

    // Split items into chunks
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    // Process each chunk in parallel
    const chunkPromises = chunks.map(chunk => this._processChunk(chunk, processor));
    const chunkResults = await Promise.all(chunkPromises);

    // Aggregate results and errors from all chunks
    const results = [];
    const errors = [];

    for (const chunkResult of chunkResults) {
      results.push(...chunkResult.results);
      errors.push(...chunkResult.errors);
    }

    return { results, errors };
  }

  /**
   * Process a single chunk of items
   * @private
   * @param {string[]} chunk - Items in this chunk
   * @param {Function} processor - Async function to process each item
   * @returns {Promise<{results: Array, errors: Array}>}
   */
  async _processChunk(chunk, processor) {
    const results = [];
    const errors = [];

    // Process each item in the chunk sequentially
    for (const item of chunk) {
      try {
        const result = await processor(item);
        results.push({
          item,
          result,
          success: true
        });
      } catch (error) {
        errors.push({
          item,
          error: error.message || String(error),
          stack: error.stack,
          success: false
        });
      }
    }

    return { results, errors };
  }
}

// Update manifest entry
export const manifestEntry = {
  file: 'performance/BatchProcessor.js',
  purpose: 'Parallel file processing utility with error collection',
  api: {
    class: 'BatchProcessor',
    constructor: 'BatchProcessor(maxWorkers = 4)',
    methods: [
      'async process(items: string[], processor: Function) → Promise<{results: Array, errors: Array}>'
    ],
    notes: 'Processes items in parallel chunks, collects both successes and errors without rejecting'
  }
};