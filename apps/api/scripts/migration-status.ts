import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { getMigrationStatus, printMigrationStatus } from '../src/database/migrations/migration-runner';

const rootDir = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.join(rootDir, '.env') });

void getMigrationStatus({
  rootDir,
  sqlDir: process.env.DB_MIGRATION_SQL_DIR,
  allowSchemaBootstrap: process.env.DB_MIGRATION_BOOTSTRAP_STATUS === 'true',
})
  .then((report) => {
    printMigrationStatus(report);
    if (report.state === 'blocked' || report.state === 'drifted') {
      process.exitCode = 1;
    }
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
