/**
 * Purpose: Splits + merges scan reports for chunked processing
 * Dependencies: Node.js std lib
 * API: SauronReportSplitter(config).split(), merge()
 * Config: chunkSize, logger, dateProvider
 */

export class SauronReportSplitter {
  constructor(config = {}) {
    this.chunkSize = config.chunkSize || 100;
    this.logger = config.logger || null;
    this.dateProvider = config.dateProvider || (() => new Date());
  }

  /**
   * Splits a large report into smaller chunks
   * @param {object} report - Full scan report with files array
   * @returns {array} Array of report chunks with shared metadata
   */
  split(report) {
    // Handle empty or invalid reports
    if (!report || !report.files || !Array.isArray(report.files)) {
      return [this._deepClone(report || {})];
    }

    // Handle small reports that don't need splitting
    if (report.files.length <= this.chunkSize) {
      return [this._deepClone(report)];
    }

    const chunks = [];
    const files = report.files;
    const totalFiles = files.length;
    const numChunks = Math.ceil(totalFiles / this.chunkSize);

    // Extract metadata (everything except files)
    const metadata = this._extractMetadata(report);

    // Create chunks
    for (let i = 0; i < numChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, totalFiles);
      const chunkFiles = files.slice(start, end);

      const chunk = {
        ...this._deepClone(metadata),
        files: this._deepClone(chunkFiles),
        _chunkInfo: {
          chunkIndex: i,
          totalChunks: numChunks,
          filesInChunk: chunkFiles.length,
          startIndex: start,
          endIndex: end - 1,
          totalFiles: totalFiles,
          timestamp: this.dateProvider().toISOString()
        }
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Merges report chunks back into a full report
   * @param {array} chunks - Array of report chunks to merge
   * @returns {object} Merged report with deduplicated files
   */
  merge(chunks) {
    // Handle empty or invalid chunks
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return {};
    }

    // Handle single chunk
    if (chunks.length === 1) {
      const merged = this._deepClone(chunks[0]);
      delete merged._chunkInfo;
      return merged;
    }

    // Sort chunks by chunk index to ensure correct order
    const sortedChunks = [...chunks].sort((a, b) => {
      const indexA = a._chunkInfo?.chunkIndex;
      const indexB = b._chunkInfo?.chunkIndex;
      
      // Warn if chunk info is missing
      if (indexA === undefined && this.logger) {
        this.logger(`Warning: Chunk missing _chunkInfo.chunkIndex, treating as index 0`);
      }
      if (indexB === undefined && this.logger) {
        this.logger(`Warning: Chunk missing _chunkInfo.chunkIndex, treating as index 0`);
      }
      
      return (indexA ?? 0) - (indexB ?? 0);
    });

    // Use first chunk as base for metadata
    const baseChunk = sortedChunks[0];
    const metadata = this._extractMetadata(baseChunk);
    
    // Merge all files while deduplicating
    const fileMap = new Map();
    
    for (const chunk of sortedChunks) {
      if (chunk.files && Array.isArray(chunk.files)) {
        for (const file of chunk.files) {
          // Use file path as unique key for deduplication
          let key = file.path;
          
          if (!key) {
            key = JSON.stringify(file);
            if (this.logger) {
              this.logger(`Warning: File missing 'path' property, using JSON.stringify for deduplication`);
            }
          }
          
          if (!fileMap.has(key)) {
            fileMap.set(key, this._deepClone(file));
          }
        }
      }
    }

    // Build merged report
    const merged = {
      ...this._deepClone(metadata),
      files: Array.from(fileMap.values()),
      _mergeInfo: {
        chunksProcessed: chunks.length,
        totalFiles: fileMap.size,
        mergedAt: this.dateProvider().toISOString()
      }
    };

    // Clean up chunk info from metadata
    delete merged._chunkInfo;

    return merged;
  }

  /**
   * Extracts metadata (all properties except files and chunk info)
   * @private
   */
  _extractMetadata(report) {
    const metadata = {};
    for (const key in report) {
      if (key !== 'files' && key !== '_chunkInfo' && report.hasOwnProperty(key)) {
        metadata[key] = report[key];
      }
    }
    return metadata;
  }

  /**
   * Deep clones an object to avoid mutations
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this._deepClone(item));
    }

    if (obj instanceof Object) {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this._deepClone(obj[key]);
        }
      }
      return cloned;
    }
  }
}

// Example usage:
// const splitter = new SauronReportSplitter({ 
//   chunkSize: 50,
//   logger: console.warn,
//   dateProvider: () => new Date('2024-01-01') // For deterministic testing
// });
// const chunks = splitter.split(largeReport);
// const merged = splitter.merge(chunks);