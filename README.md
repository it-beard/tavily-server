# Tavily MCP Server

A Model Context Protocol (MCP) server that provides AI-powered search capabilities using the Tavily API. This server enables AI assistants to perform comprehensive web searches and retrieve relevant, up-to-date information.

## Features

- AI-powered search functionality
- Support for basic and advanced search depths
- Rich search results including titles, URLs, and content snippets
- AI-generated summaries of search results
- Result scoring and response time tracking

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
- Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

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

The server provides a single tool named `search` with the following parameters:

### Required Parameters
- `query` (string): The search query to execute

### Optional Parameters
- `search_depth` (string): Either "basic" (faster) or "advanced" (more comprehensive)

### Example Usage

```typescript
// Example using the MCP SDK
const result = await mcpClient.callTool("tavily", "search", {
  query: "latest developments in artificial intelligence",
  search_depth: "basic"
});
```

### Response Format

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

## Development

### Project Structure

```
tavily-server/
├── src/
│   └── index.ts    # Main server implementation
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
