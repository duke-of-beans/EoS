/**
 * api.js - HTTP request utility functions for Eye of Sauron system
 *
 * Purpose: Provides reusable HTTP request utilities with abort controller support,
 * comprehensive error handling, and configurable timeout/retry logic.
 *
 * Dependencies: None (uses native fetch API)
 *
 * Public API:
 * - fetchData(url, options) → Promise<any> - GET request with automatic JSON parsing
 * - postData(url, data, options) → Promise<any> - POST request with JSON body
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Creates an abort controller with timeout
 * @param {number} timeout - Timeout in milliseconds
 * @returns {{controller: AbortController, timeoutId: number}}
 */
const createAbortController = (timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { controller, timeoutId };
};

/**
 * Implements exponential backoff with jitter
 * @param {number} attempt - Current attempt number
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
const calculateRetryDelay = (attempt, baseDelay) => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
};

/**
 * Performs HTTP GET request with automatic retry and error handling
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Base retry delay in ms (default: 1000)
 * @param {Object} options.headers - Additional headers
 * @param {AbortSignal} options.signal - External abort signal
 * @returns {Promise<any>} Parsed response data
 * @throws {ApiError} On request failure or non-2xx response
 */
export async function fetchData(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRY_ATTEMPTS,
    retryDelay = DEFAULT_RETRY_DELAY,
    headers = {},
    signal: externalSignal,
    ...fetchOptions
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const { controller, timeoutId } = createAbortController(timeout);

    try {
      // Combine external signal with timeout signal
      const combinedSignal = externalSignal
        ? AbortSignal.any([externalSignal, controller.signal])
        : controller.signal;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...headers
        },
        signal: combinedSignal,
        ...fetchOptions
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text().catch(() => null)
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        throw new ApiError('Request aborted', 0, null);
      }

      if (attempt < retries) {
        const delay = calculateRetryDelay(attempt, retryDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    lastError?.message || 'Network request failed',
    0,
    null
  );
}

/**
 * Performs HTTP POST request with automatic retry and error handling
 * @param {string} url - Target URL
 * @param {any} data - Request body data (will be JSON stringified)
 * @param {Object} options - Request options
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Base retry delay in ms (default: 1000)
 * @param {Object} options.headers - Additional headers
 * @param {AbortSignal} options.signal - External abort signal
 * @returns {Promise<any>} Parsed response data
 * @throws {ApiError} On request failure or non-2xx response
 */
export async function postData(url, data, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRY_ATTEMPTS,
    retryDelay = DEFAULT_RETRY_DELAY,
    headers = {},
    signal: externalSignal,
    ...fetchOptions
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const { controller, timeoutId } = createAbortController(timeout);

    try {
      // Combine external signal with timeout signal
      const combinedSignal = externalSignal
        ? AbortSignal.any([externalSignal, controller.signal])
        : controller.signal;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        body: JSON.stringify(data),
        signal: combinedSignal,
        ...fetchOptions
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text().catch(() => null)
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        throw new ApiError('Request aborted', 0, null);
      }

      // Don't retry on 4xx errors (client errors)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        const delay = calculateRetryDelay(attempt, retryDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    lastError?.message || 'Network request failed',
    0,
    null
  );
}

// Re-export error class for external use
export { ApiError };
// Added cleanup for event listeners
