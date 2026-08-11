import type { Pool, PoolConnection } from 'mysql2/promise';

export type MigrationStatus = 'applied' | 'failed';

export type MigrationTargetSafety = 'local' | 'remote';

export interface MigrationTarget {
  protocol: string;
  host: string;
  port: string;
  database: string;
  username: string;
  safety: MigrationTargetSafety;
  isProductionLike: boolean;
}

export interface MigrationFile {
  filename: string;
  order: number;
  description: string;
  absolutePath: string;
  checksumSha256: string;
  sql: string;
  isDraft: boolean;
}

export interface AppliedMigration {
  filename: string;
  checksumSha256: string;
  status: MigrationStatus;
  startedAt: Date;
  appliedAt: Date | null;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface MigrationStatusReport {
  target: MigrationTarget;
  schemaMigrationsExists: boolean;
  localMigrations: MigrationFile[];
  appliedMigrations: AppliedMigration[];
  pendingMigrations: MigrationFile[];
  draftMigrations: MigrationFile[];
  checksumMismatches: Array<{
    filename: string;
    expected: string;
    actual: string;
  }>;
  missingLocalMigrations: AppliedMigration[];
  failedMigrations: AppliedMigration[];
  state: 'current' | 'pending' | 'drifted' | 'blocked';
}

export interface MigrationRunnerOptions {
  rootDir: string;
  sqlDir?: string;
  env?: NodeJS.ProcessEnv;
  allowSchemaBootstrap?: boolean;
}

export interface MigrationRunnerContext {
  pool: Pool;
  connection: PoolConnection;
  target: MigrationTarget;
}
