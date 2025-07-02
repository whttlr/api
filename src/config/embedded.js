/**
 * Embedded Mode Configuration
 * 
 * Configuration settings specifically for when the API runs embedded within Electron
 */

export const embeddedConfig = {
  // Disable certain features in embedded mode
  cors: {
    origin: ['http://localhost:5173', 'file://'],
    credentials: true
  },
  
  // Reduce logging in embedded mode
  logging: {
    level: process.env.EMBEDDED_MODE ? 'error' : 'info'
  },
  
  // Embedded-specific settings
  embedded: {
    enabled: process.env.EMBEDDED_MODE === 'true',
    parentProcess: process.ppid
  },

  // Modified security settings for embedded mode
  security: {
    helmet: {
      contentSecurityPolicy: process.env.EMBEDDED_MODE ? false : true,
      crossOriginEmbedderPolicy: process.env.EMBEDDED_MODE ? false : true
    }
  },

  // API server settings for embedded mode
  server: {
    // In embedded mode, we may want to be more restrictive about shutdown
    gracefulShutdown: process.env.EMBEDDED_MODE === 'true',
    // Timeout for graceful shutdown
    shutdownTimeout: 5000
  }
};

/**
 * Get configuration based on current mode
 */
export function getConfig() {
  const isEmbedded = process.env.EMBEDDED_MODE === 'true';
  
  return {
    ...embeddedConfig,
    mode: isEmbedded ? 'embedded' : 'standalone',
    isEmbedded
  };
}