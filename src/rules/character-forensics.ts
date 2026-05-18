/**
 * Character-level forensics scanner for Eye of Sauron (TypeScript port)
 * Detects: invisible chars, homoglyphs, smart quotes, Greek semicolons,
 * tabs vs spaces, trailing spaces, excessive newlines
 */

import { Issue } from '../types';

interface CharInfo {
  name: string;
  code: number;
}

interface HomoglyphInfo {
  latin: string;
  name: string;
}

interface SmartQuoteInfo {
  standard: string;
  name: string;
}

interface LineIndent {
  line: number;
  indent: string;
  position: number;
}

export class CharacterForensics {
  private readonly invisibleChars: Map<string, CharInfo>;  private readonly homoglyphs: Map<string, HomoglyphInfo>;
  private readonly smartQuotes: Map<string, SmartQuoteInfo>;
  private readonly greekSemicolon = ';';

  constructor() {
    this.invisibleChars = new Map<string, CharInfo>([
      ['​', { name: 'ZERO_WIDTH_SPACE', code: 8203 }],
      ['‌', { name: 'ZERO_WIDTH_NON_JOINER', code: 8204 }],
      ['‍', { name: 'ZERO_WIDTH_JOINER', code: 8205 }],
      ['﻿', { name: 'ZERO_WIDTH_NO_BREAK_SPACE', code: 65279 }],
    ]);

    // Keys are CYRILLIC lookalike codepoints (not their Latin equivalents)
    this.homoglyphs = new Map<string, HomoglyphInfo>([
      ['а', { latin: 'a', name: 'CYRILLIC_A' }],
      ['е', { latin: 'e', name: 'CYRILLIC_E' }],
      ['о', { latin: 'o', name: 'CYRILLIC_O' }],
      ['р', { latin: 'p', name: 'CYRILLIC_P' }],
      ['с', { latin: 'c', name: 'CYRILLIC_C' }],
      ['х', { latin: 'x', name: 'CYRILLIC_X' }],
    ]);

    this.smartQuotes = new Map<string, SmartQuoteInfo>([
      ['“', { standard: '"', name: 'LEFT_DOUBLE_QUOTE' }],
      ['”', { standard: '"', name: 'RIGHT_DOUBLE_QUOTE' }],
      ['‘', { standard: "'", name: 'LEFT_SINGLE_QUOTE' }],
      ['’', { standard: "'", name: 'RIGHT_SINGLE_QUOTE' }],
      ['„', { standard: '"', name: 'DOUBLE_LOW_9_QUOTE' }],
      ['‚', { standard: "'", name: 'SINGLE_LOW_9_QUOTE' }],
    ]);
  }
  async analyze(content: string, filePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    // Normalize CRLF and bare CR to LF before analysis
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    let position = 0;
    let consecutiveNewlines = 0;
    let lastNewlinePosition = -1;

    const lineIndents: LineIndent[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;
      const lineStartPosition = position;

      // Trailing spaces
      if (line.length > 0 && line[line.length - 1] === ' ') {
        issues.push({
          type: 'TRAILING_SPACE',
          severity: 'WARNING',
          file: filePath,
          position: position + line.length - 1,
          line: lineNumber,
          char: ' ',
          message: `Trailing space detected at end of line ${lineNumber}`,
          fix: 'Remove trailing whitespace',
        });
      }

      // Analyze indentation
      let indentChars = '';
      for (let i = 0; i < line.length; i++) {
        if (line[i] === ' ' || line[i] === '\t') {
          indentChars += line[i];
        } else {
          break;
        }
      }
      if (indentChars.length > 0) {
        lineIndents.push({ line: lineNumber, indent: indentChars, position: lineStartPosition });
      }

      // Character-by-character analysis
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        const charPosition = position + charIndex;

        // Invisible characters
        const charInfo = this.invisibleChars.get(char);
        if (charInfo) {
          issues.push({
            type: 'INVISIBLE_CHAR',
            severity: 'DANGER',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char,
            message: `Invisible character ${charInfo.name} (U+${charInfo.code.toString(16).toUpperCase().padStart(4, '0')}) detected`,
            fix: 'Remove invisible character',
          });
        }

        // Homoglyphs
        const homoglyph = this.homoglyphs.get(char);
        if (homoglyph) {
          issues.push({
            type: 'HOMOGLYPH',
            severity: 'APOCALYPSE',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char,
            expected: homoglyph.latin,
            message: `${homoglyph.name} looks like '${homoglyph.latin}' but is actually Cyrillic`,
            fix: `Replace with Latin '${homoglyph.latin}'`,
          });
        }
        // Smart quotes
        const quoteInfo = this.smartQuotes.get(char);
        if (quoteInfo) {
          issues.push({
            type: 'SMART_QUOTE',
            severity: 'WARNING',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char,
            expected: quoteInfo.standard,
            message: `Smart quote ${quoteInfo.name} detected`,
            fix: `Replace with standard quote '${quoteInfo.standard}'`,
          });
        }

        // Greek semicolon
        if (char === this.greekSemicolon) {
          issues.push({
            type: 'GREEK_SEMICOLON',
            severity: 'APOCALYPSE',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char,
            expected: ';',
            message: 'Greek question mark (looks like semicolon) detected',
            fix: 'Replace with standard semicolon',
          });
        }
      }

      // Move position to next line (add 1 for newline character)
      position += line.length + 1;
      // Track consecutive newlines
      if (line.length === 0) {
        consecutiveNewlines++;
        if (consecutiveNewlines === 1) {
          lastNewlinePosition = lineStartPosition;
        }
      } else {
        if (consecutiveNewlines >= 4) {
          issues.push({
            type: 'EXCESSIVE_NEWLINES',
            severity: 'WARNING',
            file: filePath,
            position: lastNewlinePosition,
            line: lineNumber - consecutiveNewlines,
            message: `${consecutiveNewlines} consecutive empty lines detected`,
            fix: 'Reduce to maximum 2 empty lines',
          });
        }
        consecutiveNewlines = 0;
      }
    }

    // Check for excessive newlines at end of file
    if (consecutiveNewlines >= 4) {
      issues.push({
        type: 'EXCESSIVE_NEWLINES',
        severity: 'WARNING',
        file: filePath,
        position: lastNewlinePosition,
        line: lines.length - consecutiveNewlines + 1,
        message: `${consecutiveNewlines} consecutive empty lines at end of file`,
        fix: 'Remove trailing empty lines',
      });
    }
    // Analyze mixed tabs and spaces
    const hasTabIndent = lineIndents.some(li => li.indent.includes('\t'));
    const hasSpaceIndent = lineIndents.some(li => li.indent.includes(' '));

    if (hasTabIndent && hasSpaceIndent) {
      for (const lineIndent of lineIndents) {
        const hasBoth = lineIndent.indent.includes('\t') && lineIndent.indent.includes(' ');
        if (hasBoth) {
          issues.push({
            type: 'MIXED_INDENT',
            severity: 'DANGER',
            file: filePath,
            position: lineIndent.position,
            line: lineIndent.line,
            message: `Mixed tabs and spaces in indentation on line ${lineIndent.line}`,
            fix: 'Use consistent indentation (either tabs or spaces, not both)',
          });
        }
      }

      if (!issues.some(i => i.type === 'MIXED_INDENT')) {
        issues.push({
          type: 'MIXED_INDENT',
          severity: 'WARNING',
          file: filePath,
          position: 0,
          line: 1,
          message: 'File uses both tabs and spaces for indentation (inconsistent across lines)',
          fix: 'Choose either tabs or spaces for the entire file',
        });
      }
    }

    return issues;
  }
}