/**
 * Swagger/OpenAPI Configuration
 * 
 * Provides interactive API documentation using Swagger UI
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger configuration options
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CNC G-code Sender API',
      version: '1.0.0',
      description: `
REST API for CNC machine control and G-code execution. 

This API provides programmatic access to all CLI functionality including:
- Serial port connection management
- Machine status and diagnostics
- G-code command execution
- File management and processing
- Preset management

**Getting Started:**
1. List available ports: \`GET /api/v1/connection/ports\`
2. Connect to a port: \`POST /api/v1/connection/connect\`
3. Check machine status: \`GET /api/v1/machine/status\`
4. Execute G-code: \`POST /api/v1/gcode/execute\`

**Safety Note:** Always ensure your CNC machine is properly configured and safety measures are in place before executing G-code commands.
      `,
      contact: {
        name: 'CNC G-code Sender',
        url: 'https://github.com/your-repo/cnc-gcode-sender'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'API v1 base URL'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'API health and information endpoints'
      },
      {
        name: 'Connection',
        description: 'Serial port connection management'
      },
      {
        name: 'Machine',
        description: 'Machine status, limits, and control'
      },
      {
        name: 'G-code',
        description: 'G-code execution and queue management'
      },
      {
        name: 'Files',
        description: 'G-code file management'
      },
      {
        name: 'Presets',
        description: 'Preset command management'
      },
      {
        name: 'Help',
        description: 'Help information and command documentation'
      }
    ],
    components: {
      schemas: {
        // Standard response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indicates if the request was successful'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
              description: 'Human-readable success message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-06-24T12:00:00.000Z',
              description: 'ISO timestamp of the response'
            },
            execution_time_ms: {
              type: 'number',
              example: 45,
              description: 'Execution time in milliseconds'
            }
          },
          required: ['success', 'timestamp']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Always false for error responses'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                  description: 'Machine-readable error code'
                },
                message: {
                  type: 'string',
                  example: 'Request validation failed',
                  description: 'Human-readable error message'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details (development mode only)'
                }
              },
              required: ['code', 'message']
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-06-24T12:00:00.000Z'
            }
          },
          required: ['success', 'error', 'timestamp']
        },
        
        // Connection-related schemas
        SerialPort: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              example: '/dev/tty.usbmodem1101',
              description: 'Serial port device path'
            },
            manufacturer: {
              type: 'string',
              example: 'Arduino LLC',
              description: 'Port manufacturer (if available)'
            },
            serialNumber: {
              type: 'string',
              example: '557373333323512345',
              description: 'Serial number (if available)'
            },
            vendorId: {
              type: 'string',
              example: '2341',
              description: 'Vendor ID (if available)'
            },
            productId: {
              type: 'string',
              example: '0043',
              description: 'Product ID (if available)'
            }
          },
          required: ['path']
        },
        
        ConnectionStatus: {
          type: 'object',
          properties: {
            connected: {
              type: 'boolean',
              example: true,
              description: 'Whether a connection is active'
            },
            port: {
              type: 'string',
              nullable: true,
              example: '/dev/tty.usbmodem1101',
              description: 'Currently connected port path'
            },
            responseCallbacks: {
              type: 'number',
              example: 0,
              description: 'Number of pending response callbacks'
            }
          },
          required: ['connected', 'port']
        },
        
        ConnectRequest: {
          type: 'object',
          properties: {
            port: {
              type: 'string',
              example: '/dev/tty.usbmodem1101',
              description: 'Serial port path to connect to'
            }
          },
          required: ['port']
        },
        
        // Machine status schemas (Phase 2)
        MachineStatus: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              example: 'Idle',
              description: 'Current machine state'
            },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number', example: 0 },
                y: { type: 'number', example: 0 },
                z: { type: 'number', example: 0 }
              }
            },
            work_position: {
              type: 'object',
              properties: {
                x: { type: 'number', example: 0 },
                y: { type: 'number', example: 0 },
                z: { type: 'number', example: 0 }
              }
            }
          }
        },
        
        // G-code execution schemas (Phase 3)
        GcodeCommand: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              example: 'G0 X10',
              description: 'G-code command to execute'
            }
          },
          required: ['command']
        },
        
        ExecutionResult: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              example: 'G0 X10'
            },
            success: {
              type: 'boolean',
              example: true
            },
            response: {
              type: 'string',
              example: 'ok'
            },
            duration_ms: {
              type: 'number',
              example: 1250
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        GcodeExecutionResult: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              example: 'G0 X10 Y20'
            },
            response: {
              type: 'string',
              example: 'ok'
            },
            duration_ms: {
              type: 'number',
              example: 150
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            execution_details: {
              type: 'object',
              properties: {
                sent_at: {
                  type: 'number',
                  example: 1703422800000
                },
                completed_at: {
                  type: 'number',
                  example: 1703422800150
                },
                raw_response: {
                  type: 'string',
                  example: 'ok'
                }
              }
            }
          }
        },
        
        GcodeFileExecutionResult: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              example: '/Users/user/cnc/.gcode/app.gcode'
            },
            execution: {
              type: 'object',
              properties: {
                totalCommands: {
                  type: 'number',
                  example: 15
                },
                successful: {
                  type: 'number',
                  example: 15
                },
                failed: {
                  type: 'number',
                  example: 0
                },
                duration_ms: {
                  type: 'number',
                  example: 2500
                },
                completed_at: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  command: { type: 'string' },
                  success: { type: 'boolean' },
                  response: { type: 'string' },
                  error: { type: 'string', nullable: true },
                  duration_ms: { type: 'number' }
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                success_rate: {
                  type: 'string',
                  example: '100.0%'
                },
                average_command_time: {
                  type: 'string',
                  example: '167ms'
                },
                file_size_bytes: {
                  type: 'number',
                  example: 1024
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        GcodeFileValidationResult: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              example: '/Users/user/cnc/.gcode/app.gcode'
            },
            valid: {
              type: 'boolean',
              example: true
            },
            totalLines: {
              type: 'number',
              example: 43
            },
            executableCommands: {
              type: 'number',
              example: 15
            },
            fileSize: {
              type: 'number',
              example: 1024
            },
            preview: {
              type: 'array',
              items: { type: 'string' },
              example: ['G21', 'G90', 'M3 S8000', 'G0 X7.8', 'G0 Y95']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        ExecutionQueueStatus: {
          type: 'object',
          properties: {
            connected: {
              type: 'boolean',
              example: true
            },
            port: {
              type: 'string',
              example: '/dev/tty.usbmodem1101',
              nullable: true
            },
            commandsInQueue: {
              type: 'number',
              example: 5
            },
            isExecuting: {
              type: 'boolean',
              example: true
            },
            currentCommand: {
              type: 'string',
              example: 'G0 X15 Y25',
              nullable: true
            },
            queueStatus: {
              type: 'string',
              enum: ['active', 'empty'],
              example: 'active'
            },
            estimatedTime: {
              type: 'number',
              example: 30000,
              nullable: true,
              description: 'Estimated remaining time in milliseconds'
            },
            progress: {
              type: 'object',
              nullable: true,
              properties: {
                current: { type: 'number' },
                total: { type: 'number' },
                percentage: { type: 'number' }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        // File management schemas (Phase 4)
        FileListResult: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'app.gcode' },
                  path: { type: 'string', example: '.gcode/app.gcode' },
                  size: { type: 'number', example: 1024 },
                  sizeFormatted: { type: 'string', example: '1.00 KB' },
                  created: { type: 'string', format: 'date-time' },
                  modified: { type: 'string', format: 'date-time' },
                  extension: { type: 'string', example: '.gcode' },
                  type: { type: 'string', example: 'G-code' }
                }
              }
            },
            count: { type: 'number', example: 1 },
            directory: { type: 'string', example: '.gcode' },
            sort: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'name' },
                order: { type: 'string', example: 'asc' }
              }
            },
            totalSize: { type: 'number', example: 1024 },
            totalSizeFormatted: { type: 'string', example: '1.00 KB' }
          }
        },
        
        FileInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'app.gcode' },
            path: { type: 'string', example: '.gcode/app.gcode' },
            size: { type: 'number', example: 1024 },
            sizeFormatted: { type: 'string', example: '1.00 KB' },
            created: { type: 'string', format: 'date-time' },
            modified: { type: 'string', format: 'date-time' },
            extension: { type: 'string', example: '.gcode' },
            type: { type: 'string', example: 'G-code' },
            content: {
              type: 'object',
              properties: {
                totalLines: { type: 'number', example: 43 },
                executableLines: { type: 'number', example: 15 },
                commentLines: { type: 'number', example: 28 },
                preview: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['G21', 'G90', 'M3 S8000']
                },
                estimatedDuration: {
                  type: 'object',
                  properties: {
                    seconds: { type: 'number', example: 120 },
                    formatted: { type: 'string', example: '2m 0s' }
                  }
                }
              }
            }
          }
        },
        
        FileUploadResult: {
          type: 'object',
          properties: {
            filename: { type: 'string', example: 'app_1703422800000.gcode' },
            originalName: { type: 'string', example: 'app.gcode' },
            path: { type: 'string', example: '.gcode/app_1703422800000.gcode' },
            size: { type: 'number', example: 1024 },
            sizeFormatted: { type: 'string', example: '1.00 KB' },
            mimetype: { type: 'string', example: 'text/plain' },
            uploaded: { type: 'string', format: 'date-time' },
            description: { type: 'string', nullable: true },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['facing', 'production']
            },
            content: {
              type: 'object',
              properties: {
                totalLines: { type: 'number' },
                executableLines: { type: 'number' },
                commentLines: { type: 'number' },
                preview: {
                  type: 'array',
                  items: { type: 'string' }
                },
                estimatedDuration: {
                  type: 'object',
                  properties: {
                    seconds: { type: 'number' },
                    formatted: { type: 'string' }
                  }
                }
              }
            },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                errors: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        },
        
        FileUpdateResult: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            path: { type: 'string' },
            size: { type: 'number' },
            sizeFormatted: { type: 'string' },
            modified: { type: 'string', format: 'date-time' },
            description: { type: 'string', nullable: true },
            backup: { type: 'boolean' },
            content: {
              type: 'object',
              properties: {
                totalLines: { type: 'number' },
                executableLines: { type: 'number' },
                commentLines: { type: 'number' },
                estimatedDuration: {
                  type: 'object',
                  properties: {
                    seconds: { type: 'number' },
                    formatted: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        
        FileValidationResult: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            valid: { type: 'boolean' },
            errors: {
              type: 'array',
              items: { type: 'string' }
            },
            warnings: {
              type: 'array',
              items: { type: 'string' }
            },
            stats: {
              type: 'object',
              properties: {
                totalLines: { type: 'number' },
                executableLines: { type: 'number' },
                commentLines: { type: 'number' },
                estimatedDuration: {
                  type: 'object',
                  properties: {
                    seconds: { type: 'number' },
                    formatted: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        
        // Preset management schemas (Phase 4)
        PresetListResult: {
          type: 'object',
          properties: {
            presets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'homing_sequence' },
                  type: { type: 'string', enum: ['command', 'commands', 'file', 'mixed'], example: 'commands' },
                  valid: { type: 'boolean', example: true },
                  issues: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  commandCount: { type: 'number', example: 3 },
                  preview: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['$H', 'G92 X0 Y0 Z0', 'G0 Z5']
                  },
                  description: { type: 'string', example: '3 G-code commands' }
                }
              }
            },
            count: { type: 'number', example: 2 },
            valid: { type: 'number', example: 2 },
            invalid: { type: 'number', example: 0 }
          }
        },
        
        PresetInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'homing_sequence' },
            type: { type: 'string', example: 'commands' },
            definition: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'array',
                  items: { type: 'string' }
                }
              ],
              example: ['$H', 'G92 X0 Y0 Z0', 'G0 Z5']
            },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' }
                },
                commandCount: { type: 'number' }
              }
            },
            commands: {
              type: 'array',
              items: { type: 'string' }
            },
            description: { type: 'string' },
            estimatedDuration: {
              type: 'object',
              properties: {
                seconds: { type: 'number' },
                formatted: { type: 'string' }
              }
            }
          }
        },
        
        PresetCreateResult: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            definition: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'array',
                  items: { type: 'string' }
                }
              ]
            },
            description: { type: 'string', nullable: true },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' }
                },
                commandCount: { type: 'number' }
              }
            },
            commands: {
              type: 'array',
              items: { type: 'string' }
            },
            created: { type: 'string', format: 'date-time' }
          }
        },
        
        PresetUpdateResult: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            definition: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'array',
                  items: { type: 'string' }
                }
              ]
            },
            description: { type: 'string', nullable: true },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' }
                },
                commandCount: { type: 'number' }
              }
            },
            commands: {
              type: 'array',
              items: { type: 'string' }
            },
            backup: {
              description: 'Previous preset definition'
            },
            modified: { type: 'string', format: 'date-time' }
          }
        },
        
        PresetExecutionResult: {
          type: 'object',
          properties: {
            preset: { type: 'string' },
            execution: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                totalCommands: { type: 'number' },
                successful: { type: 'number' },
                failed: { type: 'number' },
                duration_ms: { type: 'number' },
                completed_at: { type: 'string', format: 'date-time' }
              }
            },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  command: { type: 'string' },
                  success: { type: 'boolean' },
                  response: { type: 'string', nullable: true },
                  error: { type: 'string', nullable: true }
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                success_rate: { type: 'string', example: '100.0%' },
                average_command_time: { type: 'string', example: '833ms' }
              }
            }
          }
        },
        
        PresetValidationResult: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' }
                },
                commandCount: { type: 'number' }
              }
            },
            commands: {
              type: 'array',
              items: { type: 'string' }
            },
            estimatedDuration: {
              type: 'object',
              properties: {
                seconds: { type: 'number' },
                formatted: { type: 'string' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        
        // Help and documentation schemas (Phase 5)
        HelpInfo: {
          type: 'object',
          properties: {
            api: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'CNC G-code Sender API' },
                version: { type: 'string', example: '1.0.0' },
                description: { type: 'string' },
                documentation: { type: 'string', example: '/api/v1/docs' },
                endpoints: {
                  type: 'object',
                  additionalProperties: { type: 'string' }
                }
              }
            },
            cli: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                commands: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CliCommand' }
                },
                safetyTips: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      tips: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                },
                configuration: {
                  type: 'object',
                  properties: {
                    machineLimits: { type: 'object' },
                    defaultPort: { type: 'string' },
                    gcodeFileExtensions: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            },
            quickStart: {
              type: 'object',
              properties: {
                steps: {
                  type: 'array',
                  items: { type: 'string' }
                },
                examples: {
                  type: 'object',
                  additionalProperties: { type: 'string' }
                }
              }
            },
            support: {
              type: 'object',
              properties: {
                documentation: { type: 'string' },
                repository: { type: 'string' },
                apiDocumentation: { type: 'string' },
                helpEndpoints: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        },
        
        CommandsList: {
          type: 'object',
          properties: {
            commands: {
              type: 'array',
              items: { $ref: '#/components/schemas/CliCommand' }
            },
            categorized: {
              type: 'object',
              properties: {
                connection: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CliCommand' }
                },
                machine: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CliCommand' }
                },
                gcode: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CliCommand' }
                },
                utility: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CliCommand' }
                }
              }
            },
            count: { type: 'number', example: 14 },
            categories: {
              type: 'array',
              items: { type: 'string' },
              example: ['connection', 'machine', 'gcode', 'utility']
            }
          }
        },
        
        CliCommand: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'connect' },
            syntax: { type: 'string', example: 'connect <port>' },
            description: { type: 'string', example: 'Connect to a serial port' },
            category: { 
              type: 'string', 
              enum: ['connection', 'machine', 'gcode', 'utility'],
              example: 'connection'
            },
            requiresConnection: { type: 'boolean', example: false },
            examples: {
              type: 'array',
              items: { type: 'string' },
              example: ['connect /dev/tty.usbmodem1101']
            },
            parameters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  required: { type: 'boolean' }
                }
              }
            },
            aliases: {
              type: 'array',
              items: { type: 'string' }
            },
            safety: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        
        CommandInfo: {
          allOf: [
            { $ref: '#/components/schemas/CliCommand' },
            {
              type: 'object',
              properties: {
                apiEquivalent: { 
                  type: 'string', 
                  example: 'POST /api/v1/connection/connect' 
                },
                usage: {
                  type: 'object',
                  properties: {
                    cli: { type: 'string', example: 'connect <port>' },
                    api: { type: 'string', example: 'POST /api/v1/connection/connect' }
                  }
                },
                safetyNotes: {
                  type: 'array',
                  items: { type: 'string' }
                },
                relatedCommands: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' }
                    }
                  }
                }
              }
            }
          ]
        }
      },
      
      responses: {
        SuccessResponse: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        ErrorResponse: {
          description: 'Error response',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ErrorResponse' },
                  {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'object',
                        properties: {
                          code: { example: 'VALIDATION_ERROR' },
                          message: { example: 'Request validation failed' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ErrorResponse' },
                  {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'object',
                        properties: {
                          code: { example: 'NOT_FOUND' },
                          message: { example: 'Resource not found' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ErrorResponse' },
                  {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'object',
                        properties: {
                          code: { example: 'INTERNAL_ERROR' },
                          message: { example: 'An unexpected error occurred' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  apis: [
    'src/ui/api/routes/*.js',
    'src/ui/api/features/*/routes.js',
    'src/ui/api/features/*/controller.js',
    'src/ui/api/docs/swagger.js'
  ]
};

/**
 * Generate Swagger specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b4151; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; }
  `,
  customSiteTitle: 'CNC G-code Sender API Documentation',
  customfavIcon: '/favicon.ico'
};

/**
 * Setup Swagger middleware
 */
export function setupSwagger(app) {
  // Serve swagger spec as JSON
  app.get('/api/v1/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // Serve Swagger UI
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  return app;
}