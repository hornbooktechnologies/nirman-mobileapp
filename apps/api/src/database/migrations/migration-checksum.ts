import * as crypto from 'node:crypto';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeLineEndings(sql: string): string {
  return sql.replace(/\r\n?/g, '\n');
}

export function calculateMigrationChecksum(sql: string): string {
  return sha256(normalizeLineEndings(sql));
}

export function matchesMigrationChecksum(sql: string, appliedChecksum: string): boolean {
  const normalizedSql = normalizeLineEndings(sql);

  return (
    appliedChecksum === sha256(normalizedSql) ||
    appliedChecksum === sha256(normalizedSql.replace(/\n/g, '\r\n'))
  );
}
