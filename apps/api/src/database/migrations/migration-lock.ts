import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

interface LockRow extends RowDataPacket {
  lock_acquired: number | null;
}

const LOCK_NAME = 'nirmansite_schema_migrations';

export async function acquireMigrationLock(
  connection: PoolConnection,
  timeoutSeconds: number,
) {
  const [rows] = await connection.query<LockRow[]>(
    'SELECT GET_LOCK(?, ?) AS lock_acquired',
    [LOCK_NAME, timeoutSeconds],
  );

  if (rows[0]?.lock_acquired !== 1) {
    throw new Error('Could not acquire migration lock. Another migration may be running.');
  }
}

export async function releaseMigrationLock(connection: PoolConnection) {
  await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
}
