/**
 * Purpose: Exports scan reports in multiple formats (JSON, CSV, XML)
 * Dependencies: Node.js standard library only
 * Public API:
 *   - new SauronScanExporter(config)
 *   - toJson(report) → string
 *   - toCsv(report) → string
 *   - toXml(report) → string
 *
 * Note: For very large reports, future versions could implement streaming
 * to reduce memory usage. Current implementation builds strings in memory.
 */

export default class SauronScanExporter {
  constructor(config = {}) {
    this.config = {
      prettyJson: config.prettyJson || false,
      csvHeaders: config.csvHeaders || ['file', 'type', 'severity', 'line', 'column', 'message'],
      logTagSanitization: config.logTagSanitization || false
    };
    this.sanitizedTags = new Set(); // Track sanitized XML tags
  }

  /**
   * Export report as JSON string
   * @param {Object} report - Scan report object
   * @returns {string} JSON formatted string
   */
  toJson(report) {
    if (!report || typeof report !== 'object') {
      return '{}';
    }

    try {
      if (this.config.prettyJson) {
        return JSON.stringify(report, null, 2);
      }
      return JSON.stringify(report);
    } catch (error) {
      // Handle circular references or other JSON errors
      return JSON.stringify({ error: 'Failed to serialize report' });
    }
  }

  /**
   * Export report as CSV string
   * @param {Object} report - Scan report object
   * @returns {string} CSV formatted string
   */
  toCsv(report) {
    if (!report || typeof report !== 'object') {
      return this.config.csvHeaders.join(',') + '\n';
    }

    const rows = [];
    rows.push(this.config.csvHeaders.map(h => this._escapeCsvField(h)).join(','));

    // Extract issues from vision.files structure
    if (report.vision?.files) {
      Object.entries(report.vision.files).forEach(([file, fileData]) => {
        if (fileData.issues && Array.isArray(fileData.issues)) {
          fileData.issues.forEach(issue => {
            const row = this._buildCsvRow(issue, file);
            rows.push(row);
          });
        }
      });
    }

    // Handle flat issues array if present
    if (report.issues && Array.isArray(report.issues)) {
      report.issues.forEach(issue => {
        const row = this._buildCsvRow(issue);
        rows.push(row);
      });
    }

    return rows.join('\n');
  }

  /**
   * Build CSV row based on configured headers
   * @private
   */
  _buildCsvRow(issue, file = null) {
    const rowData = this.config.csvHeaders.map(header => {
      let value = '';

      // Map header to issue property
      switch(header.toLowerCase()) {
        case 'file':
          value = file || issue.file || '';
          break;
        case 'type':
          value = issue.type || '';
          break;
        case 'severity':
          value = issue.severity || '';
          break;
        case 'line':
          value = issue.line || '';
          break;
        case 'column':
          value = issue.column || '';
          break;
        case 'message':
          value = issue.message || '';
          break;
        case 'rule':
          value = issue.rule || '';
          break;
        case 'evidence':
          value = issue.evidence || '';
          break;
        default:
          // Check if issue has this property
          value = issue[header] || '';
      }

      return this._escapeCsvField(value);
    });

    return rowData.join(',');
  }

