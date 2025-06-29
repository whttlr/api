import React, { createContext, useContext, useReducer, useEffect } from 'react';

const MachineContext = createContext();

const initialState = {
  connection: {
    isConnected: false,
    port: null,
    baudRate: 115200
  },
  position: {
    x: 0,
    y: 0,
    z: 0,
    units: 'mm'
  },
  status: {
    state: 'Idle',
    feedRate: 0,
    spindleSpeed: 0,
    spindleDirection: 'CW'
  },
  workCoordinateSystem: 'G54',
  alarms: [],
  lastUpdate: null
};

function machineReducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connection: {
          ...state.connection,
          ...action.payload
        }
      };
    case 'UPDATE_POSITION':
      return {
        ...state,
        position: {
          ...state.position,
          ...action.payload
        },
        lastUpdate: Date.now()
      };
    case 'UPDATE_STATUS':
      return {
        ...state,
        status: {
          ...state.status,
          ...action.payload
        },
        lastUpdate: Date.now()
      };
    case 'SET_UNITS':
      return {
        ...state,
        position: {
          ...state.position,
          units: action.payload
        }
      };
    case 'SET_WORK_COORDINATE_SYSTEM':
      return {
        ...state,
        workCoordinateSystem: action.payload
      };
    case 'ADD_ALARM':
      return {
        ...state,
        alarms: [...state.alarms, action.payload]
      };
    case 'CLEAR_ALARMS':
      return {
        ...state,
        alarms: []
      };
    case 'RESET_MACHINE_STATE':
      return {
        ...initialState,
        connection: state.connection
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function MachineProvider({ children }) {
  const [state, dispatch] = useReducer(machineReducer, initialState);

  const value = {
    state,
    dispatch,
    setConnectionStatus: (status) => dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }),
    updatePosition: (position) => dispatch({ type: 'UPDATE_POSITION', payload: position }),
    updateStatus: (status) => dispatch({ type: 'UPDATE_STATUS', payload: status }),
    setUnits: (units) => dispatch({ type: 'SET_UNITS', payload: units }),
    setWorkCoordinateSystem: (wcs) => dispatch({ type: 'SET_WORK_COORDINATE_SYSTEM', payload: wcs }),
    addAlarm: (alarm) => dispatch({ type: 'ADD_ALARM', payload: alarm }),
    clearAlarms: () => dispatch({ type: 'CLEAR_ALARMS' }),
    resetMachineState: () => dispatch({ type: 'RESET_MACHINE_STATE' })
  };

  return (
    <MachineContext.Provider value={value}>
      {children}
    </MachineContext.Provider>
  );
}

export function useMachine() {
  const context = useContext(MachineContext);
  if (context === undefined) {
    throw new Error('useMachine must be used within a MachineProvider');
  }
  return context;
}