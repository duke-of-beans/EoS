#!/usr/bin/env node
/**
 * structure-mapper.js - Project Structure Visualizer
 *
 * Simple script to map out directory structure and files
 * Usage: node structure-mapper.js [directory]
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  // Directories to ignore
  IGNORE_DIRS: [
    'node_modules', '.git', 'dist', 'build', '.next',
    'coverage', 'vendor', '__pycache__', 'venv',
    '.vscode', '.idea', 'tmp', 'temp', 'logs'
  ],

  // File extensions to track
  CODE_EXTENSIONS: [
    '.js', '.mjs', '.jsx', '.ts', '.tsx', '.vue',
    '.py', '.java', '.go', '.rb', '.php', '.cs'
  ],

  // Max depth to prevent infinite recursion
  MAX_DEPTH: 10,

  // Visual settings
  SHOW_HIDDEN: false,
  SHOW_FILE_SIZE: false,
  SHOW_STATS: true
};

class StructureMapper {
  constructor() {
    this.stats = {
      totalDirs: 0,
      totalFiles: 0,
      filesByExtension: {},
      largestFiles: [],
      deepestPath: { path: '', depth: 0 }
    };
  }

  async map(rootPath = '.') {
    console.log('📊 PROJECT STRUCTURE MAPPER\n');
    console.log(`📍 Root: ${path.resolve(rootPath)}`);
    console.log('═'.repeat(80) + '\n');

    const startTime = Date.now();

    try {
      // Build the tree structure
      const tree = await this.buildTree(rootPath, 0);

      // Print the tree
      this.printTree(tree);

      // Print statistics
      if (CONFIG.SHOW_STATS) {
        this.printStats(Date.now() - startTime);
      }

      // Save to file
      await this.saveReport(tree);

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async buildTree(dirPath, depth = 0, relativePath = '') {
    if (depth > CONFIG.MAX_DEPTH) {
      return {
        name: path.basename(dirPath),
        type: 'directory',
        truncated: true
      };
    }

    const node = {
      name: path.basename(dirPath) || '.',
      path: relativePath || '.',
      type: 'directory',
      children: [],
      fileCount: 0,
      dirCount: 0
    };

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Sort entries: directories first, then files
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of entries) {
        // Skip hidden files unless configured
        if (!CONFIG.SHOW_HIDDEN && entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        const childRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          // Skip ignored directories
          if (CONFIG.IGNORE_DIRS.includes(entry.name)) continue;

          this.stats.totalDirs++;
          node.dirCount++;

          // Track depth
          if (depth + 1 > this.stats.deepestPath.depth) {
            this.stats.deepestPath = {
              path: childRelativePath,
              depth: depth + 1
            };
          }

          // Recursively build subdirectory
          const childNode = await this.buildTree(fullPath, depth + 1, childRelativePath);
          node.children.push(childNode);

        } else if (entry.isFile()) {
          this.stats.totalFiles++;
          node.fileCount++;

          const ext = path.extname(entry.name).toLowerCase();
          this.stats.filesByExtension[ext] = (this.stats.filesByExtension[ext] || 0) + 1;

          const fileNode = {
            name: entry.name,
            path: childRelativePath,
            type: 'file',
            extension: ext
          };

          // Add file size if configured
          if (CONFIG.SHOW_FILE_SIZE) {
            try {
              const stats = await fs.stat(fullPath);
              fileNode.size = stats.size;

              // Track largest files
              this.stats.largestFiles.push({
                path: childRelativePath,
                size: stats.size
              });

              // Keep only top 10 largest
              this.stats.largestFiles.sort((a, b) => b.size - a.size);
              this.stats.largestFiles = this.stats.largestFiles.slice(0, 10);
            } catch (e) {
              // Ignore stat errors
            }
          }

          node.children.push(fileNode);
        }
      }

    } catch (error) {
      if (error.code !== 'EACCES' && error.code !== 'EPERM') {
        console.error(`Error reading ${dirPath}:`, error.message);
      }
    }

    return node;
  }

  printTree(node, prefix = '', isLast = true, depth = 0) {
    // Print current node
    if (depth > 0) {
      const connector = isLast ? '└── ' : '├── ';
      const icon = node.type === 'directory' ? '📁' : this.getFileIcon(node.extension);
      const name = node.truncated ? `${node.name} (...)` : node.name;

      let line = prefix + connector + icon + ' ' + name;

      // Add file count for directories
      if (node.type === 'directory' && (node.fileCount > 0 || node.dirCount > 0)) {
        const counts = [];
        if (node.dirCount > 0) counts.push(`${node.dirCount} dirs`);
        if (node.fileCount > 0) counts.push(`${node.fileCount} files`);
        line += ` (${counts.join(', ')})`;
      }

      // Add size for files
      if (node.type === 'file' && node.size) {
        line += ` [${this.formatSize(node.size)}]`;
      }

      console.log(line);
    } else {
      // Root node
      console.log(`📁 ${node.name} (${node.dirCount} dirs, ${node.fileCount} files)`);
    }

    // Print children
    if (node.children) {
      const childPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

      node.children.forEach((child, index) => {
        const isLastChild = index === node.children.length - 1;
        this.printTree(child, childPrefix, isLastChild, depth + 1);
      });
    }
  }

  getFileIcon(extension) {
    const iconMap = {
      '.js': '📜', '.mjs': '📜', '.jsx': '⚛️',
      '.ts': '📘', '.tsx': '⚛️',
      '.json': '📋', '.yml': '⚙️', '.yaml': '⚙️',
      '.html': '🌐', '.css': '🎨', '.scss': '🎨',
      '.md': '📝', '.txt': '📄', '.pdf': '📕',
      '.jpg': '🖼️', '.png': '🖼️', '.gif': '🖼️',
      '.zip': '📦', '.tar': '📦', '.gz': '📦',
      '.env': '🔐', '.gitignore': '🚫',
      '.py': '🐍', '.java': '☕', '.go': '🐹',
      '.rb': '💎', '.php': '🐘', '.cs': '🔷'
    };

    return iconMap[extension] || '📄';
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  printStats(duration) {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 STATISTICS\n');

    // Basic counts
    console.log(`📁 Total Directories: ${this.stats.totalDirs}`);
    console.log(`📄 Total Files: ${this.stats.totalFiles}`);
    console.log(`⏱️  Scan Duration: ${(duration / 1000).toFixed(2)}s`);

    // File type distribution
    console.log('\n📈 File Distribution:');
    const sortedExtensions = Object.entries(this.stats.filesByExtension)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    sortedExtensions.forEach(([ext, count]) => {
      const percentage = ((count / this.stats.totalFiles) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(percentage / 2));
      console.log(`   ${ext.padEnd(8)} ${count.toString().padStart(5)} files ${bar} ${percentage}%`);
    });

    // Code file statistics
    const codeFiles = Object.entries(this.stats.filesByExtension)
      .filter(([ext]) => CONFIG.CODE_EXTENSIONS.includes(ext))
      .reduce((sum, [_, count]) => sum + count, 0);

    if (codeFiles > 0) {
      console.log(`\n💻 Code Files: ${codeFiles} (${((codeFiles / this.stats.totalFiles) * 100).toFixed(1)}%)`);
    }

    // Deepest path
    if (this.stats.deepestPath.depth > 0) {
      console.log(`\n🏔️  Deepest Path: ${this.stats.deepestPath.depth} levels`);
      console.log(`   ${this.stats.deepestPath.path}`);
    }

    // Largest files
    if (CONFIG.SHOW_FILE_SIZE && this.stats.largestFiles.length > 0) {
      console.log('\n📏 Largest Files:');
      this.stats.largestFiles.slice(0, 5).forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.path} (${this.formatSize(file.size)})`);
      });
    }
  }

  async saveReport(tree) {
    const report = {
      timestamp: new Date().toISOString(),
      root: path.resolve('.'),
      stats: this.stats,
      structure: tree
    };

    await fs.writeFile('structure-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Full report saved to: structure-report.json');
  }
}

// Directory-specific summaries
function generateSummary(tree) {
  const summaries = [];

  function analyze(node, path = '') {
    if (node.type !== 'directory' || !node.children) return;

    const currentPath = path ? `${path}/${node.name}` : node.name;

    // Analyze directory contents
    const analysis = {
      path: currentPath,
      fileTypes: {},
      hasTests: false,
      hasConfig: false,
      hasDocs: false,
      isEmpty: node.children.length === 0
    };

    node.children.forEach(child => {
      if (child.type === 'file') {
        const ext = child.extension;
        analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;

        // Detect common patterns
        if (child.name.includes('test') || child.name.includes('spec')) {
          analysis.hasTests = true;
        }
        if (['.json', '.yml', '.yaml', '.env'].includes(ext)) {
          analysis.hasConfig = true;
        }
        if (['.md', '.txt', '.pdf'].includes(ext)) {
          analysis.hasDocs = true;
        }
      } else {
        // Recurse into subdirectories
        analyze(child, currentPath);
      }
    });

    // Only add non-empty summaries
    if (!analysis.isEmpty) {
      summaries.push(analysis);
    }
  }

  analyze(tree);
  return summaries;
}

// Main execution
(async () => {
  try {
    const targetPath = process.argv[2] || '.';
    const mapper = new StructureMapper();
    await mapper.map(targetPath);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();

module.exports = StructureMapper;