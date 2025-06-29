/**
 * Connection Feature Controller
 * 
 * Handles serial port connection management via API endpoints.
 * Migrated to feature-based architecture with externalized configuration.
 */

import { info, error as logError } from '../../../../lib/logger/LoggerService.js';
import { asyncHandler, throwError } from '../../shared/middleware/errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { getSharedGcodeSender, resetSharedGcodeSender } from '../../../../lib/shared/InstanceManager.js';
import { getApiMessages } from '../../config/messages.js';

/**
 * Get or create GcodeSender instance
 */
function getGcodeSender() {
  return getSharedGcodeSender();
}

/**
 * Get list of available serial ports
 */
export const listPorts = asyncHandler(async (req, res) => {
  info('API: Listing available serial ports');
  
  const sender = getGcodeSender();
  const ports = await sender.getAvailablePorts();
  const messages = getApiMessages(req.language || 'en');
  
  res.success({
    ports,
    count: ports.length
  }, messages.connection.success.ports_listed);
});

/**
 * Get current connection status
 */
export const getStatus = asyncHandler(async (req, res) => {
  info('API: Getting connection status');
  
  const sender = getGcodeSender();
  const status = sender.getStatus();
  const messages = getApiMessages(req.language || 'en');
  
  res.success({
    connected: status.isConnected,
    port: status.currentPort || null,
    responseCallbacks: status.responseCallbacks
  }, messages.connection.success.status_retrieved);
});

/**
 * Connect to a serial port
 */
export const connect = asyncHandler(async (req, res) => {
  const { port } = req.body;
  const messages = getApiMessages(req.language || 'en');
  
  if (!port) {
    throwError(
      ErrorCodes.VALIDATION_ERROR, 
      messages.connection.errors.port_required,
      null, 
      400
    );
  }
  
  info(`API: Connecting to port: ${port}`);
  
  const sender = getGcodeSender();
  
  // Check if already connected
  const currentStatus = sender.getStatus();
  if (currentStatus.isConnected) {
    if (currentStatus.currentPort === port) {
      return res.success({
        connected: true,
        port: currentStatus.currentPort
      }, messages.connection.success.already_connected.replace('{port}', port));
    } else {
      throwError(
        ErrorCodes.ALREADY_CONNECTED, 
        messages.connection.errors.already_connected.replace('{port}', currentStatus.currentPort),
        null,
        409
      );
    }
  }
  
  try {
    await sender.connect(port);
    
    info(`API: Successfully connected to ${port}`);
    
    res.success({
      connected: true,
      port: port
    }, messages.connection.success.connected.replace('{port}', port));
    
  } catch (error) {
    logError(`API: Failed to connect to ${port}:`, error.message);
    
    if (error.message.includes('not found') || error.message.includes('cannot open')) {
      throwError(
        ErrorCodes.PORT_NOT_AVAILABLE, 
        messages.connection.errors.port_not_available.replace('{port}', port),
        error.message, 
        400
      );
    } else if (error.message.includes('in use') || error.message.includes('locked')) {
      throwError(
        ErrorCodes.PORT_NOT_AVAILABLE, 
        messages.connection.errors.port_in_use.replace('{port}', port),
        error.message, 
        409
      );
    } else {
      throwError(
        ErrorCodes.CONNECTION_FAILED, 
        messages.connection.errors.connection_failed.replace('{port}', port),
        error.message, 
        500
      );
    }
  }
});

/**
 * Disconnect from current port
 */
export const disconnect = asyncHandler(async (req, res) => {
  info('API: Disconnecting from port');
  
  const sender = getGcodeSender();
  const messages = getApiMessages(req.language || 'en');
  
  // Check if connected
  const currentStatus = sender.getStatus();
  if (!currentStatus.isConnected) {
    return res.success({
      connected: false,
      port: null
    }, messages.connection.success.already_disconnected);
  }
  
  const connectedPort = currentStatus.currentPort;
  
  try {
    await sender.disconnect();
    
    info(`API: Successfully disconnected from ${connectedPort}`);
    
    res.success({
      connected: false,
      port: null
    }, messages.connection.success.disconnected.replace('{port}', connectedPort));
    
  } catch (error) {
    logError('API: Failed to disconnect:', error.message);
    throwError(
      ErrorCodes.CONNECTION_FAILED, 
      messages.connection.errors.disconnect_failed,
      error.message, 
      500
    );
  }
});

/**
 * Get health status of the connection system
 */
export const healthCheck = asyncHandler(async (req, res) => {
  const sender = getGcodeSender();
  const status = sender.getStatus();
  const messages = getApiMessages(req.language || 'en');
  
  // Get available ports to verify system health
  let portsAvailable = false;
  let portCount = 0;
  
  try {
    const ports = await sender.getAvailablePorts();
    portsAvailable = true;
    portCount = ports.length;
  } catch (error) {
    logError('API: Health check - failed to list ports:', error.message);
  }
  
  const health = {
    status: 'healthy',
    connection: {
      connected: status.isConnected,
      port: status.currentPort || null
    },
    system: {
      portsAvailable,
      portCount
    },
    timestamp: new Date().toISOString()
  };
  
  res.success(health, messages.connection.success.health_check);
});

/**
 * Reset connection (disconnect and clear state)
 */
export const reset = asyncHandler(async (req, res) => {
  info('API: Resetting connection');
  
  const sender = getGcodeSender();
  const currentStatus = sender.getStatus();
  const messages = getApiMessages(req.language || 'en');
  
  if (currentStatus.isConnected) {
    try {
      await sender.disconnect();
      info('API: Disconnected during reset');
    } catch (error) {
      logError('API: Error during reset disconnect:', error.message);
    }
  }
  
  // Reset shared sender instance to clear state
  resetSharedGcodeSender();
  
  res.success({
    connected: false,
    port: null,
    reset: true
  }, messages.connection.success.reset_complete);
});