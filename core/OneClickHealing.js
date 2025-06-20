/**
 * Purpose: Applies safe auto-fixes to code content
 * Dependencies: Node.js std lib
 * API: OneClickHealing().applyFixes(content)
 */

export class OneClickHealing {
  constructor() {
    // Initialize fix patterns
    this.invisibleChars = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]/g;

    // Smart quotes map with proper Unicode characters
    this.smartQuotes = new Map([
      ['\u201C', '"'],  // " Left double quotation mark (U+201C)
      ['\u201D', '"'],  // " Right double quotation mark (U+201D)
      ['\u2018', "'"],  // ' Left single quotation mark (U+2018)
      ['\u2019', "'"],  // ' Right single quotation mark (U+2019)
      ['\u201E', '"'],  // „ Double low-9 quotation mark (U+201E)
      ['\u201A', "'"],  // ‚ Single low-9 quotation mark (U+201A)
      ['\u00AB', '"'],  // « Left-pointing double angle quotation mark (U+00AB)
      ['\u00BB', '"'],  // » Right-pointing double angle quotation mark (U+00BB)
      ['\u2039', "'"],  // ‹ Single left-pointing angle quotation mark (U+2039)
      ['\u203A', "'"]   // › Single right-pointing angle quotation mark (U+203A)
    ]);

    // Pre-compile smart quote regex with escaped characters
    const smartQuoteChars = Array.from(this.smartQuotes.keys())
      .map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\    // Initialize fix patterns
    this.invisibleChars = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]/g;
    this.smartQuotes = {
      '"': '"',  // Left double quotation mark
      '"': '"',  // Right double quotation mark
      ''': "'",  // Left single quotation mark
      ''': "'",  // Right single quotation mark
      '„': '"',  // Double low-9 quotation mark
      '‚': "'",  // Single low-9 quotation mark
      '«': '"',  // Left-pointing double angle quotation mark
      '»': '"',  // Right-pointing double angle quotation mark
      '‹': "'",  // Single left-pointing angle quotation mark
      '›': "'"   // Single right-pointing angle quotation mark
    };
    this.trailingSpaces = /[ \t]+$/gm;
    this.doubleSemicolons = /;;+/g;')) // Escape regex metacharacters
      .join('|');
    this.smartQuoteRegex = new RegExp(`(${smartQuoteChars})`, 'g');

    this.trailingSpaces = /[ \t]+$/gm;
    this.doubleSemicolons = /;;+/g;
  }

  /**
   * Apply all safe fixes to the content
   * @param {string} content - The code content to fix
   * @returns {{ fixedContent: string, appliedFixes: Array<{type: string, count: number}> }}
   */
  applyFixes(content) {
    if (typeof content !== 'string') {
      throw new TypeError('Content must be a string');
    }

    let fixedContent = content;
    const appliedFixes = [];

    // 1. Remove invisible characters
    const invisibleMatches = fixedContent.match(this.invisibleChars);
    if (invisibleMatches) {
      fixedContent = fixedContent.replace(this.invisibleChars, '');
      appliedFixes.push({
        type: 'invisible_characters',
        count: invisibleMatches.length
      });
    }

    // 2. Replace smart quotes with standard quotes
    let smartQuoteCount = 0;
    fixedContent = fixedContent.replace(this.smartQuoteRegex, (match) => {
      smartQuoteCount++;
      return this.smartQuotes.get(match);
    });
    if (smartQuoteCount > 0) {
      appliedFixes.push({
        type: 'smart_quotes',
        count: smartQuoteCount
      });
    }

    // 3. Remove trailing spaces
    const trailingMatches = fixedContent.match(this.trailingSpaces);
    if (trailingMatches) {
      fixedContent = fixedContent.replace(this.trailingSpaces, '');
      appliedFixes.push({
        type: 'trailing_spaces',
        count: trailingMatches.length
      });
    }

    // 4. Fix double semicolons to single
    const doubleSemicolonMatches = fixedContent.match(this.doubleSemicolons);
    if (doubleSemicolonMatches) {
      fixedContent = fixedContent.replace(this.doubleSemicolons, ';');
      appliedFixes.push({
        type: 'double_semicolons',
        count: doubleSemicolonMatches.length
      });
    }

    return {
      fixedContent,
      appliedFixes
    };
  }
}

// Export as default for convenience
export default OneClickHealing;