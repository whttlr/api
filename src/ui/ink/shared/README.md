# Shared Infrastructure

Common components, hooks, and services used across all features.

## Context Providers

### AppStateContext
- Global application state (current screen, loading, errors, modals)
- Navigation actions (navigateTo, goBack)
- UI state management (showModal, setLoading)

### MachineContext  
- Machine connection status
- Real-time position and status updates
- Alarm and error state
- Work coordinate system

### SettingsContext
- User preferences (units, theme, hotkeys)
- Machine configuration (limits, step sizes)
- Settings persistence and validation

## Hooks

### useGlobalHotkeys
- Global keyboard shortcut handling
- Context-sensitive hotkey routing
- Integration with all context providers

### useAppState
- Convenient wrapper for AppStateContext
- Provides navigation and UI state actions

### useCncConnection
- Machine connection management
- Real-time status polling
- Command sending interface

## Components

### Button
- Styled button component with variants
- Selection states and keyboard navigation
- Consistent styling across features

### Modal
- Overlay modal component
- Configurable size and content
- ESC key handling for dismissal

### ProgressBar
- Visual progress indication
- Customizable colors and sizing
- Percentage display option

### TextInput
- Single and multi-line text input
- Cursor navigation and editing
- Focus states and validation

### FileSelector
- Directory browsing component
- File filtering by extension
- Keyboard navigation and selection

## Services

### ScreenRouter
- Screen navigation logic
- History management
- Route validation and available screens

## Utils

### keyBindings
- Key mapping and formatting utilities
- Cross-platform key handling
- Hotkey description formatting

### formatting
- Position, time, and unit formatting
- File size and percentage display
- Text truncation and padding
- ASCII box creation for layouts

This shared infrastructure ensures consistency and reusability across all features while maintaining clean separation of concerns.