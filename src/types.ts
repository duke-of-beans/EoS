/**
 * Eye of Sauron — Core type definitions
 * All interfaces for scan results, health reports, rules, and configuration.
 */

// ── Issue severity levels ──────────────────────────────────────────────────
export type Severity = 'APOCALYPSE' | 'DANGER' | 'WARNING' | 'NOTICE' | 'INFO';

// ── Scan modes ─────────────────────────────────────────────────────────────
export type ScanMode = 'quick' | 'deep' | 'quantum';

// ── Issue found during scan ────────────────────────────────────────────────
export interface Issue {
  type: string;
  severity: Severity;
  file: string;
  position?: number;
  line: number;
  char?: string;
  expected?: string;
  message: string;
  fix?: string;
  subType?: string;
}

// ── Per-file scan result ───────────────────────────────────────────────────
export interface FileResult {
  path: string;
  size: number;
  lines?: number;
  characters?: number;  issues?: Issue[];
  metrics?: FileMetrics;
  skipped?: boolean;
  reason?: string;
  error?: boolean;
  errorMessage?: string;
  timestamp?: number;
}

export interface FileMetrics {
  characterCount: number;
  lineCount: number;
  issueCount: number;
}

// ── Prophecy (cross-file or file-level prediction) ─────────────────────────
export interface Prophecy {
  type: string;
  file?: string;
  message: string;
  severity: Severity;
  category: string;
  files?: string[];
  metric?: number;
  timestamp?: number;
}

// ── Scan profile configuration ─────────────────────────────────────────────
export interface ScanProfile {
  name: string;
  maxDepth: number;
  skipTests: boolean;
  analyzers: string[];
  timeout: number;
  crossFileAnalysis?: boolean;
}
// ── Scan summary ───────────────────────────────────────────────────────────
export interface ScanSummary {
  totalFiles: number;
  totalCharacters: number;
  totalIssues: number;
  criticalIssues: number;
  warnings: number;
  healthScore: number;
  duration: number;
  propheciesGenerated: number;
}

// ── Scan metadata ──────────────────────────────────────────────────────────
export interface ScanMetadata {
  scanDate: string;
  duration: number;
  version: string;
  profile: ScanProfile;
}

// ── Complete health report (public API return type) ────────────────────────
export interface HealthReport {
  metadata: ScanMetadata;
  summary: ScanSummary;
  files: Record<string, FileResult>;
  prophecies: Prophecy[];
  stats: ScanStats;
}

export interface ScanStats {
  filesScanned: number;
  totalCharacters: number;
  startTime: number | null;
  endTime: number | null;
  duration: number | null;
}

// ── Scanner configuration ──────────────────────────────────────────────────
export interface ScannerConfig {
  maxFileSize?: number;
  excludePatterns?: RegExp[];
  fileExtensions?: string[];
  batchSize?: number;
  maxWorkers?: number;
  allowConsole?: boolean;
  skipTests?: boolean;
  skipTribunalContract?: boolean;
  enableCharacterForensics?: boolean;
  enablePatternPrecognition?: boolean;
  enableBuiltInAnalyzers?: boolean;
  aggregateSimilarIssues?: boolean;
  maxSimilarIssues?: number;
}