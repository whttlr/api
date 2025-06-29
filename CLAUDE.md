# Claude Context for CNC G-code Sender Project

## 🚨 CRITICAL DEVELOPMENT RULES - ALWAYS FOLLOW

**Before starting ANY task, review these rules. Before completing ANY task, verify compliance with ALL rules.**

### 🌐 Internationalization (i18n)
- **ALWAYS use i18n for user-facing messages** - Never hardcode text strings
- Import from `i18n` and use `i18n.t('key', {params})` for all user output
- Add new message keys to `locales/en/messages.json`
- NO exceptions for console output, error messages, or temporary code

### 🧪 Test-Driven Development (TDD) 
- **MUST follow TDD for ALL features** - Write failing test FIRST, then code
- Write one failing unit test at a time
- Only write enough production code to make the current test pass
- Refactor only after tests are passing
- ALL new features and bug fixes require tests first

### ♻️ Code Reusability
- **Refactor code to make it reusable** when patterns emerge
- Extract common functionality into shared utilities
- Create reusable components instead of duplicating logic
- Move repeated code into lib/ or utils/ directories

### 📏 File Size Limits
- **Maximum 300 lines per file** - Split larger files immediately
- Each file should have a single responsibility
- Use clear, descriptive file names that indicate purpose
- Keep functions focused and atomic

### 🏗️ Strictly Enforced Architecture
- **Follow the self-contained module structure** exactly
- Each module contains: `__tests__/`, `__mocks__/`, `README.md`, `config.js`, `index.js`
- Use dependency injection and clear public APIs
- NO cross-module imports except from `lib/` or `utils/`

### ⚛️ Atomic & Reusable Components
- **Keep components atomic** - single responsibility principle
- Design for reusability across different contexts
- Use composition over inheritance
- Clear interfaces and minimal dependencies

### ⚙️ Configuration Management
- **NO hardcoded values in logic files** - extract ALL settings to config
- Use `config.json` for application settings
- Use `settings/` directory for machine-specific configurations
- Pass configuration as dependencies, don't import directly

### 🔄 Continuous Refactoring
- **Refactor immediately** when code diverges from above rules
- Don't accumulate technical debt
- Review existing code regularly for improvement opportunities
- Maintain clean, readable, and maintainable code

### ✅ Pre-Completion Review
- **ALWAYS review code before task completion**
- Verify ALL rules above are followed
- Check for hardcoded strings, oversized files, missing tests
- Ensure proper architecture compliance
- Run tests and verify functionality

## Project Overview
A Node.js-based G-code sender for CNC machines via serial port communication, with comprehensive debugging and diagnostic capabilities.

## Key Commands
- `npm start` - Start the application
- `npm run interactive` - Interactive mode
- `npm run list-ports` - List available serial ports
- `npm run diagnose` - Run diagnostics
- `npm run limits` - Check machine limits
- `npm run debug` - Comprehensive debugging
- `npm run fix:alarm` - Alarm recovery
- `npm run test:homing` - Test homing functionality
- `npm test` - Run test suite

## Project Structure
**NOTE**: If any files are created, deleted, or moved, please update this architecture section to reflect the current project structure.

```
.
├── locales/                       # Internationalization (i18n) message files
│   └── en/                        # English language messages
│       └── messages.json          # Core application messages
├── src/
│   ├── cnc/                       # CNC-specific logic
│   │   ├── alarms/                # Alarm and error recovery
│   │   ├── commands/              # G-code command set
│   │   ├── connection/            # Serial connection management
│   │   ├── diagnostics/           # Movement testing logic
│   │   ├── files/                 # File load/save
│   │   ├── queries/               # Status/parameter query
│   │   ├── GcodeSender.js         # Core G-code sender
│   │   └── config.js              # Config management
│   ├── ui/                        # User interfaces
│   │   ├── api/                   # REST API server
│   │   │   ├── controllers/       # API controllers
│   │   │   ├── middleware/        # API middleware
│   │   │   ├── routes/            # API routes
│   │   │   ├── services/          # API services
│   │   │   └── server.js          # Express server
│   │   └── cli/                   # CLI interface
│   ├── lib/                       # Reusable modules / services
│   │   ├── diagnostics/           # Diagnostics service
│   │   ├── helpers/               # GRBL protocol helpers
│   │   ├── logger/                # Logging facility
│   │   ├── presets/               # Preset storage and logic
│   │   ├── reporting/             # Report generation/parsing
│   │   └── status/                # Status decoder
│   ├── utils/                     # Generic utilities
│   └── i18n.js                    # i18n setup and init
└── scripts/                       # Standalone scripts
    ├── diagnostics/
    ├── presets/
    └── testing/
```

