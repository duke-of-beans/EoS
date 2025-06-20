/**
 * SauronThreatModeler.js - Builds threat model summaries from scan and dependency data
 *
 * Purpose: Aggregates scan results and dependency audits into actionable threat models
 * Dependencies: Node.js standard library only
 * Public API: SauronThreatModeler().model(scanReport, dependencyAudit)
 *
 * @module SauronThreatModeler
 */

class SauronThreatModeler {
  constructor(config = {}) {
    this.config = {
      includeDiagramData: config.includeDiagramData !== false, // default true
      maxThreats: config.maxThreats || 100
    };

    // Threat type references
    this.threatReferences = {
      injection: 'https://owasp.org/www-project-top-ten/2021/A03_2021-Injection/',
      misconfiguration: 'https://owasp.org/www-project-top-ten/2021/A05_2021-Security_Misconfiguration/',
      vulnerable_dependency: 'https://owasp.org/www-project-top-ten/2021/A06_2021-Vulnerable_and_Outdated_Components/',
      broken_access_control: 'https://owasp.org/www-project-top-ten/2021/A01_2021-Broken_Access_Control/',
      crypto_failure: 'https://owasp.org/www-project-top-ten/2021/A02_2021-Cryptographic_Failures/',
      data_exposure: 'https://owasp.org/www-project-top-ten/2021/A01_2021-Broken_Access_Control/',
      xss: 'https://owasp.org/www-project-top-ten/2021/A03_2021-Injection/',
      deserialization: 'https://owasp.org/www-project-top-ten/2021/A08_2021-Software_and_Data_Integrity_Failures/',
      insufficient_logging: 'https://owasp.org/www-project-top-ten/2021/A09_2021-Security_Logging_and_Monitoring_Failures/',
      ssrf: 'https://owasp.org/www-project-top-ten/2021/A10_2021-Server-Side_Request_Forgery/'
    };
  }

  /**
   * Build threat model from scan report and dependency audit
   * @param {Object} scanReport - Scan report from EyeOfSauronOmniscient
   * @param {Object} dependencyAudit - Dependency audit data
   * @returns {Object} Threat model with summary, threats, and optional diagram data
   */
  model(scanReport, dependencyAudit) {
    // Handle empty/bad input gracefully
    if (!scanReport || typeof scanReport !== 'object') {
      scanReport = { files: {} };
    }
    if (!dependencyAudit || typeof dependencyAudit !== 'object') {
      dependencyAudit = { vulnerabilities: [] };
    }

    // Extract threats from scan report
    const scanThreats = this._extractScanThreats(scanReport);

    // Extract threats from dependency audit
    const depThreats = this._extractDependencyThreats(dependencyAudit);

    // Combine and deduplicate threats
    const allThreats = [...scanThreats, ...depThreats];

    // Sort by severity and limit
    const sortedThreats = this._sortAndLimitThreats(allThreats);

    // Build summary
    const summary = this._buildSummary(sortedThreats, scanReport, dependencyAudit);

    // Build response
    const response = {
      summary,
      threats: sortedThreats
    };

    // Add diagram data if enabled
    if (this.config.includeDiagramData) {
      response.diagramData = this._buildDiagramData(sortedThreats, scanReport);
    }

    return response;
  }

  _extractScanThreats(scanReport) {
    const threats = [];
    const files = scanReport.files || {};

    Object.entries(files).forEach(([filePath, fileData]) => {
      const issues = fileData.issues || [];

      issues.forEach(issue => {
        const threatType = this._mapIssueToThreatType(issue);
        const severity = this._normalizeSeverity(issue.severity);

        threats.push({
          type: threatType,
          severity,
          files: [filePath],
          dependencies: [],
          reference: this.threatReferences[threatType] || 'https://owasp.org/www-project-top-ten/',
          source: 'scan',
          details: issue.message || issue.type || 'Security issue detected'
        });
      });
    });

    return threats;
  }

