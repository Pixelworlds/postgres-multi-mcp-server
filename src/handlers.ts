import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Config } from './config.js';
import { DatabaseManager } from './database.js';
import {
    createFunctionErrorResponse, createIndexErrorResponse, createQueryErrorResponse, createTableErrorResponse,
    createTableOperationErrorResponse, createTriggerErrorResponse
} from './errorHandling.js';

export class ToolHandlers {
  constructor(private dbManager: DatabaseManager, private config: Config) {}

  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'switchDatabase':
        return this.handleSwitchDatabase(args?.database as string);

      case 'listDatabases':
        return this.handleListDatabases();

      case 'query':
        return this.handleQuery(args?.sql as string);

      case 'execute':
        return this.handleExecute(args?.sql as string);

      case 'insert':
        return this.handleInsert(args?.table as string, args?.data as Record<string, any>);

      case 'update':
        return this.handleUpdate(args?.table as string, args?.data as Record<string, any>, args?.where as string);

      case 'delete':
        return this.handleDelete(args?.table as string, args?.where as string);

      case 'createTable':
        return this.handleCreateTable(
          args?.tableName as string,
          args?.columns as Array<{ name: string; type: string; constraints?: string }>,
          args?.constraints as Array<string>
        );

      case 'createFunction':
        return this.handleCreateFunction(
          args?.name as string,
          args?.parameters as string,
          args?.returnType as string,
          args?.language as string,
          args?.body as string,
          args?.options as string
        );

      case 'createTrigger':
        return this.handleCreateTrigger(
          args?.name as string,
          args?.tableName as string,
          args?.functionName as string,
          args?.when as string,
          args?.events as string[],
          args?.forEach as string,
          args?.condition as string
        );

      case 'createIndex':
        return this.handleCreateIndex(
          args?.tableName as string,
          args?.indexName as string,
          args?.columns as string[],
          args?.unique as boolean,
          args?.type as string,
          args?.where as string
        );

      case 'alterTable':
        return this.handleAlterTable(args?.tableName as string, args?.operation as string, args?.details as string);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async handleSwitchDatabase(database: string): Promise<CallToolResult> {
    this.dbManager.switchDatabase(database);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: `Switched to database: ${database}`,
              currentDatabase: database,
              availableDatabases: Object.keys(this.dbManager.getDatabases()),
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }

  private async handleListDatabases(): Promise<CallToolResult> {
    const databases = this.dbManager.getDatabases();
    const currentDatabase = this.dbManager.getCurrentDatabase();

    const databaseInfo = this.config.environments
      ? this.config.environments.map(env => ({
          name: env.name,
          displayName: env.displayName,
          type: env.database.type,
          host: env.database.host,
          database: env.database.database,
          current: env.name === currentDatabase,
        }))
      : Object.entries(databases).map(([name, dbConfig]) => ({
          name,
          type: dbConfig.type,
          host: dbConfig.host,
          database: dbConfig.database,
          current: name === currentDatabase,
        }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              currentDatabase,
              databases: databaseInfo,
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }

  private async handleQuery(sql: string): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        await client.query('BEGIN TRANSACTION READ ONLY');
        try {
          const queryResult = await client.query(sql);
          await client.query('ROLLBACK');
          return queryResult;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return createQueryErrorResponse(error, sql);
    }
  }

  private async handleExecute(sql: string): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        await client.query('BEGIN');
        try {
          const queryResult = await client.query(sql);
          await client.query('COMMIT');
          return queryResult;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                command: result.command,
                rowCount: result.rowCount,
                rows: result.rows,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createQueryErrorResponse(error, sql);
    }
  }

