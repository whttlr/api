import { useState, useEffect, useCallback } from 'react';
import { useMachine } from '../context/MachineContext.jsx';
import { useAppState } from '../context/AppStateContext.jsx';

export function useCncConnection() {
  const { state: machineState, setConnectionStatus, updatePosition, updateStatus } = useMachine();
  const { setError, setLoading } = useAppState();
  
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (port, baudRate = 115200) => {
    if (machineState.connection.isConnected) {
      setError('Already connected to a CNC machine');
      return false;
    }

    setIsConnecting(true);
    setLoading(true);
    
    try {
      setConnectionStatus({
        isConnected: true,
        port,
        baudRate
      });
      
      setIsConnecting(false);
      setLoading(false);
      return true;
    } catch (error) {
      setError(`Failed to connect to ${port}: ${error.message}`);
      setIsConnecting(false);
      setLoading(false);
      return false;
    }
  }, [machineState.connection.isConnected, setConnectionStatus, setError, setLoading]);

  const disconnect = useCallback(async () => {
    if (!machineState.connection.isConnected) {
      return true;
    }

    setLoading(true);
    
    try {
      setConnectionStatus({
        isConnected: false,
        port: null,
        baudRate: 115200
      });
      
      setLoading(false);
      return true;
    } catch (error) {
      setError(`Failed to disconnect: ${error.message}`);
      setLoading(false);
      return false;
    }
  }, [machineState.connection.isConnected, setConnectionStatus, setError, setLoading]);

  const sendCommand = useCallback(async (command) => {
    if (!machineState.connection.isConnected) {
      setError('Not connected to CNC machine');
      return false;
    }

    try {
      return true;
    } catch (error) {
      setError(`Failed to send command: ${error.message}`);
      return false;
    }
  }, [machineState.connection.isConnected, setError]);

  const getStatus = useCallback(async () => {
    if (!machineState.connection.isConnected) {
      return null;
    }

    try {
      const status = {
        state: 'Idle',
        position: { x: 0, y: 0, z: 0 },
        feedRate: 0,
        spindleSpeed: 0
      };
      
      updatePosition(status.position);
      updateStatus({
        state: status.state,
        feedRate: status.feedRate,
        spindleSpeed: status.spindleSpeed
      });
      
      return status;
    } catch (error) {
      setError(`Failed to get status: ${error.message}`);
      return null;
    }
  }, [machineState.connection.isConnected, updatePosition, updateStatus, setError]);

  useEffect(() => {
    if (!machineState.connection.isConnected) {
      return;
    }

    const statusInterval = setInterval(getStatus, 100);
    return () => clearInterval(statusInterval);
  }, [machineState.connection.isConnected, getStatus]);

  return {
    isConnected: machineState.connection.isConnected,
    isConnecting,
    port: machineState.connection.port,
    baudRate: machineState.connection.baudRate,
    connect,
    disconnect,
    sendCommand,
    getStatus
  };
}