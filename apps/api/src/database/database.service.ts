import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  createPool,
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';
import { parseMigrationDatabaseUrl } from './migrations/migration-safety';
import {
  DatabaseConnection,
  DatabaseTransaction,
  QueryParams,
} from './database.types';

const DEFAULT_CONNECTION_LIMIT = 5;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for mysql2 database access.');
    }

    const parsedDatabaseUrl = parseMigrationDatabaseUrl(databaseUrl);

    this.pool = createPool({
      host: parsedDatabaseUrl.host,
      port: Number(parsedDatabaseUrl.port),
      user: parsedDatabaseUrl.username,
      password: parsedDatabaseUrl.password,
      database: parsedDatabaseUrl.database,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? DEFAULT_CONNECTION_LIMIT),
      decimalNumbers: false,
      // SQL DATE values are calendar dates, not instants. Returning them as
      // Date objects lets a later toISOString() shift the day in positive UTC
      // offsets (for example, 2026-08-15 became 2026-08-14 in Asia/Kolkata).
      // Keep only DATE columns as YYYY-MM-DD strings; DATETIME/TIMESTAMP values
      // remain Date objects for the existing timestamp mappings.
      dateStrings: ["DATE"],
    });
  }

  async query<T extends RowDataPacket>(
    sql: string,
    params: QueryParams = [],
    connection: DatabaseConnection = this.pool,
  ): Promise<T[]> {
    const [rows] = await connection.execute<T[]>(sql, [...params]);
    return rows;
  }

  async execute(
    sql: string,
    params: QueryParams = [],
    connection: DatabaseConnection = this.pool,
  ): Promise<ResultSetHeader> {
    const [result] = await connection.execute<ResultSetHeader>(sql, [...params]);
    return result;
  }

  async transaction<T>(
    callback: (connection: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async ping(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.ping();
    } finally {
      connection.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
