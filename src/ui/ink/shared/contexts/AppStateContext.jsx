/**
 * App State Context
 * 
 * Manages global application state including navigation, loading states,
 * errors, modals, and sidebar functionality.
 * 
 * @module AppStateContext
 */

import React, { createContext, useContext, useReducer } from 'react';

const AppStateContext = createContext();

/**
 * Initial application state
 */
export const initialAppState = {
  currentScreen: 'main-menu',
  previousScreen: null,
  isLoading: false,
  loadingMessage: '',
  transitionState: 'idle', // 'idle', 'exiting', 'entering'
  error: null,
  modal: null, // Keep for backward compatibility
  sidebar: {
    isOpen: false,
    type: null, // 'help', 'gcode-reference', 'context-help'
    title: ''
  }
};

/**
 * App state reducer for managing state transitions
 * @param {Object} state - Current state
 * @param {Object} action - Action to process
 * @returns {Object} New state
 */
export function appStateReducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE_TO':
      return {
        ...state,
        previousScreen: state.currentScreen,
        currentScreen: action.payload.screen,
        transitionState: 'entering',
        error: null
      };
    case 'GO_BACK':
      return {
        ...state,
        currentScreen: state.previousScreen || 'main-menu',
        previousScreen: null,
        transitionState: 'entering'
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_LOADING':
      return { 
        ...state, 
        isLoading: action.payload.loading !== undefined ? action.payload.loading : action.payload,
        loadingMessage: action.payload.message || ''
      };
    case 'SET_TRANSITION_STATE':
      return { ...state, transitionState: action.payload };
    case 'SHOW_MODAL':
      return { ...state, modal: action.payload };
    case 'HIDE_MODAL':
      return { ...state, modal: null };
    case 'SHOW_SIDEBAR':
      return { 
        ...state, 
        sidebar: { 
          isOpen: true, 
          type: action.payload.type, 
          title: action.payload.title 
        },
        modal: null // Close any existing modal when opening sidebar
      };
    case 'HIDE_SIDEBAR':
      return { 
        ...state, 
        sidebar: { 
          isOpen: false, 
          type: null, 
          title: '' 
        } 
      };
    default:
      return state;
  }
}

/**
 * App State Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  const value = {
    state,
    
    // Navigation actions
    navigateTo: (screen) => dispatch({ type: 'NAVIGATE_TO', payload: { screen } }),
    goBack: () => dispatch({ type: 'GO_BACK' }),
    
    // Error handling
    setError: (error) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    
    // Loading states
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    
    // Modal management (legacy)
    showModal: (modal) => dispatch({ type: 'SHOW_MODAL', payload: modal }),
    hideModal: () => dispatch({ type: 'HIDE_MODAL' }),
    
    // Sidebar management
    showSidebar: (sidebar) => dispatch({ type: 'SHOW_SIDEBAR', payload: sidebar }),
    hideSidebar: () => dispatch({ type: 'HIDE_SIDEBAR' })
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Hook to use app state functionality
 * @returns {Object} App state context methods and state
 */
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

/**
 * Hook to use only navigation functionality
 * @returns {Object} Navigation methods
 */
export function useNavigation() {
  const { navigateTo, goBack } = useAppState();
  return { navigateTo, goBack };
}

/**
 * Hook to use only error handling functionality
 * @returns {Object} Error handling methods
 */
export function useErrorHandling() {
  const { setError, clearError, state } = useAppState();
  return { 
    setError, 
    clearError, 
    error: state.error 
  };
}

/**
 * Hook to use only loading state functionality
 * @returns {Object} Loading state methods
 */
export function useLoadingState() {
  const { setLoading, state } = useAppState();
  return { 
    setLoading, 
    isLoading: state.isLoading, 
    loadingMessage: state.loadingMessage 
  };
}

export default AppStateContext;