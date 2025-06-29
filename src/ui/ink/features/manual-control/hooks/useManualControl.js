/**
 * useManualControl Hook
 * 
 * Complete state management for manual control operations including jogging,
 * speed control, work coordinates, and keyboard input handling.
 * 
 * @module useManualControl
 */

import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import { useCNC } from '../../../shared/contexts/CNCContext.jsx';
import { useToast } from '../../../shared/contexts/ToastContext.jsx';
import { useSettings } from '../../../shared/contexts/SettingsContext.jsx';
import { SafetyValidator } from '../../../shared/services/SafetyValidator.js';
import { 
  buildJogCommand, 
  parseDirection, 
  validateJogParameters,
  calculateWorkPosition,
  getJogSpeeds
} from '../services/ManualControlService.js';

/**
 * Manual Control Hook
 * @returns {Object} Manual control state and actions
 */
export function useManualControl() {
  const { state, sendCommand } = useCNC();
  const { showToast } = useToast();
  const { state: settings } = useSettings();
  
  // Jog state
  const [jogSpeed, setJogSpeed] = useState('medium');
  const [jogDistance, setJogDistance] = useState(1);
  const [isJogging, setIsJogging] = useState(false);
  const [activeDirection, setActiveDirection] = useState(null);
  const [continuousJog, setContinuousJog] = useState(false);
  
  // Work coordinate state
  const [workOffset, setWorkOffset] = useState({ x: 0, y: 0, z: 0 });
  
  const speeds = getJogSpeeds();
  
  /**
   * Execute jog movement
   * @param {string} direction - Movement direction
   */
  const executeJog = useCallback(async (direction) => {
    if (isJogging) return;
    
    const speedValue = speeds[jogSpeed];
    const validation = validateJogParameters(jogDistance, speedValue);
    
    if (!validation.isValid) {
      showToast(validation.errors.join(', '), 'error');
      return;
    }
    
    // Show warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => showToast(warning, 'warning'));
    }
    
    // Safety validation
    const currentPos = state.machinePosition || { x: 0, y: 0, z: 0 };
    const targetChange = { x: 0, y: 0, z: 0 };
    
    const axis = direction.charAt(0).toLowerCase();
    const sign = direction.charAt(1) === '+' ? 1 : -1;
    targetChange[axis] = sign * jogDistance;
    
    const targetPos = {
      x: currentPos.x + targetChange.x,
      y: currentPos.y + targetChange.y,
      z: currentPos.z + targetChange.z
    };
    
    const safetyCheck = SafetyValidator.validateMovement(
      currentPos, 
      targetPos, 
      settings.machine?.limits || { x: 200, y: 200, z: 100 }
    );
    
    if (!safetyCheck.isValid) {
      showToast(`Safety violation: ${safetyCheck.errors.join(', ')}`, 'error');
      return;
    }
    
    if (safetyCheck.warnings.length > 0) {
      safetyCheck.warnings.forEach(warning => showToast(warning, 'warning'));
    }
    
    try {
      setIsJogging(true);
      setActiveDirection(direction);
      
      const command = buildJogCommand(direction, jogDistance, speedValue);
      await sendCommand(command);
      
      showToast(`Jogged ${direction} by ${jogDistance}mm`, 'success');
    } catch (error) {
      showToast(`Jog failed: ${error.message}`, 'error');
    } finally {
      setIsJogging(false);
      setActiveDirection(null);
    }
  }, [isJogging, jogSpeed, jogDistance, speeds, state.machinePosition, settings.machine, sendCommand, showToast]);
  
  /**
   * Handle keyboard input for jogging
   */
  const handleJogInput = useCallback((input, key) => {
    const direction = parseDirection(input, key);
    if (direction) {
      executeJog(direction);
    }
  }, [executeJog]);
  
  /**
   * Change jog speed
   * @param {string} speed - Speed preset ('slow', 'medium', 'fast')
   */
  const handleSpeedChange = useCallback((speed) => {
    if (speeds[speed]) {
      setJogSpeed(speed);
      showToast(`Jog speed set to ${speed} (${speeds[speed]}mm/min)`, 'info');
    }
  }, [speeds, showToast]);
  
  /**
   * Change jog distance
   * @param {number} distance - New jog distance
   */
  const handleDistanceChange = useCallback((distance) => {
    if (distance > 0 && distance <= 100) {
      setJogDistance(distance);
      showToast(`Jog distance set to ${distance}mm`, 'info');
    }
  }, [showToast]);
  
  /**
   * Execute homing sequence
   */
  const executeHome = useCallback(async () => {
    if (isJogging) return;
    
    try {
      setIsJogging(true);
      showToast('Starting homing sequence...', 'info');
      
      await sendCommand('$H');
      showToast('Homing completed successfully', 'success');
    } catch (error) {
      showToast(`Homing failed: ${error.message}`, 'error');
    } finally {
      setIsJogging(false);
    }
  }, [isJogging, sendCommand, showToast]);
  
  /**
   * Set current position as work origin
   */
  const setWorkOrigin = useCallback(() => {
    const currentPos = state.machinePosition || { x: 0, y: 0, z: 0 };
    setWorkOffset({ ...currentPos });
    showToast('Work origin set to current position', 'success');
  }, [state.machinePosition, showToast]);
  
  /**
   * Go to work origin
   */
  const goToWorkOrigin = useCallback(async () => {
    if (isJogging) return;
    
    try {
      setIsJogging(true);
      showToast('Moving to work origin...', 'info');
      
      await sendCommand(`G0 X${workOffset.x} Y${workOffset.y} Z${workOffset.z}`);
      showToast('Moved to work origin', 'success');
    } catch (error) {
      showToast(`Failed to move to origin: ${error.message}`, 'error');
    } finally {
      setIsJogging(false);
    }
  }, [isJogging, workOffset, sendCommand, showToast]);
  
  /**
   * Reset work origin to zero
   */
  const resetWorkOrigin = useCallback(() => {
    setWorkOffset({ x: 0, y: 0, z: 0 });
    showToast('Work origin reset to zero', 'info');
  }, [showToast]);
  
  /**
   * Toggle continuous jog mode
   */
  const toggleContinuousJog = useCallback(() => {
    setContinuousJog(prev => {
      const newMode = !prev;
      showToast(`Continuous jog ${newMode ? 'enabled' : 'disabled'}`, 'info');
      return newMode;
    });
  }, [showToast]);
  
  // Calculate work position
  const workPosition = calculateWorkPosition(
    state.machinePosition || { x: 0, y: 0, z: 0 },
    workOffset
  );
  
  // Control actions object
  const controlActions = {
    executeJog,
    executeHome,
    setWorkOrigin,
    goToWorkOrigin,
    resetWorkOrigin,
    toggleContinuousJog
  };
  
  // Input handling with keyboard shortcuts
  useInput((input, key) => {
    // Speed shortcuts
    if (input === '1') handleSpeedChange('slow');
    if (input === '2') handleSpeedChange('medium');
    if (input === '3') handleSpeedChange('fast');
    
    // Distance adjustment
    if (input === '+' || input === '=') {
      const newDistance = Math.min(jogDistance + 0.1, 100);
      handleDistanceChange(Math.round(newDistance * 10) / 10);
    }
    if (input === '-') {
      const newDistance = Math.max(jogDistance - 0.1, 0.1);
      handleDistanceChange(Math.round(newDistance * 10) / 10);
    }
    
    // Work coordinate shortcuts
    if (input === 'z') setWorkOrigin();
    if (input === 'g') goToWorkOrigin();
    if (input === 'r') resetWorkOrigin();
    
    // Other controls
    if (input === 'h') executeHome();
    if (input === 'c') toggleContinuousJog();
    
    // Movement input
    handleJogInput(input, key);
  });
  
  return {
    // State
    jogSpeed,
    setJogSpeed,
    jogDistance,
    setJogDistance,
    isJogging,
    activeDirection,
    continuousJog,
    workOffset,
    workPosition,
    
    // Actions
    controlActions,
    handleJogInput,
    handleSpeedChange,
    handleDistanceChange,
    executeHome,
    setWorkOrigin,
    goToWorkOrigin,
    resetWorkOrigin,
    toggleContinuousJog
  };
}

export default useManualControl;