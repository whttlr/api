/**
 * Health Feature Configuration
 * 
 * Configuration settings for API and system health monitoring.
 * Controls health check behavior, thresholds, and reporting.
 */

/**
 * Health monitoring configuration
 */
export const healthConfig = {
  // Basic health check settings
  basic: {
    // Whether to include uptime in basic health checks
    includeUptime: true,
    
    // Whether to include memory usage
    includeMemoryUsage: true,
    
    // Whether to include timestamp
    includeTimestamp: true,
    
    // Whether to include version information
    includeVersion: true,
    
    // Cache duration for basic health data (milliseconds)
    cacheDuration: 5000
  },

  // Detailed health check settings
  detailed: {
    // Whether to enable detailed health checks
    enabled: true,
    
    // How often to update detailed health data (milliseconds)
    updateInterval: 30000,
    
    // Whether to include system metrics
    includeSystemMetrics: true,
    
    // Whether to include component status
    includeComponentStatus: true,
    
    // Whether to include performance metrics
    includePerformanceMetrics: true,
    
    // Cache duration for detailed health data (milliseconds)
    cacheDuration: 10000
  },

  // System monitoring settings
  system: {
    // CPU usage monitoring
    cpu: {
      // Whether to monitor CPU usage
      enabled: true,
      
      // Warning threshold (percentage)
      warningThreshold: 70,
      
      // Critical threshold (percentage)
      criticalThreshold: 90,
      
      // Sampling interval (milliseconds)
      samplingInterval: 1000,
      
      // Number of samples for averaging
      sampleCount: 5
    },

    // Memory usage monitoring
    memory: {
      // Whether to monitor memory usage
      enabled: true,
      
      // Warning threshold (percentage)
      warningThreshold: 80,
      
      // Critical threshold (percentage)
      criticalThreshold: 95,
      
      // Whether to include detailed memory breakdown
      includeBreakdown: true
    },

    // Disk space monitoring
    disk: {
      // Whether to monitor disk space
      enabled: true,
      
      // Warning threshold (percentage)
      warningThreshold: 85,
      
      // Critical threshold (percentage)
      criticalThreshold: 95,
      
      // Paths to monitor
      pathsToMonitor: ['./', './uploads', './logs']
    }
  },

  // Component health monitoring
  components: {
    // API server health
    api: {
      // Whether to monitor API health
      enabled: true,
      
      // Response time warning threshold (milliseconds)
      responseTimeWarning: 1000,
      
      // Response time critical threshold (milliseconds)
      responseTimeCritical: 5000,
      
      // Whether to check endpoint availability
      checkEndpoints: false,
      
      // Endpoints to check for health
      endpointsToCheck: ['/api/v1/health']
    },

    // Connection health
    connection: {
      // Whether to monitor connection health
      enabled: true,
      
      // Connection timeout threshold (milliseconds)
      timeoutThreshold: 5000,
      
      // Whether to test connection responsiveness
      testResponsiveness: true,
      
      // Response time warning threshold (milliseconds)
      responseTimeWarning: 2000,
      
      // Response time critical threshold (milliseconds)
      responseTimeCritical: 10000
    },

    // Machine health
    machine: {
      // Whether to monitor machine health
      enabled: true,
      
      // Whether machine must be connected for healthy status
      requireConnection: false,
      
      // Command response timeout (milliseconds)
      commandTimeout: 5000,
      
      // Whether to send test commands
      sendTestCommands: false,
      
      // Test command to use
      testCommand: '?'
    }
  },

  // Performance monitoring
  performance: {
    // Whether to track performance metrics
    enabled: true,
    
    // Request tracking
    requests: {
      // Whether to track request metrics
      enabled: true,
      
      // Maximum number of requests to track
      maxTrackedRequests: 1000,
      
      // Time window for metrics (milliseconds)
      timeWindow: 300000, // 5 minutes
      
      // Whether to track by endpoint
      trackByEndpoint: true
    },

    // Response time tracking
    responseTimes: {
      // Whether to track response times
      enabled: true,
      
      // Warning threshold (milliseconds)
      warningThreshold: 1000,
      
      // Critical threshold (milliseconds)
      criticalThreshold: 5000,
      
      // Number of samples for averaging
      sampleCount: 100
    },

    // Error rate tracking
    errorRates: {
      // Whether to track error rates
      enabled: true,
      
      // Warning threshold (percentage)
      warningThreshold: 5,
      
      // Critical threshold (percentage)
      criticalThreshold: 10,
      
      // Time window for error rate calculation (milliseconds)
      timeWindow: 300000 // 5 minutes
    }
  },

  // Health status determination
  status: {
    // Overall health determination strategy: 'worst', 'majority', 'weighted'
    strategy: 'worst',
    
    // Component weights for weighted strategy
    componentWeights: {
      api: 0.3,
      connection: 0.3,
      machine: 0.2,
      system: 0.2
    },
    
    // Status levels: healthy, degraded, unhealthy, unknown
    levels: {
      healthy: 'All systems operating normally',
      degraded: 'Some non-critical issues detected',
      unhealthy: 'Critical issues affecting functionality',
      unknown: 'Unable to determine system status'
    },
    
    // How long to cache overall status (milliseconds)
    cacheDuration: 5000
  },

  // Alerting and notifications
  alerting: {
    // Whether to enable alerting
    enabled: false,
    
    // Alert channels: 'log', 'webhook', 'email'
    channels: ['log'],
    
    // Webhook URL for alerts
    webhookUrl: process.env.HEALTH_WEBHOOK_URL,
    
    // Email settings for alerts
    email: {
      to: process.env.HEALTH_ALERT_EMAIL,
      from: 'noreply@cnc-system.local',
      subject: 'CNC System Health Alert'
    },
    
    // Alert thresholds
    thresholds: {
      // Send alert when status becomes degraded
      alertOnDegraded: true,
      
      // Send alert when status becomes unhealthy
      alertOnUnhealthy: true,
      
      // Minimum time between alerts (milliseconds)
      alertCooldown: 300000 // 5 minutes
    }
  }
};

