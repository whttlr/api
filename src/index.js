/**
 * API Module Public API
 * 
 * Exports API-specific functionality and configurations.
 */

// Configuration
export * from './config/messages.js';

// Shared middleware and utilities
export * from './shared/responseFormatter.js';
export * from './shared/middleware/errorHandler.js';

// Route definitions
export { default as apiRoutes } from './routes/index.js';