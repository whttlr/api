import { Config } from '../../cnc/config.js';
import { log } from '../logger/index.js';

// Load configuration
const CONFIG = Config.get();

/**
 * Get current connection status
 */
function getStatus(isConnected, currentPort, responseCallbacks) {
  return {
    isConnected: isConnected,
    currentPort: currentPort,
    responseCallbacks: responseCallbacks.size
  };
}

/**
 * Query machine status
 */
async function queryMachineStatus(sendRawGcode) {
  try {
    const result = await sendRawGcode('?', 5000);
    const parsed = parseMachineStatus(result.response);
    log(`   ✅ Status: ${parsed ? parsed.state : 'Unknown'}`);
    return {
      raw: result.response,
      parsed: parsed
    };
  } catch (error) {
    log(`   ❌ Status query failed: ${error.message}`);
    return { raw: error.message, parsed: null };
  }
}

/**
 * Query GRBL settings
 */
async function queryGrblSettings(sendRawGcode) {
  try {
    const result = await sendRawGcode('$$', 10000);
    const parsed = parseGrblSettings(result.response);
    log(`   ✅ Retrieved ${Object.keys(parsed).length} GRBL settings`);
    return {
      raw: result.response,
      parsed: parsed
    };
  } catch (error) {
    log(`   ❌ Settings query failed: ${error.message}`);
    return { raw: error.message, parsed: {} };
  }
}

/**
 * Query coordinate systems
 */
async function queryCoordinateSystems(sendRawGcode) {
  try {
    const result = await sendRawGcode('$#', 5000);
    const parsed = parseCoordinateSystems(result.response);
    log(`   ✅ Retrieved coordinate systems`);
    return {
      raw: result.response,
      parsed: parsed
    };
  } catch (error) {
    log(`   ❌ Coordinate systems query failed: ${error.message}`);
    return { raw: error.message, parsed: {} };
  }
}

/**
 * Query parser state
 */
async function queryParserState(sendRawGcode) {
  try {
    const result = await sendRawGcode('$G', 5000);
    const parsed = parseParserState(result.response);
    log(`   ✅ Retrieved parser state`);
    return {
      raw: result.response,
      parsed: parsed
    };
  } catch (error) {
    log(`   ❌ Parser state query failed: ${error.message}`);
    return { raw: error.message, parsed: {} };
  }
}

/**
 * Parse machine status response
 */
function parseMachineStatus(response) {
  const match = response.match(/<([^|]+)\|([^>]+)>/);
  if (!match) return null;

  const status = {
    state: match[1],
    position: {},
    workPosition: {}
  };

  // Parse position data
  const positionData = match[2];
  const parts = positionData.split('|');

  // First part is usually MPos (machine position)
  const mPosMatch = parts[0].match(/MPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (mPosMatch) {
    status.position = {
      x: parseFloat(mPosMatch[1]),
      y: parseFloat(mPosMatch[2]),
      z: parseFloat(mPosMatch[3])
    };
  }

  // Look for WPos (work position)
  const wPosMatch = positionData.match(/WPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (wPosMatch) {
    status.workPosition = {
      x: parseFloat(wPosMatch[1]),
      y: parseFloat(wPosMatch[2]),
      z: parseFloat(wPosMatch[3])
    };
  }

  return status;
}

/**
 * Parse GRBL settings response
 */
function parseGrblSettings(response) {
  const settings = {};
  const lines = response.split('\n');

  for (const line of lines) {
    const match = line.match(/\$(\d+)=([^\s]+)/);
    if (match) {
      const settingNum = parseInt(match[1]);
      const value = parseFloat(match[2]) || match[2];
      settings[settingNum] = value;
    }
  }

  return settings;
}

/**
 * Parse coordinate systems response
 */
function parseCoordinateSystems(response) {
  const systems = {};
  const lines = response.split('\n');

  for (const line of lines) {
    const match = line.match(/\[([^\]]+)\]/);
    if (match) {
      const content = match[1];
      const parts = content.split(':');
      if (parts.length === 2) {
        const name = parts[0];
        const coords = parts[1].split(',').map(v => parseFloat(v));
        systems[name] = {
          x: coords[0] || 0,
          y: coords[1] || 0,
          z: coords[2] || 0
        };
      }
    }
  }

  return systems;
}

/**
 * Parse parser state response
 */
function parseParserState(response) {
  const state = {
    mode: null,
    coordinateSystem: null,
    plane: null,
    units: null,
    distanceMode: null,
    feedRateMode: null,
    programMode: null,
    spindleState: null,
    coolantState: null
  };

  // Extract G-code states
  const codes = response.match(/\[([^\]]+)\]/);
  if (codes) {
    const codeList = codes[1].split(' ');

    for (const code of codeList) {
      if (code.startsWith('G0') || code.startsWith('G1') || code.startsWith('G2') || code.startsWith('G3')) {
        state.mode = code;
      } else if (code.startsWith('G54') || code.startsWith('G55') || code.startsWith('G56') || code.startsWith('G57') || code.startsWith('G58') || code.startsWith('G59')) {
        state.coordinateSystem = code;
      } else if (code === 'G17' || code === 'G18' || code === 'G19') {
        state.plane = code;
      } else if (code === 'G20' || code === 'G21') {
        state.units = code;
      } else if (code === 'G90' || code.startsWith('G91')) {
        state.distanceMode = code;
      } else if (code === 'G93' || code.startsWith('G94')) {
        state.feedRateMode = code;
      } else if (code === 'M0' || code === 'M1' || code === 'M2' || code === 'M30') {
        state.programMode = code;
      } else if (code === 'M3' || code === 'M4' || code === 'M5') {
        state.spindleState = code;
      } else if (code === 'M7' || code === 'M8' || code === 'M9') {
        state.coolantState = code;
      }
    }
  }

  return state;
}

