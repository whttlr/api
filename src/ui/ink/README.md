# Ink CLI Application - Complete Implementation

A comprehensive React-based CLI application using [Ink](https://github.com/vadimdemedes/ink) for CNC G-code control and machine management.

## 🎯 Overview

This application provides a full-featured command-line interface for CNC machine control, including G-code execution, manual jogging, spindle control, and comprehensive settings management. Built with modern React patterns and following strict architectural principles.

## 🏗️ Architecture

This application follows the self-contained module architecture defined in CLAUDE.md, with each feature organized as an independent, testable module.

### Project Structure

```
src/ui/ink/
├── features/                      # Feature-based modules
│   ├── navigation/                # Main menu and routing
│   │   ├── components/            # MainMenu, StatusBar, HotkeyHelp
│   │   ├── screens/               # MainScreen
│   │   └── README.md
│   ├── gcode-execution/           # G-code workflows
│   │   ├── components/            # Editor, Selector, Viewer, Runner
│   │   ├── screens/               # ExecuteScreen
│   │   ├── hooks/                 # useGcodeExecution, useFileSelector
│   │   ├── services/              # GcodeValidator, ExecutionService
│   │   └── README.md
│   ├── manual-control/            # Machine control
│   │   ├── components/            # JogControls, SpindleControls, etc.
│   │   ├── screens/               # ManualControlScreen, AdvancedControlScreen
│   │   ├── hooks/                 # useJogging, useMachineStatus
│   │   ├── services/              # JoggingService, StatusService
│   │   └── README.md
│   └── settings/                  # Configuration management
│       ├── components/            # SettingsForm, MachineSettings, UnitsToggle
│       ├── screens/               # SettingsScreen
│       ├── hooks/                 # useSettings
│       ├── services/              # SettingsService
│       └── README.md
├── shared/                        # Shared infrastructure
│   ├── context/                   # React contexts
│   ├── hooks/                     # Shared hooks
│   ├── components/                # Reusable UI components
│   ├── services/                  # Business logic
│   ├── utils/                     # Utilities
│   └── README.md
├── config/                        # Configuration files
│   ├── app.js                     # Application settings
│   ├── hotkeys.js                 # Keyboard shortcuts
│   ├── screens.js                 # Screen definitions
│   └── themes.js                  # UI themes
├── locales/                       # Internationalization
│   └── en/cli-messages.json       # English messages
├── App.jsx                        # Main application entry
└── README.md                      # This file
```

## ✨ Features

### 🎮 Navigation & Interface
- **Main Menu**: Intuitive navigation with keyboard shortcuts
- **Status Bar**: Persistent machine status display
- **Hotkey Help**: Context-sensitive help system
- **Global Shortcuts**: Always-available commands

### 📝 G-code Execution
- **Manual Entry**: Multi-line editor with syntax validation
- **File Selection**: Browse and select from `.gcode` directory
- **Code Preview**: Syntax-highlighted preview with metadata
- **Real-time Execution**: Progress monitoring with pause/resume/stop
- **Validation**: Pre-execution safety and syntax checking

### 🕹️ Manual Control
- **Precision Jogging**: Multi-axis control with configurable step sizes
- **Homing**: Individual or simultaneous axis homing
- **Spindle Control**: RPM, direction, and coolant management
- **Status Monitoring**: Real-time position and machine state
- **Safety Features**: Travel limits and emergency stop

### ⚙️ Settings Management
- **Machine Configuration**: Limits, speeds, and safety parameters
- **User Preferences**: Units, themes, and interface options
- **Connection Settings**: Serial port and communication parameters
- **File Persistence**: Automatic save/load with validation

## 🎨 Shared Infrastructure

### Context Providers
- **AppStateContext**: Navigation, loading states, modals, errors
- **MachineContext**: Position, status, connection, alarms
- **SettingsContext**: User preferences and machine configuration

### Reusable Components
- **Button**: Styled buttons with variants and states
- **Modal**: Overlay dialogs with keyboard handling
- **ProgressBar**: Visual progress indication
- **TextInput**: Single/multi-line input with validation
- **FileSelector**: Directory browsing with filtering

### Hooks & Services
- **useGlobalHotkeys**: Global keyboard shortcut management
- **useCncConnection**: Machine communication abstraction
- **ScreenRouter**: Navigation and screen management
- **Formatting Utils**: Consistent data presentation

## 🚀 Getting Started

### Prerequisites
```bash
npm install ink react fs path
```

### Installation
1. Clone/copy the implementation to your project
2. Install dependencies
3. Run the application:

```bash
# Development
node -r esm src/ui/ink/App.jsx

# Production (requires build setup)
npm run build:ink
npm start
```

### Configuration
The application will create a `config/user-settings.json` file on first run. Default settings include:

- **Travel Limits**: X/Y ±200mm, Z ±100mm
- **Speed Limits**: 8000 mm/min max, 24000 RPM max
- **Step Sizes**: 0.001, 0.01, 0.1, 1, 10, 100 mm
- **Units**: Metric (mm) by default

## ⌨️ Keyboard Controls

### Global (Available Everywhere)
- `g` - Show G-code command reference
- `u` - Toggle metric/imperial units
- `s` - Open settings screen
- `?` - Show keyboard shortcuts help
- `q` - Quit application
- `Ctrl+C` - Emergency exit

### Navigation
- `↑↓` - Navigate menus and lists
- `Enter` - Select/activate
- `Esc` - Go back/cancel
- `Tab` - Cycle through tabs/sections

### G-code Execution
- `Enter` - Execute G-code
- `Ctrl+S` - Save file
- `Space` - Pause/resume during execution
- `S` - Stop execution

### Manual Control
- `X/Y/Z` - Select axis
- `←→↑↓` - Jog selected axis
- `+/-` - Change step size
- `H` - Home all axes
- `M` - Start/stop spindle
- `Space` - Emergency stop

### Settings
- `1-4` - Switch setting categories
- `Ctrl+S` - Save settings
- `Ctrl+R` - Reset to defaults

## 🛡️ Safety Features

### Validation & Limits
- **Travel Boundaries**: Configurable per-axis limits
- **Speed Limits**: Maximum feed rate and RPM validation
- **G-code Validation**: Syntax and safety checking
- **Emergency Stop**: Always-accessible halt functionality

### Error Handling
- **Connection Monitoring**: Automatic detection of communication issues
- **Alarm States**: Machine alarm detection and display
- **Input Validation**: Real-time validation with helpful error messages
- **Graceful Degradation**: Fallback behavior for edge cases

## 🧪 Testing Strategy

Each feature includes comprehensive testing:
- **Unit Tests**: Individual component and service testing
- **Integration Tests**: Cross-component workflow testing
- **Mock Services**: Isolated testing with simulated hardware
- **Validation Testing**: Settings and input validation coverage

## 🔌 Integration Points

### CNC Core Services
- Uses existing `src/cnc/GcodeSender.js` for execution
- Integrates with `src/cnc/connection/ConnectionManager.js`
- Leverages `src/lib/logger/LoggerService.js` for logging

### File System
- G-code files from `.gcode/` directory
- Settings persistence in `config/user-settings.json`
- Automatic directory creation and file management

## 🎛️ Configuration

### Application Settings (`config/app.js`)
```javascript
{
  defaultScreen: 'main-menu',
  refreshRate: 100,
  fileExtensions: ['.gcode', '.nc', '.tap'],
  gcodeDirectory: '.gcode/'
}
```

### Keyboard Shortcuts (`config/hotkeys.js`)
- Global shortcuts available on all screens
- Context-specific shortcuts per screen
- Customizable key bindings

### Themes (`config/themes.js`)
- Default color scheme
- Monochrome option for accessibility
- Customizable UI elements

## 📚 Development

### Adding New Features
1. Create feature directory with standard structure
2. Implement components, hooks, and services
3. Add to main App.jsx routing
4. Update configuration files
5. Write comprehensive tests

### Code Standards
- Follow self-contained module architecture
- Use TypeScript for enhanced safety (planned)
- Maintain 90%+ test coverage
- Document all public APIs

## 🔄 Future Enhancements

- **TypeScript Migration**: Enhanced type safety
- **Plugin System**: Extensible feature architecture
- **Remote Control**: Network-based machine access
- **Advanced Visualization**: 3D toolpath preview
- **Macro System**: Custom G-code sequences
- **Multi-language Support**: International localization

## 📄 License

This implementation follows the same license as the parent CNC project.

---

**Built with ❤️ using React, Ink, and modern JavaScript patterns**