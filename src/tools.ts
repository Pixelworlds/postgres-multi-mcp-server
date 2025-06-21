import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const createToolDefinitions = (databaseNames: string[]): Tool[] => {
  return [
    {
      name: 'switchDatabase',
      description: 'Switch to a different database configuration',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: databaseNames,
            description: `Available databases: ${databaseNames.join(', ')}`,
          },
        },
        required: ['database'],
      },
    },
    {
      name: 'listDatabases',
      description: 'List all available database configurations',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'query',
      description: 'Run a read-only SQL query',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string' },
        },
      },
    },
    {
      name: 'execute',
      description: 'Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE)',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string' },
        },
      },
    },
    {
      name: 'insert',
      description: 'Insert a new record into a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          data: {
            type: 'object',
            additionalProperties: true,
          },
        },
        required: ['table', 'data'],
      },
    },
    {
      name: 'update',
      description: 'Update records in a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          data: {
            type: 'object',
            additionalProperties: true,
          },
          where: { type: 'string' },
        },
        required: ['table', 'data', 'where'],
      },
    },
    {
      name: 'delete',
      description: 'Delete records from a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          where: { type: 'string' },
        },
        required: ['table', 'where'],
      },
    },
    {
      name: 'createTable',
      description: 'Create a new table with specified columns and constraints',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: { type: 'string' },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                constraints: { type: 'string', description: 'Optional constraints like NOT NULL, UNIQUE, etc.' },
              },
              required: ['name', 'type'],
            },
          },
          constraints: {
            type: 'array',
            items: {
              type: 'string',
              description: 'Table-level constraints like PRIMARY KEY, FOREIGN KEY, etc.',
            },
          },
        },
        required: ['tableName', 'columns'],
      },
    },
    {
      name: 'createFunction',
      description: 'Create a PostgreSQL function/procedure',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          parameters: { type: 'string' },
          returnType: { type: 'string' },
          language: { type: 'string', description: 'plpgsql, sql, etc.' },
          body: { type: 'string' },
          options: { type: 'string', description: 'Additional function options' },
        },
        required: ['name', 'parameters', 'returnType', 'language', 'body'],
      },
    },
    {
      name: 'createTrigger',
      description: 'Create a trigger on a table',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tableName: { type: 'string' },
          functionName: { type: 'string' },
          when: { type: 'string', description: 'BEFORE, AFTER, or INSTEAD OF' },
          events: {
            type: 'array',
            items: { type: 'string', description: 'INSERT, UPDATE, DELETE' },
          },
          forEach: { type: 'string', description: 'ROW or STATEMENT' },
          condition: { type: 'string', description: 'Optional WHEN condition' },
        },
        required: ['name', 'tableName', 'functionName', 'when', 'events', 'forEach'],
      },
    },
    {
      name: 'createIndex',
      description: 'Create an index on a table',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: { type: 'string' },
          indexName: { type: 'string' },
          columns: {
            type: 'array',
            items: { type: 'string' },
          },
          unique: { type: 'boolean' },
          type: { type: 'string', description: 'BTREE, HASH, GIN, GIST, etc.' },
          where: { type: 'string', description: 'Optional condition' },
        },
        required: ['tableName', 'indexName', 'columns'],
      },
    },
    {
      name: 'alterTable',
      description: 'Alter a table structure',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: { type: 'string' },
          operation: {
            type: 'string',
            description: 'ADD COLUMN, DROP COLUMN, ALTER COLUMN, etc.',
          },
          details: { type: 'string', description: 'Specific details for the operation' },
        },
        required: ['tableName', 'operation', 'details'],
      },
    },
  ];
};
