import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface DatabaseErrorContext {
  sql?: string;
  table?: string;
  tableName?: string;
  functionName?: string;
  triggerName?: string;
  indexName?: string;
  operation?: string;
  [key: string]: any;
}

export const createErrorResponse = (error: Error | unknown, context: DatabaseErrorContext = {}): CallToolResult => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error: errorMessage,
            ...context,
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
};

export const createQueryErrorResponse = (error: Error | unknown, sql: string): CallToolResult => {
  return createErrorResponse(error, { sql });
};

export const createTableErrorResponse = (error: Error | unknown, table: string, operation?: string): CallToolResult => {
  const context: DatabaseErrorContext = { table };
  if (operation) {
    context.operation = operation;
  }
  return createErrorResponse(error, context);
};

export const createFunctionErrorResponse = (error: Error | unknown, functionName: string): CallToolResult => {
  return createErrorResponse(error, { functionName });
};

export const createTriggerErrorResponse = (
  error: Error | unknown,
  triggerName: string,
  tableName: string
): CallToolResult => {
  return createErrorResponse(error, { triggerName, tableName });
};

export const createIndexErrorResponse = (
  error: Error | unknown,
  indexName: string,
  tableName: string
): CallToolResult => {
  return createErrorResponse(error, { indexName, tableName });
};

export const createTableOperationErrorResponse = (
  error: Error | unknown,
  tableName: string,
  operation: string
): CallToolResult => {
  return createErrorResponse(error, { tableName, operation });
};
