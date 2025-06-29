import { useState, useCallback, useRef } from 'react';
import { JoggingService } from '../services/JoggingService.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { useMachine } from '../../../shared/context/MachineContext.jsx';
import { useSettings } from '../../../shared/context/SettingsContext.jsx';

export function useJogging() {
  const [joggingState, setJoggingState] = useState({
    isJogging: false,
    currentStepSize: 1,
    feedRate: 1000
  });

  const { setError } = useAppState();
  const { state: machineState, updatePosition } = useMachine();
  const { state: settings } = useSettings();
  
  const joggingServiceRef = useRef(new JoggingService());

  const jogAxis = useCallback(async (axis, direction, distance = null) => {
    if (!machineState.connection.isConnected) {
      setError('Machine not connected');
      return false;
    }

    if (machineState.status.state === 'Alarm') {
      setError('Cannot jog: Machine in alarm state');
      return false;
    }

    const jogDistance = distance || joggingState.currentStepSize;
    
    const validation = joggingServiceRef.current.validateJogMove(
      axis, 
      direction > 0 ? jogDistance : -jogDistance,
      machineState.position
    );

    if (!validation.valid) {
      setError(validation.reason);
      return false;
    }

    try {
      setJoggingState(prev => ({ ...prev, isJogging: true }));
      
      const success = await joggingServiceRef.current.jogAxis(
        axis, 
        direction, 
        jogDistance, 
        joggingState.feedRate
      );

      if (success) {
        const newPosition = { ...machineState.position };
        newPosition[axis.toLowerCase()] = validation.newPosition;
        updatePosition(newPosition);
      }

      return success;

    } catch (error) {
      setError(`Jog failed: ${error.message}`);
      return false;
    } finally {
      setJoggingState(prev => ({ ...prev, isJogging: false }));
    }
  }, [
    machineState.connection.isConnected,
    machineState.status.state,
    machineState.position,
    joggingState.currentStepSize,
    joggingState.feedRate,
    setError,
    updatePosition
  ]);

  const homeAxis = useCallback(async (axis = null) => {
    if (!machineState.connection.isConnected) {
      setError('Machine not connected');
      return false;
    }

    try {
      setJoggingState(prev => ({ ...prev, isJogging: true }));
      
      const success = await joggingServiceRef.current.homeAxis(axis);
      
      if (success) {
        if (axis) {
          const newPosition = { ...machineState.position };
          newPosition[axis.toLowerCase()] = 0;
          updatePosition(newPosition);
        } else {
          updatePosition({ x: 0, y: 0, z: 0 });
        }
      }

      return success;

    } catch (error) {
      setError(`Homing failed: ${error.message}`);
      return false;
    } finally {
      setJoggingState(prev => ({ ...prev, isJogging: false }));
    }
  }, [machineState.connection.isConnected, machineState.position, setError, updatePosition]);

  const emergencyStop = useCallback(async () => {
    try {
      const success = await joggingServiceRef.current.emergencyStop();
      
      if (success) {
        setJoggingState(prev => ({ ...prev, isJogging: false }));
      }

      return success;

    } catch (error) {
      setError(`Emergency stop failed: ${error.message}`);
      return false;
    }
  }, [setError]);

  const setStepSize = useCallback((stepSize) => {
    const success = joggingServiceRef.current.setStepSize(stepSize);
    
    if (success) {
      setJoggingState(prev => ({ ...prev, currentStepSize: stepSize }));
    }

    return success;
  }, []);

  const cycleStepSize = useCallback((direction = 1) => {
    const success = joggingServiceRef.current.cycleStepSize(direction);
    
    if (success) {
      setJoggingState(prev => ({ 
        ...prev, 
        currentStepSize: joggingServiceRef.current.currentStepSize 
      }));
    }

    return success;
  }, []);

  const setFeedRate = useCallback((feedRate) => {
    const success = joggingServiceRef.current.setFeedRate(feedRate);
    
    if (success) {
      setJoggingState(prev => ({ ...prev, feedRate }));
    }

    return success;
  }, []);

  const getAvailableStepSizes = useCallback(() => {
    return joggingServiceRef.current.availableStepSizes;
  }, []);

  const getLimits = useCallback(() => {
    return joggingServiceRef.current.limits;
  }, []);

  return {
    joggingState,
    jogAxis,
    homeAxis,
    emergencyStop,
    setStepSize,
    cycleStepSize,
    setFeedRate,
    getAvailableStepSizes,
    getLimits,
    canJog: machineState.connection.isConnected && 
            machineState.status.state !== 'Alarm' && 
            !joggingState.isJogging
  };
}