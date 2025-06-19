/**
 * Purpose: Audits 3rd-party dependencies for CVEs and license compliance
 * Dependencies: Node.js std lib (fs, path)
 * API: SauronDependencyAuditor().audit(path) → { vulnerabilities, licenseViolations, summary }
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';

export class SauronDependencyAuditor {
  /**
   * Creates a new dependency auditor instance
   * @param {Object} config - Configuration options
   * @param {Array} config.allowlist - Packages to skip (strings or RegExp patterns)
   *   - String exact match: 'lodash'
   *   - String prefix match: '@company/' (matches all @company/* packages)
   *   - RegExp pattern: /^@internal\// (matches via regex test)
   * @param {Object} config.licenseRules - License compliance rules
   *   - forbidden: Array of forbidden license identifiers
   *   - allowed: Array of allowed licenses (empty = all non-forbidden allowed)
   *   - requireLicense: Boolean, whether to flag packages without licenses
   */
  constructor(config = {}) {
    this.allowlist = config.allowlist || [];
    this.licenseRules = config.licenseRules || this.getDefaultLicenseRules();
    this.knownCVEs = this.loadKnownCVEs();
  }

  /**
   * Audits dependencies from package-lock.json
   * @param {string} packageLockPath - Path to package-lock.json
   * @returns {Promise<object>} Audit results with vulnerabilities and license violations
   */
  async audit(packageLockPath) {
    try {
      const packageLock = this.loadPackageLock(packageLockPath);
      const dependencies = this.extractDependencies(packageLock);
      
      const vulnerabilities = [];
      const licenseViolations = [];
      
      for (const [packageName, packageInfo] of Object.entries(dependencies)) {
        // Skip allowlisted packages
        if (this.isAllowlisted(packageName)) {
          continue;
        }
        
        // Check for vulnerabilities
        const vulns = this.checkVulnerabilities(packageName, packageInfo);
        vulnerabilities.push(...vulns);
        
        // Check license compliance
        const violations = this.checkLicenseCompliance(packageName, packageInfo);
        licenseViolations.push(...violations);
      }
      
      const summary = this.generateSummary(vulnerabilities, licenseViolations, dependencies);
      
      return {
        vulnerabilities,
        licenseViolations,
        summary
      };
    } catch (error) {
      throw new Error(`Dependency audit failed: ${error.message}`);
    }
  }

  /**
   * Loads and parses package-lock.json
   */
  loadPackageLock(packageLockPath) {
    try {
      const content = readFileSync(resolve(packageLockPath), 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load package-lock.json: ${error.message}`);
    }
  }

  /**
   * Extracts all dependencies from package-lock structure
   */
  extractDependencies(packageLock) {
    const dependencies = {};
    
    // Handle lockfileVersion 2+ format
    if (packageLock.packages) {
      for (const [path, info] of Object.entries(packageLock.packages)) {
        if (path === '') continue; // Skip root package
        
        const packageName = this.extractPackageName(path);
        if (packageName) {
          dependencies[packageName] = {
            version: info.version,
            resolved: info.resolved,
            integrity: info.integrity,
            license: info.license,
            dev: info.dev || false,
            optional: info.optional || false
          };
        }
      }
    }
    
    // Handle lockfileVersion 1 format
    if (packageLock.dependencies) {
      this.extractV1Dependencies(packageLock.dependencies, dependencies);
    }
    
    return dependencies;
  }

  /**
   * Extracts package name from node_modules path
   */
  extractPackageName(path) {
    const match = path.match(/^node_modules\/(.+)$/);
    if (match) {
      const parts = match[1].split('/node_modules/');
      return parts[parts.length - 1];
    }
    return null;
  }

  /**
   * Recursively extracts dependencies from v1 format
   */
  extractV1Dependencies(deps, result, isDev = false) {
    for (const [name, info] of Object.entries(deps)) {
      result[name] = {
        version: info.version,
        resolved: info.resolved,
        integrity: info.integrity,
        license: info.license,
        dev: info.dev || isDev,
        optional: info.optional || false
      };
      
      if (info.dependencies) {
        this.extractV1Dependencies(info.dependencies, result, isDev);
      }
    }
  }

  /**
   * Checks if package is in allowlist
   * 
   * Matching behavior:
   * - Exact match: 'lodash' matches 'lodash'
   * - Prefix match: 'foo/' matches 'foo/bar', 'foo/baz', etc.
   * - Scoped packages: '@company/*' matches all @company scoped packages
   * - RegExp: /^@trusted-org\// matches packages starting with @trusted-org/
   * 
   * Examples:
   * - allowlist: ['lodash'] - matches only 'lodash'
   * - allowlist: ['@company/'] - matches '@company/package1', '@company/package2'
   * - allowlist: [/^@internal\//] - matches all packages starting with '@internal/'
   * 
   * @param {string} packageName - The package name to check
   * @returns {boolean} True if package is allowlisted
   */
  isAllowlisted(packageName) {
    return this.allowlist.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(packageName);
      }
      // String patterns support exact match or prefix match with trailing slash
      return packageName === pattern || packageName.startsWith(`${pattern}/`);
    });
  }

  /**
   * Checks for known vulnerabilities
   */
  checkVulnerabilities(packageName, packageInfo) {
    const vulnerabilities = [];
    const packageKey = `${packageName}@${packageInfo.version}`;
    
    // Check against known CVEs
    for (const cve of this.knownCVEs) {
      if (this.matchesVulnerability(packageName, packageInfo.version, cve)) {
        vulnerabilities.push({
          type: 'vulnerability',
          severity: cve.severity,
          package: packageName,
          version: packageInfo.version,
          cve: cve.id,
          description: cve.description,
          fixedIn: cve.fixedIn,
          filePath: `node_modules/${packageName}`,
          line: 1,
          column: 1,
          recommendation: `Upgrade to version ${cve.fixedIn || 'latest'} or higher`
        });
      }
    }
    
    return vulnerabilities;
  }

  /**
   * Matches package against vulnerability criteria
   * NOTE: This uses simplified version range checking.
   * For production, use 'semver' package for proper range evaluation:
   * - semver.satisfies(version, range)
   * - semver.lt(), semver.lte(), semver.gt(), etc.
   */
  matchesVulnerability(packageName, version, cve) {
    if (cve.package !== packageName) return false;
    
    // Simple version comparison (should use semver in production)
    const affected = cve.affectedVersions;
    if (affected.includes('*')) return true;
    if (affected.includes(version)) return true;
    
    // Check version ranges (simplified)
    // TODO: Replace with semver.satisfies() for proper range handling
    for (const range of affected) {
      if (range.startsWith('<')) {
        const targetVersion = range.substring(1);
        if (this.compareVersions(version, targetVersion) < 0) return true;
      }
      if (range.startsWith('<=')) {
        const targetVersion = range.substring(2);
        if (this.compareVersions(version, targetVersion) <= 0) return true;
      }
    }
    
    return false;
  }

  /**
   * Simple version comparison (returns -1, 0, or 1)
   * NOTE: This is a basic implementation. For production use,
   * consider using the 'semver' package for robust version handling
   * including pre-release versions, build metadata, etc.
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    
    return 0;
  }

  /**
   * Checks license compliance
   */
  checkLicenseCompliance(packageName, packageInfo) {
    const violations = [];
    const license = packageInfo.license || 'UNLICENSED';
    
    // Check against license rules
    if (this.licenseRules.forbidden && this.licenseRules.forbidden.includes(license)) {
      violations.push({
        type: 'license-violation',
        severity: 'high',
        package: packageName,
        version: packageInfo.version,
        license: license,
        rule: 'forbidden',
        filePath: `node_modules/${packageName}`,
        line: 1,
        column: 1,
        description: `License "${license}" is forbidden by policy`,
        recommendation: 'Replace with package using approved license'
      });
    }
    
    // Check for missing licenses
    if (license === 'UNLICENSED' && this.licenseRules.requireLicense) {
      violations.push({
        type: 'license-violation',
        severity: 'medium',
        package: packageName,
        version: packageInfo.version,
        license: license,
        rule: 'missing',
        filePath: `node_modules/${packageName}`,
        line: 1,
        column: 1,
        description: 'Package has no declared license',
        recommendation: 'Verify license terms before using'
      });
    }
    
    // Check against allowed list
    if (this.licenseRules.allowed && 
        this.licenseRules.allowed.length > 0 && 
        !this.licenseRules.allowed.includes(license)) {
      violations.push({
        type: 'license-violation',
        severity: 'medium',
        package: packageName,
        version: packageInfo.version,
        license: license,
        rule: 'not-allowed',
        filePath: `node_modules/${packageName}`,
        line: 1,
        column: 1,
        description: `License "${license}" is not in allowed list`,
        recommendation: 'Use packages with approved licenses only'
      });
    }
    
    return violations;
  }

  /**
   * Generates audit summary
   */
  generateSummary(vulnerabilities, licenseViolations, dependencies) {
    const totalPackages = Object.keys(dependencies).length;
    const devDependencies = Object.values(dependencies).filter(d => d.dev).length;
    const prodDependencies = totalPackages - devDependencies;
    
    const vulnBySeverity = this.groupBySeverity(vulnerabilities);
    const licenseBySeverity = this.groupBySeverity(licenseViolations);
    
    return {
      totalPackages,
      prodDependencies,
      devDependencies,
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: vulnBySeverity.critical || 0,
        high: vulnBySeverity.high || 0,
        medium: vulnBySeverity.medium || 0,
        low: vulnBySeverity.low || 0
      },
      licenseViolations: {
        total: licenseViolations.length,
        high: licenseBySeverity.high || 0,
        medium: licenseBySeverity.medium || 0,
        low: licenseBySeverity.low || 0
      },
      allowlistedPackages: this.allowlist.length
    };
  }

  /**
   * Groups issues by severity
   */
  groupBySeverity(issues) {
    return issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Gets default license rules
   */
  getDefaultLicenseRules() {
    return {
      forbidden: ['GPL', 'GPL-2.0', 'GPL-3.0', 'AGPL-3.0'],
      allowed: [], // Empty means all non-forbidden are allowed
      requireLicense: true
    };
  }

  /**
   * Loads known CVEs database
   * 
   * IMPORTANT: This currently returns hardcoded demo CVE data for development.
   * In production, this should:
   * - Load from a local JSON file: JSON.parse(readFileSync('./cve-database.json'))
   * - Fetch from a CVE API service (NVD, Snyk, npm audit, etc.)
   * - Connect to an internal vulnerability database
   * - Use npm audit API or similar service
   * 
   * @returns {Array} Array of CVE objects for demonstration
   */
  loadKnownCVEs() {
    // TODO: Replace with actual CVE data source in production
    // Example: return JSON.parse(readFileSync('./cve-database.json', 'utf8'));
    // Example: return await fetch('https://api.nvd.nist.gov/...').then(r => r.json());
    
    // DEMO DATA - Replace in production
    return [
      {
        id: 'CVE-2021-23337',
        package: 'lodash',
        affectedVersions: ['<4.17.21'],
        fixedIn: '4.17.21',
        severity: 'high',
        description: 'Command injection vulnerability'
      },
      {
        id: 'CVE-2020-8203',
        package: 'lodash',
        affectedVersions: ['<4.17.19'],
        fixedIn: '4.17.19',
        severity: 'high',
        description: 'Prototype pollution vulnerability'
      },
      {
        id: 'CVE-2021-44906',
        package: 'minimist',
        affectedVersions: ['<1.2.6'],
        fixedIn: '1.2.6',
        severity: 'critical',
        description: 'Prototype pollution vulnerability'
      },
      {
        id: 'CVE-2022-46175',
        package: 'json5',
        affectedVersions: ['<2.2.2'],
        fixedIn: '2.2.2',
        severity: 'high',
        description: 'Prototype pollution vulnerability'
      }
    ];
  }
}

export default SauronDependencyAuditor;