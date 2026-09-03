import * as dotenv from "dotenv";
import * as path from "path";
import { createPool, type RowDataPacket } from "mysql2/promise";
import { parseMigrationDatabaseUrl } from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const target = parseMigrationDatabaseUrl(process.env.DATABASE_URL);
const pool = createPool({ host: target.host, port: Number(target.port), user: target.username, password: target.password, database: target.database, connectionLimit: 1 });

async function main() {
  const [tables] = await pool.query<RowDataPacket[]>("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('notifications','notification_push_devices','notification_push_deliveries') ORDER BY table_name");
  const [columns] = await pool.query<RowDataPacket[]>("SELECT column_name, column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'importance'");
  const [grants] = await pool.query<RowDataPacket[]>("SELECT r.name role_name, COUNT(*) grant_count FROM `role` r INNER JOIN permission p ON p.roleId = r.id WHERE p.resource = 'notifications' AND p.action = 'read' GROUP BY r.name ORDER BY r.name");
  const [counts] = await pool.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM notifications) notifications, (SELECT COUNT(*) FROM notification_push_devices) devices, (SELECT COUNT(*) FROM notification_push_deliveries) deliveries");
  console.log(JSON.stringify({ target: `${target.host}/${target.database}`, tables: tables.map((row) => row.TABLE_NAME ?? row.table_name), columns, grants, counts: counts[0] }, null, 2));
}
void main().finally(() => pool.end());
