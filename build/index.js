#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
const API_KEY = process.env.TAVILY_API_KEY;
if (!API_KEY) {
    throw new Error('TAVILY_API_KEY environment variable is required');
}
const isValidSearchArgs = (args) => typeof args === 'object' &&
    args !== null &&
    typeof args.query === 'string' &&
    (args.search_depth === undefined ||
        args.search_depth === 'basic' ||
        args.search_depth === 'advanced');
class TavilyServer {
    constructor() {
        this.server = new Server({
            name: 'tavily-search-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.axiosInstance = axios.create({
            baseURL: 'https://api.tavily.com',
            headers: {
                'Content-Type': 'application/json',
                'api-key': API_KEY,
            },
        });
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search',
                    description: 'Perform an AI-powered search using Tavily API',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Search query',
                            },
                            search_depth: {
                                type: 'string',
                                enum: ['basic', 'advanced'],
                                description: 'Search depth - basic is faster, advanced is more comprehensive',
                            },
                        },
                        required: ['query'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'search') {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            if (!isValidSearchArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidParams, 'Invalid search arguments');
            }
            try {
                console.error('Making request to Tavily API...'); // Debug log
                const response = await this.axiosInstance.post('/search', {
                    api_key: API_KEY,
                    query: request.params.arguments.query,
                    search_depth: request.params.arguments.search_depth || 'basic',
                    include_answer: true,
                    include_raw_content: false
                });
                console.error('Received response from Tavily API'); // Debug log
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                console.error('Tavily API Error:', error); // Debug log
                const axiosError = error;
                const errorMessage = axiosError.response?.data?.message ??
                    axiosError.response?.data?.error ??
                    axiosError.message ??
                    'Unknown error occurred';
                const statusCode = axiosError.response?.status ?? 'unknown';
                console.error(`Error details - Message: ${errorMessage}, Status: ${statusCode}`); // Debug log
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Tavily API error: ${errorMessage} (Status: ${statusCode})`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Tavily MCP server running on stdio');
    }
}
const server = new TavilyServer();
server.run().catch(console.error);
