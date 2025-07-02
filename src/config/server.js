/**
 * API Server Configuration
 * 
 * Centralized server settings extracted from hardcoded values.
 */

export const serverConfig = {
  // Server binding
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Request limits
  bodyLimits: {
    json: '10mb',
    urlencoded: '10mb'
  },
  
  // Timeouts
  timeouts: {
    gracefulShutdown: 10000, // 10 seconds
    requestTimeout: 30000   // 30 seconds
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },
  
  // Trust proxy settings
  trustProxy: process.env.TRUST_PROXY || false
};