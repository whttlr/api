/**
 * Connection Management Hook
 * 
 * Manages CNC machine connection state, port scanning, and connection
 * lifecycle with automatic refresh and error handling.
 * 
 * @module useConnection
 */

import { useState, useEffect, useCallback } from 'react';
import { useCNC } from '../../../shared/contexts/index.js';

/**
 * Connection management hook
 * @returns {Object} Connection state and actions
 */
export function useConnection() {
  const { state, connect, disconnect, refreshPorts } = useCNC();
  const [isScanning, setIsScanning] = useState(false);
  const [scanInterval, setScanInterval] = useState(null);
  const [connectionHistory, setConnectionHistory] = useState([]);

  /**
   * Auto-refresh ports when disconnected
   */
  useEffect(() => {
    if (!state.connection.isConnected && !scanInterval) {
      const interval = setInterval(() => {
        if (!state.connection.isConnected) {
          refreshPorts();
        }
      }, 10000); // Refresh every 10 seconds
      
      setScanInterval(interval);
    } else if (state.connection.isConnected && scanInterval) {
      clearInterval(scanInterval);
      setScanInterval(null);
    }

    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [state.connection.isConnected, scanInterval, refreshPorts]);

  /**
   * Enhanced connect function with history tracking
   */
  const connectToPort = useCallback(async (portPath) => {
    try {
      setIsScanning(true);
      await connect(portPath);
      
      // Add to connection history
      setConnectionHistory(prev => {
        const newHistory = prev.filter(p => p !== portPath);
        return [portPath, ...newHistory].slice(0, 5); // Keep last 5
      });
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [connect]);

  /**
   * Enhanced disconnect function
   */
  const disconnectFromPort = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, [disconnect]);

  /**
   * Force refresh ports
   */
  const forceRefreshPorts = useCallback(async () => {
    setIsScanning(true);
    try {
      await refreshPorts();
    } finally {
      setIsScanning(false);
    }
  }, [refreshPorts]);

  /**
   * Get connection statistics
   */
  const getConnectionStats = useCallback(() => {
    return {
      isConnected: state.connection.isConnected,
      isConnecting: state.connection.status === 'connecting',
      hasError: !!state.connection.lastError,
      portCount: state.availablePorts?.length || 0,
      currentPort: state.connection.port,
      uptime: state.connection.connectedAt ? 
        Date.now() - state.connection.connectedAt : 0
    };
  }, [state.connection, state.availablePorts]);

  return {
    // State
    connection: state.connection,
    availablePorts: state.availablePorts || [],
    isScanning,
    connectionHistory,
    stats: getConnectionStats(),
    
    // Actions
    connect: connectToPort,
    disconnect: disconnectFromPort,
    refreshPorts: forceRefreshPorts,
    
    // Computed state
    hasAvailablePorts: (state.availablePorts?.length || 0) > 0,
    canConnect: !state.connection.isConnected && (state.availablePorts?.length || 0) > 0,
    canDisconnect: state.connection.isConnected
  };
}

/**
 * Port scanning hook for automatic discovery
 */
export function usePortScanning(enabled = true) {
  const { refreshPorts } = useCNC();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const scanPorts = async () => {
      setIsScanning(true);
      try {
        await refreshPorts();
        setLastScan(new Date());
      } finally {
        setIsScanning(false);
      }
    };

    // Initial scan
    scanPorts();

    // Set up interval scanning
    const interval = setInterval(scanPorts, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [enabled, refreshPorts]);

  return {
    isScanning,
    lastScan,
    forceRescan: async () => {
      setIsScanning(true);
      try {
        await refreshPorts();
        setLastScan(new Date());
      } finally {
        setIsScanning(false);
      }
    }
  };
}

// Default export
export default useConnection;