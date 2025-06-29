# Diagnostics Module

## Purpose
Provides comprehensive machine diagnostics including movement testing, health scoring, homing analysis, and diagnostic reporting.

## Public API

### DiagnosticsManager Class
```javascript
import { DiagnosticsManager, DIAGNOSTIC_TYPES, HEALTH_SCORES, TEST_RESULTS } from './index.js';

const diagnosticsManager = new DiagnosticsManager(config);
```

### Methods
- `testSmallMovements(commandExecutor, port, isConnected)` - Test basic machine movements
- `generateDiagnosticReport(diagnostics)` - Generate formatted diagnostic report
- `analyzeHomingRequirements(grblSettings)` - Analyze homing configuration
- `analyzeDiagnostics(diagnostics)` - Analyze diagnostic results for issues
- `runComprehensiveDiagnostics(queryManager, commandExecutor, port, isConnected)` - Full diagnostic suite
- `isMachineReady(diagnostics)` - Check if machine is ready for operation
- `calculateHealthScore(diagnostics)` - Calculate machine health score (0-100)

### Diagnostic Types
- **Movement Tests**: Small movement commands to verify responsiveness
- **Homing Analysis**: Check homing configuration and limit switches
- **Comprehensive**: Full diagnostic suite with all checks
- **Health Check**: Overall machine health assessment

### Health Scoring
- **Excellent (90-100)**: Machine fully operational
- **Good (75-89)**: Minor issues, mostly operational
- **Fair (50-74)**: Some issues affecting performance
- **Poor (25-49)**: Significant issues requiring attention
- **Critical (0-24)**: Major problems, machine not operational

## Configuration
Requires config object with:
- `movementDebug.testMovements` - Array of test movement commands
- `ui.diagnosticsEmojis` - Icons for diagnostic output
- `ui.reportSeparator` - Report formatting

## Usage Example
```javascript
const diagnostics = new DiagnosticsManager(config);

// Run comprehensive diagnostics
const results = await diagnostics.runComprehensiveDiagnostics(
  queryManager, commandExecutor, port, true
);

// Generate report
diagnostics.generateDiagnosticReport(results);

// Check machine health
const healthScore = diagnostics.calculateHealthScore(results);
console.log(`Machine health: ${healthScore}%`);
```

## Dependencies
- No external dependencies (self-contained)