/**
 * Main Menu Feature Index
 * 
 * Exports all main menu related components and hooks.
 * 
 * @module MainMenuFeature
 */

// Components
export { MainMenu, getMenuItems, findMenuItem } from './components/MainMenu.jsx';
export { MainScreen } from './components/MainScreen.jsx';
export { MainScreen as MainMenuScreen } from './components/MainScreen.jsx';

// Hooks
export { 
  useNavigation,
  useMenuSelection,
  useScreenTransition 
} from './hooks/useNavigation.js';

// Default export
export { MainScreen as default } from './components/MainScreen.jsx';