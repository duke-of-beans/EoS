/**
 * Purpose: Internal error logger utility for Eye of Sauron
 * Dependencies: Node.js std lib
 * API: ErrorLogger().log(file, error), getSummary()
 * 
 * Thread Safety Note: This implementation uses an internal array that could face
 * race conditions in concurrent environments. Currently safe for single-threaded
 * use. Consider mutex/locking for future parallelization needs.
 */

export class ErrorLogger {
  constructor() {
    this.errors = [];
  }

  /**
   * Logs an error associated with a specific file
   * @param {string} file - The file path where the error occurred
   * @param {Error|string} error - The error object or error message string
   * @returns {void}
   */
  log(file, error) {
    const errorObj = {
      file,
      message: '',
      stack: null
    };

    if (error instanceof Error) {
      errorObj.message = error.message;
      errorObj.stack = error.stack || null;
    } else if (typeof error === 'string') {
      errorObj.message = error;
      errorObj.stack = null;
    } else {
      // Handle edge case where error is neither Error nor string
      errorObj.message = String(error);
      errorObj.stack = null;
    }

    this.errors.push(errorObj);
  }

  /**
   * Returns a summary of all logged errors
   * @returns {{count: number, errors: Array<{file: string, message: string, stack: string|null}>}}
   *          stack will be string if error had stack trace, null otherwise
   */
  getSummary() {
    return {
      count: this.errors.length,
      errors: this.errors.map(err => ({
        file: err.file,
        message: err.message,
        stack: err.stack
      }))
    };
  }
}