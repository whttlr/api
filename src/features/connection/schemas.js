/**
 * Connection Feature Schemas
 * 
 * Request/response validation schemas for connection endpoints.
 */

import { throwError } from '../../shared/middleware/errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { getApiMessages } from '../../config/messages.js';

/**
 * Validate connection request body
 */
export const validateConnection = (req, res, next) => {
  const { port } = req.body;
  const messages = getApiMessages(req.language || 'en');
  
  // Check if port is provided
  if (!port) {
    return throwError(
      ErrorCodes.VALIDATION_ERROR,
      messages.connection.errors.port_required,
      null,
      400
    );
  }
  
  // Check if port is a string
  if (typeof port !== 'string') {
    return throwError(
      ErrorCodes.VALIDATION_ERROR,
      messages.connection.errors.port_invalid_type,
      null,
      400
    );
  }
  // /dev/tty.usbmodem1101
  // Check port format (basic validation)
  // const portRegex = /^(\/dev\/|COM)\w+$/i;
  // if (!portRegex.test(port)) {
  //   return throwError(
  //     ErrorCodes.VALIDATION_ERROR,
  //     messages.connection.errors.port_invalid_format,
  //     null,
  //     400
  //   );
  // }
  
  next();
};

/**
 * Connection response schemas for documentation
 */
export const ConnectionSchemas = {
  Port: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Serial port path',
        example: '/dev/ttyUSB0'
      },
      manufacturer: {
        type: 'string',
        description: 'Port manufacturer',
        example: 'Arduino LLC'
      },
      serialNumber: {
        type: 'string',
        description: 'Device serial number'
      },
      vendorId: {
        type: 'string',
        description: 'USB vendor ID'
      },
      productId: {
        type: 'string',
        description: 'USB product ID'
      }
    }
  },

  ConnectionStatus: {
    type: 'object',
    properties: {
      connected: {
        type: 'boolean',
        description: 'Whether currently connected to a port'
      },
      port: {
        type: 'string',
        nullable: true,
        description: 'Currently connected port path'
      },
      responseCallbacks: {
        type: 'integer',
        description: 'Number of pending response callbacks'
      }
    }
  },

  HealthStatus: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['healthy', 'degraded', 'unhealthy'],
        description: 'Overall health status'
      },
      connection: {
        type: 'object',
        properties: {
          connected: { type: 'boolean' },
          port: { type: 'string', nullable: true }
        }
      },
      system: {
        type: 'object',
        properties: {
          portsAvailable: { type: 'boolean' },
          portCount: { type: 'integer' }
        }
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Health check timestamp'
      }
    }
  }
};