## Important Notes
- This is a CNC control application that sends G-code commands to machines
- The project includes safety features and alarm handling
- Commands are sent sequentially with proper response waiting
- GRBL-compatible controller support
- Comprehensive diagnostic and debugging capabilities

## Configuration
- Main config in `config.json`
- Machine-specific settings in `settings/machines/`
- Tool definitions in `settings/tools/`

## Dependencies
- serialport: Serial communication
- jest: Testing framework
- i18next: Internationalization framework
- i18next-fs-backend: i18next backend for loading translations from the file system

## Coding Guidelines

### Test-Driven Development (TDD)
- **MUST follow TDD**: Write a failing test first, then write minimal code to make it pass
- Write one failing unit test at a time
- Only write enough production code to make the current test pass
- Refactor only after tests are passing
- All new features and bug fixes require tests first

### Unit Testing Strategy

#### Testing Framework & Configuration
- **Jest Framework**: Configured with ES modules support via `node --experimental-vm-modules`
- **Coverage Reporting**: HTML, LCOV, and text formats enabled
- **Coverage Targets**: Minimum 80% line coverage, 70% branch coverage for src/ folder
- **Test Location**: Co-located with source code in `__tests__/` folders following architecture

#### Test Commands
- `npm test` - Run complete test suite
- `npm run test:watch` - Run tests in watch mode during development
- `npm run test:coverage` - Generate detailed coverage reports (to be added)
- `npm run test:unit` - Run unit tests only (to be added)
- `npm run test:integration` - Run integration tests (to be added)

#### Testing Priorities by Module

**HIGH PRIORITY (Core Functionality)**
1. **cnc/GcodeSender.js** - Main G-code sending logic with mocked serial port
2. **cnc/connection/ConnectionManager.js** - ✅ DONE - Serial port connection management
3. **cnc/commands/CommandExecutor.js** - Command execution and response handling
4. **cnc/alarms/AlarmManager.js** - Alarm detection and recovery procedures
5. **cnc/queries/QueryManager.js** - Status and parameter queries

**MEDIUM PRIORITY (Services & Processing)**
6. **cnc/files/FileProcessor.js** - G-code file validation and processing
7. **cnc/diagnostics/DiagnosticsManager.js** - Movement testing and diagnostics
8. **lib/logger/LoggerService.js** - Centralized logging with different output modes
9. **lib/status/StatusService.js** - Status parsing and interpretation
10. **lib/helpers/HelpersService.js** - GRBL protocol helpers

**LOW PRIORITY (Supporting Features)**
11. **lib/presets/PresetsService.js** - Preset storage and management
12. **lib/diagnostics-service/DiagnosticsService.js** - Diagnostic utilities
13. **lib/reporting/ReportStructures.js** - ✅ DONE - StructuredLogger tested
14. **ui/cli/cli.js** - CLI interface functionality
15. **src/i18n.js** - Internationalization setup

#### Testing Patterns & Standards

**Mock Strategy**
- **External Dependencies**: Mock all external dependencies (SerialPort, file system, network)
- **Mock Files**: Store mocks in `__mocks__/` folders alongside tests
- **Shared Mocks**: Common mocks (mock-serial-port.js, sample-gcode.js) available across modules
- **Dependency Injection**: Design modules to accept dependencies for easier testing