  private async handleInsert(table: string, data: Record<string, any>): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        await client.query('BEGIN');
        try {
          const queryResult = await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
          );
          await client.query('COMMIT');
          return queryResult;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createTableErrorResponse(error, table, 'INSERT');
    }
  }

  private async handleUpdate(table: string, data: Record<string, any>, where: string): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const setClause = Object.entries(data)
          .map(([col, _], i) => `${col} = $${i + 1}`)
          .join(', ');

        await client.query('BEGIN');
        try {
          const queryResult = await client.query(
            `UPDATE ${table} SET ${setClause} WHERE ${where} RETURNING *`,
            Object.values(data)
          );
          await client.query('COMMIT');
          return queryResult;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createTableErrorResponse(error, table, 'UPDATE');
    }
  }

  private async handleDelete(table: string, where: string): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        await client.query('BEGIN');
        try {
          const queryResult = await client.query(`DELETE FROM ${table} WHERE ${where} RETURNING *`);
          await client.query('COMMIT');
          return queryResult;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createTableErrorResponse(error, table, 'DELETE');
    }
  }

  private async handleCreateTable(
    tableName: string,
    columns: Array<{ name: string; type: string; constraints?: string }>,
    constraints?: Array<string>
  ): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const columnDefinitions = columns
          .map(col => `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`)
          .join(', ');

        const tableConstraints = constraints ? ', ' + constraints.join(', ') : '';
        const createTableSQL = `CREATE TABLE ${tableName} (${columnDefinitions}${tableConstraints})`;

        await client.query('BEGIN');
        try {
          await client.query(createTableSQL);
          await client.query('COMMIT');
          return { sql: createTableSQL };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Table ${tableName} created successfully`,
                sql: result.sql,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createTableOperationErrorResponse(error, tableName, 'CREATE TABLE');
    }
  }

  private async handleCreateFunction(
    name: string,
    parameters: string,
    returnType: string,
    language: string,
    body: string,
    options?: string
  ): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION ${name}(${parameters})
        RETURNS ${returnType}
        LANGUAGE ${language}
        ${options || ''}
        AS $$
        ${body}
        $$;
      `;

        await client.query('BEGIN');
        try {
          await client.query(createFunctionSQL);
          await client.query('COMMIT');
          return { sql: createFunctionSQL };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Function ${name} created successfully`,
                sql: result.sql,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createFunctionErrorResponse(error, name);
    }
  }

  private async handleCreateTrigger(
    name: string,
    tableName: string,
    functionName: string,
    when: string,
    events: string[],
    forEach: string,
    condition?: string
  ): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const eventStr = events.join(' OR ');
        const whenClause = condition ? `WHEN (${condition})` : '';

        const createTriggerSQL = `
        CREATE TRIGGER ${name}
        ${when} ${eventStr}
        ON ${tableName}
        FOR EACH ${forEach}
        ${whenClause}
        EXECUTE FUNCTION ${functionName}();
      `;

        await client.query('BEGIN');
        try {
          await client.query(createTriggerSQL);
          await client.query('COMMIT');
          return { sql: createTriggerSQL };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Trigger ${name} created successfully on table ${tableName}`,
                sql: result.sql,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createTriggerErrorResponse(error, name, tableName);
    }
  }

  private async handleCreateIndex(
    tableName: string,
    indexName: string,
    columns: string[],
    unique?: boolean,
    type?: string,
    where?: string
  ): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const uniqueStr = unique ? 'UNIQUE' : '';
        const typeStr = type ? `USING ${type}` : '';
        const whereClause = where ? `WHERE ${where}` : '';

        const createIndexSQL = `
        CREATE ${uniqueStr} INDEX ${indexName}
        ON ${tableName} ${typeStr} (${columns.join(', ')})
        ${whereClause}
      `;

        await client.query('BEGIN');
        try {
          await client.query(createIndexSQL);
          await client.query('COMMIT');
          return { sql: createIndexSQL };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Index ${indexName} created successfully on table ${tableName}`,
                sql: result.sql,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createIndexErrorResponse(error, indexName, tableName);
    }
  }

  private async handleAlterTable(tableName: string, operation: string, details: string): Promise<CallToolResult> {
    try {
      const result = await this.dbManager.executeWithConnection(async client => {
        const alterTableSQL = `ALTER TABLE ${tableName} ${operation} ${details}`;

        await client.query('BEGIN');
        try {
          await client.query(alterTableSQL);
          await client.query('COMMIT');
          return { sql: alterTableSQL };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Table ${tableName} altered successfully`,
                sql: result.sql,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return createTableOperationErrorResponse(error, tableName, operation);
    }
  }
}
