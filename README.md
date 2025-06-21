# PostgreSQL Multi-Environment MCP Server

A Model Context Protocol server that provides both read and write access to PostgreSQL databases across multiple environments. This server enables LLMs to inspect database schemas, execute queries, modify data, create/modify database schema objects, and switch between different database environments (production, staging, demo, development, etc.).

> **Note:** This is a multi-environment version based on the [Enhanced PostgreSQL MCP Server](https://github.com/garethcott/enhanced-postgres-mcp-server) by Gareth Cottrell, which itself is based on the original [PostgreSQL MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres) by Anthropic. The original server provides read-only access to a single database, the enhanced version adds write capabilities and schema management, and this multi-environment version adds support for unlimited database environments with runtime configuration.

## Components

### Tools

#### Data Query
- **query**
  - Execute read-only SQL queries against the connected database
  - Input: `sql` (string): The SQL query to execute
  - All queries are executed within a READ ONLY transaction

#### Data Modification
- **execute**
  - Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE)
  - Input: `sql` (string): The SQL statement to execute
  - Executed within a transaction with proper COMMIT/ROLLBACK handling

- **insert**
  - Insert a new record into a table
  - Input: 
    - `table` (string): The table name
    - `data` (object): Key-value pairs where keys are column names and values are the data to insert

- **update**
  - Update records in a table
  - Input: 
    - `table` (string): The table name
    - `data` (object): Key-value pairs for the fields to update
    - `where` (string): The WHERE condition to identify records to update

- **delete**
  - Delete records from a table
  - Input: 
    - `table` (string): The table name
    - `where` (string): The WHERE condition to identify records to delete

#### Schema Management
- **createTable**
  - Create a new table with specified columns and constraints
  - Input:
    - `tableName` (string): The table name
    - `columns` (array): Array of column definitions with name, type, and optional constraints
    - `constraints` (array): Optional array of table-level constraints

- **createFunction**
  - Create a PostgreSQL function/procedure
  - Input:
    - `name` (string): Function name
    - `parameters` (string): Function parameters
    - `returnType` (string): Return type
    - `language` (string): Language (plpgsql, sql, etc.)
    - `body` (string): Function body
    - `options` (string): Optional additional function options

- **createTrigger**
  - Create a trigger on a table
  - Input:
    - `name` (string): Trigger name
    - `tableName` (string): Table to apply trigger to
    - `functionName` (string): Function to call
    - `when` (string): BEFORE, AFTER, or INSTEAD OF
    - `events` (array): Array of events (INSERT, UPDATE, DELETE)
    - `forEach` (string): ROW or STATEMENT
    - `condition` (string): Optional WHEN condition

- **createIndex**
  - Create an index on a table
  - Input:
    - `tableName` (string): Table name
    - `indexName` (string): Index name
    - `columns` (array): Columns to index
    - `unique` (boolean): Whether the index is unique
    - `type` (string): Optional index type (BTREE, HASH, GIN, GIST, etc.)
    - `where` (string): Optional condition

- **alterTable**
  - Alter a table structure
  - Input:
    - `tableName` (string): Table name
    - `operation` (string): Operation (ADD COLUMN, DROP COLUMN, etc.)
    - `details` (string): Operation details

### Resources

The server provides schema information for each table in the database:

- **Table Schemas** (`postgres://<host>/<table>/schema`)
  - JSON schema information for each table
  - Includes column names and data types
  - Automatically discovered from database metadata

## Configuration

The server supports multiple database configurations passed directly from the MCP server configuration. This allows you to switch between different databases (production, staging, demo, development, or any custom environments) without restarting the server.

### Configuration Structure

The configuration supports an arbitrary number of environments using a standardized structure. Configuration is provided as a JSON string via command line argument.

The configuration structure is:

```json
{
  "environments": [
    {
      "name": "production",
      "displayName": "Production",
      "database": {
        "type": "postgres",
        "host": "prod-db.example.com",
        "port": 5432,
        "database": "prod_app",
        "username": "prod_user",
        "password": "prod_password",
        "ssl": true,
        "poolSize": 10
      }
    },
    {
      "name": "staging",
      "displayName": "Staging",
      "database": {
        "type": "postgres",
        "host": "staging-db.example.com",
        "port": 5432,
        "database": "staging_app",
        "username": "staging_user",
        "password": "staging_password",
        "ssl": true,
        "poolSize": 5
      }
    },
    {
      "name": "demo",
      "displayName": "Demo",
      "database": {
        "type": "postgres",
        "host": "demo-db.example.com",
        "port": 5432,
        "database": "demo_app",
        "username": "demo_user",
        "password": "demo_password",
        "ssl": true,
        "poolSize": 3
      }
    },
    {
      "name": "development",
      "displayName": "Development",
      "database": {
        "type": "postgres",
        "connectionString": "postgresql://dev_user:dev_password@localhost:5432/myapp_dev",
        "poolSize": 2
      }
    }
  ]
}
```