**Test Structure Requirements**
```javascript
describe('ModuleName', () => {
  let module;
  let mockDependencies;

  beforeEach(() => {
    // Fresh setup for each test
    mockDependencies = createMockDependencies();
    module = new ModuleName(mockDependencies);
  });

  describe('method_name', () => {
    test('should handle success case', () => {
      // Test successful operation
    });

    test('should handle error case', () => {
      // Test error conditions
    });

    test('should validate inputs', () => {
      // Test input validation
    });
  });
});
```

**Safety-Critical Testing**
- **CNC Safety**: All alarm, emergency stop, and limit handling must have 100% test coverage
- **Serial Communication**: Mock all serial communication for consistent testing
- **Error Conditions**: Test all error scenarios, timeouts, and connection failures
- **Data Validation**: Test G-code parsing, command validation, and status interpretation

**Coverage Requirements**
- **Functions**: 90% minimum for core CNC modules, 80% for services
- **Lines**: 85% minimum for core CNC modules, 75% for services  
- **Branches**: 80% minimum for all conditional logic
- **Uncovered Code**: Must be documented with rationale (unreachable error conditions, etc.)

#### Test File Roadmap

**Immediate Priority (Week 1)**
- [ ] cnc/GcodeSender.test.js - Core sender functionality
- [ ] cnc/commands/CommandExecutor.test.js - Command execution
- [ ] cnc/alarms/AlarmManager.test.js - Alarm handling

**Short Term (Week 2-3)**  
- [ ] cnc/queries/QueryManager.test.js - Status queries
- [ ] cnc/files/FileProcessor.test.js - File processing
- [ ] lib/logger/LoggerService.test.js - Logging service

**Medium Term (Week 4-6)**
- [ ] cnc/diagnostics/DiagnosticsManager.test.js - Diagnostics
- [ ] lib/status/StatusService.test.js - Status parsing
- [ ] lib/helpers/HelpersService.test.js - GRBL helpers

**Long Term (Week 7-8)**
- [ ] lib/presets/PresetsService.test.js - Presets
- [ ] ui/cli/cli.test.js - CLI interface
- [ ] src/i18n.test.js - Internationalization

#### Integration Testing Strategy
- **Serial Port Integration**: Test with mock hardware responses
- **File Processing Integration**: Test complete G-code file workflows  
- **Error Recovery Integration**: Test alarm-to-recovery workflows
- **API Integration**: Test CLI-to-core and API-to-core communication

#### Continuous Integration Requirements
- **Pre-commit Hooks**: Run tests before commits
- **Coverage Gates**: Block merges below coverage thresholds
- **Test Performance**: Individual tests must complete within 100ms
- **Mock Verification**: Ensure mocks stay in sync with real implementations

### File Organization
- **Keep files small and focused**: Aim for under 300 lines per file
- Each file should have a single responsibility
- Split large files into smaller, more focused modules
- Use clear, descriptive file names that indicate purpose

### Configuration Management
- **No hardcoded values in logic files**: Extract all settings to config files
- Use `config.json` for application settings
- Use `settings/` directory for machine-specific configurations
- Keep magic numbers and strings in configuration files
- Pass configuration as dependencies rather than importing directly

### Code Review Process
- Regularly review existing code for refactoring opportunities
- Look for files exceeding 300 lines that need splitting
- Identify hardcoded values that should be moved to config
- Ensure proper separation of concerns

### Post-Edit Review Process
- **ALWAYS review import dependencies**: After editing any file, identify all files that import the edited file
- Check each importing file to see if changes are needed due to API modifications
- Update import statements, method calls, and dependencies as needed
- Run tests for all affected files to ensure no breaking changes
- Use search tools to find all references to modified functions/classes

## Strictly Enforced Architecture

### Self-Contained Module Structure
Each functional domain is organized as a self-contained module with all related files in a dedicated folder.

