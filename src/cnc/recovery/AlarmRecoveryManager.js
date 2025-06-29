/**
 * Automated Alarm Recovery Manager
 * 
 * Handles automatic recovery from GRBL alarms with safe recovery sequences,
 * position verification, and state restoration.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class AlarmRecoveryManager extends EventEmitter {
  constructor(commandManager, config = {}) {
    super();
    
    if (!commandManager) {
      throw new Error('AlarmRecoveryManager requires a command manager');
    }
    
    this.commandManager = commandManager;
    this.config = {
      enableAutoRecovery: true,         // Enable automatic recovery
      maxRecoveryAttempts: 3,           // Max attempts per alarm
      recoveryTimeout: 30000,           // Timeout for recovery sequence
      safeHeight: 5.0,                  // Safe Z height for recovery
      homingTimeout: 60000,             // Timeout for homing sequence
      positionTolerance: 0.1,           // Position verification tolerance
      pauseBeforeRecovery: 2000,        // Pause before starting recovery
      enablePositionRestore: true,      // Restore position after recovery
      enableWorkOffsetRestore: true,    // Restore work offsets
      enableSpindleRestore: false,      // Restore spindle state (safety)
      enableCoolantRestore: true,       // Restore coolant state
      ...config
    };
    
    this.recoveryHistory = [];
    this.currentRecovery = null;
    this.machineState = {
      lastKnownPosition: { x: 0, y: 0, z: 0 },
      lastKnownWorkOffset: { x: 0, y: 0, z: 0 },
      lastKnownSpindleState: { running: false, speed: 0 },
      lastKnownCoolantState: false,
      isHomed: false,
      coordinateSystem: 'G54'
    };
    
    this.alarmTypes = {
      1: { name: 'Hard Limit', severity: 'critical', autoRecoverable: false },
      2: { name: 'Soft Limit', severity: 'high', autoRecoverable: true },
      3: { name: 'Abort Cycle', severity: 'medium', autoRecoverable: true },
      4: { name: 'Probe Fail Initial', severity: 'medium', autoRecoverable: false },
      5: { name: 'Probe Fail Contact', severity: 'medium', autoRecoverable: false },
      6: { name: 'Homing Fail Reset', severity: 'high', autoRecoverable: true },
      7: { name: 'Homing Fail Door', severity: 'high', autoRecoverable: true },
      8: { name: 'Homing Fail Pull-off', severity: 'high', autoRecoverable: true },
      9: { name: 'Homing Fail Approach', severity: 'high', autoRecoverable: true }
    };
    
    this.stats = {
      totalAlarms: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      hardLimitAlarms: 0,
      softLimitAlarms: 0,
      homingAlarms: 0
    };
  }

  /**
   * Handle alarm and attempt recovery
   */
  async handleAlarm(alarmCode, context = {}) {
    this.stats.totalAlarms++;
    
    const alarmInfo = this.alarmTypes[alarmCode];
    if (!alarmInfo) {
      warn('Unknown alarm code', { alarmCode });
      return { success: false, reason: 'unknown_alarm' };
    }
    
    info(`Alarm detected: ${alarmInfo.name} (${alarmCode})`, {
      severity: alarmInfo.severity,
      autoRecoverable: alarmInfo.autoRecoverable
    });
    
    // Update alarm statistics
    this.updateAlarmStats(alarmCode);
    
    // Check if auto-recovery is enabled and alarm is recoverable
    if (!this.config.enableAutoRecovery || !alarmInfo.autoRecoverable) {
      this.emit('alarmRequiresManualIntervention', {
        alarmCode,
        alarmInfo,
        reason: alarmInfo.autoRecoverable ? 'auto_recovery_disabled' : 'not_auto_recoverable'
      });
      
      return { success: false, reason: 'manual_intervention_required' };
    }
    
    // Start recovery process
    return await this.startRecoverySequence(alarmCode, alarmInfo, context);
  }

  /**
   * Start automated recovery sequence
   */
  async startRecoverySequence(alarmCode, alarmInfo, context) {
    if (this.currentRecovery) {
      warn('Recovery already in progress, ignoring new alarm');
      return { success: false, reason: 'recovery_in_progress' };
    }
    
    this.currentRecovery = {
      alarmCode,
      alarmInfo,
      startTime: Date.now(),
      attempts: 0,
      phase: 'starting',
      context
    };
    
    try {
      info(`Starting recovery sequence for alarm ${alarmCode}`);
      this.emit('recoveryStarted', { alarmCode, alarmInfo });
      
      // Pause before recovery
      if (this.config.pauseBeforeRecovery > 0) {
        this.currentRecovery.phase = 'pausing';
        await this.delay(this.config.pauseBeforeRecovery);
      }
      
      // Execute recovery based on alarm type
      const result = await this.executeRecoverySequence(alarmCode, alarmInfo, context);
      
      if (result.success) {
        this.stats.successfulRecoveries++;
        info(`Recovery successful for alarm ${alarmCode}`, { 
          attempts: this.currentRecovery.attempts,
          duration: Date.now() - this.currentRecovery.startTime
        });
        
        this.emit('recoveryCompleted', {
          alarmCode,
          alarmInfo,
          attempts: this.currentRecovery.attempts,
          duration: Date.now() - this.currentRecovery.startTime
        });
      } else {
        this.stats.failedRecoveries++;
        error(`Recovery failed for alarm ${alarmCode}`, { 
          reason: result.reason,
          attempts: this.currentRecovery.attempts
        });
        
        this.emit('recoveryFailed', {
          alarmCode,
          alarmInfo,
          reason: result.reason,
          attempts: this.currentRecovery.attempts
        });
      }
      
      // Record recovery in history
      this.recordRecovery(this.currentRecovery, result);
      
      return result;
      
    } catch (err) {
      error('Recovery sequence error', { error: err.message, alarmCode });
      
      this.emit('recoveryError', {
        alarmCode,
        alarmInfo,
        error: err
      });
      
      return { success: false, reason: 'recovery_error', error: err.message };
      
    } finally {
      this.currentRecovery = null;
    }
  }

  /**
   * Execute specific recovery sequence based on alarm type
   */
  async executeRecoverySequence(alarmCode, alarmInfo, context) {
    this.stats.recoveryAttempts++;
    this.currentRecovery.attempts++;
    
    switch (alarmCode) {
      case 1: // Hard Limit
        return await this.recoverFromHardLimit(context);
        
      case 2: // Soft Limit
        return await this.recoverFromSoftLimit(context);
        
      case 3: // Abort Cycle
        return await this.recoverFromAbortCycle(context);
        
      case 6:
      case 7:
      case 8:
      case 9: // Homing Failures
        return await this.recoverFromHomingFailure(alarmCode, context);
        
      default:
        return { success: false, reason: 'no_recovery_sequence' };
    }
  }

  /**
   * Recover from hard limit alarm
   */
  async recoverFromHardLimit(context) {
    // Hard limits require manual intervention for safety
    warn('Hard limit alarm requires manual intervention');
    
    // Clear the alarm but don't attempt automated movement
    try {
      this.currentRecovery.phase = 'clearing_alarm';
      await this.commandManager.sendCommand('$X');
      
      this.currentRecovery.phase = 'checking_position';
      const status = await this.commandManager.sendCommand('?');
      
      return {
        success: false,
        reason: 'hard_limit_requires_manual',
        actions: [
          'Manually move machine away from limit switches',
          'Check for mechanical obstructions',
          'Verify limit switch operation',
          'Re-home machine when safe'
        ]
      };
      
    } catch (err) {
      return { success: false, reason: 'alarm_clear_failed', error: err.message };
    }
  }

  /**
   * Recover from soft limit alarm
   */
  async recoverFromSoftLimit(context) {
    try {
      // Clear alarm
      this.currentRecovery.phase = 'clearing_alarm';
      await this.commandManager.sendCommand('$X');
      
      // Check current position
      this.currentRecovery.phase = 'checking_position';
      const statusResponse = await this.commandManager.sendCommand('?');
      const currentPosition = this.parsePositionFromStatus(statusResponse);
      
      if (!currentPosition) {
        return { success: false, reason: 'position_unknown' };
      }
      
      // Move to safe position if possible
      this.currentRecovery.phase = 'moving_to_safe_position';
      const safePosition = this.calculateSafePosition(currentPosition);
      
      if (safePosition) {
        await this.moveToPositionSafely(safePosition);
        
        // Verify we're in a safe location
        const verifyResponse = await this.commandManager.sendCommand('?');
        const newPosition = this.parsePositionFromStatus(verifyResponse);
        
        if (this.isPositionSafe(newPosition)) {
          return { success: true, newPosition };
        }
      }
      
      return { success: false, reason: 'could_not_reach_safe_position' };
      
    } catch (err) {
      return { success: false, reason: 'soft_limit_recovery_failed', error: err.message };
    }
  }

  /**
   * Recover from abort cycle alarm
   */
  async recoverFromAbortCycle(context) {
    try {
      // Clear alarm
      this.currentRecovery.phase = 'clearing_alarm';
      await this.commandManager.sendCommand('$X');
      
      // Reset parser state
      this.currentRecovery.phase = 'resetting_state';
      await this.commandManager.sendCommand('G90'); // Absolute positioning
      await this.commandManager.sendCommand('G21'); // Metric units
      await this.commandManager.sendCommand('G17'); // XY plane
      
      // Check machine status
      this.currentRecovery.phase = 'verifying_status';
      const status = await this.commandManager.sendCommand('?');
      
      // If position restoration is enabled, try to restore last known position
      if (this.config.enablePositionRestore && this.machineState.lastKnownPosition) {
        this.currentRecovery.phase = 'restoring_position';
        await this.restorePosition();
      }
      
      return { success: true };
      
    } catch (err) {
      return { success: false, reason: 'abort_recovery_failed', error: err.message };
    }
  }

  /**
   * Recover from homing failure
   */
  async recoverFromHomingFailure(alarmCode, context) {
    try {
      // Clear alarm
      this.currentRecovery.phase = 'clearing_alarm';
      await this.commandManager.sendCommand('$X');
      
      // Wait for machine to stabilize
      await this.delay(1000);
      
      // Retry homing sequence
      this.currentRecovery.phase = 'retrying_homing';
      
      // Use timeout for homing
      const homingPromise = this.commandManager.sendCommand('$H');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Homing timeout')), this.config.homingTimeout)
      );
      
      await Promise.race([homingPromise, timeoutPromise]);
      
      // Verify homing was successful
      this.currentRecovery.phase = 'verifying_homing';
      const status = await this.commandManager.sendCommand('?');
      
      if (this.isHomingComplete(status)) {
        this.machineState.isHomed = true;
        return { success: true };
      } else {
        return { success: false, reason: 'homing_verification_failed' };
      }
      
    } catch (err) {
      return { success: false, reason: 'homing_recovery_failed', error: err.message };
    }
  }

  /**
   * Parse position from status response
   */
  parsePositionFromStatus(statusResponse) {
    if (!statusResponse || !statusResponse.raw) return null;
    
    const posMatch = statusResponse.raw.match(/MPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (posMatch) {
      return {
        x: parseFloat(posMatch[1]),
        y: parseFloat(posMatch[2]),
        z: parseFloat(posMatch[3])
      };
    }
    
    return null;
  }

  /**
   * Calculate safe position from current position
   */
  calculateSafePosition(currentPosition) {
    // For soft limits, try moving to machine center or safe height
    return {
      x: Math.max(0, Math.min(currentPosition.x, 100)), // Assume 100mm safe zone
      y: Math.max(0, Math.min(currentPosition.y, 100)),
      z: Math.max(currentPosition.z, this.config.safeHeight)
    };
  }

  /**
   * Move to position safely with incremental steps
   */
  async moveToPositionSafely(targetPosition) {
    const status = await this.commandManager.sendCommand('?');
    const currentPosition = this.parsePositionFromStatus(status);
    
    if (!currentPosition) {
      throw new Error('Cannot determine current position');
    }
    
    // Move Z to safe height first
    if (targetPosition.z > currentPosition.z) {
      await this.commandManager.sendCommand(`G0 Z${targetPosition.z}`);
    }
    
    // Move XY
    await this.commandManager.sendCommand(`G0 X${targetPosition.x} Y${targetPosition.y}`);
    
    // Move Z to final position
    if (targetPosition.z <= currentPosition.z) {
      await this.commandManager.sendCommand(`G0 Z${targetPosition.z}`);
    }
  }

  /**
   * Check if position is safe
   */
  isPositionSafe(position) {
    if (!position) return false;
    
    // Basic safety checks - would need to be customized for specific machine
    return position.x >= 0 && position.x <= 200 &&
           position.y >= 0 && position.y <= 200 &&
           position.z >= 0 && position.z <= 100;
  }

  /**
   * Check if homing is complete
   */
  isHomingComplete(statusResponse) {
    if (!statusResponse || !statusResponse.raw) return false;
    
    // Check for Idle state and position at 0,0,0 (typical homing result)
    const isIdle = statusResponse.raw.includes('Idle');
    const position = this.parsePositionFromStatus(statusResponse);
    
    return isIdle && position && 
           Math.abs(position.x) < 0.1 && 
           Math.abs(position.y) < 0.1 && 
           Math.abs(position.z) < 0.1;
  }

  /**
   * Restore machine position
   */
  async restorePosition() {
    const lastPos = this.machineState.lastKnownPosition;
    if (!lastPos) return;
    
    debug('Restoring last known position', lastPos);
    
    // Move to safe height first
    await this.commandManager.sendCommand(`G0 Z${this.config.safeHeight}`);
    
    // Move to XY position
    await this.commandManager.sendCommand(`G0 X${lastPos.x} Y${lastPos.y}`);
    
    // Move to final Z
    await this.commandManager.sendCommand(`G0 Z${lastPos.z}`);
  }

  /**
   * Update machine state tracking
   */
  updateMachineState(state) {
    if (state.position) {
      this.machineState.lastKnownPosition = { ...state.position };
    }
    
    if (state.workOffset) {
      this.machineState.lastKnownWorkOffset = { ...state.workOffset };
    }
    
    if (state.spindleState !== undefined) {
      this.machineState.lastKnownSpindleState = { ...state.spindleState };
    }
    
    if (state.coolantState !== undefined) {
      this.machineState.lastKnownCoolantState = state.coolantState;
    }
    
    if (state.isHomed !== undefined) {
      this.machineState.isHomed = state.isHomed;
    }
  }

  /**
   * Update alarm statistics
   */
  updateAlarmStats(alarmCode) {
    switch (alarmCode) {
      case 1:
        this.stats.hardLimitAlarms++;
        break;
      case 2:
        this.stats.softLimitAlarms++;
        break;
      case 6:
      case 7:
      case 8:
      case 9:
        this.stats.homingAlarms++;
        break;
    }
  }

  /**
   * Record recovery attempt in history
   */
  recordRecovery(recovery, result) {
    this.recoveryHistory.push({
      alarmCode: recovery.alarmCode,
      alarmName: recovery.alarmInfo.name,
      startTime: recovery.startTime,
      duration: Date.now() - recovery.startTime,
      attempts: recovery.attempts,
      success: result.success,
      reason: result.reason,
      phases: recovery.phases || [],
      context: recovery.context
    });
    
    // Limit history size
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-50);
    }
  }

  /**
   * Get recovery statistics
   */
  getStatistics() {
    const successRate = this.stats.recoveryAttempts > 0 ? 
      (this.stats.successfulRecoveries / this.stats.recoveryAttempts) * 100 : 0;
    
    return {
      ...this.stats,
      successRate,
      averageAttemptsPerRecovery: this.stats.successfulRecoveries > 0 ? 
        this.stats.recoveryAttempts / this.stats.successfulRecoveries : 0,
      isRecoveryInProgress: !!this.currentRecovery,
      currentRecovery: this.currentRecovery ? {
        alarmCode: this.currentRecovery.alarmCode,
        phase: this.currentRecovery.phase,
        attempts: this.currentRecovery.attempts,
        duration: Date.now() - this.currentRecovery.startTime
      } : null
    };
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory() {
    return [...this.recoveryHistory];
  }

  /**
   * Test recovery sequence (for validation)
   */
  async testRecoverySequence(alarmCode, options = {}) {
    const dryRun = options.dryRun || false;
    
    if (dryRun) {
      // Simulate recovery without actual commands
      debug(`Dry run recovery test for alarm ${alarmCode}`);
      return { success: true, dryRun: true };
    }
    
    // Actually test the recovery sequence
    return await this.handleAlarm(alarmCode, { test: true });
  }

  /**
   * Promise-based delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.currentRecovery) {
      warn('Cleanup called during active recovery');
    }
    
    this.recoveryHistory = [];
    this.currentRecovery = null;
    this.removeAllListeners();
  }
}