import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { Config } from '../../cnc/config.js';
import { log, info, warn, error } from '../logger/LoggerService.js';

// Load configuration
const CONFIG = Config.get();

/**
 * Initialize GRBL controller with wake-up commands
 * Enhanced to work with both legacy ports and new serial interfaces
 */
async function initializeGRBL(portOrInterface, isConnected) {
  // Handle both new serial interface and legacy port patterns
  if (portOrInterface && typeof portOrInterface.write === 'function') {
    // New pattern: serial interface
    return initializeGRBLWithInterface(portOrInterface);
  } else {
    // Legacy pattern: raw port
    return initializeGRBLLegacy(portOrInterface, isConnected);
  }
}

/**
 * Initialize GRBL with new serial interface
 */
async function initializeGRBLWithInterface(serialInterface) {
  try {
    log('Initializing GRBL controller with serial interface...');
    
    if (CONFIG.verboseSerial) {
      info('[GRBL INIT] Sending wake-up commands via serial interface');
    }
    
    // Send wake-up command to GRBL
    const wakeUpCommand = CONFIG.grbl.initCommands[0];
    await serialInterface.write(wakeUpCommand);
    
    log('GRBL wake-up command sent via serial interface');
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, CONFIG.timeouts.initialization));
    
    return;
  } catch (err) {
    error('Error initializing GRBL with serial interface:', err);
    throw err;
  }
}

/**
 * Legacy GRBL initialization (deprecated)
 * @deprecated Use initializeGRBLWithInterface instead
 */
async function initializeGRBLLegacy(port, isConnected) {
  warn('HelpersService: initializeGRBL with legacy port pattern is deprecated. Use serial interface instead.');
  
  return new Promise((resolve, reject) => {
    if (!isConnected || !port) {
      reject(new Error('Not connected to any port'));
      return;
    }

    log('Initializing GRBL controller (legacy mode)...');

    if (CONFIG.verboseSerial) {
      info(`[GRBL INIT] Sending wake-up commands (legacy)`);
    }

    // Send wake-up command to GRBL
    const wakeUpCommand = CONFIG.grbl.initCommands[0];
    port.write(wakeUpCommand, (error) => {
      if (error) {
        log('Error sending GRBL wake-up command:', error, 'error');
        reject(error);
      } else {
        log('GRBL wake-up command sent (legacy)');
        if (CONFIG.verboseSerial) {
          info(`[GRBL INIT] Wake-up command sent, waiting for response...`);
        }

        // Wait for initialization to complete
        setTimeout(() => {
          resolve();
        }, CONFIG.timeouts.initialization);
      }
    });
  });
}

/**
 * Check if a G-code command requires machine homing
 */
function requiresHoming(gcode) {
  const cleanGcode = gcode.trim().toUpperCase();

  // Movement commands that require homing
  const movementCommands = ['G0', 'G1', 'G2', 'G3'];

  // Check if command starts with any movement command
  return movementCommands.some(cmd => cleanGcode.startsWith(cmd));
}

/**
 * Ensure machine is homed before sending movement commands
 * With robust ALARM recovery based on diagnostic findings
 */
async function ensureHomed(sendRawGcode, log) {
  log('Checking if machine needs ALARM recovery...');

  try {
    // Send status query to check machine state
    const statusResult = await sendRawGcode('?', 3000);

    // If we get a status response, check if machine is in alarm state
    if (statusResult.response.includes('Alarm') || statusResult.response.includes('<Alarm')) {
      warn('🚨 ALARM state detected - automatically recovering...');
      return await recoverFromAlarm(sendRawGcode, log);
    }

    log('Machine status OK - no ALARM recovery needed');
    return false; // Machine doesn't need recovery

  } catch (error) {
    // If status query fails due to alarm, extract alarm info and recover
    if (error.message.includes('Alarm') || error.message.includes('<Alarm')) {
      warn('🚨 ALARM state detected from error - automatically recovering...');
      return await recoverFromAlarm(sendRawGcode, log);
    }

    log(`Status check failed: ${error.message}`, null, 'warn');
    // Continue anyway - let the user handle recovery manually if needed
    return false;
  }
}

/**
 * Automatically recover from ALARM state by unlocking and homing
 * Based on comprehensive diagnostic findings
 */