```
src/
├── core/                          # Core CNC functionality
│   ├── connection/                # Serial port management
│   │   ├── __tests__/            # Module-specific tests
│   │   ├── __mocks__/            # Mock data for testing
│   │   ├── README.md             # Module documentation
│   │   ├── config.js             # Module configuration
│   │   ├── index.js              # Public API exports
│   │   └── ConnectionManager.js  # Main implementation
│   │
│   ├── commands/                  # G-code command execution
│   │   ├── __tests__/
│   │   ├── __mocks__/
│   │   ├── README.md
│   │   ├── config.js
│   │   ├── index.js
│   │   └── CommandExecutor.js
│   │
│   ├── queries/                   # Status and settings queries
│   ├── files/                     # File operations
│   ├── diagnostics/               # Movement testing and diagnostics
│   └── alarms/                    # Alarm handling and recovery
│
├── services/                      # Cross-module services
│   ├── logger/
│   ├── status/
│   └── helpers/
│
├── interfaces/                    # UI interfaces (CLI)
└── utils/                         # Shared utilities
```

### Architecture Principles

#### Module Structure Elements
Each module folder must contain:
- `__tests__/`: All test files related to the module
- `__mocks__/`: Mock data and service mocks for testing
- `README.md`: Documentation on module purpose, usage, and API
- `config.js`: Module-specific configuration (optional)
- `index.js`: Public API exports that define what's accessible from outside
- `ModuleName.js`: Main implementation

#### Self-Containment Rules
- **Everything related to a module stays in one location**
- **Clear public APIs**: Each module exports a clean API via `index.js`
- **Configuration separation**: Module-specific config in `config.js`
- **Dependency injection**: Modules receive dependencies rather than creating them
- **No cross-module imports**: Modules only import from `lib/` or `utils/`

#### Responsibility Clusters
- **CNC**: CNC machine control functionality (formerly core/)
- **Lib**: Reusable modules and services (formerly services/)
- **UI**: User interaction layers (formerly interfaces/)
- **Utils**: Pure utility functions (argument parsing, help display)

### Architecture Enforcement
- **File size limit**: 300 lines maximum per file
- **Single responsibility**: Each file/module has one clear purpose
- **Configuration centralization**: No hardcoded values in logic files
- **Import discipline**: Clear dependency boundaries between layers
- **Test co-location**: Tests live with the code they test

### Structured Reporting Requirements
All report generation and display functions must follow structured data approach:

- **Data-Presentation Separation**: Functions that generate reports must return structured data objects, not directly log to console
- **Structured Logger Usage**: Use `StructuredLogger` for all report output with configurable output modes (console, JSON, API, file)
- **Report Structure Definitions**: Use `ReportStructures.js` functions to create consistent data formats
- **Output Mode Support**: All report functions must accept `outputMode` parameter to support multiple output formats
- **Backward Compatibility**: Provide legacy wrapper methods for console-only output when needed
- **Future API Ready**: Structure enables easy transition to web API endpoints returning JSON instead of console output

#### Required Structure for Report Functions:
```javascript
// CORRECT: Returns structured data
generateDiagnosticReport(diagnostics, outputMode = 'console') {
  const reportData = createDiagnosticReport(diagnostics);
  return structuredLogger.logStructured(reportData);
}

// INCORRECT: Direct console logging
generateDiagnosticReport(diagnostics) {
  console.log('Report title');
  console.log('Details...');
}
```

This approach ensures the application can seamlessly expand from CLI-only to support web APIs and multiple output formats.

### Logging Requirements
All console output must use the centralized Logger Service instead of direct console calls:

- **Use Logger Service**: Import and use logger functions from `src/lib/logger/LoggerService.js`
- **No Direct Console**: Never use `console.log`, `console.error`, `console.warn` directly in business logic
- **Appropriate Log Levels**: Use correct log levels for different types of output
- **Structured Data**: Pass additional data as second parameter for structured logging
- **Clean User Output**: Use `info()` for clean user-facing messages (no timestamps)

#### Required Logging Patterns:
```javascript
// CORRECT: Use Logger Service
import { log, debug, info, warn, error } from '../lib/logger/LoggerService.js';

log('Application started');
debug('Connection details', { port: '/dev/ttyUSB0' });
info('Clean user message');  // No timestamp, clean output
warn('Warning condition', { details: 'timeout' });
error('Operation failed', { error: err.message });

// INCORRECT: Direct console usage
console.log('Application started');
console.error('Error occurred');
console.warn('Warning message');
```

