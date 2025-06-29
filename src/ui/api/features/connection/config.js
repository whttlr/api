/**
 * Connection Feature Configuration
 * 
 * Configuration settings specific to serial port connection management.
 * These settings control connection behavior, timeouts, and health monitoring.
 */

/**
 * Serial port connection configuration
 */
export const connectionConfig = {
  // Connection establishment settings
  connection: {
    // Time to wait for connection establishment (milliseconds)
    connectTimeout: 5000,
    
    // Time to wait for disconnection completion (milliseconds)
    disconnectTimeout: 3000,
    
    // Number of connection retry attempts
    maxRetries: 3,
    
    // Delay between retry attempts (milliseconds)
    retryDelay: 1000,
    
    // Whether to auto-reconnect on unexpected disconnection
    autoReconnect: false
  },

  // Port scanning and discovery settings
  portScanning: {
    // How often to refresh available ports (milliseconds)
    refreshInterval: 10000,
    
    // Whether to cache port information
    cacheResults: true,
    
    // Cache duration (milliseconds)
    cacheDuration: 5000,
    
    // Include system ports in scan results
    includeSystemPorts: false
  },

  // Connection health monitoring
  healthCheck: {
    // How often to check connection health (milliseconds)
    checkInterval: 30000,
    
    // Timeout for health check operations (milliseconds)
    timeout: 2000,
    
    // Number of consecutive failures before marking unhealthy
    failureThreshold: 3,
    
    // Whether to perform periodic health checks
    enabled: true
  },

  // Communication settings
  communication: {
    // Default baud rate for new connections
    defaultBaudRate: 115200,
    
    // Available baud rates for selection
    availableBaudRates: [9600, 19200, 38400, 57600, 115200, 230400],
    
    // Data bits configuration
    dataBits: 8,
    
    // Stop bits configuration
    stopBits: 1,
    
    // Parity setting
    parity: 'none',
    
    // Flow control setting
    flowControl: false
  },

  // Error handling and recovery
  errorHandling: {
    // Whether to log connection errors
    logErrors: true,
    
    // Maximum number of error retries
    maxErrorRetries: 3,
    
    // Delay between error recovery attempts (milliseconds)
    errorRetryDelay: 2000,
    
    // Whether to reset connection on communication errors
    resetOnError: true
  },

  // Status and monitoring
  monitoring: {
    // How often to update connection status (milliseconds)
    statusUpdateInterval: 1000,
    
    // Whether to emit connection events
    emitEvents: true,
    
    // Maximum number of status history entries to keep
    maxStatusHistory: 100,
    
    // Whether to track connection metrics
    trackMetrics: true
  }
};

/**
 * Get connection configuration with environment overrides
 */
export function getConnectionConfig() {
  return {
    ...connectionConfig,
    connection: {
      ...connectionConfig.connection,
      connectTimeout: parseInt(process.env.CONNECTION_TIMEOUT) || connectionConfig.connection.connectTimeout,
      autoReconnect: process.env.AUTO_RECONNECT === 'true' || connectionConfig.connection.autoReconnect
    },
    communication: {
      ...connectionConfig.communication,
      defaultBaudRate: parseInt(process.env.DEFAULT_BAUD_RATE) || connectionConfig.communication.defaultBaudRate
    },
    healthCheck: {
      ...connectionConfig.healthCheck,
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false'
    }
  };
}

export default connectionConfig;