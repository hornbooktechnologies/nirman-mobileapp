import * as dotenv from "dotenv";
import * as path from "path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { parseMigrationDatabaseUrl } from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

interface CountRow extends RowDataPacket {
  tableCount: number;
}

interface RolePermissionRow extends RowDataPacket {
  roleName: string;
  permissionKeys: string;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const parsed = parseMigrationDatabaseUrl(process.env.DATABASE_URL);
  const connection = await createConnection({
    host: parsed.host,
    port: Number(parsed.port),
    user: parsed.username,
    password: parsed.password,
    database: parsed.database,
  });
  try {
    const [tables] = await connection.execute<CountRow[]>(
      `SELECT COUNT(*) tableCount
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'project_progress_updates'`,
    );
    const [roles] = await connection.execute<RolePermissionRow[]>(
      `SELECT r.name roleName,
        GROUP_CONCAT(CONCAT(p.resource, ':', p.action) ORDER BY p.action) permissionKeys
       FROM role r INNER JOIN permission p ON p.roleId = r.id
       WHERE p.resource = 'progress'
       GROUP BY r.name ORDER BY r.name`,
    );
    console.log(
      JSON.stringify(
        { tableCount: Number(tables[0]?.tableCount ?? 0), roles },
        null,
        2,
      ),
    );
  } finally {
    await connection.end();
  }
}

void main();