#### Log Level Guidelines:
- **`debug()`** - Detailed debugging information, verbose output
- **`info()`** - User-facing messages, clean output without timestamps
- **`log()`** - Standard application logging with timestamps
- **`warn()`** - Warning conditions that need attention
- **`error()`** - Error conditions and failures

#### Exceptions for Direct Console:
Direct console usage is only allowed in:
- **Test files** - for test output and assertions
- **CLI help/usage** - for command-line help text
- **Structured Logger** - internal console formatting within logger service itself

This ensures consistent, configurable, and structured logging across the entire application.

### UI/API Architecture Integration Plan

#### Current State Analysis
The existing `src/ui/api/` folder contains a working Express.js API server but does not follow the project's self-contained module architecture. Current issues:

- **Monolithic Structure**: Controllers, middleware, routes in separate folders
- **Hardcoded Configuration**: PORT, HOST, and other settings embedded in server.js
- **No Testing**: Missing __tests__ and __mocks__ folders
- **Hardcoded Messages**: Error messages and API responses embedded in code
- **No i18n Integration**: API responses not internationalized

#### Target Architecture: Feature-Based API Modules

**New Structure**
```
src/
├── ui/
│   ├── api/
│   │   ├── features/                    # Feature-based API modules
│   │   │   ├── connection/             # Connection management API
│   │   │   │   ├── __tests__/          # Connection API tests
│   │   │   │   ├── __mocks__/          # Mock requests/responses
│   │   │   │   ├── controller.js       # Connection controller
│   │   │   │   ├── routes.js           # Connection routes
│   │   │   │   ├── schemas.js          # Request/response schemas
│   │   │   │   ├── middleware.js       # Connection-specific middleware
│   │   │   │   └── index.js            # Feature exports
│   │   │   │
│   │   │   ├── machine/                # Machine control API
│   │   │   │   ├── __tests__/
│   │   │   │   ├── __mocks__/
│   │   │   │   ├── controller.js
│   │   │   │   ├── routes.js
│   │   │   │   ├── schemas.js
│   │   │   │   └── index.js
│   │   │   │
│   │   │   ├── gcode/                  # G-code execution API
│   │   │   ├── files/                  # File management API
│   │   │   ├── presets/                # Presets API
│   │   │   └── health/                 # Health/diagnostics API
│   │   │
│   │   ├── shared/                     # Shared API infrastructure
│   │   │   ├── __tests__/
│   │   │   ├── __mocks__/
│   │   │   ├── middleware/             # Shared middleware (cors, error handling)
│   │   │   ├── schemas/                # Common schemas
│   │   │   ├── services/               # API-specific services
│   │   │   └── validation/             # Input validation utilities
│   │   │
│   │   ├── config/                     # API configuration
│   │   │   ├── server.js               # Server configuration
│   │   │   ├── middleware.js           # Middleware configuration
│   │   │   ├── routes.js               # Route registration
│   │   │   └── swagger.js              # API documentation config
│   │   │
│   │   ├── locales/                    # API-specific i18n messages
│   │   │   └── en/
│   │   │       └── api-messages.json   # API response messages
│   │   │
│   │   └── server.js                   # Main server entry point
│   │
│   └── cli/                            # CLI interface (existing)
```

#### Migration Strategy

**Phase 1: Infrastructure Setup**
1. **Create new folder structure** following feature-based architecture
2. **Extract configuration** from hardcoded values to config files
3. **Set up i18n** for API responses with new locales/en/api-messages.json
4. **Create shared middleware** in shared/middleware/ folder
5. **Set up testing framework** for API endpoints

**Phase 2: Feature Migration**
1. **Connection Feature** - Migrate ConnectionController to features/connection/
2. **Machine Feature** - Migrate MachineController to features/machine/
3. **File Feature** - Migrate FileController to features/files/
4. **G-code Feature** - Migrate GcodeController to features/gcode/
5. **Presets Feature** - Migrate PresetController to features/presets/
6. **Health Feature** - Create new health/diagnostics endpoints

