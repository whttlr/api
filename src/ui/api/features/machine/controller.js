/**
 * Machine Feature Controller
 * 
 * Handles machine status, limits, diagnostics, and control operations via API endpoints.
 * Migrated to feature-based architecture with externalized configuration.
 */

import { info, error as logError } from '../../../../lib/logger/LoggerService.js';
import { asyncHandler, throwError } from '../../shared/middleware/errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { getSharedGcodeSender } from '../../../../lib/shared/InstanceManager.js';
import { getApiMessages } from '../../config/messages.js';

/**
 * Get shared GcodeSender instance
 */
function getGcodeSender() {
  return getSharedGcodeSender();
}

/**
 * Ensure machine is connected before operations
 */
function ensureConnected(sender, messages) {
  const status = sender.getStatus();
  if (!status.isConnected) {
    throwError(
      ErrorCodes.NOT_CONNECTED,
      messages.machine.error.not_connected,
      { currentStatus: status },
      400
    );
  }
  return status;
}

/**
 * Get current machine status
 */
export const getMachineStatus = asyncHandler(async (req, res) => {
  info('API: Getting machine status');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    // Query machine status using existing GcodeSender functionality
    const machineStatus = await sender.queryMachineStatus();
    
    res.success({
      connected: true,
      port: sender.getStatus().currentPort,
      status: machineStatus
    }, messages.machine.success.status_retrieved);
    
  } catch (error) {
    logError('API: Failed to get machine status:', error.message);
    throwError(
      ErrorCodes.MACHINE_NOT_READY,
      messages.machine.error.status_failed,
      error.message,
      500
    );
  }
});

/**
 * Get machine limits information
 */
export const getMachineLimits = asyncHandler(async (req, res) => {
  info('API: Getting machine limits');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    // Get limits info using existing functionality
    const limitsInfo = await sender.getLimitsInfo();
    
    res.success({
      connected: true,
      port: sender.getStatus().currentPort,
      limits: limitsInfo
    }, messages.machine.success.limits_retrieved);
    
  } catch (error) {
    logError('API: Failed to get machine limits:', error.message);
    throwError(
      ErrorCodes.MACHINE_NOT_READY,
      messages.machine.error.limits_failed,
      error.message,
      500
    );
  }
});

/**
 * Run comprehensive machine diagnostics
 */
export const runDiagnostics = asyncHandler(async (req, res) => {
  info('API: Running machine diagnostics');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    // Run diagnostics using existing functionality
    const diagnosticsResult = await sender.runComprehensiveDiagnostics();
    
    res.success({
      connected: true,
      port: sender.getStatus().currentPort,
      diagnostics: diagnosticsResult,
      timestamp: new Date().toISOString()
    }, messages.machine.success.diagnostics_completed);
    
  } catch (error) {
    logError('API: Failed to run diagnostics:', error.message);
    throwError(
      ErrorCodes.MACHINE_NOT_READY,
      messages.machine.error.diagnostics_failed,
      error.message,
      500
    );
  }
});

/**
 * Send unlock command ($X)
 */
export const unlockMachine = asyncHandler(async (req, res) => {
  info('API: Sending unlock command ($X)');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    const result = await sender.sendGcode('$X');
    
    info(`API: Unlock command sent successfully: ${result.response}`);
    
    res.success({
      command: '$X',
      response: result.response,
      duration_ms: result.duration,
      timestamp: new Date().toISOString()
    }, messages.machine.success.unlock_sent);
    
  } catch (error) {
    logError('API: Failed to send unlock command:', error.message);
    throwError(
      ErrorCodes.COMMAND_FAILED,
      messages.machine.error.unlock_failed,
      error.message,
      500
    );
  }
});

/**
 * Send homing command ($H)
 */
export const homeMachine = asyncHandler(async (req, res) => {
  info('API: Sending homing command ($H)');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    const result = await sender.sendGcode('$H');
    
    info(`API: Homing command sent successfully: ${result.response}`);
    
    res.success({
      command: '$H',
      response: result.response,
      duration_ms: result.duration,
      timestamp: new Date().toISOString()
    }, messages.machine.success.homing_sent);
    
  } catch (error) {
    logError('API: Failed to send homing command:', error.message);
    throwError(
      ErrorCodes.COMMAND_FAILED,
      messages.machine.error.homing_failed,
      error.message,
      500
    );
  }
});

/**
 * Send soft reset (Ctrl+X)
 */
export const resetMachine = asyncHandler(async (req, res) => {
  info('API: Sending soft reset command');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    // Send soft reset using the existing method
    await sender.sendSoftReset();
    
    info('API: Soft reset command sent successfully');
    
    res.success({
      command: 'SOFT_RESET',
      message: messages.machine.info.reset_sent,
      timestamp: new Date().toISOString()
    }, messages.machine.success.reset_sent);
    
  } catch (error) {
    logError('API: Failed to send soft reset:', error.message);
    throwError(
      ErrorCodes.COMMAND_FAILED,
      messages.machine.error.reset_failed,
      error.message,
      500
    );
  }
});

/**
 * Send emergency stop (M112)
 */
export const emergencyStop = asyncHandler(async (req, res) => {
  info('API: Sending emergency stop command');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  ensureConnected(sender, messages);
  
  try {
    const result = await sender.sendGcode('M112');
    
    info(`API: Emergency stop sent successfully: ${result.response}`);
    
    res.success({
      command: 'M112',
      response: result.response,
      duration_ms: result.duration,
      timestamp: new Date().toISOString()
    }, messages.machine.success.emergency_stop_sent);
    
  } catch (error) {
    logError('API: Failed to send emergency stop:', error.message);
    throwError(
      ErrorCodes.COMMAND_FAILED,
      messages.machine.error.emergency_stop_failed,
      error.message,
      500
    );
  }
});

/**
 * Get machine health status
 */
export const getMachineHealth = asyncHandler(async (req, res) => {
  info('API: Getting machine health status');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  const connectionStatus = sender.getStatus();
  
  const health = {
    connection: {
      connected: connectionStatus.isConnected,
      port: connectionStatus.currentPort || null
    },
    timestamp: new Date().toISOString()
  };
  
  // If connected, try to get basic status
  if (connectionStatus.isConnected) {
    try {
      const machineStatus = await sender.queryMachineStatus();
      health.machine = {
        statusAvailable: true,
        state: machineStatus?.parsed?.state || 'Unknown',
        responsive: true
      };
    } catch (error) {
      health.machine = {
        statusAvailable: false,
        responsive: false,
        error: error.message
      };
    }
  } else {
    health.machine = {
      statusAvailable: false,
      responsive: false,
      reason: messages.machine.info.not_connected
    };
  }
  
  // Determine overall health status
  const isHealthy = connectionStatus.isConnected && 
                   (health.machine.responsive !== false);
  
  health.status = isHealthy ? 'healthy' : 'unhealthy';
  
  res.success(health, messages.machine.success.health_retrieved);
});