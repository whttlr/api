import { useState, useEffect, useCallback, useRef } from 'react';
import { StatusService } from '../services/StatusService.js';
import { useMachine } from '../../../shared/context/MachineContext.jsx';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';

export function useMachineStatus(autoStart = true) {
  const [statusHistory, setStatusHistory] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const { updatePosition, updateStatus, addAlarm } = useMachine();
  const { setError } = useAppState();
  
  const statusServiceRef = useRef(new StatusService());

  const handleStatusUpdate = useCallback((status) => {
    try {
      if (status.position) {
        updatePosition(status.position.work);
      }

      if (status.state) {
        updateStatus({
          state: status.state,
          feedRate: status.feedRate,
          spindleSpeed: status.spindleSpeed,
          spindleDirection: status.spindleDirection
        });
      }

      if (status.alarms && status.alarms.length > 0) {
        status.alarms.forEach(alarm => addAlarm(alarm));
      }

      setStatusHistory(prev => {
        const newHistory = [...prev, status];
        return newHistory.slice(-50);
      });

      setLastUpdate(status.timestamp);

    } catch (error) {
      setError(`Status update failed: ${error.message}`);
    }
  }, [updatePosition, updateStatus, addAlarm, setError]);

  const startPolling = useCallback(() => {
    if (isPolling) return;

    statusServiceRef.current.startStatusPolling(handleStatusUpdate);
    setIsPolling(true);
  }, [isPolling, handleStatusUpdate]);

  const stopPolling = useCallback(() => {
    if (!isPolling) return;

    statusServiceRef.current.stopStatusPolling(handleStatusUpdate);
    setIsPolling(false);
  }, [isPolling, handleStatusUpdate]);

  const setPollingInterval = useCallback((interval) => {
    return statusServiceRef.current.setPollingInterval(interval);
  }, []);

  const getCurrentStatus = useCallback(() => {
    return statusServiceRef.current.getCurrentStatus();
  }, []);

  const clearHistory = useCallback(() => {
    statusServiceRef.current.clearHistory();
    setStatusHistory([]);
  }, []);

  const getPollingInfo = useCallback(() => {
    return {
      isPolling,
      lastUpdate,
      historySize: statusHistory.length,
      service: statusServiceRef.current.getPollingStatus()
    };
  }, [isPolling, lastUpdate, statusHistory.length]);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await statusServiceRef.current.queryMachineStatus();
      handleStatusUpdate(status);
      return status;
    } catch (error) {
      setError(`Failed to refresh status: ${error.message}`);
      return null;
    }
  }, [handleStatusUpdate, setError]);

  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, startPolling, stopPolling]);

  return {
    isPolling,
    lastUpdate,
    statusHistory,
    startPolling,
    stopPolling,
    setPollingInterval,
    getCurrentStatus,
    clearHistory,
    getPollingInfo,
    refreshStatus
  };
}