  _extractDependencyThreats(dependencyAudit) {
    const threats = [];
    const vulnerabilities = dependencyAudit.vulnerabilities || [];

    vulnerabilities.forEach(vuln => {
      const severity = this._normalizeSeverity(vuln.severity);

      threats.push({
        type: 'vulnerable_dependency',
        severity,
        files: vuln.paths || [],
        dependencies: [vuln.module || vuln.name || 'unknown'],
        reference: vuln.url || this.threatReferences.vulnerable_dependency,
        source: 'dependency',
        details: vuln.overview || vuln.title || 'Vulnerable dependency detected'
      });
    });

    return threats;
  }

  _mapIssueToThreatType(issue) {
    const typeMapping = {
      'sql-injection': 'injection',
      'command-injection': 'injection',
      'xss': 'xss',
      'hardcoded-secret': 'crypto_failure',
      'weak-crypto': 'crypto_failure',
      'path-traversal': 'broken_access_control',
      'open-redirect': 'broken_access_control',
      'insecure-random': 'crypto_failure',
      'eval-usage': 'injection',
      'unsafe-regex': 'injection',
      'ssrf': 'ssrf',
      'xxe': 'injection',
      'missing-auth': 'broken_access_control',
      'sensitive-data': 'data_exposure',
      'debug-enabled': 'misconfiguration',
      'default-config': 'misconfiguration'
    };

    const issueType = (issue.type || '').toLowerCase();
    for (const [pattern, threatType] of Object.entries(typeMapping)) {
      if (issueType.includes(pattern)) {
        return threatType;
      }
    }

    // Default mapping based on severity
    if (issue.severity === 'critical' || issue.severity === 'high') {
      return 'misconfiguration';
    }

    return 'misconfiguration';
  }

  _normalizeSeverity(severity) {
    const severityMap = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
      'info': 0
    };

