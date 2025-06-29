# Alarms Module

## Purpose
Handles alarm detection, analysis, recovery procedures, and alarm-specific diagnostics for CNC machines.

## Public API

### AlarmManager Class
```javascript
import { AlarmManager, ALARM_TYPES, ALARM_SEVERITY, RECOVERY_STATUS } from './index.js';

const alarmManager = new AlarmManager(config);
```

### Methods
- `performAlarmAnalysis(diagnostics)` - Analyze alarm conditions from diagnostics
- `testAlarmTriggers(commandExecutor, port, isConnected)` - Test alarm triggering (diagnostic)
- `analyzeAlarmDiagnostics(diagnostics)` - Analyze alarm-related issues
- `generateAlarmDiagnosticReport(diagnostics)` - Generate alarm-specific report
- `getRecoveryCommands(alarmType)` - Get recovery command sequence for alarm type
- `executeAlarmRecovery(alarmType, commandExecutor, port, isConnected)` - Execute recovery
- `isInAlarmState(machineStatus)` - Check if machine is currently in alarm
- `getPreventionChecklist()` - Get alarm prevention checklist

### Alarm Types
- **Type 1**: Hard limit triggered
- **Type 2**: G-code motion exceeds machine travel
- **Type 3**: Reset while in motion
- **Type 4**: Probe fail - no contact
- **Type 5**: Probe fail - already triggered
- **Type 6**: Homing fail - no limit switches
- **Type 7**: Homing fail - safety door opened
- **Type 8**: Homing fail - pull off exceeded
- **Type 9**: Homing fail - no limit switches found

### Recovery Procedures
Each alarm type has specific recovery steps:
- Unlock commands (`$X`)
- Homing commands (`$H`)
- Position verification
- Safety checks

## Configuration
Requires config object with:
- `alarms.recoverySteps` - Recovery procedures by alarm type
- `alarms.descriptions` - Alarm type descriptions
- `ui.diagnosticsEmojis` - Icons for alarm reporting

## Usage Example
```javascript
const alarmManager = new AlarmManager(config);

// Analyze current alarm state
const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

if (analysis.alarmDetected) {
  console.log(`Alarm Type ${analysis.alarmType}: ${analysis.description}`);
  
  // Execute recovery
  const recovery = await alarmManager.executeAlarmRecovery(
    analysis.alarmType, commandExecutor, port, true
  );
  
  console.log(`Recovery: ${recovery.successful}/${recovery.results.length} steps completed`);
}

// Generate alarm report
alarmManager.generateAlarmDiagnosticReport(diagnostics);
```

## Dependencies
- No external dependencies (self-contained)