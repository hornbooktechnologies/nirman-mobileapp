import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { migrate, printMigrationStatus } from '../src/database/migrations/migration-runner';

const rootDir = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.join(rootDir, '.env') });

void migrate({
  rootDir,
  sqlDir: process.env.DB_MIGRATION_SQL_DIR,
})
  .then((report) => {
    printMigrationStatus(report);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
