/**
 * Health Feature Module
 * 
 * Public API exports for system health, help, and documentation
 */

export { default as healthRoutes } from './routes.js';
export { getHealth, getDetailedHealth } from './controller.js';