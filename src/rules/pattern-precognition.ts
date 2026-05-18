/**
 * Contract + risk pattern analyzer for Eye of Sauron (TypeScript port)
 * Detects: memory leaks (setInterval without clear), event listener leaks,
 * missing Tribunal contract methods
 */

import type { Issue, Severity, ScannerConfig } from '../types';

export class PatternPrecognition {
  private readonly config: ScannerConfig;
  private readonly requiredMethods = ['render', 'destroy', 'attachTo', 'toJSON'];

  constructor(config: ScannerConfig = {}) {
    this.config = config;
  }

  async detect(content: string, filePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];

    issues.push(...this._detectMemoryLeaks(content, filePath));
    issues.push(...this._detectEventListenerLeaks(content, filePath));
    issues.push(...this._detectMissingContractMethods(content, filePath));

    return issues;
  }
  private _detectMemoryLeaks(content: string, filePath: string): Issue[] {
    const issues: Issue[] = [];
    const intervals: { index: number; line: number }[] = [];

    const setIntervalRe = /setInterval\s*\(/g;
    const clearIntervalRe = /clearInterval\s*\(/g;

    let match: RegExpExecArray | null;
    while ((match = setIntervalRe.exec(content)) !== null) {
      intervals.push({ index: match.index, line: this._getLineNumber(content, match.index) });
    }

    const hasClears = clearIntervalRe.test(content);

    if (intervals.length > 0 && !hasClears) {
      for (const interval of intervals) {
        issues.push({
          type: 'MEMORY_LEAK',
          severity: 'DANGER',
          file: filePath,
          line: interval.line,
          message: 'setInterval detected without corresponding clearInterval',
          fix: 'Store interval ID and call clearInterval() in cleanup/destroy method',
        });
      }
    }

    return issues;
  }

  private _detectEventListenerLeaks(content: string, filePath: string): Issue[] {
    const issues: Issue[] = [];
    const listeners: { line: number; eventType: string }[] = [];
    const removalTypes = new Set<string>();

    const addRe = /addEventListener\s*\([^)]+\)/g;
    const removeRe = /removeEventListener\s*\([^)]+\)/g;

    let match: RegExpExecArray | null;
    while ((match = addRe.exec(content)) !== null) {
      const eventMatch = match[0].match(/addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/);
      const eventType = eventMatch ? eventMatch[1] : 'unknown';
      listeners.push({
        line: this._getLineNumber(content, match.index),
        eventType,
      });
    }

    while ((match = removeRe.exec(content)) !== null) {
      const eventMatch = match[0].match(/removeEventListener\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (eventMatch) removalTypes.add(eventMatch[1]);
    }

    for (const listener of listeners) {
      if (!removalTypes.has(listener.eventType)) {
        issues.push({
          type: 'MEMORY_LEAK',
          severity: 'DANGER',
          file: filePath,
          line: listener.line,
          message: `addEventListener('${listener.eventType}') without corresponding removeEventListener`,
          fix: `Add removeEventListener('${listener.eventType}', handler) in cleanup/destroy method`,
        });
      }
    }

    return issues;
  }

  private _detectMissingContractMethods(content: string, filePath: string): Issue[] {
    if (this.config.skipTribunalContract === true) return [];

    const isComponentFile = /class\s+\w+|export\s+(?:default\s+)?(?:class|function)|\.prototype\./i.test(content);
    if (!isComponentFile) return [];
    const foundMethods = new Set<string>();
    const methodRe = /(?:(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)\s*\{|(\w+)\s*:\s*(?:async\s+)?function\s*\([^)]*\)\s*\{|(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>|(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)/g;

    let match: RegExpExecArray | null;
    while ((match = methodRe.exec(content)) !== null) {
      const methodName = match[1] || match[2] || match[3] || match[4];
      if (methodName) foundMethods.add(methodName);
    }

    const missingMethods = this.requiredMethods.filter(m => !foundMethods.has(m));
    if (missingMethods.length === 0) return [];

    const severity: Severity =
      missingMethods.length === this.requiredMethods.length ? 'APOCALYPSE' :
      missingMethods.length >= 2 ? 'DANGER' : 'WARNING';

    return [{
      type: 'MISSING_METHOD',
      severity,
      file: filePath,
      line: 1,
      message: `Missing required Tribunal contract methods: ${missingMethods.join(', ')}`,
      fix: `Implement the following methods: ${missingMethods.map(m => `${m}()`).join(', ')}`,
    }];
  }

  private _getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}