import React, { createContext, useContext, useReducer } from 'react';

const AppStateContext = createContext();

const initialState = {
  currentScreen: 'main-menu',
  previousScreen: null,
  isLoading: false,
  error: null,
  modal: null,
  theme: 'default'
};

function appStateReducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE_TO':
      return {
        ...state,
        previousScreen: state.currentScreen,
        currentScreen: action.payload.screen,
        error: null
      };
    case 'GO_BACK':
      return {
        ...state,
        currentScreen: state.previousScreen || 'main-menu',
        previousScreen: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'SHOW_MODAL':
      return {
        ...state,
        modal: action.payload
      };
    case 'HIDE_MODAL':
      return {
        ...state,
        modal: null
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  const value = {
    state,
    dispatch,
    navigateTo: (screen) => dispatch({ type: 'NAVIGATE_TO', payload: { screen } }),
    goBack: () => dispatch({ type: 'GO_BACK' }),
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    showModal: (modal) => dispatch({ type: 'SHOW_MODAL', payload: modal }),
    hideModal: () => dispatch({ type: 'HIDE_MODAL' }),
    setTheme: (theme) => dispatch({ type: 'SET_THEME', payload: theme })
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}