/**
 * Get comprehensive limits information
 */
async function getLimitsInfo(isConnected, queryMachineStatus, queryGrblSettings) {
  if (!isConnected) {
    throw new Error('Must be connected to machine before checking limits');
  }

  const limitsInfo = {
    configured: CONFIG.machineLimits,
    current: null,
    grblSettings: null,
    availableRange: null,
    warnings: []
  };

  try {
    // Get current machine status and position
    const statusResult = await queryMachineStatus();
    if (statusResult.parsed) {
      limitsInfo.current = statusResult.parsed;
    }

    // Get GRBL settings to understand machine configuration
    const settingsResult = await queryGrblSettings();
    if (settingsResult.parsed) {
      limitsInfo.grblSettings = settingsResult.parsed;

      // Common GRBL settings related to limits:
      // $130, $131, $132 = Max travel (X, Y, Z)
      // $20 = Soft limits enable
      // $21 = Hard limits enable
      // $22 = Homing cycle enable

      if (limitsInfo.grblSettings[130] || limitsInfo.grblSettings[131] || limitsInfo.grblSettings[132]) {
        const grblMaxTravel = {
          x: limitsInfo.grblSettings[130] || 'Not set',
          y: limitsInfo.grblSettings[131] || 'Not set',
          z: limitsInfo.grblSettings[132] || 'Not set'
        };

        // Compare with configured limits
        if (typeof grblMaxTravel.x === 'number' && grblMaxTravel.x !== CONFIG.machineLimits.x.totalTravel) {
          limitsInfo.warnings.push(`X-axis: GRBL max travel (${grblMaxTravel.x}mm) differs from configured (${CONFIG.machineLimits.x.totalTravel}mm)`);
        }
        if (typeof grblMaxTravel.y === 'number' && grblMaxTravel.y !== CONFIG.machineLimits.y.totalTravel) {
          limitsInfo.warnings.push(`Y-axis: GRBL max travel (${grblMaxTravel.y}mm) differs from configured (${CONFIG.machineLimits.y.totalTravel}mm)`);
        }
        if (typeof grblMaxTravel.z === 'number' && grblMaxTravel.z !== CONFIG.machineLimits.z.totalTravel) {
          limitsInfo.warnings.push(`Z-axis: GRBL max travel (${grblMaxTravel.z}mm) differs from configured (${CONFIG.machineLimits.z.totalTravel}mm)`);
        }
      }

      // Check if soft limits are enabled
      if (limitsInfo.grblSettings[20] === 0) {
        limitsInfo.warnings.push('Soft limits are DISABLED ($20=0) - machine may move beyond safe limits');
      }

      // Check if hard limits are enabled
      if (limitsInfo.grblSettings[21] === 0) {
        limitsInfo.warnings.push('Hard limits are DISABLED ($21=0) - no physical limit switch protection');
      }

      // Check if homing is enabled
      if (limitsInfo.grblSettings[22] === 0) {
        limitsInfo.warnings.push('Homing cycle is DISABLED ($22=0) - machine position may be unreliable');
      }
    }

    // Calculate available range based on current position
    if (limitsInfo.current && limitsInfo.current.position) {
      const currentPos = limitsInfo.current.position;

      limitsInfo.availableRange = {};

      // Calculate available X range
      limitsInfo.availableRange.x = {
        min: CONFIG.machineLimits.x.min - currentPos.x,
        max: CONFIG.machineLimits.x.max - currentPos.x,
        current: currentPos.x
      };

      // Calculate available Y range
      limitsInfo.availableRange.y = {
        min: CONFIG.machineLimits.y.min - currentPos.y,
        max: CONFIG.machineLimits.y.max - currentPos.y,
        current: currentPos.y
      };

      // Calculate available Z range
      limitsInfo.availableRange.z = {
        min: CONFIG.machineLimits.z.min - currentPos.z,
        max: CONFIG.machineLimits.z.max - currentPos.z,
        current: currentPos.z
      };
    }

  } catch (error) {
    limitsInfo.warnings.push(`Error retrieving limits information: ${error.message}`);
  }

  return limitsInfo;
}

