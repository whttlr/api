/**
 * Unit Conversion Service
 * 
 * Provides unit conversion utilities for imperial/metric measurements
 * with performance-optimized caching for position formatting.
 * 
 * @module UnitConverter
 */

// Conversion constants
const MM_TO_INCHES = 1 / 25.4;
const INCHES_TO_MM = 25.4;

// Memoized position formatting cache to reduce computation overhead
const positionCache = new Map();
const CACHE_SIZE_LIMIT = 100;

/**
 * Convert millimeters to inches
 * @param {number} mm - Value in millimeters
 * @returns {number} Value in inches
 */
export const convertMmToInches = (mm) => mm * MM_TO_INCHES;

/**
 * Convert inches to millimeters
 * @param {number} inches - Value in inches
 * @returns {number} Value in millimeters
 */
export const convertInchesToMm = (inches) => inches * INCHES_TO_MM;

/**
 * Get display unit string based on unit system
 * @param {string} units - Unit system ('metric' or 'imperial')
 * @returns {string} Display unit ('mm' or 'in')
 */
export const getDisplayUnit = (units) => units === 'metric' ? 'mm' : 'in';

/**
 * Convert value to display units
 * @param {number} value - Value in millimeters (internal storage)
 * @param {string} units - Target unit system ('metric' or 'imperial')
 * @returns {number} Value in display units
 */
export const getDisplayValue = (value, units) => {
  if (units === 'imperial') {
    return convertMmToInches(value);
  }
  return value;
};

/**
 * Format position value with caching for performance
 * @param {number} value - Position value in mm
 * @param {string} units - Unit system ('metric' or 'imperial')
 * @param {number} precision - Decimal places (default: 2)
 * @returns {string} Formatted position string
 */
export const formatPosition = (value, units, precision = 2) => {
  const cacheKey = `${value}-${units}-${precision}`;
  if (positionCache.has(cacheKey)) {
    return positionCache.get(cacheKey);
  }
  
  const displayValue = getDisplayValue(value, units);
  const result = displayValue.toFixed(precision);
  
  // Limit cache size to prevent memory leaks
  if (positionCache.size > CACHE_SIZE_LIMIT) {
    const firstKey = positionCache.keys().next().value;
    positionCache.delete(firstKey);
  }
  
  positionCache.set(cacheKey, result);
  return result;
};

/**
 * Format coordinate object to display string
 * @param {Object} pos - Position object {x, y, z}
 * @param {string} units - Unit system
 * @param {number} precision - Decimal places
 * @returns {string} Formatted coordinate string
 */
export const formatCoordinate = (pos, units, precision = 2) => {
  const x = formatPosition(pos.x || 0, units, precision);
  const y = formatPosition(pos.y || 0, units, precision);
  const z = formatPosition(pos.z || 0, units, precision);
  return `${x},${y},${z}`;
};

/**
 * Format feed rate with appropriate units
 * @param {number} feedRate - Feed rate in mm/min
 * @param {string} units - Unit system
 * @returns {string} Formatted feed rate string
 */
export const formatFeedRate = (feedRate, units) => {
  if (!feedRate || feedRate === 0) {
    return `0 ${getDisplayUnit(units)}/min`;
  }
  
  const displayRate = getDisplayValue(feedRate, units);
  const unit = getDisplayUnit(units);
  return `${displayRate.toFixed(0)} ${unit}/min`;
};

/**
 * Parse user input value to internal units (mm)
 * @param {string|number} input - User input value
 * @param {string} units - Current unit system
 * @returns {number} Value in millimeters
 */
export const parseInputValue = (input, units) => {
  const value = parseFloat(input);
  if (isNaN(value)) {
    throw new Error('Invalid numeric input');
  }
  
  if (units === 'imperial') {
    return convertInchesToMm(value);
  }
  return value;
};

/**
 * Convert machine limits from config units to display units
 * @param {Object} limits - Machine limits object
 * @param {string} units - Target unit system
 * @returns {Object} Converted limits object
 */
export const convertLimits = (limits, units) => {
  const result = {};
  
  Object.keys(limits).forEach(axis => {
    if (typeof limits[axis] === 'object') {
      result[axis] = {
        min: getDisplayValue(limits[axis].min, units),
        max: getDisplayValue(limits[axis].max, units),
        totalTravel: getDisplayValue(limits[axis].totalTravel, units)
      };
    } else {
      result[axis] = getDisplayValue(limits[axis], units);
    }
  });
  
  return result;
};

/**
 * Clear the position formatting cache
 */
export const clearCache = () => {
  positionCache.clear();
};

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache size and hit rate info
 */
export const getCacheStats = () => {
  return {
    size: positionCache.size,
    limit: CACHE_SIZE_LIMIT
  };
};

// Default export with all utilities
const UnitConverter = {
  convertMmToInches,
  convertInchesToMm,
  getDisplayUnit,
  getDisplayValue,
  formatPosition,
  formatCoordinate,
  formatFeedRate,
  parseInputValue,
  convertLimits,
  clearCache,
  getCacheStats
};

export { UnitConverter };
export default UnitConverter;