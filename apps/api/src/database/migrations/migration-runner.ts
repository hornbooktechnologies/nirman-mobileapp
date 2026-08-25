import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import {
  AppliedMigration,
  MigrationFile,
  MigrationTarget,
  MigrationRunnerContext,
  MigrationRunnerOptions,
  MigrationStatusReport,
} from './migration-types';
import {
  formatMigrationTarget,
  parseMigrationDatabaseUrl,
  parseMigrationTarget,
  validateMigrationMutationSafety,
} from './migration-safety';
import { acquireMigrationLock, releaseMigrationLock } from './migration-lock';
import {
  calculateMigrationChecksum,
  matchesMigrationChecksum,
} from './migration-checksum';

const DEFAULT_CONNECTION_LIMIT = 5;
const DEFAULT_LOCK_TIMEOUT_SECONDS = 30;
const DEFAULT_SQL_DIR = path.join('apps', 'api', 'src', 'database', 'sql', 'migrations');
const MIGRATION_FILENAME_PATTERN = /^(\d{3})_([a-z0-9_]+)\.sql$/;

interface SchemaTableRow extends RowDataPacket {
  table_exists: string;
}

interface AppliedMigrationRow extends RowDataPacket {
  filename: string;
  checksum_sha256: string;
  status: 'applied' | 'failed';
  started_at: Date;
  applied_at: Date | null;
  duration_ms: number | null;
  error_message: string | null;
}

function resolveSqlDir(options: MigrationRunnerOptions) {
  return path.resolve(options.rootDir, options.sqlDir ?? DEFAULT_SQL_DIR);
}

function getDatabaseUrl(env: NodeJS.ProcessEnv) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and choose a safe target first.');
  }
  return databaseUrl;
}

function createMigrationPool(databaseUrl: string, env: NodeJS.ProcessEnv): Pool {
  const parsed = parseMigrationDatabaseUrl(databaseUrl);
  return createPool({
    host: parsed.host,
    port: Number(parsed.port),
    user: parsed.username,
    password: parsed.password,
    database: parsed.database,
    waitForConnections: true,
    connectionLimit: Number(env.DB_CONNECTION_LIMIT ?? DEFAULT_CONNECTION_LIMIT),
    multipleStatements: true,
    decimalNumbers: false,
    dateStrings: false,
  });
}

async function createContext(options: MigrationRunnerOptions): Promise<MigrationRunnerContext> {
  const env = options.env ?? process.env;
  const databaseUrl = getDatabaseUrl(env);
  const target = parseMigrationTarget(databaseUrl, env);
  const pool = createMigrationPool(databaseUrl, env);
  const connection = await pool.getConnection();
  return { pool, connection, target };
}

function readTargetBeforeConnection(
  env: NodeJS.ProcessEnv,
): { databaseUrl: string; target: MigrationTarget } {
  const databaseUrl = getDatabaseUrl(env);
  return {
    databaseUrl,
    target: parseMigrationTarget(databaseUrl, env),
  };
}

async function createContextForTarget(
  options: MigrationRunnerOptions,
  databaseUrl: string,
  target: MigrationTarget,
): Promise<MigrationRunnerContext> {
  const env = options.env ?? process.env;
  const pool = createMigrationPool(databaseUrl, env);
  const connection = await pool.getConnection();
  return { pool, connection, target };
}

async function closeContext(context: MigrationRunnerContext) {
  context.connection.release();
  await context.pool.end();
}

async function schemaMigrationsExists(connection: PoolConnection): Promise<boolean> {
  const [rows] = await connection.query<SchemaTableRow[]>(
    `SELECT TABLE_NAME AS table_exists
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'
     LIMIT 1`,
  );
  return Boolean(rows[0]?.table_exists);
}

