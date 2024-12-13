#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const API_KEY = process.env.TAVILY_API_KEY;
if (!API_KEY) {
  throw new Error('TAVILY_API_KEY environment variable is required');
}

// Get the directory where the script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TavilySearchResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  query: string;
}

interface TavilyErrorResponse {
  message: string;
  status?: number;
  error?: string;
}

interface StoredSearches {
  searches: { [query: string]: TavilySearchResponse };
  lastQuery: string | null;
}

const isValidSearchArgs = (
  args: any
): args is { query: string; search_depth?: 'basic' | 'advanced' } =>
  typeof args === 'object' &&
  args !== null &&
  typeof args.query === 'string' &&
  (args.search_depth === undefined ||
    args.search_depth === 'basic' ||
    args.search_depth === 'advanced');

class TavilyServer {
  private server: Server;
  private axiosInstance;
  private searches: StoredSearches = { searches: {}, lastQuery: null };
  private dataDir: string;
  private storageFile: string;

  constructor() {
    this.server = new Server(
      {
        name: 'tavily-search-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://api.tavily.com',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
    });

    // Set up data storage paths
    this.dataDir = join(__dirname, '..', 'data');
    this.storageFile = join(this.dataDir, 'searches.json');

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async initializeStorage() {
    try {
      // Create data directory if it doesn't exist
      await mkdir(this.dataDir, { recursive: true });
      
      // Try to load existing data
      try {
        const data = await readFile(this.storageFile, 'utf-8');
        this.searches = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is invalid, initialize with empty state
        this.searches = { searches: {}, lastQuery: null };
        await this.saveSearches();
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw new Error('Failed to initialize storage');
    }
  }

  private async saveSearches() {
    try {
      await writeFile(this.storageFile, JSON.stringify(this.searches, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save searches:', error);
      throw new Error('Failed to save searches');
    }
  }

  private async saveSearch(query: string, result: TavilySearchResponse) {
    this.searches.searches[query] = result;
    this.searches.lastQuery = query;
    await this.saveSearches();
  }

  private setupResourceHandlers() {
    // List available static resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'tavily://last-search/result',
          name: 'Last Search Result',
          description: 'Results from the most recent search query',
          mimeType: 'application/json',
        }
      ],
    }));

    // List resource templates for dynamic resources
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        {
          uriTemplate: 'tavily://search/{query}',
          name: 'Search Results by Query',
          description: 'Search results for a specific query',
          mimeType: 'application/json',
        },
      ],
    }));

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      // Handle static resource: last search result
      if (request.params.uri === 'tavily://last-search/result') {
        if (!this.searches.lastQuery || !this.searches.searches[this.searches.lastQuery]) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'No search has been performed yet'
          );
        }
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.searches.searches[this.searches.lastQuery], null, 2),
            },
          ],
        };
      }

      // Handle dynamic resource: search by query
      const searchMatch = request.params.uri.match(/^tavily:\/\/search\/(.+)$/);
      if (searchMatch) {
        const query = decodeURIComponent(searchMatch[1]);
        
        // First check if we already have this search stored
        if (this.searches.searches[query]) {
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.searches.searches[query], null, 2),
              },
            ],
          };
        }

        // If not found in storage, perform new search
        try {
          const response = await this.axiosInstance.post<TavilySearchResponse>(
            '/search',
            {
              api_key: API_KEY,
              query,
              search_depth: 'basic',
              include_answer: true,
              include_raw_content: false
            }
          );

          // Save the result
          await this.saveSearch(query, response.data);

          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          const axiosError = error as { response?: { data?: TavilyErrorResponse; status?: number }; message?: string };
          throw new McpError(
            ErrorCode.InternalError,
            `Search failed: ${axiosError.response?.data?.message ?? axiosError.message}`
          );
        }
      }

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid resource URI: ${request.params.uri}`
      );
    });
  }

  private setupToolHandlers() {
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
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidSearchArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid search arguments'
        );
      }

      try {
        console.error('Making request to Tavily API...'); // Debug log
        const response = await this.axiosInstance.post<TavilySearchResponse>(
          '/search',
          {
            api_key: API_KEY,
            query: request.params.arguments.query,
            search_depth: request.params.arguments.search_depth || 'basic',
            include_answer: true,
            include_raw_content: false
          }
        );

        // Save the result
        await this.saveSearch(request.params.arguments.query, response.data);

        console.error('Received response from Tavily API'); // Debug log
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Tavily API Error:', error); // Debug log
        const axiosError = error as { response?: { data?: TavilyErrorResponse; status?: number }; message?: string };
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
    // Initialize storage before starting the server
    await this.initializeStorage();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tavily MCP server running on stdio');
  }
}

const server = new TavilyServer();
server.run().catch(console.error);