  /**
   * Export report as XML string
   * @param {Object} report - Scan report object
   * @returns {string} XML formatted string
   */
  toXml(report) {
    if (!report || typeof report !== 'object') {
      return '<?xml version="1.0" encoding="UTF-8"?>\n<report>\n</report>';
    }

    const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xmlLines.push('<report>');

    // Add metadata if present
    if (report.metadata) {
      xmlLines.push('  <metadata>');
      Object.entries(report.metadata).forEach(([key, value]) => {
        xmlLines.push(`    <${this._escapeXmlTag(key)}>${this._escapeXml(String(value))}</${this._escapeXmlTag(key)}>`);
      });
      xmlLines.push('  </metadata>');
    }

    // Add summary if present
    if (report.summary) {
      xmlLines.push('  <summary>');
      Object.entries(report.summary).forEach(([key, value]) => {
        xmlLines.push(`    <${this._escapeXmlTag(key)}>${this._escapeXml(String(value))}</${this._escapeXmlTag(key)}>`);
      });
      xmlLines.push('  </summary>');
    }

    // Add issues
    xmlLines.push('  <issues>');

    // Extract from vision.files structure
    if (report.vision?.files) {
      Object.entries(report.vision.files).forEach(([file, fileData]) => {
        if (fileData.issues && Array.isArray(fileData.issues)) {
          fileData.issues.forEach(issue => {
            xmlLines.push(this._issueToXml(issue, file));
          });
        }
      });
    }

    // Handle flat issues array
    if (report.issues && Array.isArray(report.issues)) {
      report.issues.forEach(issue => {
        xmlLines.push(this._issueToXml(issue));
      });
    }

    xmlLines.push('  </issues>');
    xmlLines.push('</report>');

    return xmlLines.join('\n');
  }

  /**
   * Escape CSV field value
   * @private
   */
  _escapeCsvField(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // Check if field needs quoting
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      // Escape quotes by doubling them
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Escape XML content
   * @private
   */
  _escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape XML tag name
   * @private
   */
  _escapeXmlTag(str) {
    const original = str;
    // Replace invalid XML tag characters with underscores
    const sanitized = str.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Log sanitization if enabled and tag was changed
    if (this.config.logTagSanitization && original !== sanitized && !this.sanitizedTags.has(original)) {
      this.sanitizedTags.add(original);
      console.log(`[SauronScanExporter] XML tag sanitized: "${original}" → "${sanitized}"`);
    }

    return sanitized;
  }

  /**
   * Convert issue object to XML string
   * @private
   */
  _issueToXml(issue, file = null) {
    const lines = ['    <issue>'];

    if (file || issue.file) {
      lines.push(`      <file>${this._escapeXml(file || issue.file)}</file>`);
    }
    if (issue.type) {
      lines.push(`      <type>${this._escapeXml(issue.type)}</type>`);
    }
    if (issue.severity) {
      lines.push(`      <severity>${this._escapeXml(issue.severity)}</severity>`);
    }
    if (issue.line !== undefined) {
      lines.push(`      <line>${issue.line}</line>`);
    }
    if (issue.column !== undefined) {
      lines.push(`      <column>${issue.column}</column>`);
    }
    if (issue.message) {
      lines.push(`      <message>${this._escapeXml(issue.message)}</message>`);
    }
    if (issue.rule) {
      lines.push(`      <rule>${this._escapeXml(issue.rule)}</rule>`);
    }
    if (issue.evidence) {
      lines.push(`      <evidence>${this._escapeXml(issue.evidence)}</evidence>`);
    }

    lines.push('    </issue>');
    return lines.join('\n');
  }
}

/**
 * Update for /docs/EoS-manifest.md:
 *
 * ## SauronScanExporter.js
 * **Purpose:** Exports scan reports in multiple formats for external analysis
 * **Location:** eye-of-sauron/utils/SauronScanExporter.js
 * **API:**
 *   - `new SauronScanExporter(config)` - Create exporter instance
 *     - config.prettyJson: boolean (default false) - Pretty print JSON output
 *     - config.csvHeaders: string[] (default: ['file','type','severity','line','column','message']) - Custom CSV headers
 *     - config.logTagSanitization: boolean (default false) - Log when XML tags are sanitized
 *   - `toJson(report)` - Export as JSON string
 *   - `toCsv(report)` - Export as CSV with escaped fields and configurable headers
 *   - `toXml(report)` - Export as XML with safe encoding
 * **Features:**
 *   - Handles both flat and nested report structures
 *   - Configurable CSV headers for custom export formats
 *   - Optional logging when XML tags require sanitization
 *   - Escapes unsafe characters in all formats
 *   - Supports minimal and pretty JSON output
 *   - Generates valid CSV with RFC 4180 compliant quoting
 *   - Produces well-formed XML with proper entity encoding
 * **Future Enhancements:**
 *   - Streaming support for very large reports to reduce memory usage
 */