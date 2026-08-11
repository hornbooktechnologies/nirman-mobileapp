import { MigrationTarget } from './migration-types';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const MUTATION_CONFIRMATION = 'I_UNDERSTAND_THIS_MUTATES_THE_DATABASE';

export interface ParsedMigrationDatabaseUrl {
  protocol: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

export function parseMigrationDatabaseUrl(
  databaseUrl: string,
): ParsedMigrationDatabaseUrl {
  const protocolMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//.exec(databaseUrl);
  if (!protocolMatch) {
    throw new Error('DATABASE_URL must start with mysql:// or mariadb:// for migrations.');
  }

  const protocol = protocolMatch[1];
  const withoutProtocol = databaseUrl.slice(protocolMatch[0].length);
  const pathStart = withoutProtocol.indexOf('/');
  if (pathStart === -1) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  const authority = withoutProtocol.slice(0, pathStart);
  const pathAndQuery = withoutProtocol.slice(pathStart + 1);
  const queryStart = pathAndQuery.indexOf('?');
  const database = (queryStart === -1 ? pathAndQuery : pathAndQuery.slice(0, queryStart)).trim();
  const atIndex = authority.lastIndexOf('@');
  const authPart = atIndex === -1 ? '' : authority.slice(0, atIndex);
  const hostPort = atIndex === -1 ? authority : authority.slice(atIndex + 1);
  const credentialSeparator = authPart.indexOf(':');
  const username = credentialSeparator === -1 ? authPart : authPart.slice(0, credentialSeparator);
  const password = credentialSeparator === -1 ? '' : authPart.slice(credentialSeparator + 1);

  let host = hostPort;
  let port = '3306';
  if (hostPort.startsWith('[')) {
    const closingBracket = hostPort.indexOf(']');
    host = hostPort.slice(1, closingBracket);
    const remaining = hostPort.slice(closingBracket + 1);
    if (remaining.startsWith(':')) port = remaining.slice(1);
  } else {
    const colonIndex = hostPort.lastIndexOf(':');
    if (colonIndex > -1) {
      host = hostPort.slice(0, colonIndex);
      port = hostPort.slice(colonIndex + 1);
    }
  }

  return {
    protocol,
    host,
    port,
    database,
    username,
    password,
  };
}

export function parseMigrationTarget(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): MigrationTarget {
  const parsed = parseMigrationDatabaseUrl(databaseUrl);
  const protocol = parsed.protocol;

  if (protocol !== 'mysql' && protocol !== 'mariadb') {
    throw new Error('DATABASE_URL must use mysql:// or mariadb:// for migrations.');
  }

  if (!parsed.host || !parsed.database) {
    throw new Error('DATABASE_URL must include a host and database name.');
  }

  const safety = LOCAL_HOSTS.has(parsed.host.toLowerCase()) ? 'local' : 'remote';
  const productionPattern = /prod|production/i;

  return {
    protocol,
    host: parsed.host,
    port: parsed.port,
    database: parsed.database,
    username: parsed.username,
    safety,
    isProductionLike:
      productionPattern.test(parsed.host) ||
      productionPattern.test(parsed.database) ||
      env.NODE_ENV === 'production',
  };
}

export function validateMigrationMutationSafety(
  target: MigrationTarget,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.DB_MIGRATION_CONFIRM !== MUTATION_CONFIRMATION) {
    throw new Error(
      `Refusing to mutate database. Set DB_MIGRATION_CONFIRM=${MUTATION_CONFIRMATION} only after confirming the target is safe.`,
    );
  }

  if (target.safety === 'remote' && env.DB_MIGRATION_ALLOW_REMOTE !== 'true') {
    throw new Error(
      'Refusing to mutate a non-local database. Set DB_MIGRATION_ALLOW_REMOTE=true only for an approved safe target.',
    );
  }

  if (target.isProductionLike && env.DB_MIGRATION_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      'Refusing to mutate a production-like database target without DB_MIGRATION_ALLOW_PRODUCTION=true and a separately approved process.',
    );
  }
}

export function formatMigrationTarget(target: MigrationTarget): string {
  const user = target.username ? `${target.username}@` : '';
  return `${target.protocol}://${user}${target.host}:${target.port}/${target.database} (${target.safety})`;
}