/**
 * Display comprehensive limits information
 */
function displayLimitsInfo(limitsInfo) {
  log('\n============================================');
  log('        🎯 MACHINE LIMITS & POSITION 🎯');
  log('============================================\n');

  // Current Position
  if (limitsInfo.current && limitsInfo.current.position) {
    const pos = limitsInfo.current.position;
    log('📍 CURRENT POSITION:');
    log(`   X: ${pos.x.toFixed(3)}mm`);
    log(`   Y: ${pos.y.toFixed(3)}mm`);
    log(`   Z: ${pos.z.toFixed(3)}mm`);
    log(`   State: ${limitsInfo.current.state}\n`);
  }

  // Configured Limits
  log('⚙️  CONFIGURED LIMITS:');
  log(`   X: ${CONFIG.machineLimits.x.min}mm to ${CONFIG.machineLimits.x.max}mm (${CONFIG.machineLimits.x.totalTravel}mm travel)`);
  log(`   Y: ${CONFIG.machineLimits.y.min}mm to ${CONFIG.machineLimits.y.max}mm (${CONFIG.machineLimits.y.totalTravel}mm travel)`);
  log(`   Z: ${CONFIG.machineLimits.z.min}mm to ${CONFIG.machineLimits.z.max}mm (${CONFIG.machineLimits.z.totalTravel}mm travel)\n`);

  // Available Movement Range
  if (limitsInfo.availableRange) {
    log('🎯 AVAILABLE MOVEMENT FROM CURRENT POSITION:');
    const xRange = limitsInfo.availableRange.x;
    const yRange = limitsInfo.availableRange.y;
    const zRange = limitsInfo.availableRange.z;

    log(`   X: ${xRange.min.toFixed(1)}mm to +${xRange.max.toFixed(1)}mm`);
    log(`   Y: ${yRange.min.toFixed(1)}mm to +${yRange.max.toFixed(1)}mm`);
    log(`   Z: ${zRange.min.toFixed(1)}mm to +${zRange.max.toFixed(1)}mm\n`);
  }

  // GRBL Settings
  if (limitsInfo.grblSettings) {
    log('🔧 GRBL LIMIT SETTINGS:');
    log(`   Max Travel X ($130): ${limitsInfo.grblSettings[130] || 'Not set'}`);
    log(`   Max Travel Y ($131): ${limitsInfo.grblSettings[131] || 'Not set'}`);
    log(`   Max Travel Z ($132): ${limitsInfo.grblSettings[132] || 'Not set'}`);
    log(`   Soft Limits ($20): ${limitsInfo.grblSettings[20] === 1 ? 'ENABLED' : 'DISABLED'}`);
    log(`   Hard Limits ($21): ${limitsInfo.grblSettings[21] === 1 ? 'ENABLED' : 'DISABLED'}`);
    log(`   Homing Cycle ($22): ${limitsInfo.grblSettings[22] === 1 ? 'ENABLED' : 'DISABLED'}\n`);
  }

  // Warnings
  if (limitsInfo.warnings.length > 0) {
    log('⚠️  WARNINGS:');
    limitsInfo.warnings.forEach(warning => {
      log(`   • ${warning}`);
    });
    log('');
  }

  log('============================================');
}

export {
  getStatus,
  queryMachineStatus,
  queryGrblSettings,
  queryCoordinateSystems,
  queryParserState,
  parseMachineStatus,
  parseGrblSettings,
  parseCoordinateSystems,
  parseParserState,
  getLimitsInfo,
  displayLimitsInfo
};