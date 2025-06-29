# Queries Module

## Purpose
Manages machine status queries, GRBL settings retrieval, coordinate system queries, and limits information for CNC machines.

## Public API

### QueryManager Class
```javascript
import { QueryManager, QUERY_TYPES, MACHINE_STATES } from './index.js';

const queryManager = new QueryManager(config);
```

### Methods
- `queryMachineStatus(commandExecutor, port, isConnected)` - Get current machine status
- `queryGrblSettings(commandExecutor, port, isConnected)` - Retrieve GRBL settings
- `queryCoordinateSystems(commandExecutor, port, isConnected)` - Get coordinate systems
- `queryParserState(commandExecutor, port, isConnected)` - Get parser state
- `getLimitsInfo(isConnected, statusQuery, settingsQuery)` - Get machine limits
- `displayLimitsInfo(limitsInfo)` - Display limits information
- `getStatus(isConnected, currentPort, responseCallbacks)` - Connection status
- `runFullQuery(commandExecutor, port, isConnected)` - Comprehensive query suite
- `generateQueryReport(queryResults)` - Generate formatted report

### Query Types
- **Machine Status**: Position, state, feed rate, spindle speed
- **GRBL Settings**: All machine configuration parameters
- **Coordinate Systems**: Work coordinate offsets
- **Parser State**: Current modal state
- **Limits Info**: Travel limits and safety boundaries

## Configuration
Requires config object with:
- `ui` - Report formatting and display options
- Query timeout settings (inherited from command executor)

## Usage Example
```javascript
const queryManager = new QueryManager(config);

// Single queries
const status = await queryManager.queryMachineStatus(executor, port, true);
const settings = await queryManager.queryGrblSettings(executor, port, true);

// Comprehensive query
const fullResults = await queryManager.runFullQuery(executor, port, true);
queryManager.generateQueryReport(fullResults);
```

## Dependencies
- `../services/status.js` - Status parsing and query functions