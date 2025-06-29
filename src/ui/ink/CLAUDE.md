# Claude Context for CNC Ink UI Project

## 🚨 CRITICAL DEVELOPMENT RULES - ALWAYS FOLLOW

**Before starting ANY task, review these rules. Before completing ANY task, verify compliance with ALL rules.**

### 🌐 Internationalization (i18n)
- **ALWAYS use i18n for user-facing messages** - Never hardcode text strings
- Import from `i18n` and use `i18n.t('key', {params})` for all user output
- Add new message keys to `locales/en/cli-messages.json`
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
- Move repeated code into shared/ directories

### 📏 File Size Limits
- **Maximum 300 lines per file** - Split larger files immediately
- Each file should have a single responsibility
- Use clear, descriptive file names that indicate purpose
- Keep functions focused and atomic

### 🏗️ Feature-Based Architecture
- **Follow the feature-based module structure** exactly
- Each feature contains: `components/`, `hooks/`, `services/`, `index.js`
- Use composition patterns and clear public APIs
- NO cross-feature imports except from `shared/`

### ⚛️ Atomic & Reusable Components
- **Keep components atomic** - single responsibility principle
- Design for reusability across different contexts
- Use composition over prop drilling
- Clear interfaces and minimal dependencies

### ⚙️ Configuration Management
- **NO hardcoded values in logic files** - extract ALL settings to config
- Use `config/` directory for application settings
- Pass configuration as props or context, don't import directly

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
A React Ink-based terminal UI for CNC machine control, providing an intuitive command-line interface for G-code execution, manual control, and machine management.

## Key Technologies & Dependencies
- **React Ink**: Terminal UI framework for building CLI interfaces with React components
- **React**: Core library for component-based architecture
- **Node.js**: Runtime environment for the application
- **SerialPort**: Communication with CNC machines via serial connection (from parent project)
- **Jest**: Testing framework for unit and integration tests

## Project Structure
**NOTE**: If any files are created, deleted, or moved, please update this architecture section to reflect the current project structure.

```
src/ui/ink/
├── features/                      # Feature modules (screens)
│   ├── connection/                # Serial connection management
│   │   ├── components/            # Connection-specific components
│   │   ├── hooks/                 # Connection-related hooks
│   │   ├── services/              # Connection services
│   │   └── index.js               # Feature exports
│   │
│   ├── file-browser/              # G-code file management
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   │
│   ├── gcode-execution/           # G-code execution control
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   │
│   ├── job-progress/              # Job monitoring and progress
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   │
│   ├── main-menu/                 # Primary navigation
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   │
│   ├── manual-control/            # Manual machine control
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   │
│   └── settings/                  # Application configuration
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.js
│
├── shared/                        # Shared components and utilities
│   ├── components/                # Reusable UI components
│   │   ├── feedback/              # Loading, toasts, notifications
│   │   ├── input/                 # Form inputs, text fields
│   │   ├── interactive/           # Selectable lists, menus
│   │   ├── layout/                # Layout components, sidebar
│   │   └── modals/                # Modal dialogs, confirmations
│   │
│   ├── contexts/                  # React contexts for state management
│   │   ├── AppStateContext.jsx    # Global app state and navigation
│   │   ├── CNCContext.jsx         # CNC machine state and commands
│   │   ├── SettingsContext.jsx    # User settings and preferences
│   │   └── ToastContext.jsx       # Toast notifications
│   │
│   └── services/                  # Shared business logic services
│       ├── KeyboardService.js     # Keyboard shortcut management
│       ├── StorageService.js      # Local data persistence
│       └── ValidationService.js   # Input validation utilities
│
├── router/                        # Navigation and routing
│   └── AppRouter.jsx              # Central routing logic
│
├── config/                        # Configuration files
│   ├── keyboard.js                # Keyboard shortcuts configuration
│   ├── screens.js                 # Screen definitions and metadata
│   └── theme.js                   # UI theme and styling constants
│
├── locales/                       # Internationalization
│   └── en/                        # English language files
│       └── cli-messages.json      # UI text and messages
│
├── CNCApp.jsx                     # Main application component
└── App.js                         # Application entry point
```

## Architecture Principles

### Feature-Based Organization
Each feature is a self-contained module with:
- **Components**: Feature-specific React components
- **Hooks**: Custom hooks for feature logic
- **Services**: Business logic and API calls
- **Index**: Public API exports

### Shared Resources
- **Components**: Reusable UI elements across features
- **Contexts**: Global state management with React Context
- **Services**: Cross-feature business logic

### Layout System
- **100% Width Layout**: All screens utilize full terminal width
- **Collapsible Sidebar**: Help information accessible via '?' hotkey
- **Status Bar**: Fixed bottom bar with machine status and shortcuts
- **Responsive Design**: Adapts to different terminal sizes

### State Management
- **AppStateContext**: Navigation, loading states, sidebar management
- **CNCContext**: Machine connection, status, and commands
- **SettingsContext**: User preferences and configuration
- **ToastContext**: Notification and feedback messages

### Navigation System
- **State-Based Routing**: Uses React state instead of URL routing
- **Keyboard Navigation**: Arrow keys, shortcuts, and hotkeys
- **Screen Transitions**: Smooth transitions between different screens
- **Breadcrumb Support**: Back navigation and screen history

## Key Components

### Layout Components
- **AppRouter**: Central routing and layout management with 100% width and collapsible sidebar
- **HelpSidebar**: Context-sensitive help panel with keyboard shortcuts for each screen
- **StatusBar**: Fixed bottom status and navigation bar
- **LoadingSpinner**: Consistent loading indicators

