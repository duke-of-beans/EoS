/**
 * Purpose: Generates visual maps of code dependencies in DOT/Graphviz and JSON formats
 * Dependencies: Node.js standard library only
 * Public API:
 *   - new SauronDependencyVisualizer(graph) - Creates visualizer with dependency graph
 *   - generateDot(config) - Returns DOT format string for Graphviz rendering
 *   - generateJson(options) - Returns JSON string representation of dependency graph
 *
 * Notes:
 *   - Leaf nodes: Nodes with incoming but no outgoing edges (can optionally include orphans)
 *   - DOT escaping: Handles special characters including quotes, backslashes, newlines safely
 *   - Statistics in JSON output can be disabled via config.includeStatistics = false
 */

export class SauronDependencyVisualizer {
  constructor(graph = {}) {
    // Support both adjacency list and nodes/edges formats
    if (graph.nodes && graph.edges) {
      this.nodes = new Set(graph.nodes);
      this.edges = graph.edges || [];
    } else {
      // Assume adjacency list format
      this.nodes = new Set();
      this.edges = [];

      for (const [from, deps] of Object.entries(graph)) {
        this.nodes.add(from);
        if (Array.isArray(deps)) {
          deps.forEach(to => {
            this.nodes.add(to);
            this.edges.push({ from, to });
          });
        }
      }
    }
  }

  /**
   * Generates DOT format string for Graphviz visualization
   * @param {Object} config - Optional configuration
   * @param {string} config.title - Graph title
   * @param {string} config.rankdir - Direction: TB, BT, LR, RL (default: LR)
   * @param {Object} config.nodeStyle - Node styling attributes
   * @param {Object} config.edgeStyle - Edge styling attributes
   * @param {boolean} config.includeOrphans - Include nodes with no connections
   * @returns {string} DOT format string
   */
  generateDot(config = {}) {
    const {
      title = 'Dependency Graph',
      rankdir = 'LR',
      nodeStyle = {
        shape: 'box',
        style: 'filled',
        fillcolor: 'lightblue',
        fontname: 'Arial'
      },
      edgeStyle = {
        color: 'gray',
        fontname: 'Arial',
        fontsize: '10'
      },
      includeOrphans = true
    } = config;

    const lines = [];

    // Header
    lines.push('digraph Dependencies {');
    lines.push(`  label="${this._escapeDotString(title)}";`);
    lines.push(`  rankdir=${rankdir};`);
    lines.push('  node [' + this._formatAttributes(nodeStyle) + '];');
    lines.push('  edge [' + this._formatAttributes(edgeStyle) + '];');
    lines.push('');

    // Add all nodes (including orphans if requested)
    if (includeOrphans) {
      for (const node of this.nodes) {
        lines.push(`  "${this._escapeDotString(node)}";`);
      }
      if (this.nodes.size > 0) lines.push('');
    }

    // Add edges
    const addedNodes = new Set();
    for (const edge of this.edges) {
      const from = this._escapeDotString(edge.from);
      const to = this._escapeDotString(edge.to);
      let edgeLine = `  "${from}" -> "${to}"`;

      if (edge.label) {
        edgeLine += ` [label="${this._escapeDotString(edge.label)}"]`;
      }

      lines.push(edgeLine + ';');
      addedNodes.add(edge.from);
      addedNodes.add(edge.to);
    }

    // Add orphan nodes if not including all nodes
    if (!includeOrphans) {
      const orphans = Array.from(this.nodes).filter(n => !addedNodes.has(n));
      if (orphans.length > 0) {
        lines.push('');
        lines.push('  // Orphan nodes');
        orphans.forEach(node => {
          lines.push(`  "${this._escapeDotString(node)}";`);
        });
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generates JSON string representation of the dependency graph
   * @param {Object|number} options - Options object or indent number for backwards compatibility
   * @param {number} options.indent - Number of spaces for indentation (default: 2)
   * @param {boolean} options.includeStatistics - Include graph statistics (default: true)
   * @param {boolean} options.includeOrphansInLeaves - Count orphan nodes as leaf nodes (default: false)
   * @returns {string} JSON string
   */
  generateJson(options = 2) {
    // Handle backwards compatibility - if number passed, treat as indent
    const config = typeof options === 'number'
      ? { indent: options }
      : {
          indent: 2,
          includeStatistics: true,
          includeOrphansInLeaves: false,
          ...options
        };

    const graph = {
      nodes: Array.from(this.nodes).sort(),
      edges: this.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        ...(edge.label && { label: edge.label })
      }))
    };

    // Add statistics if requested
    if (config.includeStatistics) {
      graph.statistics = {
        nodeCount: this.nodes.size,
        edgeCount: this.edges.length,
        orphanNodes: this._getOrphanNodes().length,
        hubNodes: this._getHubNodes(),
        leafNodes: this._getLeafNodes(config.includeOrphansInLeaves)
      };
    }

    return JSON.stringify(graph, null, config.indent);
  }

  /**
   * Escapes special characters for DOT string literals
   * @private
   */
  _escapeDotString(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Formats attributes object into DOT attribute string
   * @private
   */
  _formatAttributes(attrs) {
    return Object.entries(attrs)
      .map(([key, value]) => `${key}="${this._escapeDotString(value)}"`)
      .join(', ');
  }

  /**
   * Gets nodes with no incoming or outgoing edges
   * @private
   */
  _getOrphanNodes() {
    const connectedNodes = new Set();
    this.edges.forEach(edge => {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    });

    return Array.from(this.nodes).filter(node => !connectedNodes.has(node));
  }

  /**
   * Gets nodes with high outgoing edge count (top 5)
   * @private
   */
  _getHubNodes() {
    const outgoingCount = {};
    this.edges.forEach(edge => {
      outgoingCount[edge.from] = (outgoingCount[edge.from] || 0) + 1;
    });

    return Object.entries(outgoingCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([node, count]) => ({ node, outgoingEdges: count }));
  }

  /**
   * Gets nodes with no outgoing edges
   * @private
   * @param {boolean} includeOrphans - Whether to include orphan nodes as leaf nodes
   * @returns {Array} Array of leaf node names
   */
  _getLeafNodes(includeOrphans = false) {
    const hasOutgoing = new Set(this.edges.map(edge => edge.from));
    const hasIncoming = new Set(this.edges.map(edge => edge.to));

    // Standard leaf nodes: have incoming edges but no outgoing edges
    const standardLeaves = Array.from(hasIncoming).filter(node => !hasOutgoing.has(node));

    if (includeOrphans) {
      // Include orphan nodes (no edges at all) as leaf nodes
      const orphans = this._getOrphanNodes();
      const allLeaves = new Set([...standardLeaves, ...orphans]);
      return Array.from(allLeaves);
    }

    return standardLeaves;
  }

  /**
   * Adds a new dependency edge
   * @param {string} from - Source node
   * @param {string} to - Target node
   * @param {string} label - Optional edge label
   */
  addEdge(from, to, label = null) {
    this.nodes.add(from);
    this.nodes.add(to);
    const edge = { from, to };
    if (label) edge.label = label;
    this.edges.push(edge);
  }

  /**
   * Adds a new node without edges
   * @param {string} node - Node name
   */
  addNode(node) {
    this.nodes.add(node);
  }

  /**
   * Gets the internal graph representation
   * @returns {Object} Graph with nodes and edges
   */
  getGraph() {
    return {
      nodes: Array.from(this.nodes),
      edges: [...this.edges]
    };
  }
}