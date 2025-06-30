/**
 * MCP Tool Generator - Converts API endpoints to MCP tools
 * 
 * Takes parsed API endpoints and generates MCP (Model Context Protocol)
 * tool definitions and server implementation.
 */

import fs from 'fs/promises';
import path from 'path';

export class ToolGenerator {
  constructor(endpoints, config = {}) {
    this.endpoints = endpoints;
    this.config = {
      serverName: 'cnc-gcode-sender',
      serverVersion: '1.0.0',
      baseUrl: 'http://localhost:3000',
      outputDir: './docs/mcp',
      ...config
    };
  }

  /**
   * Generate all MCP documentation files
   */
  async generateAll() {
    const tools = this.generateTools();
    const server = this.generateServer(tools);
    const readme = this.generateReadme(tools);
    const packageJson = this.generatePackageJson();
    const summary = this.generateSummary(tools);

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Write all files
    await Promise.all([
      fs.writeFile(path.join(this.config.outputDir, 'server.js'), server),
      fs.writeFile(path.join(this.config.outputDir, 'tools.json'), JSON.stringify(tools, null, 2)),
      fs.writeFile(path.join(this.config.outputDir, 'README.md'), readme),
      fs.writeFile(path.join(this.config.outputDir, 'package.json'), JSON.stringify(packageJson, null, 2)),
      fs.writeFile(path.join(this.config.outputDir, 'generation-summary.json'), JSON.stringify(summary, null, 2))
    ]);

    return {
      tools,
      server,
      readme,
      packageJson,
      summary,
      outputDir: this.config.outputDir
    };
  }

  /**
   * Generate MCP tool definitions from endpoints
   */
  generateTools() {
    return this.endpoints.map(endpoint => {
      const toolName = this.generateToolName(endpoint);
      const inputSchema = this.generateInputSchema(endpoint);
      const description = this.generateToolDescription(endpoint);

      return {
        name: toolName,
        description,
        inputSchema
      };
    });
  }

  /**
   * Generate tool name from endpoint
   */
  generateToolName(endpoint) {
    const feature = endpoint.feature.toLowerCase();
    const method = endpoint.method.toLowerCase();
    const pathParts = endpoint.path
      .replace('/api/v1/', '')
      .split('/')
      .filter(part => part && !part.startsWith('{'))
      .join('_');

    if (method === 'get' && pathParts) {
      return `${feature}_${pathParts}`;
    } else if (method !== 'get') {
      return pathParts ? `${feature}_${method}_${pathParts}` : `${feature}_${method}_index`;
    } else {
      return `${feature}_${method}_index`;
    }
  }

  /**
   * Generate tool description
   */
  generateToolDescription(endpoint) {
    const tag = endpoint.tags?.[0] || endpoint.feature.toUpperCase();
    const desc = endpoint.description || `${endpoint.feature} endpoint`;
    
    return `[${tag}] ${desc}\n\nEndpoint: ${endpoint.method} ${endpoint.path}\nTags: ${endpoint.tags?.join(', ') || endpoint.feature}`;
  }

  /**
   * Generate input schema for tool
   */
  generateInputSchema(endpoint) {
    const properties = {
      baseUrl: {
        type: 'string',
        description: 'Base URL of the CNC API server',
        default: this.config.baseUrl
      }
    };

    const required = [];

    // Add body parameter for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      properties.body = {
        type: 'object',
        description: 'Request body data',
        additionalProperties: true
      };
      
