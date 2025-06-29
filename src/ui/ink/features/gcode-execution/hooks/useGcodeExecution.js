import { useState, useCallback, useRef } from 'react';
import { ExecutionService } from '../services/ExecutionService.js';
import { GcodeValidator } from '../services/GcodeValidator.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';

export function useGcodeExecution() {
  const [executionState, setExecutionState] = useState({
    isExecuting: false,
    isPaused: false,
    progress: 0,
    currentLine: 0,
    totalLines: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    status: 'idle',
    error: null
  });

  const [validationResult, setValidationResult] = useState(null);
  const { setError, setLoading } = useAppState();
  
  const executionServiceRef = useRef(new ExecutionService());
  const validatorRef = useRef(new GcodeValidator());

  const validateGcode = useCallback((gcode) => {
    try {
      setLoading(true);
      const result = validatorRef.current.validateGcode(gcode);
      setValidationResult(result);
      return result;
    } catch (error) {
      setError(`Validation failed: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  const executeGcode = useCallback(async (gcode) => {
    if (executionState.isExecuting) {
      setError('Execution already in progress');
      return false;
    }

    const validation = validateGcode(gcode);
    if (!validation || !validation.isValid) {
      setError('G-code validation failed. Please fix errors before executing.');
      return false;
    }

    try {
      setExecutionState(prev => ({ ...prev, isExecuting: true, error: null }));
      setLoading(true);

      await executionServiceRef.current.executeGcode(
        gcode,
        (progress) => {
          setExecutionState(prev => ({
            ...prev,
            ...progress
          }));
        },
        (status) => {
          setExecutionState(prev => ({
            ...prev,
            status: status.status || prev.status
          }));
        }
      );

      return true;
    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        error: error.message,
        status: 'error'
      }));
      setError(`Execution failed: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
      setExecutionState(prev => ({ ...prev, isExecuting: false }));
    }
  }, [executionState.isExecuting, validateGcode, setError, setLoading]);

  const pauseExecution = useCallback(() => {
    const success = executionServiceRef.current.pause();
    if (success) {
      setExecutionState(prev => ({ ...prev, isPaused: true, status: 'paused' }));
    }
    return success;
  }, []);

  const resumeExecution = useCallback(() => {
    const success = executionServiceRef.current.resume();
    if (success) {
      setExecutionState(prev => ({ ...prev, isPaused: false, status: 'running' }));
    }
    return success;
  }, []);

  const stopExecution = useCallback(() => {
    const success = executionServiceRef.current.stop();
    if (success) {
      setExecutionState(prev => ({
        ...prev,
        isExecuting: false,
        isPaused: false,
        status: 'stopped'
      }));
    }
    return success;
  }, []);

  const resetExecution = useCallback(() => {
    executionServiceRef.current.reset();
    setExecutionState({
      isExecuting: false,
      isPaused: false,
      progress: 0,
      currentLine: 0,
      totalLines: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      status: 'idle',
      error: null
    });
    setValidationResult(null);
  }, []);

  return {
    executionState,
    validationResult,
    validateGcode,
    executeGcode,
    pauseExecution,
    resumeExecution,
    stopExecution,
    resetExecution
  };
}