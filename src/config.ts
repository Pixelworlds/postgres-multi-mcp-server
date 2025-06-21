export interface DatabaseConfig {
  type: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
  poolSize?: number;
}

export interface Environment {
  name: string;
  displayName: string;
  database: DatabaseConfig;
}

export interface EnvironmentVariable {
  name: string;
  description: string;
  default?: string;
}

export interface Config {
  environments?: Environment[];
  databases?: Record<string, DatabaseConfig>;
  environmentVariables?: EnvironmentVariable[];
}

export function loadConfig(): Config {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    try {
      const configData = args[0];
      return JSON.parse(configData) as Config;
    } catch (error) {
      console.error('Failed to parse config from command line argument:', error);
      process.exit(1);
    }
  }

  console.error('No configuration found. Please provide config as a command line argument.');
  process.exit(1);
}

export function resolveEnvironmentVariables(config: Config): Record<string, string> {
  const envVars: Record<string, string> = {};

  if (!config.environmentVariables) return envVars;

  for (const envVar of config.environmentVariables) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.default) {
        envVars[envVar.name] = envVar.default;
      } else {
        console.error(`Missing required environment variable: ${envVar.name}`);
        process.exit(1);
      }
    } else {
      envVars[envVar.name] = value;
    }
  }

  return envVars;
}

export function substituteVariables(text: string, envVars: Record<string, string>): string {
  let result = text;

  result = result.replace(/\$\{env:([^}]+)\}/g, (match, envName) => {
    const value = envVars[envName];
    if (value === undefined) {
      throw new Error(`Unknown environment variable: ${envName}`);
    }
    return value;
  });

  return result;
}

export function buildConnectionString(dbConfig: DatabaseConfig, envVars: Record<string, string>): string {
  if (dbConfig.connectionString) {
    return substituteVariables(dbConfig.connectionString, envVars);
  }

  const host = substituteVariables(dbConfig.host || 'localhost', envVars);
  const port = dbConfig.port || 5432;
  const database = substituteVariables(dbConfig.database || 'postgres', envVars);
  const username = dbConfig.username ? substituteVariables(dbConfig.username, envVars) : '';
  const password = dbConfig.password ? substituteVariables(dbConfig.password, envVars) : '';

  let connectionString = 'postgresql://';

  if (username) {
    const encodedUsername = encodeURIComponent(username);
    connectionString += encodedUsername;

    if (password) {
      const encodedPassword = encodeURIComponent(password);
      connectionString += `:${encodedPassword}`;
    }

    connectionString += '@';
  }
  connectionString += `${host}:${port}/${database}`;

  if (dbConfig.ssl) {
    connectionString += '?sslmode=require';
  }

  return connectionString;
}