**Phase 3: Testing & Documentation**
1. **Unit Tests** - Add comprehensive test coverage for all API endpoints
2. **Integration Tests** - Test complete API workflows
3. **Mock Data** - Create realistic mock data for development and testing
4. **API Documentation** - Update Swagger documentation for new structure

#### Configuration Extraction Plan

**Current Hardcoded Values to Extract:**
- Server configuration (PORT, HOST, timeout settings)
- Middleware configuration (CORS settings, body limits, security headers)
- Error codes and messages
- API endpoint paths and versions
- Swagger documentation metadata

**New Configuration Files:**
```
src/ui/api/config/
├── server.js           # Server settings (port, host, timeouts)
├── middleware.js       # Middleware configuration
├── security.js        # Security and CORS settings
├── documentation.js    # Swagger/OpenAPI settings
└── responses.js        # Standard response formats
```

#### Internationalization Integration

**API Messages Structure:**
```json
// locales/en/api-messages.json
{
  "connection": {
    "success": {
      "connected": "Successfully connected to {port}",
      "disconnected": "Successfully disconnected from {port}",
      "ports_listed": "Available ports retrieved successfully"
    },
    "errors": {
      "port_required": "Port path is required",
      "already_connected": "Already connected to {port}. Disconnect first.",
      "connection_failed": "Failed to connect to {port}",
      "port_not_available": "Port {port} is not available"
    }
  },
  "machine": {
    "success": {
      "status_retrieved": "Machine status retrieved successfully",
      "command_sent": "Command sent successfully"
    },
    "errors": {
      "not_connected": "Machine not connected",
      "invalid_command": "Invalid G-code command"
    }
  }
}
```

**Integration with Existing i18n:**
- Extend existing i18next configuration to include API messages
- Create API-specific i18n middleware for request localization
- Support Accept-Language header for international API clients

#### Testing Strategy for API

**Test Structure per Feature:**
```javascript
// features/connection/__tests__/controller.test.js
describe('Connection Controller', () => {
  describe('POST /connect', () => {
    test('should connect to valid port', async () => {
      // Test successful connection
    });
    
    test('should handle invalid port', async () => {
      // Test error handling
    });
    
    test('should validate required fields', async () => {
      // Test input validation
    });
  });
});
```

**Mock Strategy:**
- Mock CNC core services for isolated API testing
- Create realistic request/response mock data
- Mock external dependencies (serial ports, file system)

#### Implementation Priority

**Week 1: Foundation**
- [ ] Create new folder structure
- [ ] Extract server configuration to config files
- [ ] Set up API-specific i18n messages
- [ ] Create shared middleware structure

**Week 2: Core Features**
- [ ] Migrate connection feature with tests
- [ ] Migrate machine feature with tests
- [ ] Update server.js to use new structure

**Week 3: Remaining Features**
- [ ] Migrate files, gcode, and presets features
- [ ] Create health/diagnostics feature
- [ ] Complete test coverage for all endpoints

**Week 4: Polish & Documentation**
- [ ] Integration testing
- [ ] Update API documentation
- [ ] Performance optimization
- [ ] Security review

#### Benefits of New Architecture

1. **Maintainability**: Each feature is self-contained with its own tests and documentation
2. **Scalability**: Easy to add new API features following the established pattern
3. **Testability**: Comprehensive test coverage with feature-specific mocks
4. **Internationalization**: API responses support multiple languages
5. **Configuration**: All settings externalized for different environments
6. **Documentation**: Clear feature boundaries and API contracts
7. **Consistency**: Follows the same architecture patterns as the core CNC modules

This migration will transform the API from a monolithic structure to a modular, feature-based architecture that aligns with the project's architectural principles and supports future growth.

## Recent Changes
- Modified `executeGcodeFile` method to properly wait for responses before sending next command
- Removed arbitrary delays in favor of response-based sequencing
- Safety checks and alarm handling
- Migrated all console.log/error/warn statements to use centralized Logger Service (75+ statements across 10 files)