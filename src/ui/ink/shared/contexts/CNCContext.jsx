/**
 * CNC Context
 * 
 * Manages CNC machine state, connection, commands, files, and job execution.
 * This is a complex context that integrates with core CNC services.
 * 
 * @module CNCContext
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CNCContext = createContext();

/**
 * Initial CNC state
 */
export const initialCNCState = {
  // Connection state
  connection: {
    isConnected: false,
    port: null,
    status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
    lastError: null
  },
  
  // Machine state
  machine: {
    position: { x: 0, y: 0, z: 0, units: 'mm' },
    status: { state: 'Unknown', feedRate: 0, spindleSpeed: 0 },
    workOffset: { x: 0, y: 0, z: 0 },
    limits: null,
    lastUpdate: null
  },
  
  // Command state
  commands: {
    queue: [],
    history: [],
    isExecuting: false,
    lastCommand: null,
    lastResponse: null
  },
  
  // File management state
  files: {
    currentDirectory: process.cwd(),
    availableFiles: [],
    recentFiles: [],
    currentFile: null,
    fileContent: null,
    fileStats: null,
    isLoading: false,
    error: null
  },
  
  // Job execution state
  job: {
    isRunning: false,
    isPaused: false,
    currentLine: 0,
    totalLines: 0,
    progress: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    feedOverride: 100,
    spindleOverride: 100,
    startTime: null
  },
  
  // Real-time updates
  realTimeUpdates: {
    enabled: false,
    interval: 500,
    lastStatusQuery: null
  }
};

/**
 * CNC state reducer
 * @param {Object} state - Current state
 * @param {Object} action - Action to process
 * @returns {Object} New state
 */
export function cncStateReducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connection: {
          ...state.connection,
          ...action.payload
        }
      };
      
    case 'UPDATE_MACHINE_STATE':
      return {
        ...state,
        machine: {
          ...state.machine,
          ...action.payload,
          lastUpdate: Date.now()
        }
      };
      
    case 'ADD_COMMAND_TO_HISTORY':
      return {
        ...state,
        commands: {
          ...state.commands,
          history: [action.payload, ...state.commands.history].slice(0, 50), // Keep last 50
          lastCommand: action.payload.command,
          lastResponse: action.payload.response
        }
      };
      
    case 'SET_COMMAND_EXECUTING':
      return {
        ...state,
        commands: {
          ...state.commands,
          isExecuting: action.payload
        }
      };
      
    case 'UPDATE_FILE_STATE':
      return {
        ...state,
        files: {
          ...state.files,
          ...action.payload
        }
      };
      
    case 'UPDATE_JOB_STATE':
      return {
        ...state,
        job: {
          ...state.job,
          ...action.payload
        }
      };
      
    case 'SET_REALTIME_UPDATES':
      return {
        ...state,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          ...action.payload
        }
      };
      
    default:
      return state;
  }
}

