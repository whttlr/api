/**
 * Connection Service
 * 
 * Business logic for managing CNC machine connections, port validation,
 * and connection state management.
 * 
 * @module ConnectionService
 */

/**
 * Validate port information for connection compatibility
 * @param {Object} port - Port information object
 * @returns {Object} Validation result with compatibility score
 */
export function validatePort(port) {
  const validation = {
    isValid: true,
    score: 0,
    issues: [],
    recommendations: []
  };

  // Check if port has manufacturer info
  if (port.manufacturer && port.manufacturer !== 'Unknown') {
    validation.score += 30;
    
    // Check for known CNC controller manufacturers
    const knownManufacturers = [
      'arduino', 'ch340', 'ftdi', 'silabs', 'prolific', 'atmel'
    ];
    
    const manufacturer = port.manufacturer.toLowerCase();
    if (knownManufacturers.some(known => manufacturer.includes(known))) {
      validation.score += 40;
    }
  } else {
    validation.issues.push('Unknown manufacturer - may not be a CNC controller');
  }

  // Check vendor/product IDs
  if (port.vendorId && port.vendorId !== 'Unknown') {
    validation.score += 20;
    
    // Known CNC controller vendor IDs
    const knownVendorIds = [
      '2341', // Arduino
      '1a86', // CH340
      '0403', // FTDI
      '10c4', // Silicon Labs
      '067b'  // Prolific
    ];
    
    if (knownVendorIds.includes(port.vendorId.toLowerCase())) {
      validation.score += 30;
    }
  }

  // Check product ID for known patterns
  if (port.productId && port.productId !== 'Unknown') {
    validation.score += 10;
  }

  // Generate recommendations based on score
  if (validation.score >= 70) {
    validation.recommendations.push('High compatibility - likely a CNC controller');
  } else if (validation.score >= 40) {
    validation.recommendations.push('Moderate compatibility - test connection');
  } else {
    validation.recommendations.push('Low compatibility - verify this is your CNC controller');
    validation.issues.push('Port may not be a CNC controller');
  }

  return validation;
}

/**
 * Get connection speed recommendations based on port type
 * @param {Object} port - Port information object
 * @returns {Array} Array of recommended baud rates
 */
export function getRecommendedBaudRates(port) {
  const defaultRates = [115200, 250000, 57600, 38400, 19200, 9600];
  
  // Arduino-based controllers typically use 115200
  if (port.manufacturer?.toLowerCase().includes('arduino')) {
    return [115200, 250000, 57600];
  }
  
  // CH340 chips common in cheap Arduino clones
  if (port.manufacturer?.toLowerCase().includes('ch340')) {
    return [115200, 57600, 9600];
  }
  
  // FTDI chips - can handle higher speeds
  if (port.manufacturer?.toLowerCase().includes('ftdi')) {
    return [250000, 115200, 57600];
  }
  
  return defaultRates;
}

/**
 * Format port display name for UI
 * @param {Object} port - Port information object
 * @returns {string} Formatted display name
 */
export function formatPortDisplayName(port) {
  let name = port.path;
  
  if (port.manufacturer && port.manufacturer !== 'Unknown') {
    name += ` (${port.manufacturer})`;
  }
  
  return name;
}

/**
 * Get port connection tips based on port characteristics
 * @param {Object} port - Port information object
 * @returns {Array} Array of connection tips
 */
export function getConnectionTips(port) {
  const tips = [];
  
  if (port.manufacturer?.toLowerCase().includes('arduino')) {
    tips.push('Arduino-based controller detected');
    tips.push('Try 115200 baud rate first');
    tips.push('Press reset button if connection fails');
  }
  
  if (port.manufacturer?.toLowerCase().includes('ch340')) {
    tips.push('CH340 USB-Serial chip detected');
    tips.push('Ensure CH340 drivers are installed');
    tips.push('Common in Arduino Nano clones');
  }
  
  if (port.manufacturer?.toLowerCase().includes('ftdi')) {
    tips.push('FTDI chip detected - high quality serial interface');
    tips.push('Can handle high speed communication');
    tips.push('Usually very reliable connection');
  }
  
  if (tips.length === 0) {
    tips.push('Generic USB-Serial device');
    tips.push('Try standard GRBL baud rate (115200)');
    tips.push('Verify this is your CNC controller');
  }
  
  return tips;
}

/**
 * Connection status analyzer
 * @param {Object} connectionState - Current connection state
 * @returns {Object} Analysis of connection health
 */
export function analyzeConnectionHealth(connectionState) {
  const analysis = {
    health: 'unknown',
    issues: [],
    recommendations: [],
    uptime: 0
  };
  
  if (!connectionState.isConnected) {
    analysis.health = 'disconnected';
    analysis.issues.push('Not connected to CNC controller');
    analysis.recommendations.push('Select a port and connect');
    return analysis;
  }
  
  // Calculate uptime
  if (connectionState.connectedAt) {
    analysis.uptime = Date.now() - connectionState.connectedAt;
  }
  
  // Check for recent errors
  if (connectionState.lastError) {
    analysis.health = 'error';
    analysis.issues.push(`Connection error: ${connectionState.lastError}`);
    analysis.recommendations.push('Try disconnecting and reconnecting');
    analysis.recommendations.push('Check USB cable and connections');
  } else if (analysis.uptime > 0) {
    analysis.health = 'healthy';
    analysis.recommendations.push('Connection is stable and working');
  }
  
  return analysis;
}

/**
 * Connection service factory
 */
export const ConnectionService = {
  validatePort,
  getRecommendedBaudRates,
  formatPortDisplayName,
  getConnectionTips,
  analyzeConnectionHealth
};

// Default export
export default ConnectionService;