import * as dotenv from "dotenv";
import * as path from "path";
import { createPool, type RowDataPacket } from "mysql2/promise";
import { parseMigrationDatabaseUrl } from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const target = parseMigrationDatabaseUrl(process.env.DATABASE_URL);
const pool = createPool({
  host: target.host,
  port: Number(target.port),
  user: target.username,
  password: target.password,
  database: target.database,
  connectionLimit: 1,
});

async function main() {
  const [tables] = await pool.query<RowDataPacket[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('file_assets','gallery_entries') ORDER BY table_name",
  );
  const [grants] = await pool.query<RowDataPacket[]>(
    "SELECT r.name role_name, GROUP_CONCAT(CONCAT(p.resource, ':', p.action) ORDER BY p.action SEPARATOR ',') grants FROM `role` r LEFT JOIN permission p ON p.roleId = r.id AND p.resource = 'gallery' GROUP BY r.id, r.name HAVING grants IS NOT NULL ORDER BY r.name",
  );
  const [counts] = await pool.query<RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM file_assets) file_assets, (SELECT COUNT(*) FROM gallery_entries) gallery_entries",
  );
  console.log(
    JSON.stringify(
      {
        target: `${target.host}/${target.database}`,
        tables: tables.map((row) => row.TABLE_NAME ?? row.table_name),
        grants,
        counts: counts[0],
      },
      null,
      2,
    ),
  );
}
main().finally(() => pool.end());
