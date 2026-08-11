import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

export type QueryParam =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | null;

export type QueryParams = readonly QueryParam[];

export type DatabaseConnection = Pick<PoolConnection, 'execute' | 'query'>;

export type DatabaseTransaction = PoolConnection;

export type DbRow = RowDataPacket;

export type DbResult = ResultSetHeader;