### Interactive Components
- **SelectableList**: Unified list selection with keyboard navigation
- **TextInput**: Standardized text input with validation
- **ConfirmationModal**: User confirmation dialogs
- **EmergencyStopModal**: Safety-critical stop functionality

### Feature Screens
- **MainMenuScreen**: Primary navigation and feature access
- **ConnectionScreen**: Serial port connection management
- **GCodeExecutionScreen**: G-code file execution and monitoring
- **FileBrowserScreen**: G-code file browsing and selection
- **ManualControlScreen**: Direct machine control interface
- **SettingsScreen**: Application and machine configuration
- **JobProgressScreen**: Real-time job monitoring

## Keyboard Shortcuts

### Global Shortcuts
- **'?'**: Toggle help sidebar (implemented in CNCApp.jsx)
- **ESC**: Back/cancel action
- **Ctrl+C**: Emergency stop and exit

### Navigation Shortcuts
- **↑/↓**: Navigate lists and menus
- **Enter**: Select/confirm action
- **Tab**: Switch between panels/sections

### Screen-Specific Shortcuts
- **Space**: Start/pause operations
- **'s'**: Stop current operation
- **'r'**: Refresh/reload data
- **'h'**: Home machine axes
- **'u'**: Unlock machine alarms

## Development Guidelines

### Component Design
- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Build complex UIs from simple, reusable components
- **Props Interface**: Clear, documented prop interfaces
- **Error Boundaries**: Proper error handling and user feedback

### State Management
- **Context Usage**: Use appropriate context for different state types
- **State Colocation**: Keep state as close to usage as possible
- **Immutable Updates**: Always use immutable state update patterns
- **Performance**: Optimize context and re-render performance

### Testing Strategy
- **Component Testing**: Test components in isolation with mocks
- **Integration Testing**: Test feature workflows end-to-end
- **Keyboard Testing**: Verify all keyboard interactions work correctly
- **Error Testing**: Test error conditions and recovery scenarios

### Code Quality
- **TypeScript-like Props**: Document expected props clearly
- **Error Handling**: Graceful degradation and user-friendly errors
- **Performance**: Optimize for terminal rendering performance
- **Accessibility**: Ensure keyboard-only navigation works well

## React Ink Patterns

### Essential Components
- **Box Components**: Use `<Box>` for layout instead of div
- **Text Components**: Use `<Text>` for all text rendering
- **useInput Hook**: Handle keyboard input with useInput
- **Flexbox Layout**: Use flexbox properties for responsive layouts

### Layout Best Practices
- **Fixed Dimensions**: Be mindful of terminal size constraints
- **Color Usage**: Use colors sparingly and meaningfully
- **Border Styles**: Use consistent border styles across components
- **Text Wrapping**: Handle long text gracefully
- **Loading States**: Provide clear feedback for async operations

### Performance Considerations
- **Render Optimization**: Minimize unnecessary re-renders
- **Memory Usage**: Clean up resources and event listeners
- **Terminal Updates**: Batch updates to reduce flickering
- **Component Lifecycle**: Proper mount/unmount handling

## Configuration Files

### Current Configuration
- **config/app.js**: Application-wide settings
- **config/hotkeys.js**: Keyboard shortcut definitions
- **config/screens.js**: Screen metadata and navigation rules
- **config/themes.js**: Terminal colors and styling
- **locales/en/cli-messages.json**: All user-facing text and messages

### Configuration Management
- Extract all hardcoded values to config files
- Use context or props to pass configuration
- Keep magic numbers and strings in configuration files
- Support different environments (dev, test, production)

## Dependencies Reference

This project uses the parent project's dependencies and services:

### Core CNC Dependencies
- **CNC Core Logic**: `../../cnc/` - Core CNC control functionality
- **Shared Libraries**: `../../lib/` - Reusable services and utilities
- **Configuration**: `../../config.json` - Application settings
- **Internationalization**: `../../i18n.js` - i18n setup and configuration

### External Dependencies
- **serialport**: Serial communication with CNC machines
- **jest**: Testing framework
- **i18next**: Internationalization framework
- **i18next-fs-backend**: File system backend for translations

## Important Notes

### Terminal UI Specifics
- This is a terminal-based UI using React Ink, not a web application
- All interactions are keyboard-driven - no mouse support
- Components must be optimized for terminal rendering
- Serial communication requires careful error handling and timeouts
- Safety features (emergency stop) must be always accessible

### Help System
- Context-sensitive help via HelpSidebar component
- Different help content for each screen/feature
- Keyboard shortcuts documentation
- Toggle help with '?' key globally

### Safety Considerations
- Emergency stop functionality always accessible
- Proper error handling and user feedback
- Input validation for all G-code and machine commands
- Clear status indicators for machine state

## Recent Architectural Changes

### Layout Improvements
- **100% Width Layout**: Updated AppRouter.jsx to use full terminal width
- **Collapsible Sidebar**: Added HelpSidebar component with context-sensitive help
- **Global Keyboard Shortcuts**: Implemented '?' hotkey in CNCApp.jsx to toggle sidebar
- **Improved State Management**: Enhanced AppStateContext with sidebar state management

### Component Organization
- Standardized component structure across features
- Clear separation of concerns between layout and business logic
- Consistent prop interfaces and error handling patterns
- Reusable components in shared/ directory

This documentation provides a comprehensive guide for developing and maintaining the CNC Ink UI project while following established patterns and best practices.