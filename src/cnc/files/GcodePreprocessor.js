/**
 * G-code Preprocessor
 * 
 * Validates, optimizes, and prepares G-code files for streaming execution.
 * Handles file parsing, command validation, and metadata extraction.
 */

import { promises as fs } from 'fs';
import { EventEmitter } from 'events';
import { debug, warn, error } from '../../lib/logger/LoggerService.js';

export class GcodePreprocessor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxFileSize: 50 * 1024 * 1024,      // 50MB max file size
      maxLines: 100000,                   // Max lines per file
      stripComments: false,               // Remove comments during processing
      validateSyntax: true,               // Validate G-code syntax
      calculateTotalDistance: true,       // Calculate total movement distance
      estimateTime: true,                 // Estimate execution time
      defaultFeedRate: 100,               // Default feed rate for estimation
      defaultSpindleSpeed: 1000,          // Default spindle speed
      safeZHeight: 5.0,                   // Safe Z height for tool changes
      ...config
    };
    
    this.validGCodes = new Set([
      'G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G18', 'G19', 'G20', 'G21',
      'G28', 'G30', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G40', 'G41', 'G42',
      'G43', 'G49', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59',
      'G80', 'G81', 'G82', 'G83', 'G85', 'G89', 'G90', 'G91', 'G92',
      'G93', 'G94', 'G98', 'G99'
    ]);
    
    this.validMCodes = new Set([
      'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9',
      'M30', 'M48', 'M49'
    ]);
  }

  /**
   * Process a G-code file
   */
  async processFile(filePath, options = {}) {
    try {
      debug(`Processing G-code file: ${filePath}`);
      
      // Check file exists and size
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size ${stats.size} exceeds maximum ${this.config.maxFileSize}`);
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      const rawLines = content.split('\n');
      
      if (rawLines.length > this.config.maxLines) {
        throw new Error(`File has ${rawLines.length} lines, exceeds maximum ${this.config.maxLines}`);
      }

      // Process lines
      const processed = await this.processLines(rawLines, filePath, options);
      
      // Calculate metadata
      const metadata = await this.calculateMetadata(processed.lines, filePath);
      
      const result = {
        success: true,
        filePath,
        originalLineCount: rawLines.length,
        processedLineCount: processed.lines.length,
        lines: processed.lines,
        warnings: processed.warnings,
        errors: processed.errors,
        metadata,
        estimatedTime: metadata.estimatedTime,
        totalDistance: metadata.totalDistance
      };
      
      debug('G-code file processed successfully', {
        file: filePath,
        lines: result.processedLineCount,
        warnings: result.warnings.length,
        errors: result.errors.length
      });
      
      return result;
      
    } catch (err) {
      error('Failed to process G-code file', {
        file: filePath,
        error: err.message
      });
      
      return {
        success: false,
        error: err.message,
        filePath
      };
    }
  }

  /**
   * Process individual lines
   */
  async processLines(rawLines, filePath, options = {}) {
    const lines = [];
    const warnings = [];
    const errors = [];
    
    let lineNumber = 0;
    let currentPosition = { x: 0, y: 0, z: 0 };
    let currentFeedRate = this.config.defaultFeedRate;
    let currentSpindleSpeed = this.config.defaultSpindleSpeed;
    
    for (const rawLine of rawLines) {
      lineNumber++;
      
      try {
        const processed = this.processLine(
          rawLine, 
          lineNumber, 
          { currentPosition, currentFeedRate, currentSpindleSpeed },
          options
        );
        
        if (processed) {
          // Update state
          if (processed.position) {
            currentPosition = { ...currentPosition, ...processed.position };
          }
          if (processed.feedRate !== undefined) {
            currentFeedRate = processed.feedRate;
          }
          if (processed.spindleSpeed !== undefined) {
            currentSpindleSpeed = processed.spindleSpeed;
          }
          
          lines.push(processed);
          
          // Collect warnings
          if (processed.warnings) {
            warnings.push(...processed.warnings.map(w => ({
              line: lineNumber,
              message: w,
              original: rawLine.trim()
            })));
          }
        }
        
      } catch (err) {
        errors.push({
          line: lineNumber,
          message: err.message,
          original: rawLine.trim()
        });
        
        if (options.stopOnError) {
          break;
        }
      }
    }
    
    return { lines, warnings, errors };
  }

  /**
   * Process a single line
   */
  processLine(rawLine, lineNumber, state, options = {}) {
    let line = rawLine.trim();
    
    // Skip empty lines
    if (!line) return null;
    
    // Handle comments
    let comment = null;
    if (line.includes(';')) {
      const parts = line.split(';');
      line = parts[0].trim();
      comment = parts.slice(1).join(';').trim();
    }
    
    if (line.startsWith('(') && line.endsWith(')')) {
      comment = line.slice(1, -1);
      line = '';
    }
    
    // Skip comment-only lines unless preserving
    if (!line && comment && this.config.stripComments) {
      return null;
    }
    
    // Return comment-only line
    if (!line && comment) {
      return {
        lineNumber,
        original: rawLine.trim(),
        command: `;${comment}`,
        type: 'comment',
        comment
      };
    }
    
    // Process G-code command
    if (line) {
      const processed = this.parseGcodeCommand(line, lineNumber, state);
      
      if (comment && !this.config.stripComments) {
        processed.comment = comment;
        processed.command += ` ;${comment}`;
      }
      
      return processed;
    }
    
    return null;
  }

  /**
   * Parse G-code command
   */
  parseGcodeCommand(command, lineNumber, state) {
    const upperCommand = command.toUpperCase();
    const warnings = [];
    
    // Validate syntax if enabled
    if (this.config.validateSyntax) {
      const validationWarnings = this.validateCommand(upperCommand);
      warnings.push(...validationWarnings);
    }
    
    // Parse parameters
    const parameters = this.parseParameters(upperCommand);
    
    // Determine command type
    const type = this.determineCommandType(upperCommand, parameters);
    
    // Calculate position changes
    const position = {};
    if (parameters.X !== undefined) position.x = parameters.X;
    if (parameters.Y !== undefined) position.y = parameters.Y;
    if (parameters.Z !== undefined) position.z = parameters.Z;
    
    // Extract feed rate and spindle speed
    const feedRate = parameters.F;
    const spindleSpeed = parameters.S;
    
    // Calculate distance for movement commands
    let distance = 0;
    if (['rapid', 'linear', 'arc'].includes(type) && Object.keys(position).length > 0) {
      const newPos = { ...state.currentPosition, ...position };
      distance = this.calculateDistance(state.currentPosition, newPos);
    }
    
    return {
      lineNumber,
      original: command,
      command: upperCommand,
      type,
      parameters,
      position: Object.keys(position).length > 0 ? position : undefined,
      feedRate,
      spindleSpeed,
      distance,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        estimatedTime: this.estimateCommandTime(type, distance, feedRate || state.currentFeedRate),
        hasMotion: distance > 0,
        isModalCommand: this.isModalCommand(upperCommand)
      }
    };
  }

  /**
   * Parse command parameters
   */
  parseParameters(command) {
    const parameters = {};
    const paramRegex = /([XYZIJKFRSPT])(-?\d*\.?\d+)/g;
    let match;
    
    while ((match = paramRegex.exec(command)) !== null) {
      const param = match[1];
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        parameters[param] = value;
      }
    }
    
    return parameters;
  }

  /**
   * Determine command type
   */
  determineCommandType(command, parameters) {
    if (command.includes('G0')) return 'rapid';
    if (command.includes('G1')) return 'linear';
    if (command.includes('G2')) return 'arc_cw';
    if (command.includes('G3')) return 'arc_ccw';
    if (command.includes('G4')) return 'dwell';
    if (command.includes('G28') || command.includes('G30')) return 'home';
    if (command.includes('M3') || command.includes('M4')) return 'spindle_on';
    if (command.includes('M5')) return 'spindle_off';
    if (command.includes('M6')) return 'tool_change';
    if (command.includes('M0') || command.includes('M1')) return 'pause';
    if (command.includes('M2') || command.includes('M30')) return 'program_end';
    if (command.match(/G[12][0-9]/)) return 'coordinate_system';
    if (command.match(/G[89][0-9]/)) return 'canned_cycle';
    
    // Check for parameter-only commands
    if (parameters.F && !command.match(/G[0-3]/)) return 'feed_rate';
    if (parameters.S && !command.match(/M[3-5]/)) return 'spindle_speed';
    
    return 'other';
  }

  /**
   * Validate G-code command syntax
   */
  validateCommand(command) {
    const warnings = [];
    
    // Check for valid G-codes
    const gCodeMatch = command.match(/G(\d+(?:\.\d+)?)/g);
    if (gCodeMatch) {
      for (const gCode of gCodeMatch) {
        if (!this.validGCodes.has(gCode)) {
          warnings.push(`Unknown G-code: ${gCode}`);
        }
      }
    }
    
    // Check for valid M-codes
    const mCodeMatch = command.match(/M(\d+)/g);
    if (mCodeMatch) {
      for (const mCode of mCodeMatch) {
        if (!this.validMCodes.has(mCode)) {
          warnings.push(`Unknown M-code: ${mCode}`);
        }
      }
    }
    
    // Check for missing parameters on arc commands
    if (command.includes('G2') || command.includes('G3')) {
      if (!command.includes('I') && !command.includes('J') && !command.includes('R')) {
        warnings.push('Arc command missing center point (I,J) or radius (R)');
      }
    }
    
    // Check for negative feed rates
    const feedMatch = command.match(/F(-?\d*\.?\d+)/);
    if (feedMatch && parseFloat(feedMatch[1]) <= 0) {
      warnings.push('Feed rate must be positive');
    }
    
    return warnings;
  }

  /**
   * Check if command is modal (affects subsequent commands)
   */
  isModalCommand(command) {
    return command.match(/G[0-3]|G1[7-9]|G2[01]|G[48-9][0-9]|M[3-9]/);
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Estimate command execution time
   */
  estimateCommandTime(type, distance, feedRate) {
    switch (type) {
      case 'rapid':
        // Assume rapid moves at 5000 mm/min
        return distance > 0 ? (distance / 5000) * 60000 : 100; // ms
        
      case 'linear':
      case 'arc_cw':
      case 'arc_ccw':
        return distance > 0 && feedRate > 0 ? (distance / feedRate) * 60000 : 100;
        
      case 'dwell':
        return 1000; // Default 1 second
        
      case 'spindle_on':
      case 'spindle_off':
        return 500; // Spindle command delay
        
      case 'tool_change':
        return 5000; // Tool change time
        
      case 'pause':
        return 0; // User-dependent
        
      default:
        return 50; // Small delay for other commands
    }
  }

  /**
   * Calculate file metadata
   */
  async calculateMetadata(lines, filePath) {
    let totalDistance = 0;
    let totalTime = 0;
    let minPosition = { x: 0, y: 0, z: 0 };
    let maxPosition = { x: 0, y: 0, z: 0 };
    let currentPosition = { x: 0, y: 0, z: 0 };
    
    const operationCounts = {
      rapid: 0,
      linear: 0,
      arc: 0,
      dwell: 0,
      spindle: 0,
      toolChange: 0,
      other: 0
    };
    
    const toolsUsed = new Set();
    let hasSpindleCommands = false;
    let hasCoolantCommands = false;
    
    for (const line of lines) {
      if (line.type === 'comment') continue;
      
      // Update position
      if (line.position) {
        currentPosition = { ...currentPosition, ...line.position };
        
        // Update bounds
        minPosition.x = Math.min(minPosition.x, currentPosition.x);
        minPosition.y = Math.min(minPosition.y, currentPosition.y);
        minPosition.z = Math.min(minPosition.z, currentPosition.z);
        maxPosition.x = Math.max(maxPosition.x, currentPosition.x);
        maxPosition.y = Math.max(maxPosition.y, currentPosition.y);
        maxPosition.z = Math.max(maxPosition.z, currentPosition.z);
      }
      
      // Accumulate distance and time
      if (line.distance) {
        totalDistance += line.distance;
      }
      if (line.metadata?.estimatedTime) {
        totalTime += line.metadata.estimatedTime;
      }
      
      // Count operations
      if (operationCounts[line.type] !== undefined) {
        operationCounts[line.type]++;
      } else {
        operationCounts.other++;
      }
      
      // Track tools
      if (line.parameters?.T) {
        toolsUsed.add(line.parameters.T);
      }
      
      // Track feature usage
      if (line.type.includes('spindle')) {
        hasSpindleCommands = true;
      }
      if (line.command.includes('M7') || line.command.includes('M8') || line.command.includes('M9')) {
        hasCoolantCommands = true;
      }
    }
    
    return {
      totalDistance,
      estimatedTime: totalTime,
      bounds: {
        min: minPosition,
        max: maxPosition,
        size: {
          x: maxPosition.x - minPosition.x,
          y: maxPosition.y - minPosition.y,
          z: maxPosition.z - minPosition.z
        }
      },
      operationCounts,
      toolsUsed: Array.from(toolsUsed),
      features: {
        hasSpindleCommands,
        hasCoolantCommands,
        hasArcs: operationCounts.arc > 0,
        hasToolChanges: operationCounts.toolChange > 0
      },
      complexity: this.calculateComplexity(operationCounts, totalDistance, lines.length)
    };
  }

  /**
   * Calculate file complexity score
   */
  calculateComplexity(operations, distance, lineCount) {
    let score = 0;
    
    // Base complexity from line count
    score += Math.min(lineCount / 1000, 10);
    
    // Motion complexity
    score += operations.arc * 0.5; // Arcs are more complex
    score += operations.linear * 0.1;
    score += operations.rapid * 0.05;
    
    // Feature complexity
    score += operations.toolChange * 2;
    score += operations.spindle * 0.2;
    score += operations.dwell * 0.1;
    
    // Distance factor
    if (distance > 1000) score += 2;
    else if (distance > 100) score += 1;
    
    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Validate entire file structure
   */
  validateFile(lines) {
    const issues = [];
    
    // Check for program start/end
    const hasStart = lines.some(line => 
      line.command?.includes('G17') || line.command?.includes('G90'));
    const hasEnd = lines.some(line => 
      line.command?.includes('M30') || line.command?.includes('M2'));
    
    if (!hasStart) {
      issues.push('File missing typical program start commands (G17, G90, etc.)');
    }
    if (!hasEnd) {
      issues.push('File missing program end command (M30 or M2)');
    }
    
    // Check for tool changes without spindle stops
    let spindleRunning = false;
    for (const line of lines) {
      if (line.type === 'spindle_on') {
        spindleRunning = true;
      } else if (line.type === 'spindle_off') {
        spindleRunning = false;
      } else if (line.type === 'tool_change' && spindleRunning) {
        issues.push(`Tool change at line ${line.lineNumber} while spindle running`);
      }
    }
    
    return issues;
  }
}