### Adding Custom Environments

To add new environments (e.g., `testing`, `qa`, `preprod`), simply add them to the `environments` array:

```json
{
  "name": "testing",
  "displayName": "Testing Environment",
  "database": {
    "type": "postgres",
    "host": "test-db.example.com",
    "port": 5432,
    "database": "test_app",
    "username": "test_user",
    "password": "test_password",
    "ssl": true,
    "poolSize": 2
  }
}
```



## Usage with Claude Desktop

Pass the configuration as a JSON string argument:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": [
        "dist/index.js",
        "{\"environments\":[{\"name\":\"production\",\"displayName\":\"Production\",\"database\":{\"type\":\"postgres\",\"host\":\"prod-db.example.com\",\"port\":5432,\"database\":\"prod_app\",\"username\":\"prod_user\",\"password\":\"prod_password\",\"ssl\":true,\"poolSize\":10}},{\"name\":\"staging\",\"displayName\":\"Staging\",\"database\":{\"type\":\"postgres\",\"host\":\"staging-db.example.com\",\"port\":5432,\"database\":\"staging_app\",\"username\":\"staging_user\",\"password\":\"staging_password\",\"ssl\":true,\"poolSize\":5}},{\"name\":\"development\",\"displayName\":\"Development\",\"database\":{\"type\":\"postgres\",\"connectionString\":\"postgresql://dev_user:dev_password@localhost:5432/myapp_dev\",\"poolSize\":2}}]}"
      ]
    }
  }
}
```

**For better readability, the configuration JSON (when formatted) looks like:**

```json
{
  "environments": [
    {
      "name": "production",
      "displayName": "Production", 
      "database": {
        "type": "postgres",
        "host": "prod-db.example.com",
        "port": 5432,
        "database": "prod_app",
        "username": "prod_user",
        "password": "prod_password",
        "ssl": true,
        "poolSize": 10
      }
    },
    {
      "name": "staging",
      "displayName": "Staging",
      "database": {
        "type": "postgres", 
        "host": "staging-db.example.com",
        "port": 5432,
        "database": "staging_app",
        "username": "staging_user",
        "password": "staging_password",
        "ssl": true,
        "poolSize": 5
      }
    },
    {
      "name": "development",
      "displayName": "Development",
      "database": {
        "type": "postgres",
        "connectionString": "postgresql://dev_user:dev_password@localhost:5432/myapp_dev",
        "poolSize": 2
      }
    }
  ]
}
```

### Docker

```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run", 
        "-i", 
        "--rm",
        "mcp/postgres-multi",
        "{\"environments\":[{\"name\":\"production\",\"displayName\":\"Production\",\"database\":{\"type\":\"postgres\",\"host\":\"prod-db.example.com\",\"port\":5432,\"database\":\"prod_app\",\"username\":\"prod_user\",\"password\":\"prod_password\",\"ssl\":true,\"poolSize\":10}}]}"
      ]
    }
  }
}
```

## Example Usage

### Database Management
```
# List all available database configurations
/listDatabases

# Switch to a specific database
/switchDatabase database="production"
/switchDatabase database="staging"
/switchDatabase database="demo"
/switchDatabase database="development"
/switchDatabase database="testing"  # Custom environment
```

### Query Data
```
/query SELECT * FROM users LIMIT 5
```

### Insert Data
```
/insert table="users", data={"name": "John Doe", "email": "john@example.com"}
```

### Update Data
```
/update table="users", data={"status": "inactive"}, where="id='123'"
```

### Create a Table
```
/createTable tableName="tasks", columns=[
  {"name": "id", "type": "SERIAL", "constraints": "PRIMARY KEY"}, 
  {"name": "title", "type": "VARCHAR(100)", "constraints": "NOT NULL"},
  {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT CURRENT_TIMESTAMP"}
]
```

### Create a Function and Trigger
```
/createFunction name="update_timestamp", parameters="", returnType="TRIGGER", language="plpgsql", body="BEGIN NEW.updated_at = NOW(); RETURN NEW; END;"

/createTrigger name="set_timestamp", tableName="tasks", functionName="update_timestamp", when="BEFORE", events=["UPDATE"], forEach="ROW"
```

## Building

Docker:

```sh
docker build -t mcp/postgres-multi -f Dockerfile . 
```

## Security Considerations

1. All data modification operations use transactions with proper COMMIT/ROLLBACK handling
2. Each operation returns the SQL that was executed for transparency
3. The server uses parameterized queries for insert/update operations to prevent SQL injection

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
