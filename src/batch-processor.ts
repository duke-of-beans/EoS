/**
 * Parallel file processing utility for Eye of Sauron (TypeScript port)
 */

interface BatchResult<T> {
  results: { item: string; result: T; success: true }[];
  errors: { item: string; error: string; stack?: string; success: false }[];
}

export class BatchProcessor {
  private readonly maxWorkers: number;

  constructor(maxWorkers = 4) {
    if (maxWorkers < 1) throw new Error('maxWorkers must be a positive number');
    this.maxWorkers = maxWorkers;
  }

  async process<T>(
    items: string[],
    processor: (item: string) => Promise<T>,
    _options?: { batchSize?: number },
  ): Promise<BatchResult<T>> {
    if (items.length === 0) return { results: [], errors: [] };

    const chunkSize = Math.ceil(items.length / this.maxWorkers);
    const chunks: string[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    const chunkResults = await Promise.all(
      chunks.map(chunk => this._processChunk(chunk, processor)),
    );

    const results: BatchResult<T>['results'] = [];
    const errors: BatchResult<T>['errors'] = [];
    for (const cr of chunkResults) {
      results.push(...cr.results);
      errors.push(...cr.errors);
    }
    return { results, errors };
  }

  private async _processChunk<T>(
    chunk: string[],
    processor: (item: string) => Promise<T>,
  ): Promise<BatchResult<T>> {
    const results: BatchResult<T>['results'] = [];
    const errors: BatchResult<T>['errors'] = [];

    for (const item of chunk) {
      try {
        const result = await processor(item);
        results.push({ item, result, success: true });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push({ item, error: error.message, stack: error.stack, success: false });
      }
    }
    return { results, errors };
  }
}