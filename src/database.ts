import { Pool } from 'pg';
import { Config, DatabaseConfig, buildConnectionString, resolveEnvironmentVariables } from './config.js';

export class DatabaseManager {
  private pools: Record<string, Pool> = {};
  private databases: Record<string, DatabaseConfig> = {};
  private currentDatabase: string;
  private pool: Pool;

  constructor(config: Config) {
    const envVars = resolveEnvironmentVariables(config);
    
    this.databases = config.environments
      ? Object.fromEntries(config.environments.map(env => [env.name, env.database]))
      : config.databases || {};

    for (const [dbName, dbConfig] of Object.entries(this.databases)) {
      const connectionString = buildConnectionString(dbConfig, envVars);
      this.pools[dbName] = new Pool({
        connectionString,
        max: dbConfig.poolSize || 10,
      });
    }

    this.currentDatabase = Object.keys(this.databases)[0];
    this.pool = this.pools[this.currentDatabase];
  }

  getCurrentDatabase(): string {
    return this.currentDatabase;
  }

  getCurrentPool(): Pool {
    return this.pool;
  }

  getDatabases(): Record<string, DatabaseConfig> {
    return this.databases;
  }

  getPools(): Record<string, Pool> {
    return this.pools;
  }

  switchDatabase(databaseName: string): void {
    if (!this.pools[databaseName]) {
      throw new Error(`Database configuration '${databaseName}' not found`);
    }
    this.currentDatabase = databaseName;
    this.pool = this.pools[databaseName];
  }

  async closeAll(): Promise<void> {
    const closePromises = Object.values(this.pools).map(pool => pool.end());
    await Promise.all(closePromises);
  }
}