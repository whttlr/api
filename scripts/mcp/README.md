# MCP Documentation Generation System

This directory contains the automated MCP (Model Context Protocol) documentation generation system for the CNC G-code Sender API.

## Overview

The system automatically parses your Express.js API routes with Swagger documentation and generates a complete MCP server that provides tools for interacting with your CNC API endpoints.

## Architecture

### Components

1. **`api-parser.js`** - Parses Express route files and extracts endpoint information
2. **`tool-generator.js`** - Converts API endpoints into MCP tool definitions and server code
3. **`generate-docs.js`** - Main orchestration script that runs the generation process

### Generated Output (in `docs/mcp/`)

- **`server.js`** - Complete MCP server implementation
- **`package.json`** - NPM package configuration for the MCP server
- **`README.md`** - Documentation and usage guide
- **`tools.json`** - MCP tool definitions in JSON format
- **`generation-summary.json`** - Generation statistics and metadata

## Usage

### Development Integration (Recommended)

The system is automatically integrated into your development workflow:

```bash
# Start API server with MCP generation
npm run api

# Start API server in development mode with MCP generation
npm run api:dev

# Generate MCP docs manually
npm run docs:mcp-generate

# Watch API files and regenerate on changes
npm run docs:mcp-watch
```

### Manual Generation

```bash
# Generate MCP documentation
node scripts/mcp/generate-docs.js
```

## How It Works

### 1. API Parsing

The system scans your API route files:
- `src/ui/api/features/*/routes.js` - Feature-based routes
- `src/ui/api/routes/index.js` - Main routes

It extracts:
- HTTP methods and paths
- Swagger/OpenAPI documentation
- Parameter definitions
- Response schemas

### 2. MCP Tool Generation

Each API endpoint becomes an MCP tool:
- Tool names follow pattern: `{feature}_{method}_{path}`
- Input schemas derived from API parameters
- Descriptions from Swagger documentation

### 3. Server Generation

Creates a complete MCP server with:
- Tool definitions
- HTTP request handling
- Error handling
- Configuration management

## Generated MCP Tools

The system currently generates **29 MCP tools** from your API:

### Connection Tools (6)
- `connection_ports` - List available serial ports
- `connection_get_status` - Get connection status
- `connection_post_connect` - Connect to a port
- `connection_post_disconnect` - Disconnect from port
- `connection_get_health` - Connection health check
- `connection_post_reset` - Reset connection

### Machine Tools (8)
- `machine_get_status` - Get machine status
- `machine_get_limits` - Get machine limits
- `machine_get_diagnostics` - Run diagnostics
- `machine_post_unlock` - Unlock machine
- `machine_post_home` - Home machine
- `machine_post_reset` - Reset machine
- `machine_post_stop` - Emergency stop
- `machine_get_health` - Machine health check

### G-code Tools (3)
- `gcode_post_execute` - Execute G-code command
- `gcode_post_file` - Execute G-code file
- `gcode_get_queue` - Get command queue status

### File Tools (4)
- `files_post_upload` - Upload G-code file
- `files_post_validate` - Validate G-code file
- `files_get_info` - Get file information
- `files_delete_delete` - Delete uploaded file

### Preset Tools (4)
- `presets_get_list` - List available presets
- `presets_get_preset` - Get specific preset
- `presets_post_execute` - Execute preset
- `presets_post_save` - Save new preset

### Health Tools (2)
- `health_get_` - API health check
- `health_get_detailed` - Detailed health status

### Main Tools (2)
- `main_get_` - API root information
- `main_get_info` - API information

## Configuration

### Environment Variables

The generated MCP server supports configuration via environment variables:

- `CNC_API_BASE_URL` - Base URL of your CNC API (default: http://localhost:3000)

### MCP Server Usage

1. **Install dependencies** in `docs/mcp/`:
   ```bash
   cd docs/mcp
   npm install
   ```

2. **Run the MCP server**:
   ```bash
   npm start
   ```

3. **Use with Claude Desktop** - Add to your configuration:
   ```json
   {
     "mcpServers": {
       "cnc-gcode-sender": {
         "command": "node",
         "args": ["/path/to/docs/mcp/server.js"],
         "env": {
           "CNC_API_BASE_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```

## Development Workflow

### Automatic Generation

The system is integrated into your development workflow:

1. **Start development**: `npm run api:dev`
2. **MCP docs generated** automatically before server starts
3. **API changes** trigger MCP regeneration
4. **Tools stay synchronized** with your API endpoints

### Manual Regeneration

If you need to regenerate manually:

```bash
npm run docs:mcp-generate
```

### File Watching

For active development with real-time updates:

```bash
npm run docs:mcp-watch
```

## Architecture Benefits

### 1. **Single Source of Truth**
- API routes define both REST endpoints and MCP tools
- No duplicate documentation to maintain
- Changes automatically propagate to MCP

### 2. **Type Safety**
- Input schemas derived from API parameter definitions
- Consistent parameter validation
- Clear tool interfaces

### 3. **Developer Experience**
- Zero manual MCP tool creation
- Automatic documentation generation
- Integrated into existing workflow

### 4. **Maintainability**
- Generated code is clean and readable
- Well-documented tool functions
- Easy to debug and extend

## Customization

### Adding New API Endpoints

1. Create new route file with Swagger documentation
2. Add route to feature or main routes
3. Run `npm run docs:mcp-generate`
4. New MCP tool automatically created

### Modifying Tool Generation

Edit the following files to customize generation:

- **`api-parser.js`** - Change endpoint parsing logic
- **`tool-generator.js`** - Modify tool generation patterns
- **`generate-docs.js`** - Update orchestration or output format

### Custom Tool Names

Modify the `generateMCPToolName()` function in `tool-generator.js` to change naming patterns.

## Troubleshooting

### Common Issues

1. **No endpoints found**: Check that route files exist and have proper Swagger documentation
2. **Generation fails**: Ensure all route files have valid JavaScript syntax
3. **Tools not working**: Verify API server is running and accessible

### Debug Mode

Add debug logging by setting environment variable:
```bash
DEBUG=mcp:* npm run docs:mcp-generate
```

### Validation

The system validates generation by checking:
- All required files are created
- Generated JavaScript syntax is valid
- Tool definitions match schema requirements

## Future Enhancements

### Planned Features

1. **Authentication Support** - Automatic auth token handling
2. **Response Validation** - Validate API responses against schemas
3. **Error Recovery** - Automatic retry logic for failed requests
4. **Streaming Support** - Handle real-time API responses
5. **Configuration UI** - Web interface for MCP server configuration

### Integration Opportunities

1. **CI/CD Integration** - Validate MCP docs in pull requests
2. **API Testing** - Use generated tools for automated testing
3. **Documentation Sites** - Generate static documentation from MCP tools
4. **OpenAPI Export** - Convert MCP tools back to OpenAPI specs

## Contributing

When modifying the generation system:

1. **Test thoroughly** with sample API endpoints
2. **Update documentation** for any new features
3. **Maintain backward compatibility** with existing tools
4. **Follow existing code patterns** and naming conventions

## License

This MCP generation system is part of the CNC G-code Sender project and follows the same MIT license.