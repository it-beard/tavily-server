# Tavily MCP Server

A Model Context Protocol (MCP) server that provides AI-powered search capabilities using the Tavily API. This server enables AI assistants to perform comprehensive web searches and retrieve relevant, up-to-date information.

## Features

- AI-powered search functionality
- Support for basic and advanced search depths
- Rich search results including titles, URLs, and content snippets
- AI-generated summaries of search results
- Result scoring and response time tracking
- Comprehensive search history storage with caching
- MCP Resources for flexible data access

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- Tavily API key (Get one at [Tavily's website](https://tavily.com))
- An MCP client (e.g., Cline, Claude Desktop, or your own implementation)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/it-beard/tavily-server.git
cd tavily-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

This server can be used with any MCP client. Below are configuration instructions for popular clients:

### Cline Configuration

If you're using Cline (the VSCode extension for Claude), create or modify the MCP settings file at:
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

Add the following configuration (replace paths and API key with your own):
```json
{
  "mcpServers": {
    "tavily": {
      "command": "node",
      "args": ["/path/to/tavily-server/build/index.js"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Desktop Configuration

If you're using the Claude Desktop app, modify the configuration file at:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Use the same configuration format as shown above.

### Other MCP Clients

For other MCP clients, consult their documentation for the correct configuration file location and format. The server configuration should include:
1. Command to run the server (typically `node`)
2. Path to the compiled server file
3. Environment variables including the Tavily API key

## Usage

### Tools

The server provides a single tool named `search` with the following parameters:

#### Required Parameters
- `query` (string): The search query to execute

#### Optional Parameters
- `search_depth` (string): Either "basic" (faster) or "advanced" (more comprehensive)

#### Example Usage

```typescript
// Example using the MCP SDK
const result = await mcpClient.callTool("tavily", "search", {
  query: "latest developments in artificial intelligence",
  search_depth: "basic"
});
```

### Resources

The server provides both static and dynamic resources for flexible data access:

#### Static Resources
- `tavily://last-search/result`: Returns the results of the most recent search query
  - Persisted to disk in the data directory
  - Survives server restarts
  - Returns a 'No search has been performed yet' error if no search has been done

#### Dynamic Resources (Resource Templates)
- `tavily://search/{query}`: Access search results for any query
  - Replace {query} with your URL-encoded search term
  - Example: `tavily://search/artificial%20intelligence`
  - Returns cached results if the query was previously made
  - Performs and stores new search if query hasn't been searched before
  - Returns the same format as the search tool but through a resource interface

Resources in MCP provide an alternative way to access data compared to tools:
- Tools are for executing operations (like performing a new search)
- Resources are for accessing data (like retrieving existing search results)
- Resource URIs can be stored and accessed later
- Resources support both static (fixed) and dynamic (templated) access patterns

#### Response Format

```typescript
interface SearchResponse {
  query: string;
  answer: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  response_time: number;
}
```

### Persistent Storage

The server implements comprehensive persistent storage for search results:

#### Storage Location
- Data is stored in the `data` directory
- `data/searches.json` contains all historical search results
- Data persists between server restarts
- Storage is automatically initialized on server start

#### Storage Features
- Stores complete search history
- Caches all search results for quick retrieval
- Automatic saving of new search results
- Disk-based persistence
- JSON format for easy debugging
- Error handling for storage operations
- Automatic directory creation

#### Caching Behavior
- All search results are cached automatically
- Subsequent requests for the same query return cached results
- Caching improves response time and reduces API calls
- Cache persists between server restarts
- Last search is tracked for quick access

## Development

### Project Structure

```
tavily-server/
├── src/
│   └── index.ts    # Main server implementation
├── data/           # Persistent storage directory
│   └── searches.json  # Search history and cache storage
├── build/          # Compiled JavaScript files
├── package.json    # Project dependencies and scripts
└── tsconfig.json   # TypeScript configuration
```

### Available Scripts

- `npm run build`: Compile TypeScript and make the output executable
- `npm run start`: Start the MCP server (after building)
- `npm run dev`: Run the server in development mode

## Error Handling

The server provides detailed error messages for common issues:
- Invalid API key
- Network errors
- Invalid search parameters
- API rate limiting
- Resource not found
- Invalid resource URIs
- Storage read/write errors

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/protocol) for the server framework
- [Tavily API](https://tavily.com) for providing the search capabilities