      // Make body required for certain endpoints
      if (endpoint.path.includes('connect') || endpoint.path.includes('execute')) {
        required.push('body');
      }
    }

    // Add path parameters
    endpoint.parameters?.forEach(param => {
      if (param.in === 'path') {
        properties[param.name] = {
          type: param.type || 'string',
          description: `Path parameter: ${param.name}`
        };
        if (param.required) {
          required.push(param.name);
        }
      }
    });

    return {
      type: 'object',
      properties,
      required
    };
  }

  /**
   * Generate complete MCP server implementation
   */
  generateServer(tools) {
    const serverClass = this.generateServerClass(tools);
    const toolHandlers = this.generateToolHandlers();
    const helperMethods = this.generateHelperMethods();

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

${serverClass}

${toolHandlers}

${helperMethods}

const server = new CNCMCPServer();
server.run().catch(console.error);
`;
  }

  /**
   * Generate the main server class
   */
  generateServerClass(tools) {
    const toolsList = tools.map(tool => {
      return `          ${JSON.stringify(tool, null, 10).replace(/\n/g, '\n          ')}`;
    }).join(',\n');

    const toolCases = tools.map(tool => {
      return `          case '${tool.name}':\n            return await this.${tool.name}(args);`;
    }).join('\n');

    return `class CNCMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: '${this.config.serverName}',
        version: '${this.config.serverVersion}',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseUrl = process.env.CNC_API_BASE_URL || '${this.config.baseUrl}';
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
${toolsList}
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
${toolCases}
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
  }`;
  }

  /**
   * Generate tool handler methods
   */
  generateToolHandlers() {
    return this.endpoints.map(endpoint => {
      const toolName = this.generateToolName(endpoint);
      const method = endpoint.method;
      const apiPath = endpoint.path;
      const description = endpoint.description || `${endpoint.feature} endpoint`;

      // Handle path parameters
      let pathTemplate = apiPath;
      endpoint.parameters?.forEach(param => {
        if (param.in === 'path') {
          pathTemplate = pathTemplate.replace(`{${param.name}}`, `\${args.${param.name} || '{${param.name}}'}`);
        }
      });

      return `
  /**
   * ${description}
   */
  async ${toolName}(args) {
    const baseUrl = args.baseUrl || this.baseUrl;
    let path = \`${pathTemplate}\`;
    
    // Remove undefined path parameters
    path = path.replace(/\\\$\\{undefined\\}/g, '');
    
    const body = ['POST', 'PUT', 'PATCH'].includes('${method}') ? args.body : null;
    
    return await this.makeApiRequest('${method}', path, body, baseUrl);
  }`;
    }).join('\n');
  }

  /**
   * Generate helper methods
   */
  generateHelperMethods() {
    return `
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
}`;
  }

  /**
   * Generate README documentation
   */
  generateReadme(tools) {
    const toolDocs = tools.map(tool => {
      return `### ${tool.name}

${tool.description}

**Input Parameters:**
\`\`\`json
${JSON.stringify(tool.inputSchema, null, 2)}
\`\`\`
`;
    }).join('\n');

    return `# CNC G-code Sender MCP Server

Generated MCP (Model Context Protocol) server for the CNC G-code Sender API.

## Generated Tools

This MCP server provides ${tools.length} tools for interacting with the CNC API:

${toolDocs}

## Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set environment variables (optional):
\`\`\`bash
export CNC_API_BASE_URL=${this.config.baseUrl}
\`\`\`

3. Run the MCP server:
\`\`\`bash
npm start
\`\`\`

## Configuration

The server can be configured using environment variables:

- \`CNC_API_BASE_URL\`: Base URL of the CNC API server (default: ${this.config.baseUrl})

## Generated Information

- **Generated on:** ${new Date().toISOString()}
- **Source:** CNC G-code Sender API routes
- **Tools count:** ${tools.length}

## Usage with Claude Desktop

Add this to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${this.config.serverName}": {
      "command": "node",
      "args": ["/path/to/this/server.js"],
      "env": {
        "CNC_API_BASE_URL": "${this.config.baseUrl}"
      }
    }
  }
}
\`\`\`
`;
  }

  /**
   * Generate package.json for MCP server
   */
  generatePackageJson() {
    return {
      name: `${this.config.serverName}-mcp`,
      version: this.config.serverVersion,
      description: 'MCP server for CNC G-code Sender API',
      main: 'server.js',
      type: 'module',
      scripts: {
        start: 'node server.js'
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^0.4.0'
      },
      keywords: ['mcp', 'model-context-protocol', 'cnc', 'gcode'],
      author: 'Generated by MCP Tool Generator',
      license: 'MIT'
    };
  }

  /**
   * Generate summary statistics
   */
  generateSummary(tools) {
    const features = [...new Set(this.endpoints.map(e => e.feature))];
    const methods = [...new Set(this.endpoints.map(e => e.method))];
    
    const toolsByFeature = {};
    features.forEach(feature => {
      toolsByFeature[feature] = this.endpoints.filter(e => e.feature === feature).length;
    });

    return {
      generatedAt: new Date().toISOString(),
      statistics: {
        totalEndpoints: this.endpoints.length,
        totalTools: tools.length,
        features,
        httpMethods: methods,
        toolsByFeature
      },
      files: [
        'server.js - Main MCP server implementation',
        'package.json - NPM package configuration',  
        'README.md - Documentation and usage guide',
        'tools.json - MCP tool definitions in JSON format'
      ]
    };
  }
}