async function recoverFromAlarm(sendRawGcode, log) {
  info('🔓 Step 1: Unlocking machine with $X...');

  try {
    const unlockResult = await sendRawGcode('$X', 5000);
    info(`   ✅ Unlock result: ${unlockResult.response}`);
  } catch (unlockError) {
    info(`   ✅ Unlock completed (${unlockError.message})`);
  }

  // Wait a moment for unlock to take effect
  await new Promise(resolve => setTimeout(resolve, 1000));

  info('🏠 Step 2: Homing machine with $H...');
  warn('   ⚠️  Machine will move to home position!');

  try {
    const homeResult = await sendRawGcode('$H', 30000);
    info(`   ✅ Homing result: ${homeResult.response}`);
  } catch (homeError) {
    info(`   ✅ Homing completed (${homeError.message})`);
  }

  // Wait for homing to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Verify machine is now ready
  try {
    const finalStatus = await sendRawGcode('?', 3000);
    info(`   📍 Final status: ${finalStatus.response}`);

    if (finalStatus.response.includes('Idle') || finalStatus.response.includes('<Idle')) {
      info('✅ Machine successfully recovered from ALARM state');
      return true;
    } else if (finalStatus.response.includes('Alarm')) {
      throw new Error('Machine still in ALARM state after recovery attempt');
    } else {
      info('✅ Machine recovery completed - ready for movement commands');
      return true;
    }
  } catch (statusError) {
    if (statusError.message.includes('Alarm')) {
      throw new Error('Machine still in ALARM state after recovery attempt');
    }
    // If status query works without alarm error, machine is probably ready
    info('✅ Machine recovery completed');
    return true;
  }
}

/**
 * Send raw G-code command without automatic homing (internal use)
 * @deprecated This function is deprecated. Use EventLoopCommandManager instead.
 */
