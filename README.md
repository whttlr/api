# CNC G-code Sender API

A comprehensive REST API server for CNC machine control and G-code execution. Built for professional CNC operations with GRBL-compatible controllers, providing enterprise-grade features including real-time monitoring, automatic recovery, and advanced file processing.

## Features

### 🚀 Core API Features
- **RESTful API Interface** - Complete HTTP API for CNC machine control
- **Real-time Connection Management** - Serial port connection handling with health monitoring
- **G-code Execution** - Execute commands and files through HTTP endpoints
- **File Management** - Upload, validate, and execute G-code files
- **Machine Status Monitoring** - Real-time machine status and position tracking
- **Preset Management** - Save and execute command presets
- **Comprehensive Health Checks** - System diagnostics and health monitoring

### 🔧 Advanced Capabilities
- **Multi-format Support** - JSON and form-data API endpoints
- **File Upload/Download** - Direct file transfer through API
- **Error Recovery** - Smart retry logic with detailed error responses
- **Configuration Management** - Dynamic configuration through API
- **Event-Driven Architecture** - Real-time updates and notifications
- **CORS Support** - Cross-origin requests for web interface integration

## Quick Start

### Start the API Server

```bash
# Install dependencies
npm install

# Start the API server
npm start
```

The API server will start on `http://localhost:3000` by default.

### Basic API Usage

**1. Check API Health:**
```bash
curl http://localhost:3000/api/v1/health
```

**2. List Available Serial Ports:**
```bash
curl http://localhost:3000/api/v1/connection/ports
```

**3. Connect to CNC Machine:**
```bash
curl -X POST http://localhost:3000/api/v1/connection/connect \
  -H "Content-Type: application/json" \
  -d '{"port": "/dev/ttyUSB0"}'
```

**4. Get Machine Status:**
```bash
curl http://localhost:3000/api/v1/machine/status
```

**5. Execute G-code Command:**
```bash
curl -X POST http://localhost:3000/api/v1/gcode/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "G0 X10 Y10"}'
```

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Connection Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/connection/ports` | GET | List available serial ports |
| `/connection/status` | GET | Get current connection status |
| `/connection/connect` | POST | Connect to a serial port |
| `/connection/disconnect` | POST | Disconnect from current port |
| `/connection/reset` | POST | Reset connection state |

### Machine Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/machine/status` | GET | Get machine status and position |
| `/machine/unlock` | POST | Send unlock command ($X) |
| `/machine/home` | POST | Send homing command ($H) |
| `/machine/reset` | POST | Send soft reset |
| `/machine/emergency-stop` | POST | Send emergency stop (M112) |

### G-code Execution

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/gcode/execute` | POST | Execute single G-code command |
| `/gcode/file` | POST | Execute G-code file |
| `/gcode/validate` | POST | Validate G-code without execution |

### File Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/files` | GET | List uploaded files |
| `/files/upload` | POST | Upload G-code file |
| `/files/{filename}` | GET | Download file |
| `/files/{filename}/validate` | POST | Validate specific file |
| `/files/{filename}/execute` | POST | Execute specific file |

### Presets

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/presets` | GET | List available presets |
| `/presets/{name}/execute` | POST | Execute preset by name |
| `/presets/{name}/validate` | POST | Validate preset |

### Health & Diagnostics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | API health check |
| `/health/detailed` | GET | Comprehensive system health |
| `/` | GET | API information and available endpoints |

## Example API Workflows

### Complete CNC Operation

```bash
# 1. Check system health
curl http://localhost:3000/api/v1/health

# 2. List and connect to port
curl http://localhost:3000/api/v1/connection/ports
curl -X POST http://localhost:3000/api/v1/connection/connect \
  -H "Content-Type: application/json" \
  -d '{"port": "/dev/ttyUSB0"}'

# 3. Home the machine
curl -X POST http://localhost:3000/api/v1/machine/home

# 4. Check machine status
curl http://localhost:3000/api/v1/machine/status

# 5. Execute G-code commands
curl -X POST http://localhost:3000/api/v1/gcode/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "G0 X0 Y0 Z0"}'

# 6. Upload and execute file
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@project.gcode"

curl -X POST http://localhost:3000/api/v1/files/project.gcode/execute
```

### File Upload and Execution

```bash
# Upload G-code file
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@my-project.gcode" \
  -F "description=CNC Project File"

# Validate the uploaded file
curl -X POST http://localhost:3000/api/v1/files/my-project.gcode/validate

# Execute the file
curl -X POST http://localhost:3000/api/v1/files/my-project.gcode/execute
```

### Error Handling Example

```bash
# API returns structured error responses
curl -X POST http://localhost:3000/api/v1/gcode/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "INVALID_GCODE"}'

