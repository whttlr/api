# Ink CLI Development Guide

## 🚀 Quick Start

### Running the Application

```bash
# Build and run the complete app
npm run ink

# Or run individual steps
npm run ink:build  # Build the JSX app
npm run ink:run    # Run the built app
```

### Development Commands

```bash
# Run minimal test app
node run-minimal.js

# Run working app with navigation
node run-working.js

# Run full featured app
node run-fixed.js
```

## 🏗️ Architecture Overview

The Ink CLI application is built with a modular architecture:

```
src/ui/ink/
├── fixed-app.jsx          # Complete working application
├── working-app.jsx        # App with navigation
├── minimal-app.jsx        # Simple test version
├── simple-app.jsx         # Basic functionality test
└── dev-start.js          # Development runner
```

### Key Components

1. **Context Providers**
   - `AppStateProvider` - Navigation and UI state
   - `MachineProvider` - Machine status and connection
   - `SettingsProvider` - User preferences and configuration

2. **Core Components**
   - `Button` - Styled interactive buttons
   - `Modal` - Overlay dialogs and help screens
   - `StatusBar` - Persistent footer with machine info
   - `MainMenu` - Primary navigation interface

3. **Navigation System**
   - Screen-based routing with context
   - Back navigation support
   - Global hotkey system

## 🔧 Development Workflow

### Building JSX Applications

The app uses esbuild to compile JSX:

```bash
npx esbuild src/ui/ink/fixed-app.jsx \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/ink-app.js \
  --external:ink \
  --external:react
```

### Key External Dependencies

- `ink` - React for CLI interfaces
- `react` - React library
- All other dependencies are bundled

### Testing Different Versions

1. **Minimal App** (`minimal-app.jsx`)
   - Basic menu with keyboard navigation
   - No complex contexts or features

2. **Working App** (`working-app.jsx`)
   - Complete context system
   - Navigation between screens
   - Button components with styling

3. **Fixed App** (`fixed-app.jsx`)
   - Full feature set
   - Status bar and modals
   - Global hotkey system
   - All architectural components

## 🎮 User Interface

### Keyboard Controls

- **↑↓** - Navigate menu items
- **Enter** - Select current item
- **1,2,3** - Quick navigation to main features
- **q** - Quit application
- **g** - Show G-code reference (global)
- **?** - Show keyboard shortcuts (global)
- **Esc** - Go back/close modals

### Visual Features

- **Double borders** for selected items
- **Single borders** for unselected items
- **Color coding** for different button types
- **Status bar** with machine information
- **Modal overlays** for help and references

## 🐛 Common Issues and Solutions

### Raw Mode Errors

```
ERROR Raw mode is not supported on the current process.stdin
```

**Solution**: This is expected when running in non-interactive environments. The app still works, but keyboard input may be limited. Run in a proper terminal for full functionality.

### JSX Compilation Errors

```
ERROR Unknown file extension ".jsx"
```

**Solution**: Use the build step with esbuild before running:
```bash
npm run ink:build
```

### Component Nesting Issues

```
ERROR <Box> can't be nested inside <Text> component
```

**Solution**: Ensure proper Ink component hierarchy:
- `<Box>` components can contain `<Text>` or other `<Box>` components
- `<Text>` components can only contain strings or inline text
- Never nest `<Box>` inside `<Text>`

## 📦 Build System

### esbuild Configuration

The build system uses esbuild with these settings:
- **Bundle**: Combines all modules into single file
- **Platform**: `node` for Node.js compatibility
- **Format**: `esm` for ES modules
- **External**: `ink` and `react` are not bundled (loaded at runtime)

### Output Structure

```
dist/
├── ink-app.js         # Main bundled application
├── minimal-app.js     # Minimal test version
├── working-app.js     # Working version with navigation
└── fixed-app.js       # Complete feature-rich version
```

## 🔄 Development Cycle

1. **Edit** JSX files in `src/ui/ink/`
2. **Build** with `npm run ink:build`
3. **Test** with `npm run ink:run`
4. **Debug** using console logs or simplified versions
5. **Iterate** by fixing issues and rebuilding

## 🎯 Next Steps

- Add more interactive features to placeholder screens
- Implement real CNC integration points
- Add comprehensive error handling
- Create automated testing for UI components
- Add TypeScript support for better development experience

## 📝 Notes

- The app is fully functional with navigation, contexts, and UI components
- All major architectural pieces are in place and working
- The foundation supports easy addition of new features
- Component nesting issues have been resolved
- Import paths are correctly configured