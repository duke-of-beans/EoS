/**
 * Console Detector - Detects console.log statements not wrapped in debug guards
 * Dependencies: None
 * Public API: detect(content, filePath, config)
 */

class ConsoleDetector {
  constructor() {
    this.name = 'ConsoleDetector';
    this.patterns = {
      console: /console\s*\.\s*(log|warn|error|info|debug|trace|table|dir|time|timeEnd)\s*\(/g,
      debugWrapper: /(?:if\s*\(\s*(?:process\.env\.(?:NODE_ENV|DEBUG)|DEBUG|__DEV__|debug|isDevelopment|isDebug).*?\)|(?:DEBUG|debug|isDevelopment|isDebug)\s*(?:&&|\?)|\/\/\s*@ts-ignore.*?console|\/\/\s*eslint-disable.*?console)/i,
      envCheck: /process\.env\.NODE_ENV\s*(?:!==?|===?)\s*['"`]production['"`]/,
      debugUtility: /(?:debug|logger|log|winston|bunyan|pino|morgan)\s*\(/i,
      testFile: /\.(test|spec|mock)\.(js|jsx|ts|tsx)$/i
    };
  }

  detect(content, filePath, config = {}) {
    if (config.allowConsole === true) {
      return [];
    }

    // Skip test files
    if (this.patterns.testFile.test(filePath)) {
      return [];
    }

    const issues = [];
    const lines = content.split('\n');

    // First pass - identify all console statements
    const consoleUsages = [];
    lines.forEach((line, index) => {
      const matches = [...line.matchAll(this.patterns.console)];
      matches.forEach(match => {
        consoleUsages.push({
          line: index + 1,
          column: match.index + 1,
          type: match[1],
          lineContent: line.trim()
        });
      });
    });

    // Second pass - check if console statements are properly guarded
    consoleUsages.forEach(usage => {
      const lineIndex = usage.line - 1;
      let isGuarded = false;

      // Check current line for inline guards
      if (this.patterns.debugWrapper.test(lines[lineIndex])) {
        isGuarded = true;
      }

      // Check previous 5 lines for guard conditions
      for (let i = Math.max(0, lineIndex - 5); i < lineIndex && !isGuarded; i++) {
        const prevLine = lines[i];
        if (this.patterns.debugWrapper.test(prevLine) ||
            this.patterns.envCheck.test(prevLine)) {
          // Check if we're inside a conditional block
          const bracesAfter = this.countBracesUntilLine(lines, i, lineIndex);
          if (bracesAfter.open > bracesAfter.close) {
            isGuarded = true;
          }
        }
      }

      // Check if it's using a debug utility instead
      if (this.patterns.debugUtility.test(lines[lineIndex])) {
        isGuarded = true;
      }

      // Check for custom ignore patterns
      if (config.ignorePatterns?.some(pattern =>
        lines[lineIndex].includes(pattern))) {
        isGuarded = true;
      }

      if (!isGuarded) {
        issues.push({
          type: 'console-statement',
          severity: 'warning',
          message: `Unguarded console.${usage.type} statement found`,
          file: filePath,
          line: usage.line,
          column: usage.column,
          snippet: usage.lineContent,
          suggestion: 'Wrap console statements in environment checks or use a proper logging utility'
        });
      }
    });

    return issues;
  }

  countBracesUntilLine(lines, startLine, endLine) {
    let open = 0;
    let close = 0;

    for (let i = startLine; i <= endLine && i < lines.length; i++) {
      const line = lines[i];
      // Skip string literals and comments
      const cleanLine = line.replace(/(['"`]).*?\1/g, '').replace(/\/\/.*$/, '');
      open += (cleanLine.match(/{/g) || []).length;
      close += (cleanLine.match(/}/g) || []).length;
    }

    return { open, close };
  }
}

module.exports = ConsoleDetector;