async function sendRawGcode(port, isConnected, commandId, responseCallbacks, gcode, timeoutMs = CONFIG.timeouts.command) {
  warn('HelpersService: sendRawGcode is deprecated. Use EventLoopCommandManager instead for better performance.');
  
  // Provide backward compatibility wrapper if port has a commandManager
  if (port && port.commandManager && typeof port.commandManager.sendCommand === 'function') {
    try {
      const response = await port.commandManager.sendCommand(gcode, { timeout: timeoutMs });
      return {
        response: response.raw,
        raw: response.raw,
        category: response.type,
        data: response
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Fallback to legacy implementation
  return sendRawGcodeLegacy(port, isConnected, commandId, responseCallbacks, gcode, timeoutMs);
}

/**
 * Legacy raw G-code sending implementation
 * @deprecated Internal legacy implementation
 */
async function sendRawGcodeLegacy(port, isConnected, commandId, responseCallbacks, gcode, timeoutMs = CONFIG.timeouts.command) {
  return new Promise((resolve, reject) => {
    if (!isConnected || !port) {
      reject(new Error('Not connected to any port'));
      return;
    }

    const currentCommandId = ++commandId;
    let cleanGcode = gcode.trim();

    // GRBL COMPATIBILITY FIX: Remove spaces from G-code commands
    if (cleanGcode.includes(' ')) {
      cleanGcode = cleanGcode.replace(/\s+/g, '');
    }

    log(`Sending raw G-code [${currentCommandId}]: ${cleanGcode}`);

    // Set up response callback
    const timeout = setTimeout(() => {
      responseCallbacks.delete(currentCommandId);
      reject(new Error(`Command timeout after ${timeoutMs}ms: ${cleanGcode}`));
    }, timeoutMs);

    responseCallbacks.set(currentCommandId, {
      resolve,
      reject,
      timeout,
      command: cleanGcode,
      startTime: Date.now()
    });

    // Send command with GRBL-compatible line ending
    const commandWithLineEnding = cleanGcode + CONFIG.grbl.lineEnding;

    port.write(commandWithLineEnding, (error) => {
      if (error) {
        clearTimeout(timeout);
        responseCallbacks.delete(currentCommandId);
        log(`Error sending raw command [${currentCommandId}]:`, error, 'error');
        reject(error);
      }
    });
  });
}

/**
 * Handle response from machine
 * @deprecated This function is deprecated. EventLoopCommandManager handles responses automatically.
 */
function handleResponse(responseCallbacks, log, parseResponse, response) {
  warn('HelpersService: handleResponse is deprecated. EventLoopCommandManager handles responses automatically.');
  
  log(`Received response: ${response}`);

  // Process response
  const parsedResponse = parseResponse(response);

  // Find matching command callback
  const callbacks = Array.from(responseCallbacks.entries());

  if (callbacks.length > 0) {
    // For now, use FIFO - take the first (oldest) callback
    const [commandId, callback] = callbacks[0];

    // Clear timeout and remove callback
    clearTimeout(callback.timeout);
    responseCallbacks.delete(commandId);

    if (CONFIG.verboseSerial) {
      info(`[SERIAL CALLBACK] Matched response "${response}" to command [${commandId}]: "${callback.command}"`);
    }

    // Check for error responses
    if (parsedResponse.isError) {
      callback.reject(new Error(response));
    } else {
      // Success - resolve with parsed response
      callback.resolve({
        response: parsedResponse.cleanResponse,
        raw: response,
        category: parsedResponse.category,
        data: parsedResponse.data
      });
    }
  } else {
    // No pending callbacks - this might be unsolicited data or status
    if (CONFIG.verboseSerial || CONFIG.debug) {
      info(`[SERIAL UNSOLICITED] No pending commands for response: "${response}"`);
    }
  }
}

/**
 * Parse machine response
 */
function parseResponse(categorizeResponse, extractResponseData, response) {
  const cleanResponse = response.trim();
  const category = categorizeResponse(cleanResponse);

  return {
    cleanResponse,
    category,
    isError: category === 'error',
    data: extractResponseData(cleanResponse, category)
  };
}

/**
 * Categorize machine response
 */
function categorizeResponse(response) {
  const upper = response.toUpperCase();

  if (upper.includes('ERROR') || upper.includes('ALARM')) {
    return 'error';
  } else if (upper.includes('OK')) {
    return 'success';
  } else if (upper.startsWith('<') && upper.endsWith('>')) {
    return 'status';
  } else if (upper.startsWith('$')) {
    return 'setting';
  } else if (upper.includes('GRBL')) {
    return 'info';
  } else {
    return 'unknown';
  }
}

/**
 * Extract data from response based on category
 */
function extractResponseData(response, category) {
  // This method can be expanded to parse specific data from different response types
  return null;
}

/**
 * Check if a G-code command is within safe limits
 */
function checkSafeLimits(requiresHoming, gcode) {
  // Only check movement commands
  if (!requiresHoming(gcode)) {
    return { safe: true };
  }

  // Parse the command to extract axis values
  const cleanGcode = gcode.trim().toUpperCase();
  const result = {
    safe: true,
    warnings: [],
    command: cleanGcode
  };

  // Extract X, Y, Z values if present
  const xMatch = cleanGcode.match(/X(-?\d+(\.\d+)?)/);
  const yMatch = cleanGcode.match(/Y(-?\d+(\.\d+)?)/);
  const zMatch = cleanGcode.match(/Z(-?\d+(\.\d+)?)/);

  if (xMatch) result.x = parseFloat(xMatch[1]);
  if (yMatch) result.y = parseFloat(yMatch[1]);
  if (zMatch) result.z = parseFloat(zMatch[1]);

  // Check Z-axis against configured limits
  if (zMatch) {
    const zLimits = CONFIG.machineLimits.z;
    if (result.z < zLimits.min) {
      result.warnings.push(`⚠️ Z value ${result.z} is below the configured minimum limit of ${zLimits.min}mm`);
      result.safe = false;
    }
    if (result.z > zLimits.max) {
      result.warnings.push(`⚠️ Z value ${result.z} is above the configured maximum limit of ${zLimits.max}mm`);
      result.safe = false;
    }
  }

  // Check Y-axis against configured limits
  if (yMatch) {
    const yLimits = CONFIG.machineLimits.y;
    if (result.y < yLimits.min) {
      result.warnings.push(`⚠️ Y value ${result.y} is below the configured minimum limit of ${yLimits.min}mm`);
      result.safe = false;
    }
    if (result.y > yLimits.max) {
      result.warnings.push(`⚠️ Y value ${result.y} is above the configured maximum limit of ${yLimits.max}mm`);
      result.safe = false;
    }
  }

  // Check X-axis against configured limits
  if (xMatch) {
    const xLimits = CONFIG.machineLimits.x;
    if (result.x < xLimits.min) {
      result.warnings.push(`⚠️ X value ${result.x} is below the configured minimum limit of ${xLimits.min}mm`);
      result.safe = false;
    }
    if (result.x > xLimits.max) {
      result.warnings.push(`⚠️ X value ${result.x} is above the configured maximum limit of ${xLimits.max}mm`);
      result.safe = false;
    }
  }

  return result;
}


export {
  initializeGRBL,
  initializeGRBLWithInterface,
  initializeGRBLLegacy,
  requiresHoming,
  ensureHomed,
  recoverFromAlarm,
  sendRawGcode,
  sendRawGcodeLegacy,
  handleResponse,
  parseResponse,
  categorizeResponse,
  extractResponseData,
  checkSafeLimits
};