/**
 * Get health configuration with environment overrides
 */
export function getHealthConfig() {
  return {
    ...healthConfig,
    detailed: {
      ...healthConfig.detailed,
      enabled: process.env.DETAILED_HEALTH_ENABLED !== 'false',
      updateInterval: parseInt(process.env.HEALTH_UPDATE_INTERVAL) || healthConfig.detailed.updateInterval
    },
    system: {
      ...healthConfig.system,
      cpu: {
        ...healthConfig.system.cpu,
        enabled: process.env.CPU_MONITORING_ENABLED !== 'false',
        warningThreshold: parseInt(process.env.CPU_WARNING_THRESHOLD) || healthConfig.system.cpu.warningThreshold,
        criticalThreshold: parseInt(process.env.CPU_CRITICAL_THRESHOLD) || healthConfig.system.cpu.criticalThreshold
      },
      memory: {
        ...healthConfig.system.memory,
        enabled: process.env.MEMORY_MONITORING_ENABLED !== 'false',
        warningThreshold: parseInt(process.env.MEMORY_WARNING_THRESHOLD) || healthConfig.system.memory.warningThreshold,
        criticalThreshold: parseInt(process.env.MEMORY_CRITICAL_THRESHOLD) || healthConfig.system.memory.criticalThreshold
      }
    },
    alerting: {
      ...healthConfig.alerting,
      enabled: process.env.HEALTH_ALERTING_ENABLED === 'true',
      webhookUrl: process.env.HEALTH_WEBHOOK_URL,
      email: {
        ...healthConfig.alerting.email,
        to: process.env.HEALTH_ALERT_EMAIL || healthConfig.alerting.email.to
      }
    }
  };
}

/**
 * Validate health configuration
 */
export function validateHealthConfig(config = healthConfig) {
  const errors = [];

  // Validate thresholds
  if (config.system.cpu.warningThreshold >= config.system.cpu.criticalThreshold) {
    errors.push('CPU warning threshold must be less than critical threshold');
  }

  if (config.system.memory.warningThreshold >= config.system.memory.criticalThreshold) {
    errors.push('Memory warning threshold must be less than critical threshold');
  }

  // Validate performance settings
  if (config.performance.requests.maxTrackedRequests <= 0) {
    errors.push('Maximum tracked requests must be greater than 0');
  }

  if (config.performance.responseTimes.sampleCount <= 0) {
    errors.push('Response time sample count must be greater than 0');
  }

  // Validate status strategy
  const validStrategies = ['worst', 'majority', 'weighted'];
  if (!validStrategies.includes(config.status.strategy)) {
    errors.push(`Status strategy must be one of: ${validStrategies.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default healthConfig;