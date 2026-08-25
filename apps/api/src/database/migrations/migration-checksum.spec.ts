import * as crypto from 'node:crypto';
import {
  calculateMigrationChecksum,
  matchesMigrationChecksum,
} from './migration-checksum';

describe('migration checksums', () => {
  const lfSql = 'CREATE TABLE example (\n  id INT NOT NULL\n);\n';
  const crlfSql = lfSql.replace(/\n/g, '\r\n');

  it('uses the same canonical checksum for LF and CRLF files', () => {
    expect(calculateMigrationChecksum(lfSql)).toBe(calculateMigrationChecksum(crlfSql));
  });

  it('accepts a legacy raw CRLF checksum for an LF checkout', () => {
    const legacyCrlfChecksum = crypto
      .createHash('sha256')
      .update(crlfSql)
      .digest('hex');

    expect(matchesMigrationChecksum(lfSql, legacyCrlfChecksum)).toBe(true);
  });

  it('rejects a checksum when SQL content changed', () => {
    expect(matchesMigrationChecksum(`${lfSql}ALTER TABLE example ADD name TEXT;\n`, calculateMigrationChecksum(lfSql))).toBe(
      false,
    );
  });
});