async function ensureSchemaMigrations(connection: PoolConnection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      checksum_sha256 CHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'applied',
      started_at DATETIME(3) NOT NULL,
      applied_at DATETIME(3) NULL,
      duration_ms INT UNSIGNED NULL,
      error_message TEXT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_filename (filename),
      KEY idx_schema_migrations_status (status),
      KEY idx_schema_migrations_applied_at (applied_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function discoverMigrationFiles(options: MigrationRunnerOptions): Promise<MigrationFile[]> {
  const sqlDir = resolveSqlDir(options);
  const entries = await fs.readdir(sqlDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name);

  const orderCounts = new Map<number, string[]>();
  const migrations: MigrationFile[] = [];

  for (const filename of sqlFiles) {
    const match = MIGRATION_FILENAME_PATTERN.exec(filename);
    if (!match) {
      throw new Error(
        `Invalid migration filename "${filename}". Use NNN_lowercase_snake_case.sql.`,
      );
    }

    const order = Number(match[1]);
    const absolutePath = path.join(sqlDir, filename);
    const sql = await fs.readFile(absolutePath, 'utf8');
    const checksumSha256 = calculateMigrationChecksum(sql);

    orderCounts.set(order, [...(orderCounts.get(order) ?? []), filename]);
    migrations.push({
      filename,
      order,
      description: match[2],
      absolutePath,
      checksumSha256,
      sql,
      isDraft: filename.endsWith('_draft.sql'),
    });
  }

  for (const [order, filenames] of orderCounts.entries()) {
    if (filenames.length > 1) {
      throw new Error(
        `Duplicate migration order ${String(order).padStart(3, '0')}: ${filenames.join(', ')}`,
      );
    }
  }

  return migrations.sort((left, right) => left.order - right.order || left.filename.localeCompare(right.filename));
}

async function readAppliedMigrations(connection: PoolConnection): Promise<AppliedMigration[]> {
  const [rows] = await connection.query<AppliedMigrationRow[]>(
    `SELECT filename, checksum_sha256, status, started_at, applied_at, duration_ms, error_message
     FROM schema_migrations
     ORDER BY filename ASC`,
  );

  return rows.map((row) => ({
    filename: row.filename,
    checksumSha256: row.checksum_sha256,
    status: row.status,
    startedAt: row.started_at,
    appliedAt: row.applied_at,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
  }));
}

function buildReport(
  target: MigrationStatusReport['target'],
  schemaExists: boolean,
  localMigrations: MigrationFile[],
  appliedMigrations: AppliedMigration[],
): MigrationStatusReport {
  const localByName = new Map(localMigrations.map((migration) => [migration.filename, migration]));
  const appliedByName = new Map(appliedMigrations.map((migration) => [migration.filename, migration]));

  const pendingMigrations = localMigrations.filter(
    (migration) => !migration.isDraft && !appliedByName.has(migration.filename),
  );
  const draftMigrations = localMigrations.filter((migration) => migration.isDraft);
  const checksumMismatches = appliedMigrations.flatMap((applied) => {
    const local = localByName.get(applied.filename);
    if (!local || matchesMigrationChecksum(local.sql, applied.checksumSha256)) return [];
    return [
      {
        filename: applied.filename,
        expected: applied.checksumSha256,
        actual: local.checksumSha256,
      },
    ];
  });
  const missingLocalMigrations = appliedMigrations.filter(
    (migration) => !localByName.has(migration.filename),
  );
  const failedMigrations = appliedMigrations.filter((migration) => migration.status === 'failed');

  const state =
    checksumMismatches.length > 0 ||
    missingLocalMigrations.length > 0 ||
    failedMigrations.length > 0 ||
    draftMigrations.length > 0
      ? 'blocked'
      : pendingMigrations.length > 0
        ? 'pending'
        : schemaExists
          ? 'current'
          : 'drifted';

  return {
    target,
    schemaMigrationsExists: schemaExists,
    localMigrations,
    appliedMigrations,
    pendingMigrations,
    draftMigrations,
    checksumMismatches,
    missingLocalMigrations,
    failedMigrations,
    state,
  };
}

export async function getMigrationStatus(
  options: MigrationRunnerOptions,
): Promise<MigrationStatusReport> {
  const env = options.env ?? process.env;
  const targetInfo = options.allowSchemaBootstrap
    ? readTargetBeforeConnection(env)
    : null;

  if (targetInfo) {
    validateMigrationMutationSafety(targetInfo.target, env);
  }

  const context = targetInfo
    ? await createContextForTarget(options, targetInfo.databaseUrl, targetInfo.target)
    : await createContext(options);
  try {
    const localMigrations = await discoverMigrationFiles(options);
    let schemaExists = await schemaMigrationsExists(context.connection);

    if (!schemaExists && options.allowSchemaBootstrap) {
      await ensureSchemaMigrations(context.connection);
      schemaExists = true;
    }

    const appliedMigrations = schemaExists
      ? await readAppliedMigrations(context.connection)
      : [];

    return buildReport(context.target, schemaExists, localMigrations, appliedMigrations);
  } finally {
    await closeContext(context);
  }
}

function assertNoBlockingStatus(report: MigrationStatusReport) {
  if (report.draftMigrations.length > 0) {
    throw new Error(
      `Draft migrations are present and will not be executed: ${report.draftMigrations
        .map((migration) => migration.filename)
        .join(', ')}. Rename only after review and approval.`,
    );
  }

  if (report.checksumMismatches.length > 0) {
    throw new Error('Applied migration checksum drift detected. Refusing to apply pending migrations.');
  }

  if (report.missingLocalMigrations.length > 0) {
    throw new Error('Applied migrations are missing locally. Refusing to apply pending migrations.');
  }

  if (report.failedMigrations.length > 0) {
    throw new Error('Failed migration records exist. Resolve them manually before continuing.');
  }
}

async function applyMigration(connection: PoolConnection, migration: MigrationFile) {
  const startedAt = new Date();
  const start = Date.now();

  await connection.beginTransaction();
  try {
    await connection.query(migration.sql);
    await connection.query(
      `INSERT INTO schema_migrations
        (filename, checksum_sha256, status, started_at, applied_at, duration_ms)
       VALUES (?, ?, 'applied', ?, CURRENT_TIMESTAMP(3), ?)`,
      [migration.filename, migration.checksumSha256, startedAt, Date.now() - start],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export async function migrate(options: MigrationRunnerOptions): Promise<MigrationStatusReport> {
  const env = options.env ?? process.env;
  const { databaseUrl, target } = readTargetBeforeConnection(env);
  validateMigrationMutationSafety(target, env);

  const context = await createContextForTarget(options, databaseUrl, target);
  const lockTimeout = Number(env.DB_MIGRATION_LOCK_TIMEOUT_SECONDS ?? DEFAULT_LOCK_TIMEOUT_SECONDS);

  try {
    await ensureSchemaMigrations(context.connection);
    await acquireMigrationLock(context.connection, lockTimeout);

    const localMigrations = await discoverMigrationFiles(options);
    const appliedMigrations = await readAppliedMigrations(context.connection);
    const report = buildReport(context.target, true, localMigrations, appliedMigrations);
    assertNoBlockingStatus(report);

    for (const migration of report.pendingMigrations) {
      await applyMigration(context.connection, migration);
    }

    const finalAppliedMigrations = await readAppliedMigrations(context.connection);
    return buildReport(context.target, true, localMigrations, finalAppliedMigrations);
  } finally {
    try {
      await releaseMigrationLock(context.connection);
    } catch {
      // The connection may already be unusable after a database error.
    }
    await closeContext(context);
  }
}

export function printMigrationStatus(report: MigrationStatusReport) {
  console.log(`Target: ${formatMigrationTarget(report.target)}`);
  console.log(`schema_migrations: ${report.schemaMigrationsExists ? 'present' : 'missing'}`);
  console.log(`Local migrations: ${report.localMigrations.length}`);
  console.log(`Applied migrations: ${report.appliedMigrations.length}`);
  console.log(`Pending migrations: ${report.pendingMigrations.length}`);
  console.log(`Draft migrations: ${report.draftMigrations.length}`);
  console.log(`State: ${report.state}`);

  if (report.pendingMigrations.length > 0) {
    console.log('\nPending:');
    for (const migration of report.pendingMigrations) console.log(`- ${migration.filename}`);
  }

  if (report.draftMigrations.length > 0) {
    console.log('\nDraft migrations blocked from execution:');
    for (const migration of report.draftMigrations) console.log(`- ${migration.filename}`);
  }

  if (report.checksumMismatches.length > 0) {
    console.log('\nChecksum mismatches:');
    for (const mismatch of report.checksumMismatches) console.log(`- ${mismatch.filename}`);
  }

  if (report.missingLocalMigrations.length > 0) {
    console.log('\nApplied records missing local files:');
    for (const migration of report.missingLocalMigrations) console.log(`- ${migration.filename}`);
  }

  if (report.failedMigrations.length > 0) {
    console.log('\nFailed migration records:');
    for (const migration of report.failedMigrations) console.log(`- ${migration.filename}`);
  }
}
