import { ListResourcesResult, ReadResourceResult, ReadResourceRequest } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseManager } from './database.js';

export class ResourceHandlers {
  private readonly SCHEMA_PATH = 'schema';
  private readonly resourceBaseUrl = new URL('postgres://localhost/');

  constructor(private dbManager: DatabaseManager) {}

  async handleListResources(): Promise<ListResourcesResult> {
    const pool = this.dbManager.getCurrentPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      
      return {
        resources: result.rows.map(row => ({
          uri: new URL(`${row.table_name}/${this.SCHEMA_PATH}`, this.resourceBaseUrl).href,
          mimeType: 'application/json',
          name: `"${row.table_name}" database schema`,
        })),
      };
    } finally {
      client.release();
    }
  }

  async handleReadResource(request: ReadResourceRequest): Promise<ReadResourceResult> {
    if (!request.params.uri) {
      throw new Error('Resource URI is required');
    }

    let resourceUrl: URL;
    try {
      resourceUrl = new URL(request.params.uri);
    } catch (error) {
      throw new Error(`Invalid resource URI: ${request.params.uri}`);
    }

    const pathComponents = resourceUrl.pathname.split('/');
    const schema = pathComponents.pop();
    const tableName = pathComponents.pop();

    if (schema !== this.SCHEMA_PATH) {
      throw new Error('Invalid resource URI');
    }

    const pool = this.dbManager.getCurrentPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
        [tableName]
      );

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } finally {
      client.release();
    }
  }
}