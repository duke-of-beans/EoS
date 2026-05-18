/**
 * Eye of Sauron — Public API
 * TypeScript-typed, importable from GregLite sidecar or any CJS/TS consumer.
 */

export { EyeOfSauronOmniscient, scanProject } from './scanner';
export { CharacterForensics } from './rules/character-forensics';
export { PatternPrecognition } from './rules/pattern-precognition';
export { BatchProcessor } from './batch-processor';

export type {
  HealthReport,
  ScanSummary,
  ScanMetadata,
  ScanStats,
  ScannerConfig,
  ScanProfile,
  ScanMode,
  Issue,
  Severity,
  FileResult,
  FileMetrics,
  Prophecy,
} from './types';