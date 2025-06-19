/**
 * Purpose: Builds and visualizes dependency graphs from package-lock.json files
 * Dependencies: Node.js std lib (fs, path)
 * Public API:
 *   - constructor: SauronDependencyGraph(options?)
 *     options: { enableLogging?: boolean, distinguishDepTypes?: boolean }
 *   - buildGraph(packageLockPath: string) → object | {graph, depTypes}
 *   - toDot(graph: object) → string
 *   - toJson(graph: object) → string
 */

import { readFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';

export class SauronDependencyGraph {
  constructor(options = {}) {
    this.visitedNodes = new Set();
    this.enableLogging = options.enableLogging || false;
    this.distinguishDepTypes = options.distinguishDepTypes || false;
    this.circularDeps = new Set();
  }

  /**
   * Builds a dependency graph from package-lock.json
   * @param {string} packageLockPath - Path to package-lock.json
   * @returns {object} Adjacency list representation { node: [dependencies] } or with types
   */
  buildGraph(packageLockPath) {
    const resolvedPath = resolve(packageLockPath);
    let lockData;
    
    try {
      const content = readFileSync(resolvedPath, 'utf8');
      lockData = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse package-lock.json: ${error.message}`);
    }

    const graph = {};
    const depTypes = {}; // Track dependency types if enabled
    const lockVersion = lockData.lockfileVersion || 1;
    
    // Extract root package name
    const rootName = lockData.name || 'root';
    graph[rootName] = [];
    if (this.distinguishDepTypes) {
      depTypes[rootName] = {};
    }

    if (lockVersion === 1) {
      // v1 format: flat dependencies object
      this._processV1Dependencies(lockData.dependencies || {}, graph, depTypes, rootName);
    } else {
      // v2+ format: packages object with nested structure
      this._processV2Dependencies(lockData.packages || {}, graph, depTypes, rootName);
    }

    // Add root dependencies
    if (lockData.dependencies) {
      graph[rootName] = Object.keys(lockData.dependencies);
      if (this.distinguishDepTypes) {
        for (const dep of graph[rootName]) {
          depTypes[rootName][dep] = 'prod';
        }
      }
    }

    // If tracking dep types, return enriched structure
    if (this.distinguishDepTypes) {
      return { graph, depTypes };
    }

    return graph;
  }

  /**
   * Process v1 format dependencies (flat structure)
   * @private
   */
  _processV1Dependencies(dependencies, graph, depTypes, parentName = null) {
    for (const [pkgName, pkgData] of Object.entries(dependencies)) {
      if (!graph[pkgName]) {
        graph[pkgName] = [];
        if (this.distinguishDepTypes) {
          depTypes[pkgName] = {};
        }
      }

      // Add package's own dependencies
      if (pkgData.requires) {
        const deps = Object.keys(pkgData.requires);
        graph[pkgName] = [...new Set([...graph[pkgName], ...deps])];
        
        if (this.distinguishDepTypes) {
          for (const dep of deps) {
            depTypes[pkgName][dep] = 'prod';
          }
        }
      }

      // Process nested dependencies recursively
      if (pkgData.dependencies) {
        this._processV1Dependencies(pkgData.dependencies, graph, depTypes, pkgName);
      }
    }
  }

  /**
   * Process v2+ format dependencies (nested structure)
   * @private
   */
  _processV2Dependencies(packages, graph, depTypes, rootName) {
    for (const [pkgPath, pkgData] of Object.entries(packages)) {
      // Skip empty key (root package)
      if (pkgPath === '') {
        continue;
      }

      // Extract package name from path
      const pkgName = this._extractPackageName(pkgPath);
      
      if (!pkgName) {
        if (this.enableLogging) {
          console.warn(`Could not extract package name from path: ${pkgPath}`);
        }
        continue;
      }
      
      if (!graph[pkgName]) {
        graph[pkgName] = [];
        if (this.distinguishDepTypes) {
          depTypes[pkgName] = {};
        }
      }

      // Add direct dependencies
      if (pkgData.dependencies) {
        const deps = Object.keys(pkgData.dependencies);
        graph[pkgName] = [...new Set([...graph[pkgName], ...deps])];
        
        if (this.distinguishDepTypes) {
          for (const dep of deps) {
            depTypes[pkgName][dep] = 'prod';
          }
        }
      }

      // Add dev dependencies if present
      if (pkgData.devDependencies) {
        const devDeps = Object.keys(pkgData.devDependencies);
        graph[pkgName] = [...new Set([...graph[pkgName], ...devDeps])];
        
        if (this.distinguishDepTypes) {
          for (const dep of devDeps) {
            depTypes[pkgName][dep] = 'dev';
          }
        }
      }

      // Add peer dependencies if present
      if (pkgData.peerDependencies) {
        const peerDeps = Object.keys(pkgData.peerDependencies);
        graph[pkgName] = [...new Set([...graph[pkgName], ...peerDeps])];
        
        if (this.distinguishDepTypes) {
          for (const dep of peerDeps) {
            depTypes[pkgName][dep] = 'peer';
          }
        }
      }
    }
  }

  /**
   * Extract package name from node_modules path with robust error handling
   * @private
   */
  _extractPackageName(pkgPath) {
    try {
      // Handle direct package reference (no node_modules in path)
      if (!pkgPath.includes('node_modules/')) {
        // Could be a workspace package or direct reference
        const cleanPath = pkgPath.replace(/^\/+/, '');
        return cleanPath.split('/')[0] || null;
      }
      
      const parts = pkgPath.split('node_modules/');
      const lastPart = parts[parts.length - 1];
      
      if (!lastPart) {
        return null;
      }
      
      // Handle scoped packages
      if (lastPart.startsWith('@')) {
        const scopeParts = lastPart.split('/');
        if (scopeParts.length >= 2) {
          return `${scopeParts[0]}/${scopeParts[1]}`;
        }
        return null;
      }
      
      // Regular packages
      const pkgName = lastPart.split('/')[0];
      return pkgName || null;
    } catch (error) {
      if (this.enableLogging) {
        console.warn(`Error extracting package name from ${pkgPath}: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Convert graph to DOT format for Graphviz
   * @param {object|{graph: object, depTypes: object}} input - Graph or enriched structure
   * @returns {string} DOT format string
   */
  toDot(input) {
    const isEnriched = input.graph && input.depTypes;
    const graph = isEnriched ? input.graph : input;
    const depTypes = isEnriched ? input.depTypes : null;
    
    const lines = ['digraph dependencies {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');
    
    // Add legend if we're distinguishing dependency types
    if (depTypes) {
      lines.push('');
      lines.push('  // Legend');
      lines.push('  subgraph cluster_legend {');
      lines.push('    label="Dependency Types";');
      lines.push('    style=filled;');
      lines.push('    fillcolor=lightgray;');
      lines.push('    node [shape=plaintext];');
      lines.push('    legend [label=<');
      lines.push('      <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">');
      lines.push('        <TR><TD>Production</TD><TD BGCOLOR="black">&nbsp;&nbsp;&nbsp;</TD></TR>');
      lines.push('        <TR><TD>Development</TD><TD BGCOLOR="blue">&nbsp;&nbsp;&nbsp;</TD></TR>');
      lines.push('        <TR><TD>Peer</TD><TD BGCOLOR="green">&nbsp;&nbsp;&nbsp;</TD></TR>');
      lines.push('      </TABLE>>];');
      lines.push('  }');
    }
    
    lines.push('');

    // Track all unique edges to avoid duplicates
    const edges = new Set();

    for (const [node, dependencies] of Object.entries(graph)) {
      // Escape node names for DOT format
      const escapedNode = this._escapeDotLabel(node);
      
      if (dependencies.length === 0) {
        // Include isolated nodes
        lines.push(`  "${escapedNode}";`);
      } else {
        for (const dep of dependencies) {
          // Skip self-references
          if (dep === node) {
            this.circularDeps.add(`${node} -> ${node} (self-reference)`);
            continue;
          }
          
          const escapedDep = this._escapeDotLabel(dep);
          let edgeStyle = '';
          
          // Add edge styling based on dependency type
          if (depTypes && depTypes[node] && depTypes[node][dep]) {
            const depType = depTypes[node][dep];
            switch (depType) {
              case 'dev':
                edgeStyle = ' [color=blue, style=dashed]';
                break;
              case 'peer':
                edgeStyle = ' [color=green, style=dotted]';
                break;
              case 'prod':
              default:
                edgeStyle = ' [color=black]';
            }
          }
          
          const edge = `"${escapedNode}" -> "${escapedDep}"${edgeStyle}`;
          const edgeKey = `${escapedNode}->${escapedDep}`;
          
          if (!edges.has(edgeKey)) {
            edges.add(edgeKey);
            lines.push(`  ${edge};`);
          }
        }
      }
    }

    lines.push('}');
    
    // Log circular dependencies if found and logging enabled
    if (this.enableLogging && this.circularDeps.size > 0) {
      console.log('Circular dependencies detected:');
      this.circularDeps.forEach(dep => console.log(`  - ${dep}`));
    }
    
    return lines.join('\n');
  }

  /**
   * Escape special characters for DOT labels
   * @private
   */
  _escapeDotLabel(label) {
    return label.replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n');
  }

  /**
   * Convert graph to JSON format
   * @param {object|{graph: object, depTypes: object}} input - Graph or enriched structure
   * @returns {string} JSON string
   */
  toJson(input) {
    const isEnriched = input.graph && input.depTypes;
    const graph = isEnriched ? input.graph : input;
    
    // Create a clean copy to handle circular references
    const safeGraph = {};
    const detectedCircular = [];
    
    for (const [node, deps] of Object.entries(graph)) {
      // Filter out circular dependencies
      safeGraph[node] = deps.filter(dep => {
        if (dep === node) {
          detectedCircular.push(`${node} -> ${node} (self-reference)`);
          return false;
        }
        return true;
      });
    }
    
    // Log circular dependencies if found and logging enabled
    if (this.enableLogging && detectedCircular.length > 0) {
      console.log('Circular dependencies filtered from JSON output:');
      detectedCircular.forEach(dep => console.log(`  - ${dep}`));
    }
    
    // Return enriched structure if input was enriched
    if (isEnriched) {
      return JSON.stringify({ graph: safeGraph, depTypes: input.depTypes }, null, 2);
    }
    
    return JSON.stringify(safeGraph, null, 2);
  }
}

// Example usage (commented out for production):
// const analyzer = new SauronDependencyGraph({ 
//   enableLogging: true,
//   distinguishDepTypes: true 
// });
// const result = analyzer.buildGraph('./package-lock.json');
// console.log(analyzer.toDot(result));
// console.log(analyzer.toJson(result));