/**
 * CNC Provider Component
 * 
 * NOTE: This is a simplified version for the migration.
 * The full implementation will need to integrate with actual CNC services.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function CNCProvider({ children }) {
  const [state, dispatch] = useReducer(cncStateReducer, initialCNCState);

  // Placeholder service methods (to be replaced with actual CNC service integration)
  const contextValue = {
    state,
    
    // Connection methods
    connect: async (port) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: { status: 'connecting' } });
      // TODO: Integrate with actual connection service
    },
    
    disconnect: async () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: { 
        isConnected: false, 
        status: 'disconnected',
        port: null 
      }});
    },
    
    refreshPorts: async () => {
      // TODO: Integrate with actual port scanning
    },
    
    // Command methods
    sendCommand: async (command) => {
      dispatch({ type: 'SET_COMMAND_EXECUTING', payload: true });
      // TODO: Integrate with actual command execution
      const result = { command, response: 'ok', timestamp: Date.now() };
      dispatch({ type: 'ADD_COMMAND_TO_HISTORY', payload: result });
      dispatch({ type: 'SET_COMMAND_EXECUTING', payload: false });
      return result;
    },
    
    addToHistory: (command, response, error = null) => {
      dispatch({ 
        type: 'ADD_COMMAND_TO_HISTORY', 
        payload: { command, response, error, timestamp: Date.now() } 
      });
    },
    
    // File methods
    changeDirectory: async (path) => {
      dispatch({ type: 'UPDATE_FILE_STATE', payload: { currentDirectory: path } });
    },
    
    loadFile: async (filePath) => {
      dispatch({ type: 'UPDATE_FILE_STATE', payload: { isLoading: true } });
      // TODO: Integrate with actual file loading
      dispatch({ type: 'UPDATE_FILE_STATE', payload: { 
        isLoading: false,
        currentFile: filePath 
      }});
    },
    
    executeFile: async (filePath) => {
      // TODO: Integrate with actual file execution
    },
    
    refreshFiles: async () => {
      // TODO: Integrate with actual file scanning
    },
    
    // Job control methods
    pauseJob: () => {
      dispatch({ type: 'UPDATE_JOB_STATE', payload: { isPaused: true } });
    },
    
    resumeJob: () => {
      dispatch({ type: 'UPDATE_JOB_STATE', payload: { isPaused: false } });
    },
    
    cancelJob: () => {
      dispatch({ type: 'UPDATE_JOB_STATE', payload: { 
        isRunning: false, 
        isPaused: false,
        progress: 0,
        currentLine: 0 
      }});
    },
    
    setFeedOverride: (percentage) => {
      dispatch({ type: 'UPDATE_JOB_STATE', payload: { feedOverride: percentage } });
    },
    
    setSpindleOverride: (percentage) => {
      dispatch({ type: 'UPDATE_JOB_STATE', payload: { spindleOverride: percentage } });
    },
    
    // Real-time updates
    enableRealTimeUpdates: () => {
      dispatch({ type: 'SET_REALTIME_UPDATES', payload: { enabled: true } });
    },
    
    disableRealTimeUpdates: () => {
      dispatch({ type: 'SET_REALTIME_UPDATES', payload: { enabled: false } });
    },
    
    // Machine state updates
    updateMachineStatus: (status) => {
      dispatch({ type: 'UPDATE_MACHINE_STATE', payload: { status } });
    },
    
    updateMachinePosition: (position) => {
      dispatch({ type: 'UPDATE_MACHINE_STATE', payload: { position } });
    },
    
    setWorkOffset: (offset) => {
      dispatch({ type: 'UPDATE_MACHINE_STATE', payload: { workOffset: offset } });
    },
    
    // Placeholder for actual gcodeSender integration
    gcodeSender: {
      emergencyStop: async () => {
        console.warn('CNCContext: gcodeSender.emergencyStop not implemented');
      }
    }
  };

  return (
    <CNCContext.Provider value={contextValue}>
      {children}
    </CNCContext.Provider>
  );
}

/**
 * Hook to use CNC functionality
 * @returns {Object} CNC context methods and state
 */
export function useCNC() {
  const context = useContext(CNCContext);
  if (context === undefined) {
    throw new Error('useCNC must be used within a CNCProvider');
  }
  return context;
}

/**
 * Hook to use only connection functionality
 * @returns {Object} Connection methods and state
 */
export function useConnection() {
  const { state, connect, disconnect, refreshPorts } = useCNC();
  return {
    connection: state.connection,
    connect,
    disconnect,
    refreshPorts
  };
}

/**
 * Hook to use only command functionality
 * @returns {Object} Command methods and state
 */
export function useCommands() {
  const { state, sendCommand, addToHistory } = useCNC();
  return {
    commands: state.commands,
    sendCommand,
    addToHistory
  };
}

/**
 * Hook to use only file functionality
 * @returns {Object} File methods and state
 */
export function useFiles() {
  const { state, changeDirectory, loadFile, executeFile, refreshFiles } = useCNC();
  return {
    files: state.files,
    changeDirectory,
    loadFile,
    executeFile,
    refreshFiles
  };
}

/**
 * Hook to use only job control functionality
 * @returns {Object} Job control methods and state
 */
export function useJobControl() {
  const { state, pauseJob, resumeJob, cancelJob, setFeedOverride, setSpindleOverride } = useCNC();
  return {
    job: state.job,
    pauseJob,
    resumeJob,
    cancelJob,
    setFeedOverride,
    setSpindleOverride
  };
}

export default CNCContext;