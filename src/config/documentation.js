/**
 * API Documentation Configuration
 * 
 * Swagger/OpenAPI documentation settings.
 */

import { serverConfig } from './server.js';

export const documentationConfig = {
  swagger: {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'CNC G-code Sender API',
        version: '1.0.0',
        description: 'REST API for CNC machine control via G-code commands',
        contact: {
          name: 'CNC G-code Sender',
          url: 'https://github.com/your-repo/gcode-sender'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: `http://${serverConfig.host}:${serverConfig.port}/api/v1`,
          description: 'Development server'
        }
      ],
      tags: [
        {
          name: 'Connection',
          description: 'Serial port connection management'
        },
        {
          name: 'Machine',
          description: 'Machine status and control'
        },
        {
          name: 'G-code',
          description: 'G-code command execution'
        },
        {
          name: 'Files',
          description: 'G-code file management'
        },
        {
          name: 'Presets',
          description: 'Machine configuration presets'
        },
        {
          name: 'Health',
          description: 'System health and diagnostics'
        }
      ],
      components: {
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: { type: 'string', nullable: true }
                }
              },
              timestamp: { type: 'string', format: 'date-time' }
            }
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    apis: [
      './src/features/*/routes.js',
      './src/features/*/schemas.js'
    ]
  },
  
  // UI configuration
  ui: {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2c3e50; }
    `,
    customSiteTitle: 'CNC G-code Sender API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    }
  },
  
  // API info endpoint configuration
  info: {
    service: 'CNC G-code Sender API',
    version: '1.0.0',
    description: 'REST API for controlling CNC machines via G-code commands',
    features: [
      'Serial port connection management',
      'Real-time machine status monitoring',
      'G-code command execution',
      'File upload and processing',
      'Alarm detection and recovery',
      'Comprehensive diagnostics'
    ],
    endpoints: {
      connection: '/api/v1/connection',
      machine: '/api/v1/machine',
      gcode: '/api/v1/gcode',
      files: '/api/v1/files',
      presets: '/api/v1/presets',
      health: '/api/v1/health'
    }
  }
};