    const normalized = (severity || '').toLowerCase();
    return severityMap[normalized] !== undefined ? severityMap[normalized] : 2;
  }

  _sortAndLimitThreats(threats) {
    // Deduplicate by creating composite key
    const threatMap = new Map();

    threats.forEach(threat => {
      const key = `${threat.type}-${threat.severity}-${threat.details}`;

      if (threatMap.has(key)) {
        // Merge files and dependencies
        const existing = threatMap.get(key);
        existing.files = [...new Set([...existing.files, ...threat.files])];
        existing.dependencies = [...new Set([...existing.dependencies, ...threat.dependencies])];
      } else {
        threatMap.set(key, { ...threat });
      }
    });

    // Convert back to array and sort
    const uniqueThreats = Array.from(threatMap.values());

    // Sort by severity (descending), then by type
    uniqueThreats.sort((a, b) => {
      if (b.severity !== a.severity) {
        return b.severity - a.severity;
      }
      return a.type.localeCompare(b.type);
    });

    // Limit to maxThreats
    return uniqueThreats.slice(0, this.config.maxThreats);
  }

  _buildSummary(threats, scanReport, dependencyAudit) {
    // Count threats by type
    const threatCounts = {};
    threats.forEach(threat => {
      threatCounts[threat.type] = (threatCounts[threat.type] || 0) + 1;
    });

    // Get top threat types
    const topThreats = Object.entries(threatCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Determine risk zones
    const zones = this._identifyRiskZones(threats, scanReport);

    // Calculate severity distribution
    const severityDist = {
      critical: threats.filter(t => t.severity === 4).length,
      high: threats.filter(t => t.severity === 3).length,
      medium: threats.filter(t => t.severity === 2).length,
      low: threats.filter(t => t.severity === 1).length,
      info: threats.filter(t => t.severity === 0).length
    };

    return {
      totalThreats: threats.length,
      topThreats,
      zones,
      severityDistribution: severityDist,
      sources: {
        scan: threats.filter(t => t.source === 'scan').length,
        dependency: threats.filter(t => t.source === 'dependency').length
      }
    };
  }

  _identifyRiskZones(threats, scanReport) {
    const zones = [];

    // Third-party zone
    const thirdPartyThreats = threats.filter(t =>
      t.source === 'dependency' ||
      t.dependencies.length > 0 ||
      t.files.some(f => f.includes('node_modules') || f.includes('vendor'))
    );

    if (thirdPartyThreats.length > 0) {
      zones.push({
        name: 'Third-Party Dependencies',
        threatCount: thirdPartyThreats.length,
        severity: Math.max(...thirdPartyThreats.map(t => t.severity)),
        description: 'External libraries and dependencies'
      });
    }

    // Internal code zone
    const internalThreats = threats.filter(t =>
      t.source === 'scan' &&
      t.dependencies.length === 0 &&
      !t.files.some(f => f.includes('node_modules') || f.includes('vendor'))
    );

    if (internalThreats.length > 0) {
      zones.push({
        name: 'Internal Code',
        threatCount: internalThreats.length,
        severity: Math.max(...internalThreats.map(t => t.severity)),
        description: 'Application source code'
      });
    }

    // Configuration zone
    const configThreats = threats.filter(t =>
      t.type === 'misconfiguration' ||
      t.files.some(f => f.includes('config') || f.includes('.env'))
    );

    if (configThreats.length > 0) {
      zones.push({
        name: 'Configuration',
        threatCount: configThreats.length,
        severity: Math.max(...configThreats.map(t => t.severity)),
        description: 'Configuration files and settings'
      });
    }

    // API/External zone
    const apiThreats = threats.filter(t =>
      t.type === 'ssrf' ||
      t.type === 'broken_access_control' ||
      t.files.some(f => f.includes('api') || f.includes('route'))
    );

    if (apiThreats.length > 0) {
      zones.push({
        name: 'API/External Interfaces',
        threatCount: apiThreats.length,
        severity: Math.max(...apiThreats.map(t => t.severity)),
        description: 'External-facing interfaces and APIs'
      });
    }

    // Sort zones by severity then count
    zones.sort((a, b) => {
      if (b.severity !== a.severity) {
        return b.severity - a.severity;
      }
      return b.threatCount - a.threatCount;
    });

    return zones;
  }

  _buildDiagramData(threats, scanReport) {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // Create zone nodes
    const zones = this._identifyRiskZones(threats, scanReport);
    zones.forEach((zone, index) => {
      const nodeId = `zone-${index}`;
      nodes.push({
        id: nodeId,
        label: zone.name,
        type: 'zone',
        severity: zone.severity,
        threatCount: zone.threatCount
      });
      nodeMap.set(zone.name, nodeId);
    });

    // Create threat type nodes
    const threatTypes = [...new Set(threats.map(t => t.type))];
    threatTypes.forEach(type => {
      const nodeId = `threat-${type}`;
      const typeThreats = threats.filter(t => t.type === type);
      const maxSeverity = Math.max(...typeThreats.map(t => t.severity));

      nodes.push({
        id: nodeId,
        label: type.replace(/_/g, ' ').toUpperCase(),
        type: 'threat',
        severity: maxSeverity,
        count: typeThreats.length
      });

      // Connect to zones
      const relevantZones = new Set();
      typeThreats.forEach(threat => {
        if (threat.source === 'dependency' || threat.dependencies.length > 0) {
          relevantZones.add('Third-Party Dependencies');
        }
        if (threat.source === 'scan' && threat.dependencies.length === 0) {
          relevantZones.add('Internal Code');
        }
        if (threat.type === 'misconfiguration') {
          relevantZones.add('Configuration');
        }
        if (threat.type === 'ssrf' || threat.type === 'broken_access_control') {
          relevantZones.add('API/External Interfaces');
        }
      });

      relevantZones.forEach(zoneName => {
        if (nodeMap.has(zoneName)) {
          edges.push({
            source: nodeMap.get(zoneName),
            target: nodeId,
            weight: typeThreats.length
          });
        }
      });
    });

    // Create file cluster nodes (top 10 most affected files)
    const fileCounts = {};
    threats.forEach(threat => {
      threat.files.forEach(file => {
        fileCounts[file] = (fileCounts[file] || 0) + 1;
      });
    });

    const topFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topFiles.forEach(([file, count], index) => {
      const nodeId = `file-${index}`;
      const fileName = file.split('/').pop() || file;

      nodes.push({
        id: nodeId,
        label: fileName,
        type: 'file',
        path: file,
        threatCount: count
      });
    });

    return {
      nodes,
      edges,
      metadata: {
        totalThreats: threats.length,
        totalFiles: Object.keys(fileCounts).length,
        generated: new Date().toISOString()
      }
    };
  }
}

module.exports = SauronThreatModeler;
export default SauronThreatModeler;

