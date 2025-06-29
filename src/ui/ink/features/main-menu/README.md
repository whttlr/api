# Main Menu Feature

Primary navigation interface for the CNC G-Code Control System.

## Components

### MainMenu
Core menu component with keyboard navigation and visual selection indicators.

**Features:**
- Arrow key navigation
- Keyboard shortcuts (1, 2, 3, c, 4, q)
- Visual selection with arrows and color coding
- Dynamic description display
- Exit confirmation for quit option

**Usage:**
```jsx
import { MainMenu } from '../features/main-menu';

<MainMenu />
```

### MainScreen
Full-screen layout wrapper that combines MainMenu with StatusBar.

**Usage:**
```jsx
import { MainScreen } from '../features/main-menu';

<MainScreen />
```

## Hooks

### useNavigation
Advanced navigation utilities with history tracking.

**Features:**
- History-aware navigation
- Breadcrumb generation
- Back button state management
- Transition state tracking

**Usage:**
```jsx
import { useNavigation } from '../features/main-menu';

const { navigate, goBack, canGoBack, getBreadcrumbs } = useNavigation();
```

### useMenuSelection
Keyboard navigation for menu items.

**Features:**
- Arrow key navigation
- Selection by keyboard shortcuts
- Current item tracking

**Usage:**
```jsx
import { useMenuSelection } from '../features/main-menu';

const { selectedIndex, selectedItem, moveUp, moveDown } = useMenuSelection(items, onSelect);
```

## Menu Items Configuration

The menu items are defined in `components/MainMenu.jsx`:

```javascript
const MENU_ITEMS = [
  { id: 'gcode-execution', title: 'Execute G-Code', key: '1', desc: '...' },
  { id: 'file-browser', title: 'File Browser', key: '2', desc: '...' },
  { id: 'manual-control', title: 'Manual Control', key: '3', desc: '...' },
  { id: 'connection', title: 'Connection', key: 'c', desc: '...' },
  { id: 'settings', title: 'Settings', key: '4', desc: '...' },
  { id: 'quit', title: 'Quit', key: 'q', desc: '...' }
];
```

## Architecture

This feature follows the established modular architecture:

```
main-menu/
├── components/
│   ├── MainMenu.jsx      # Core menu logic
│   └── MainScreen.jsx    # Layout wrapper
├── hooks/
│   └── useNavigation.js  # Navigation utilities
├── __tests__/            # Unit tests
├── README.md             # This file
└── index.js              # Public API
```

## Dependencies

- `../shared/contexts` - AppState context for navigation
- `../shared/services/InputHandler` - Standardized input handling
- `../shared/components` - StatusBar component

## Future Enhancements

- [ ] Add menu item icons
- [ ] Implement sub-menus
- [ ] Add animation transitions
- [ ] Context-sensitive help integration
- [ ] Recent items tracking