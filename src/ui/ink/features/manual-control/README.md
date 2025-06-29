# Manual Control Feature

Complete manual control functionality for CNC machine jogging, positioning, and work coordinate system management.

## Components

### ManualControlScreen
Main interface component that combines all manual control functionality.

**Features:**
- Real-time position display (machine and work coordinates)
- Jog controls with speed and distance settings
- Work coordinate system management
- Keyboard movement controls
- Safety validation and error handling

### PositionDisplay
Shows current machine and work coordinates with active movement indicators.

**Props:**
- `machinePosition` - Current machine position {x, y, z}
- `workOffset` - Work coordinate offset {x, y, z}
- `activeDirection` - Currently active movement direction

### JogControls
Speed and distance controls for machine jogging operations.

**Props:**
- `jogSpeed` - Current speed preset ('slow', 'medium', 'fast')
- `jogDistance` - Current jog distance
- `continuousJog` - Continuous jog mode flag
- `onSpeedChange` - Speed change handler
- `onToggleContinuous` - Continuous mode toggle handler

### WorkCoordinates
Work coordinate system management interface.

**Props:**
- `workOffset` - Current work offset {x, y, z}
- `onSetOrigin` - Set origin handler
- `onGoToOrigin` - Go to origin handler
- `onResetOrigin` - Reset origin handler

### MovementInstructions
Displays keyboard controls and movement instructions.

## Hooks

### useManualControl
Complete state management for manual control operations.

**Returns:**
- State: jogSpeed, jogDistance, isJogging, activeDirection, continuousJog, workOffset, workPosition
- Actions: controlActions, handleJogInput, handleSpeedChange, handleDistanceChange, executeHome, etc.

## Services

### ManualControlService
Utilities for manual control operations, coordinate formatting, and jog commands.

**Functions:**
- `formatPosition(value, units)` - Format position for display
- `getDisplayUnit(units)` - Get unit display string
- `buildJogCommand(direction, distance, speed)` - Build G-code jog command
- `parseDirection(input, key)` - Parse direction from keyboard input
- `validateJogParameters(distance, speed)` - Validate jog parameters
- `calculateWorkPosition(machinePos, workOffset)` - Calculate work position
- `getJogSpeeds()` - Get speed presets

## Keyboard Controls

### Movement
- **Arrow Keys / WASD**: X/Y axis movement
- **Q/E**: Z-axis movement (up/down)
- **H**: Home machine
- **C**: Toggle continuous jog mode

### Speed Control
- **1**: Slow speed (300 mm/min)
- **2**: Medium speed (1000 mm/min)
- **3**: Fast speed (3000 mm/min)

### Distance Control
- **+/-**: Adjust jog distance (±0.1mm)

### Work Coordinates
- **Z**: Set current position as work origin
- **G**: Go to work origin
- **R**: Reset work origin to zero

### Navigation
- **ESC**: Return to main menu

## Safety Features

- Movement validation against machine limits
- Parameter validation for distance and speed
- Safety warnings for large movements or high speeds
- Emergency stop integration
- Real-time position monitoring

## Integration

This feature integrates with:
- **CNCContext**: Machine state and command execution
- **ToastContext**: User notifications and feedback
- **SettingsContext**: Machine configuration and limits
- **SafetyValidator**: Movement safety validation
- **AppStateContext**: Navigation and screen management

## Usage Example

```javascript
import { ManualControlScreen } from './features/manual-control';

function App() {
  return <ManualControlScreen />;
}
```