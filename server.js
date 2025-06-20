/**
 * server.js - Eye of Sauron HTTP API Server
 * Purpose: Minimal HTTP API exposing Eye of Sauron scanning functionality
 * Dependencies: Node.js built-ins only (http, url, fs, path)
 * Public API:
 *   POST /process - Run full scan and return complete report
 *   POST /summary - Run scan and return summary only
 * Created: 2025-06-19
 */

import http from 'http';
import url from 'url';
import Sauron from './index.js';

const PORT = process.env.PORT || 3000;

/**
 * Parse JSON body from request
 */
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Handle scan request
 */
async function handleScan(inputPath, mode = 'cli', summaryOnly = false) {
  if (!inputPath) {
    throw new Error('Missing required field: inputPath');
  }

  if (!Sauron || !Sauron.scan) {
    throw new Error('Scan engine not properly initialized');
  }

  const report = await Sauron.scan(inputPath, mode);

  if (summaryOnly) {
    return {
      success: true,
      summary: {
        totalFiles: report.stats?.totalFiles || 0,
        totalIssues: report.stats?.totalIssues || 0,
        issuesBySeverity: report.stats?.issuesBySeverity || {},
        scanDuration: report.stats?.scanDuration || 0,
        timestamp: report.timestamp || new Date().toISOString()
      }
    };
  }

  return {
    success: true,
    report
  };
}

/**
 * Request handler
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
    return;
  }

  try {
    const body = await parseBody(req);
    const inputPath = body.inputPath || './';
    const mode = body.mode || 'cli';

    switch (pathname) {
      case '/process':
        console.log(`[${new Date().toISOString()}] Processing full scan for: ${inputPath}`);
        const fullResult = await handleScan(inputPath, mode, false);
        sendJson(res, 200, fullResult);
        break;

      case '/summary':
        console.log(`[${new Date().toISOString()}] Processing summary scan for: ${inputPath}`);
        const summaryResult = await handleScan(inputPath, mode, true);
        sendJson(res, 200, summaryResult);
        break;

      default:
        sendJson(res, 404, {
          error: 'Not found',
          message: `Unknown endpoint: ${pathname}`,
          availableEndpoints: ['/process', '/summary']
        });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    const isClientError = /Missing required field|Invalid JSON/.test(error.message);
    sendJson(res, isClientError ? 400 : 500, {
      error: isClientError ? 'Bad request' : 'Internal server error',
      message: error.message
    });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Eye of Sauron API Server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /process - Run full scan`);
  console.log(`  POST /summary - Get scan summary`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;

