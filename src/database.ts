import { Client, Pool } from 'pg';

import { buildConnectionString, Config, DatabaseConfig, resolveEnvironmentVariables } from './config.js';

export class DatabaseManager {
  private databases: Record<string, DatabaseConfig> = {};
  private currentDatabase: string;
  private envVars: Record<string, string>;

  constructor(config: Config) {
    this.envVars = resolveEnvironmentVariables(config);

    this.databases = config.environments
      ? Object.fromEntries(config.environments.map(env => [env.name, env.database]))
      : config.databases || {};

    this.currentDatabase = Object.keys(this.databases)[0];
  }

  getCurrentDatabase(): string {
    return this.currentDatabase;
  }

  getDatabases(): Record<string, DatabaseConfig> {
    return this.databases;
  }

  switchDatabase(databaseName: string): void {
    if (!this.databases[databaseName]) {
      throw new Error(`Database configuration '${databaseName}' not found`);
    }
    this.currentDatabase = databaseName;
  }

  createConnection(): Client {
    const dbConfig = this.databases[this.currentDatabase];
    const connectionString = buildConnectionString(dbConfig, this.envVars);

    return new Client({
      connectionString,
      connectionTimeoutMillis: 10000,
    });
  }

  getCurrentPool(): Pool {
    const dbConfig = this.databases[this.currentDatabase];
    const connectionString = buildConnectionString(dbConfig, this.envVars);

    return new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }

  getPools(): Record<string, Pool> {
    return {};
  }

  async closeAll(): Promise<void> {
    return Promise.resolve();
  }

  async executeWithConnection<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    const client = this.createConnection();

    try {
      await client.connect();
      return await operation(client);
    } finally {
      await client.end();
    }
  }
}