# Response:
# {
#   "success": false,
#   "error": {
#     "code": "INVALID_GCODE",
#     "message": "Invalid G-code format",
#     "details": "Command 'INVALID_GCODE' is not recognized"
#   },
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }
```

## Configuration

### Environment Variables

```bash
# Server configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# CNC configuration
DEFAULT_PORT=/dev/ttyUSB0
BAUD_RATE=115200
```

### Configuration File

Edit `config.json` to customize machine settings:

```json
{
  "defaultPort": "/dev/ttyUSB0",
  "serialPort": {
    "baudRate": 115200,
    "timeout": 5000
  },
  "machineLimits": {
    "x": {"min": -100, "max": 100},
    "y": {"min": -100, "max": 100},
    "z": {"min": -50, "max": 50}
  },
  "grbl": {
    "statusCommand": "?",
    "homeCommand": "$H",
    "unlockCommand": "$X"
  }
}
```

## Development

### Available Scripts

```bash
# Start the API server
npm start

# Start in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Generate API documentation
npm run docs:mcp-generate
```

### API Development

The API server is built using:
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **Multer** - File upload handling
- **Helmet** - Security headers
- **Swagger** - API documentation

### Project Structure

```
src/
├── ui/api/                    # API server code
│   ├── features/              # Feature-based API modules
│   │   ├── connection/        # Connection management
│   │   ├── machine/           # Machine control
│   │   ├── gcode/             # G-code execution
│   │   ├── files/             # File management
│   │   ├── presets/           # Preset management
│   │   └── health/            # Health checks
│   ├── middleware/            # Express middleware
│   ├── shared/                # Shared utilities
│   └── server.js              # Main server file
├── locales/                   # Internationalization
└── config.json               # Configuration file
```

### Testing

The project follows Test-Driven Development (TDD):

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPatterns="connection"

# Generate coverage report
npm run test:coverage
```

Tests are co-located with source code in `__tests__/` folders following the feature-based architecture.

## API Integration

### Web Interface Integration

The API is designed to work with web frontends:

```javascript
// Example frontend integration
const api = 'http://localhost:3000/api/v1';

// Connect to machine
const response = await fetch(`${api}/connection/connect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ port: '/dev/ttyUSB0' })
});

// Execute G-code
const executeResponse = await fetch(`${api}/gcode/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command: 'G0 X10 Y10' })
});
```

### CORS Configuration

The API supports cross-origin requests from:
- `localhost:3000`, `localhost:3001`, `localhost:8080` (development)
- Configurable origins for production environments

## Troubleshooting

### Common Issues

**API Server Won't Start:**
```bash
# Check if port is in use
netstat -an | grep 3000

# Start on different port
PORT=3001 npm start
```

**Connection Issues:**
```bash
# List available ports
curl http://localhost:3000/api/v1/connection/ports

# Check connection status
curl http://localhost:3000/api/v1/connection/status

# Test basic connectivity
curl -X POST http://localhost:3000/api/v1/connection/connect \
  -H "Content-Type: application/json" \
  -d '{"port": "/dev/ttyUSB0"}'
```

**File Upload Problems:**
```bash
# Check file size limits (default 10MB)
# Ensure proper Content-Type for file uploads
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@project.gcode"
```

### Debug Mode

Enable detailed logging:
```bash
DEBUG=cnc:* npm start
```

## Installation

### Prerequisites
- Node.js 16+ 
- Serial port access to CNC controller
- GRBL-compatible CNC controller

### Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd cnc-api
   npm install
   ```

2. **Configure machine settings:**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your machine settings
   ```

3. **Start the API server:**
   ```bash
   npm start
   ```

4. **Test the connection:**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

### Dependencies
- **express**: Web framework for API server
- **cors**: Cross-origin resource sharing
- **multer**: File upload handling
- **helmet**: Security middleware
- **serialport**: Serial communication with CNC controllers
- **swagger-jsdoc**: API documentation generation

## Advanced Features

### File Processing
- **Multi-format Upload**: Support for .gcode, .nc, .txt files
- **File Validation**: Pre-execution G-code validation
- **Direct Execution**: Execute files without local storage

### Security
- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Request parameter validation
- **Error Handling**: Structured error responses
- **Rate Limiting**: Configurable request rate limits

### Monitoring
- **Health Endpoints**: System and connection health monitoring
- **Status Tracking**: Real-time machine status via API
- **Error Reporting**: Comprehensive error logging and reporting

## License

This project is licensed under the MIT License - see the LICENSE file for details.