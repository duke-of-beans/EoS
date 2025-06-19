/**
 * Purpose: Character-level forensics scanner for Eye of Sauron
 * Dependencies: Node.js standard lib only
 * Public API: CharacterForensics(config).analyze(content, filePath)
 * 
 * Detects: invisible chars, homoglyphs, smart quotes, Greek semicolons,
 * tabs vs spaces, trailing spaces, excessive newlines
 */

export class CharacterForensics {
  constructor(config = {}) {
    this.config = config;
    
    // Precompiled patterns and maps
    this.invisibleChars = new Map([
      ['\u200B', { name: 'ZERO_WIDTH_SPACE', code: 8203 }],
      ['\u200C', { name: 'ZERO_WIDTH_NON_JOINER', code: 8204 }],
      ['\u200D', { name: 'ZERO_WIDTH_JOINER', code: 8205 }],
      ['\uFEFF', { name: 'ZERO_WIDTH_NO_BREAK_SPACE', code: 65279 }]
    ]);
    
    this.homoglyphs = new Map([
      ['а', { latin: 'a', name: 'CYRILLIC_A' }],  // U+0430
      ['е', { latin: 'e', name: 'CYRILLIC_E' }],  // U+0435
      ['о', { latin: 'o', name: 'CYRILLIC_O' }],  // U+043E
      ['р', { latin: 'p', name: 'CYRILLIC_P' }],  // U+0440
      ['с', { latin: 'c', name: 'CYRILLIC_C' }],  // U+0441
      ['х', { latin: 'x', name: 'CYRILLIC_X' }]   // U+0445
    ]);
    
    this.smartQuotes = new Map([
      ['\u201C', { standard: '"', name: 'LEFT_DOUBLE_QUOTE' }],   // " U+201C
      ['\u201D', { standard: '"', name: 'RIGHT_DOUBLE_QUOTE' }],  // " U+201D
      ['\u2018', { standard: "'", name: 'LEFT_SINGLE_QUOTE' }],   // ' U+2018
      ['\u2019', { standard: "'", name: 'RIGHT_SINGLE_QUOTE' }],  // ' U+2019
      ['\u201E', { standard: '"', name: 'DOUBLE_LOW_9_QUOTE' }],  // „ U+201E
      ['\u201A', { standard: "'", name: 'SINGLE_LOW_9_QUOTE' }]   // ‚ U+201A
    ]);
    
    this.greekSemicolon = '\u037E';
    this.tab = '\t';
    this.space = ' ';
  }
  
  async analyze(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    let position = 0;
    let consecutiveNewlines = 0;
    let lastNewlinePosition = -1;
    
    // Track indentation per line for mixed tabs/spaces detection
    const lineIndents = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;
      const lineStartPosition = position;
      
      // Check for trailing spaces
      if (line.length > 0 && line[line.length - 1] === ' ') {
        issues.push({
          type: 'TRAILING_SPACE',
          severity: 'WARNING',
          file: filePath,
          position: position + line.length - 1,
          line: lineNumber,
          char: ' ',
          message: `Trailing space detected at end of line ${lineNumber}`,
          fix: 'Remove trailing whitespace'
        });
      }
      
      // Analyze indentation
      let indentChars = '';
      let indentEnd = 0;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === ' ' || line[i] === '\t') {
          indentChars += line[i];
          indentEnd = i + 1;
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
        
        // Check for invisible characters
        if (this.invisibleChars.has(char)) {
          const charInfo = this.invisibleChars.get(char);
          issues.push({
            type: 'INVISIBLE_CHAR',
            severity: 'DANGER',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char: char,
            message: `Invisible character ${charInfo.name} (U+${charInfo.code.toString(16).toUpperCase().padStart(4, '0')}) detected`,
            fix: 'Remove invisible character'
          });
        }
        
        // Check for homoglyphs
        if (this.homoglyphs.has(char)) {
          const homoglyph = this.homoglyphs.get(char);
          issues.push({
            type: 'HOMOGLYPH',
            severity: 'APOCALYPSE',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char: char,
            expected: homoglyph.latin,
            message: `${homoglyph.name} looks like '${homoglyph.latin}' but is actually Cyrillic`,
            fix: `Replace with Latin '${homoglyph.latin}'`
          });
        }
        
        // Check for smart quotes
        if (this.smartQuotes.has(char)) {
          const quoteInfo = this.smartQuotes.get(char);
          issues.push({
            type: 'SMART_QUOTE',
            severity: 'WARNING',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char: char,
            expected: quoteInfo.standard,
            message: `Smart quote ${quoteInfo.name} detected`,
            fix: `Replace with standard quote '${quoteInfo.standard}'`
          });
        }
        
        // Check for Greek semicolon
        if (char === this.greekSemicolon) {
          issues.push({
            type: 'GREEK_SEMICOLON',
            severity: 'APOCALYPSE',
            file: filePath,
            position: charPosition,
            line: lineNumber,
            char: char,
            expected: ';',
            message: 'Greek question mark (looks like semicolon) detected',
            fix: 'Replace with standard semicolon'
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
            fix: 'Reduce to maximum 2 empty lines'
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
        fix: 'Remove trailing empty lines'
      });
    }
    
    // Analyze mixed tabs and spaces
    const hasTabIndent = lineIndents.some(li => li.indent.includes('\t'));
    const hasSpaceIndent = lineIndents.some(li => li.indent.includes(' '));
    
    if (hasTabIndent && hasSpaceIndent) {
      // Find lines with mixed indentation
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
            fix: 'Use consistent indentation (either tabs or spaces, not both)'
          });
        }
      }
      
      // General warning about file-level inconsistency
      if (!issues.some(i => i.type === 'MIXED_INDENT')) {
        issues.push({
          type: 'MIXED_INDENT',
          severity: 'WARNING',
          file: filePath,
          position: 0,
          line: 1,
          message: 'File uses both tabs and spaces for indentation (inconsistent across lines)',
          fix: 'Choose either tabs or spaces for the entire file'
        });
      }
    }
    
    return issues;
  }
}

/**
 * Notes for integration:
 * - Designed to be called by EyeOfSauronOmniscient.js
 * - Returns issue array to be merged into vision.files[file].issues
 * - No side effects — pure function
 */