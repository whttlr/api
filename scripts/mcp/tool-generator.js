/**
 * MCP Tool Generator
 * 
 * Converts API endpoint data into MCP (Model Context Protocol) tool definitions
 * and generates a complete MCP server implementation.
 */

import fs from 'fs';
import path from 'path';

class MCPToolGenerator {
  constructor() {
    this.tools = [];
    this.baseUrl = 'http://localhost:3000';
  }

  /**
   * Generate MCP tools from API endpoints
   */
  generateTools(endpoints) {
    console.log('🔧 Generating MCP tools from API endpoints...');
    
    this.tools = endpoints.map(endpoint => this.createMCPTool(endpoint));
    
    console.log(`✅ Generated ${this.tools.length} MCP tools`);
    return this.tools;
  }

  /**
   * Create a single MCP tool from an API endpoint
   */
  createMCPTool(endpoint) {
    const tool = {
      name: endpoint.name,
      description: this.generateToolDescription(endpoint),
      inputSchema: this.generateInputSchema(endpoint)
    };

    return tool;
  }

  /**
   * Generate tool description
   */
  generateToolDescription(endpoint) {
    let description = endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`;
    
    // Add feature context
    if (endpoint.feature && endpoint.feature !== 'main') {
      description = `[${endpoint.feature.toUpperCase()}] ${description}`;
    }

    // Add method and path info
    description += `\n\nEndpoint: ${endpoint.method} ${endpoint.path}`;
    
    if (endpoint.tags && endpoint.tags.length > 0) {
      description += `\nTags: ${endpoint.tags.join(', ')}`;
    }

    return description;
  }

  /**
   * Generate JSON Schema for tool input parameters
   */
  generateInputSchema(endpoint) {
    const schema = {
      type: 'object',
      properties: {},
      required: []
    };

    // Add path parameters
    endpoint.parameters.forEach(param => {
      if (param.in === 'path') {
        schema.properties[param.name] = {
          type: param.type || 'string',
          description: param.description || `Path parameter: ${param.name}`
        };
        if (param.required) {
          schema.required.push(param.name);
        }
      }
    });

    // Add query parameters
    endpoint.parameters.forEach(param => {
      if (param.in === 'query') {
        schema.properties[param.name] = {
          type: param.type || 'string',
          description: param.description || `Query parameter: ${param.name}`
        };
        if (param.required) {
          schema.required.push(param.name);
        }
      }
    });

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      schema.properties.body = {
        type: 'object',
        description: 'Request body data',
        additionalProperties: true
      };
      
      // Make body required for certain endpoints
      if (endpoint.path.includes('/connect') || endpoint.path.includes('/execute')) {
        schema.required.push('body');
      }
    }

    // Add base URL parameter for configuration
    schema.properties.baseUrl = {
      type: 'string',
      description: 'Base URL of the CNC API server',
      default: this.baseUrl
    };

    return schema;
  }

  /**
   * Generate complete MCP server implementation
   */
  generateMCPServer(endpoints) {
    const tools = this.generateTools(endpoints);
    
    const serverCode = this.generateServerCode(tools, endpoints);
    const packageJson = this.generatePackageJson();
    const readme = this.generateReadme(tools);
    
    return {
      serverCode,
      packageJson,
      readme,
      tools
    };
  }

  /**
   * Generate the main MCP server JavaScript code
   */
  generateServerCode(tools, endpoints) {
    const toolImplementations = endpoints.map(endpoint => 
      this.generateToolImplementation(endpoint)
    ).join('\n\n');

    return `#!/usr/bin/env node

/**
 * Generated MCP Server for CNC G-code Sender API
 * 
 * This server provides MCP (Model Context Protocol) tools for interacting
 * with the CNC G-code Sender API endpoints.
 * 
 * Generated on: ${new Date().toISOString()}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class CNCMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'cnc-gcode-sender',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseUrl = process.env.CNC_API_BASE_URL || 'http://localhost:3000';
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
${tools.map(tool => `          ${JSON.stringify(tool, null, 10).replace(/\n/g, '\n          ')}`).join(',\n')}
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
${endpoints.map(endpoint => `          case '${endpoint.name}':
            return await this.${this.sanitizeFunctionName(endpoint.name)}(args);`).join('\n')}
          default:
            throw new Error(\`Unknown tool: \${name}\`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: \`Error executing \${name}: \${error.message}\`,
            },
          ],
          isError: true,
        };
      }
    });
  }

${toolImplementations}

  /**
   * Make HTTP request to CNC API
   */
  async makeApiRequest(method, path, body = null, baseUrl = null) {
    const url = \`\${baseUrl || this.baseUrl}\${path}\`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              data: data
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(\`API request failed: \${error.message}\`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CNC MCP server running on stdio');
  }
}

const server = new CNCMCPServer();
server.run().catch(console.error);
`;
  }

  /**
   * Generate implementation for a specific tool
   */
  generateToolImplementation(endpoint) {
    const functionName = this.sanitizeFunctionName(endpoint.name);
    const pathWithParams = endpoint.path.replace(/:(\w+)/g, '${args.$1}');

    return `  /**
   * ${endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`}
   */
  async ${functionName}(args) {
    const baseUrl = args.baseUrl || this.baseUrl;
    let path = \`${pathWithParams}\`;
    
    // Remove undefined path parameters
    path = path.replace(/\\\$\\{undefined\\}/g, '');
    
    const body = ['POST', 'PUT', 'PATCH'].includes('${endpoint.method}') ? args.body : null;
    
    return await this.makeApiRequest('${endpoint.method}', path, body, baseUrl);
  }`;
  }

  /**
   * Sanitize function name for JavaScript
   */
  sanitizeFunctionName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  }

  /**
   * Generate package.json for MCP server
   */
  generatePackageJson() {
    return {
      name: 'cnc-mcp-server',
      version: '1.0.0',
      description: 'MCP server for CNC G-code Sender API',
      main: 'server.js',
      type: 'module',
      scripts: {
        start: 'node server.js'
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^0.4.0'
      },
      keywords: ['mcp', 'cnc', 'gcode', 'api'],
      generated: new Date().toISOString()
    };
  }

  /**
   * Generate README for MCP server
   */
  generateReadme(tools) {
    return `# CNC G-code Sender MCP Server

Generated MCP (Model Context Protocol) server for the CNC G-code Sender API.

## Generated Tools

This MCP server provides ${tools.length} tools for interacting with the CNC API:

${tools.map(tool => `### ${tool.name}

${tool.description}

**Input Parameters:**
\`\`\`json
${JSON.stringify(tool.inputSchema, null, 2)}
\`\`\`
`).join('\n')}

## Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set environment variables (optional):
\`\`\`bash
export CNC_API_BASE_URL=http://localhost:3000
\`\`\`

3. Run the MCP server:
\`\`\`bash
npm start
\`\`\`

## Configuration

The server can be configured using environment variables:

- \`CNC_API_BASE_URL\`: Base URL of the CNC API server (default: http://localhost:3000)

## Generated Information

- **Generated on:** ${new Date().toISOString()}
- **Source:** CNC G-code Sender API routes
- **Tools count:** ${tools.length}

## Usage with Claude Desktop

Add this to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "cnc-gcode-sender": {
      "command": "node",
      "args": ["/path/to/this/server.js"],
      "env": {
        "CNC_API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
\`\`\`
`;
  }
}

export default MCPToolGenerator;