/**
 * Shared Services Index
 * 
 * Exports all shared business logic services for the CNC UI application.
 * 
 * @module SharedServices
 */

export { SafetyValidator, default as SafetyValidatorService } from './SafetyValidator.js';
export { 
  ErrorMessages, 
  translateError, 
  getErrorCategory, 
  isRecoverableError,
  default as ErrorTranslatorService 
} from './ErrorTranslator.js';
export {
  convertMmToInches,
  convertInchesToMm,
  getDisplayUnit,
  getDisplayValue,
  formatPosition,
  formatCoordinate,
  formatFeedRate,
  parseInputValue,
  convertLimits,
  clearCache as clearUnitCache,
  getCacheStats as getUnitCacheStats,
  default as UnitConverterService
} from './UnitConverter.js';
export {
  KeyBindings,
  handleListNavigation,
  handleTextInput,
  handleModalInput,
  handleNumericInput,
  isDeleteKey,
  createDebouncedHandler,
  GlobalHotkeys,
  getGlobalHotkey,
  isValidGcodeChar,
  sanitizeGcodeInput,
  default as InputHandlerService
} from './InputHandler.js';