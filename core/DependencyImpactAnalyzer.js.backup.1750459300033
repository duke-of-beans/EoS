/**
 * Purpose: Maps file dependencies and predicts impact of changes
 * Dependencies: None (pure JS, cross-platform)
 * API: DependencyImpactAnalyzer().buildGraph(files).getImpactedFiles(file)
 * 
 * Note: Path resolution works with in-memory file contents, not filesystem.
 * Uses forward slashes for paths; normalize paths before passing if needed.
 */

export class DependencyImpactAnalyzer {
  constructor() {
    // Adjacency list representation of dependency graph
    this.graph = new Map(); // file -> Set of files that depend on it
    this.reverseGraph = new Map(); // file -> Set of files it depends on
    this.fileContents = new Map(); // file -> content
    this.circularDependencies = new Set(); // Track circular deps
    this.pathSeparator = '/'; // Configurable if needed
  }

  /**
   * Build dependency graph from file contents
   * @param {Record<string, string>} fileContents - Map of filepath to content
   */
  buildGraph(fileContents) {
    // Clear previous state
    this.graph.clear();
    this.reverseGraph.clear();
    this.fileContents.clear();
    this.circularDependencies.clear();

    // Store file contents
    for (const [filepath, content] of Object.entries(fileContents)) {
      this.fileContents.set(filepath, content);
      this.graph.set(filepath, new Set());
      this.reverseGraph.set(filepath, new Set());
    }

    // Build dependency relationships
    for (const [filepath, content] of Object.entries(fileContents)) {
      const dependencies = this._extractDependencies(filepath, content);
      
      for (const dep of dependencies) {
        // Skip external dependencies
        if (!this.fileContents.has(dep)) continue;

        // Add to reverse graph (this file depends on dep)
        this.reverseGraph.get(filepath).add(dep);
        
        // Add to forward graph (dep is depended on by this file)
        this.graph.get(dep).add(filepath);
      }
    }
  }

  /**
   * Get files impacted by changes to a specific file
   * @param {string} changedFile - Path of the changed file
   * @returns {string[]} Array of impacted files in dependency order
   */
  getImpactedFiles(changedFile) {
    if (!this.graph.has(changedFile)) {
      return [];
    }

    const impacted = new Set();
    const visited = new Set();
    const visiting = new Set(); // For cycle detection
    const order = [];

    // DFS to find all impacted files
    const dfs = (file, path = []) => {
      if (visited.has(file)) return;
      if (visiting.has(file)) {
        // Circular dependency detected
        const cycleStart = path.indexOf(file);
        const cycle = [...path.slice(cycleStart), file].join(' -> ');
        this.circularDependencies.add(cycle);
        return;
      }

      visiting.add(file);

      // Get all files that depend on this file
      const dependents = this.graph.get(file) || new Set();
      for (const dependent of dependents) {
        if (dependent !== changedFile) {
          impacted.add(dependent);
          dfs(dependent, [...path, file]);
        }
      }

      visiting.delete(file);
      visited.add(file);
      
      // Add to order after processing dependents (post-order)
      if (file !== changedFile && impacted.has(file)) {
        order.push(file);
      }
    };

    dfs(changedFile, []);

    // Reverse to get dependency order (files that need to be updated first)
    return order.reverse();
  }

  /**
   * Get detected circular dependencies
   * @returns {Set<string>} Set of circular dependency chains
   */
  getCircularDependencies() {
    return new Set(this.circularDependencies);
  }

  /**
   * Extract dependencies from file content
   * @private
   * @param {string} filepath - Path of the file being analyzed
   * @param {string} content - File content
   * @returns {Set<string>} Set of dependency file paths
   */
  _extractDependencies(filepath, content) {
    const dependencies = new Set();
    const currentDir = this._dirname(filepath);

    // Regex patterns for different import styles
    const patterns = [
      // ES6 imports: import ... from './file'
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
      // CommonJS require: require('./file')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // Dynamic imports: import('./file')
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // TypeScript type imports: import type { ... } from './file'
      /import\s+type\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip external modules (not relative or absolute paths)
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }

        // Resolve the import path
        const resolvedPath = this._resolvePath(currentDir, importPath);
        if (resolvedPath) {
          dependencies.add(resolvedPath);
        }
      }
    }

    return dependencies;
  }

  /**
   * Resolve import path to actual file path
   * @private
   * @param {string} currentDir - Directory of the importing file
   * @param {string} importPath - Import path to resolve
   * @returns {string|null} Resolved file path or null if not found
   * 
   * Note: Resolution is based on in-memory file contents, not filesystem.
   * Assumes forward slashes for path separators.
   */
  _resolvePath(currentDir, importPath) {
    // Normalize path separators to forward slashes
    const normalizedImport = importPath.replace(/\\/g, '/');
    
    // Remove leading './' if present
    let path = normalizedImport.replace(/^\.\//, '');
    
    // Handle relative paths
    if (normalizedImport.startsWith('../')) {
      // Simple parent directory resolution
      const parts = currentDir.split(this.pathSeparator).filter(Boolean);
      const importParts = path.split(this.pathSeparator);
      
      while (importParts[0] === '..') {
        parts.pop();
        importParts.shift();
      }
      
      path = this._joinPath(...parts, ...importParts);
    } else if (normalizedImport.startsWith('./')) {
      // Same directory
      path = currentDir ? this._joinPath(currentDir, path) : path;
    } else if (normalizedImport.startsWith('/')) {
      // Absolute path
      path = normalizedImport.substring(1);
    } else {
      // Relative to current directory
      path = currentDir ? this._joinPath(currentDir, normalizedImport) : normalizedImport;
    }

    // Try different extensions
    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    for (const ext of extensions) {
      const fullPath = path + ext;
      if (this.fileContents.has(fullPath)) {
        return fullPath;
      }
      // Try index file
      const indexPath = this._joinPath(path, `index${ext}`);
      if (this.fileContents.has(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Join path segments
   * @private
   * @param {...string} segments - Path segments to join
   * @returns {string} Joined path
   */
  _joinPath(...segments) {
    return segments
      .filter(Boolean)
      .join(this.pathSeparator)
      .replace(new RegExp(`${this.pathSeparator}+`, 'g'), this.pathSeparator);
  }

  /**
   * Get directory name from file path
   * @private
   * @param {string} filepath - File path
   * @returns {string} Directory path
   */
  _dirname(filepath) {
    const normalized = filepath.replace(/\\/g, this.pathSeparator);
    const parts = normalized.split(this.pathSeparator);
    parts.pop(); // Remove filename
    return parts.join(this.pathSeparator);
  }
}