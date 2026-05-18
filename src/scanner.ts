/**
 * Eye of Sauron — Main scan engine (TypeScript port)
 * Port of core/EyeOfSauronOmniscient.js
 *
 * Public API:
 *   new EyeOfSauronOmniscient(config)
 *   async scan(rootPath, mode) → HealthReport
 *   scanProject(path) → HealthReport  (convenience wrapper)
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { CharacterForensics } from './rules/character-forensics';
import { PatternPrecognition } from './rules/pattern-precognition';
import { BatchProcessor } from './batch-processor';
import {
  Issue,
  FileResult,
  Prophecy,
  ScanProfile,
  ScanMode,
  ScannerConfig,
  HealthReport,
  ScanStats,
  ScanSummary,
} from './types';

interface Vision {
  files: Map<string, FileResult>;
  stats: ScanStats;
  prophecies: Prophecy[];
}
const DEFAULT_EXCLUDE: RegExp[] = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
];

const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

const PROFILES: Record<ScanMode, ScanProfile> = {
  quick: {
    name: 'Quick Scan',
    maxDepth: 3,
    skipTests: true,
    analyzers: ['basic'],
    timeout: 100,
  },
  deep: {
    name: 'Deep Analysis',
    maxDepth: Infinity,
    skipTests: false,
    analyzers: ['all'],
    timeout: 5000,
  },
  quantum: {
    name: 'Quantum Entanglement Analysis',
    maxDepth: Infinity,
    skipTests: false,
    analyzers: ['all', 'experimental'],
    timeout: 10000,
    crossFileAnalysis: true,
  },
};

export class EyeOfSauronOmniscient {
  private readonly config: Required<Pick<ScannerConfig,
    'maxFileSize' | 'excludePatterns' | 'fileExtensions' | 'batchSize'
  >> & ScannerConfig;
  private readonly characterForensics: CharacterForensics;
  private readonly patternPrecognition: PatternPrecognition;
  private readonly batchProcessor: BatchProcessor;
  private vision!: Vision;
  private lastUsedMode: ScanMode = 'deep';
  constructor(config: ScannerConfig = {}) {
    this.config = {
      maxFileSize: config.maxFileSize ?? 1024 * 1024,
      excludePatterns: config.excludePatterns ?? DEFAULT_EXCLUDE,
      fileExtensions: config.fileExtensions ?? DEFAULT_EXTENSIONS,
      batchSize: config.batchSize ?? 10,
      ...config,
    };

    this.characterForensics = new CharacterForensics();
    this.patternPrecognition = new PatternPrecognition(this.config);
    this.batchProcessor = new BatchProcessor(config.maxWorkers ?? 4);
    this.resetVision();
  }

  private resetVision(): void {
    this.vision = {
      files: new Map(),
      stats: { filesScanned: 0, totalCharacters: 0, startTime: null, endTime: null, duration: null },
      prophecies: [],
    };
  }

  /**
   * Main scan method — analyzes a directory tree
   */
  async scan(rootPath: string, mode: ScanMode = 'deep'): Promise<HealthReport> {
    const profile = PROFILES[mode] ?? PROFILES.deep;
    this.lastUsedMode = mode;
    this.resetVision();
    this.vision.stats.startTime = Date.now();

    const files = await this.discoverFiles(rootPath, profile);

    await this.batchProcessor.process(
      files,
      async (filePath: string) => this.scanFile(filePath, profile),
      { batchSize: this.config.batchSize },
    );

    this.vision.stats.endTime = Date.now();
    this.vision.stats.duration = this.vision.stats.endTime - this.vision.stats.startTime;
    if (profile.crossFileAnalysis) {
      this.generateCrossFileProphecies();
    }

    return this.generateReport();
  }

  /**
   * Scan a single file with the given profile
   */
  private async scanFile(filePath: string, _profile: ScanProfile): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const fileStats = await stat(filePath);

      if (fileStats.size > this.config.maxFileSize) {
        this.vision.files.set(filePath, {
          path: filePath,
          size: fileStats.size,
          skipped: true,
          reason: 'File too large',
        });
        return;
      }

      const characterAnalysis = await this.characterForensics.analyze(content, filePath);
      const patterns = await this.patternPrecognition.detect(content, filePath);

      const issues: Issue[] = [
        ...(Array.isArray(characterAnalysis) ? characterAnalysis : []),
        ...(Array.isArray(patterns) ? patterns : []),
      ];

      const lineCount = content.split('\n').length;
      const fileResult: FileResult = {
        path: filePath,
        size: fileStats.size,
        lines: lineCount,
        characters: content.length,
        issues,
        metrics: {
          characterCount: content.length,
          lineCount,
          issueCount: issues.length,
        },
        timestamp: Date.now(),
      };
      this.vision.files.set(filePath, fileResult);
      this.vision.stats.filesScanned++;
      this.vision.stats.totalCharacters += content.length;

      const fileProphecies = this.generateFileProphecies(fileResult);
      this.vision.prophecies.push(...fileProphecies);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.vision.files.set(filePath, {
        path: filePath,
        size: 0,
        error: true,
        errorMessage: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Discover all files to scan
   */
  private async discoverFiles(rootPath: string, profile: ScanProfile, depth = 0): Promise<string[]> {
    const files: string[] = [];
    if (depth > profile.maxDepth) return files;

    try {
      const entries = await readdir(rootPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(rootPath, entry.name);
        if (this.shouldExclude(fullPath)) continue;

        if (entry.isDirectory()) {
          const subFiles = await this.discoverFiles(fullPath, profile, depth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (!this.config.fileExtensions.includes(ext)) continue;
          if (profile.skipTests && this.isTestFile(fullPath)) continue;
          files.push(fullPath);
        }
      }
    } catch {
      // Silently skip inaccessible directories
    }

    return files;
  }
  private shouldExclude(filePath: string): boolean {
    return this.config.excludePatterns.some(pattern => pattern.test(filePath));
  }

  private isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filePath) ||
      filePath.includes('__tests__') ||
      filePath.includes('__mocks__');
  }

  private generateFileProphecies(fileResult: FileResult): Prophecy[] {
    const prophecies: Prophecy[] = [];
    const issues = fileResult.issues ?? [];

    if (issues.length > 10) {
      prophecies.push({
        type: 'warning',
        file: fileResult.path,
        message: `High issue density detected: ${issues.length} issues in ${fileResult.lines} lines`,
        severity: 'DANGER',
        category: 'quality',
      });
    }

    const criticalIssues = issues.filter(i =>
      i.severity === 'APOCALYPSE' || i.severity === 'DANGER',
    );
    if (criticalIssues.length > 0) {
      prophecies.push({
        type: 'danger',
        file: fileResult.path,
        message: `Critical character anomalies detected: ${criticalIssues.length} critical issues`,
        severity: 'APOCALYPSE',
        category: 'security',
      });
    }

    return prophecies;
  }
  private generateCrossFileProphecies(): void {
    const allFiles = Array.from(this.vision.files.values());
    const patternClusters = new Map<string, { file: string; issue: Issue }[]>();

    for (const file of allFiles) {
      for (const issue of file.issues ?? []) {
        const key = `${issue.type}:${issue.subType ?? 'default'}`;
        if (!patternClusters.has(key)) patternClusters.set(key, []);
        patternClusters.get(key)!.push({ file: file.path, issue });
      }
    }

    for (const [pattern, occurrences] of patternClusters.entries()) {
      if (occurrences.length > 5) {
        this.vision.prophecies.push({
          type: 'pattern',
          message: `Pattern "${pattern}" detected across ${occurrences.length} files`,
          severity: 'WARNING',
          category: 'cross-file',
          files: occurrences.map(o => o.file),
          timestamp: Date.now(),
        });
      }
    }

    const totalIssues = allFiles.reduce((sum, f) => sum + (f.issues?.length ?? 0), 0);
    const avgIssuesPerFile = totalIssues / Math.max(this.vision.stats.filesScanned, 1);

    if (avgIssuesPerFile > 5) {
      this.vision.prophecies.push({
        type: 'health',
        message: `Codebase health warning: Average ${avgIssuesPerFile.toFixed(1)} issues per file`,
        severity: 'DANGER',
        category: 'overall',
        metric: avgIssuesPerFile,
        timestamp: Date.now(),
      });
    }
  }
  private generateReport(): HealthReport {
    const filesObject: Record<string, FileResult> = {};
    for (const [path, data] of this.vision.files.entries()) {
      filesObject[path] = data;
    }

    const allFiles = Array.from(this.vision.files.values());
    const totalIssues = allFiles.reduce((sum, f) => sum + (f.issues?.length ?? 0), 0);
    const criticalIssues = allFiles.reduce((sum, f) =>
      sum + (f.issues?.filter(i =>
        i.severity === 'APOCALYPSE' || i.severity === 'DANGER',
      ).length ?? 0), 0);
    const warnings = totalIssues - criticalIssues;

    // healthScore: density-based formula so projects with many files aren't unfairly penalised.
    const totalFiles = Math.max(this.vision.stats.filesScanned, 1);
    const criticalRate = criticalIssues / totalFiles;
    const warningRate = warnings / totalFiles;
    const healthScore = Math.max(0, Math.min(100, Math.round(
      100 - (criticalRate * 25) - (warningRate * 5),
    )));

    const summary: ScanSummary = {
      totalFiles: this.vision.stats.filesScanned,
      totalCharacters: this.vision.stats.totalCharacters,
      totalIssues,
      criticalIssues,
      warnings,
      healthScore,
      duration: this.vision.stats.duration ?? 0,
      propheciesGenerated: this.vision.prophecies.length,
    };
    return {
      metadata: {
        scanDate: new Date(this.vision.stats.startTime ?? Date.now()).toISOString(),
        duration: this.vision.stats.duration ?? 0,
        version: '2.0.0',
        profile: PROFILES[this.lastUsedMode] ?? PROFILES.deep,
      },
      summary,
      files: filesObject,
      prophecies: this.vision.prophecies,
      stats: this.vision.stats,
    };
  }
}

/**
 * Convenience wrapper — the public API for external consumers (e.g. GregLite).
 * Runs a quick scan by default. Returns a typed HealthReport.
 */
export async function scanProject(
  projectPath: string,
  mode: ScanMode = 'quick',
  config: ScannerConfig = {},
): Promise<HealthReport> {
  const scanner = new EyeOfSauronOmniscient(config);
  return scanner.scan(projectPath, mode);
}