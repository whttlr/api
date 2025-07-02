/**
 * Machine Feature Schemas
 * 
 * Request and response validation schemas for machine operations.
 * Provides consistent data structures for machine-related API endpoints.
 */

/**
 * Machine status response schema
 */
export const MachineStatusSchema = {
  type: 'object',
  properties: {
    state: {
      type: 'string',
      enum: ['Idle', 'Run', 'Hold', 'Jog', 'Alarm', 'Door', 'Check', 'Home', 'Sleep'],
      description: 'Current machine state',
      example: 'Idle'
    },
    position: {
      type: 'object',
      properties: {
        x: { type: 'number', example: 0.000 },
        y: { type: 'number', example: 0.000 },
        z: { type: 'number', example: 0.000 }
      },
      description: 'Machine position coordinates',
      required: ['x', 'y', 'z']
    },
    work_position: {
      type: 'object',
      properties: {
        x: { type: 'number', example: 0.000 },
        y: { type: 'number', example: 0.000 },
        z: { type: 'number', example: 0.000 }
      },
      description: 'Work coordinate system position',
      required: ['x', 'y', 'z']
    },
    feed_rate: {
      type: 'number',
      description: 'Current feed rate',
      example: 0
    },
    spindle_speed: {
      type: 'number',
      description: 'Current spindle speed',
      example: 0
    }
  },
  required: ['state', 'position']
};

/**
 * Machine limits response schema
 */
export const MachineLimitsSchema = {
  type: 'object',
  properties: {
    x: {
      type: 'object',
      properties: {
        min: { type: 'number', example: -100 },
        max: { type: 'number', example: 100 }
      },
      required: ['min', 'max']
    },
    y: {
      type: 'object',
      properties: {
        min: { type: 'number', example: -100 },
        max: { type: 'number', example: 100 }
      },
      required: ['min', 'max']
    },
    z: {
      type: 'object',
      properties: {
        min: { type: 'number', example: -40 },
        max: { type: 'number', example: 40 }
      },
      required: ['min', 'max']
    },
    softLimitsEnabled: {
      type: 'boolean',
      description: 'Whether soft limits are enabled',
      example: true
    },
    hardLimitsEnabled: {
      type: 'boolean',
      description: 'Whether hard limits are enabled',
      example: true
    },
    homingEnabled: {
      type: 'boolean',
      description: 'Whether homing cycle is enabled',
      example: true
    }
  },
  required: ['x', 'y', 'z']
};

/**
 * Diagnostics result response schema
 */
export const DiagnosticsResultSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['completed', 'failed', 'partial'],
      description: 'Overall diagnostics status',
      example: 'completed'
    },
    tests_passed: {
      type: 'integer',
      description: 'Number of tests that passed',
      example: 5
    },
    tests_failed: {
      type: 'integer',
      description: 'Number of tests that failed',
      example: 0
    },
    execution_time_ms: {
      type: 'integer',
      description: 'Total execution time in milliseconds',
      example: 2500
    },
    tests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Test name',
            example: 'Movement Test'
          },
          status: {
            type: 'string',
            enum: ['passed', 'failed', 'skipped'],
            example: 'passed'
          },
          duration_ms: {
            type: 'integer',
            description: 'Test execution time in milliseconds',
            example: 500
          },
          details: {
            type: 'string',
            description: 'Additional test details',
            example: 'All movement commands executed successfully'
          }
        },
        required: ['name', 'status']
      }
    }
  },
  required: ['status', 'tests_passed', 'tests_failed']
};

/**
 * Command execution result schema
 */
export const ExecutionResultSchema = {
  type: 'object',
  properties: {
    command: {
      type: 'string',
      description: 'Executed command',
      example: '$X'
    },
    response: {
      type: 'string',
      description: 'Machine response',
      example: 'ok'
    },
    duration_ms: {
      type: 'integer',
      description: 'Command execution time in milliseconds',
      example: 45
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Execution timestamp',
      example: '2024-06-24T12:00:00.000Z'
    }
  },
  required: ['command', 'response', 'timestamp']
};

/**
 * Machine health status schema
 */
export const MachineHealthSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['healthy', 'unhealthy'],
      description: 'Overall health status',
      example: 'healthy'
    },
    connection: {
      type: 'object',
      properties: {
        connected: {
          type: 'boolean',
          description: 'Connection status',
          example: true
        },
        port: {
          type: 'string',
          nullable: true,
          description: 'Connected port name',
          example: '/dev/tty.usbmodem1101'
        }
      },
      required: ['connected']
    },
    machine: {
      type: 'object',
      properties: {
        statusAvailable: {
          type: 'boolean',
          description: 'Whether machine status is available',
          example: true
        },
        state: {
          type: 'string',
          description: 'Current machine state',
          example: 'Idle'
        },
        responsive: {
          type: 'boolean',
          description: 'Whether machine is responding to queries',
          example: true
        },
        error: {
          type: 'string',
          description: 'Error message if not responsive',
          example: 'Connection timeout'
        },
        reason: {
          type: 'string',
          description: 'Reason for unavailability',
          example: 'Not connected'
        }
      },
      required: ['statusAvailable', 'responsive']
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Health check timestamp',
      example: '2024-06-24T12:00:00.000Z'
    }
  },
  required: ['status', 'connection', 'machine', 'timestamp']
};

/**
 * Request validation schemas (currently no request bodies for machine endpoints)
 */
export const MachineRequestSchemas = {
  // All current machine endpoints use GET or POST without request bodies
  // Future endpoints with request bodies can be added here
};