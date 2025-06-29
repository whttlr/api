/**
 * Look-Ahead Buffer for G-code Optimization
 * 
 * Analyzes upcoming G-code commands to optimize motion planning,
 * reduce stops/starts, and improve overall machining performance.
 */

import { EventEmitter } from 'events';
import { debug, warn } from '../../lib/logger/LoggerService.js';

export class LookAheadBuffer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      bufferSize: 15,                  // Lines to look ahead
      enableOptimization: true,        // Enable motion optimization
      enableFeedRateOptimization: true, // Optimize feed rates
      enableSpindleOptimization: true, // Optimize spindle changes
      minSegmentLength: 0.1,           // Minimum segment length (mm)
      cornerThreshold: 0.5,            // Corner detection threshold
      accelerationLimit: 1000,         // Max acceleration (mm/min²)
      jerkLimit: 500,                  // Max jerk (mm/min³)
      ...config
    };
    
    this.buffer = [];
    this.currentPosition = { x: 0, y: 0, z: 0 };
    this.currentFeedRate = 0;
    this.currentSpindleSpeed = 0;
    this.optimizationStats = {
      linesAnalyzed: 0,
      optimizationsApplied: 0,
      feedRateOptimizations: 0,
      spindleOptimizations: 0,
      motionOptimizations: 0
    };
  }

  /**
   * Initialize the buffer with command queue
   */
  initialize(commandQueue) {
    this.commandQueue = commandQueue;
    this.buffer = [];
    this.currentIndex = 0;
    
    debug('LookAheadBuffer initialized', {
      totalCommands: commandQueue.length,
      bufferSize: this.config.bufferSize
    });
  }

  /**
   * Get optimized command for given index
   */
  getOptimizedCommand(index) {
    if (!this.config.enableOptimization || !this.commandQueue) {
      return null;
    }

    try {
      // Fill buffer if needed
      this.fillBuffer(index);
      
      // Find command in buffer
      const bufferCommand = this.buffer.find(cmd => cmd.originalIndex === index);
      if (!bufferCommand) {
        return null;
      }

      // Apply optimizations
      const optimizedCommand = this.applyOptimizations(bufferCommand, index);
      
      if (optimizedCommand) {
        this.optimizationStats.optimizationsApplied++;
      }

      return optimizedCommand;
      
    } catch (err) {
      warn('Error in look-ahead optimization', {
        index,
        error: err.message
      });
      return null;
    }
  }

  /**
   * Fill buffer with upcoming commands
   */
  fillBuffer(startIndex) {
    // Clear old buffer entries
    this.buffer = this.buffer.filter(cmd => cmd.originalIndex >= startIndex);
    
    // Add new commands to buffer
    const endIndex = Math.min(startIndex + this.config.bufferSize, this.commandQueue.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      if (!this.buffer.find(cmd => cmd.originalIndex === i)) {
        const command = this.commandQueue[i];
        if (command) {
          const parsedCommand = this.parseCommand(command.command, i);
          if (parsedCommand) {
            this.buffer.push(parsedCommand);
          }
        }
      }
    }
    
    // Sort buffer by index
    this.buffer.sort((a, b) => a.originalIndex - b.originalIndex);
  }

  /**
   * Parse G-code command for optimization
   */
  parseCommand(command, index) {
    const cleanCommand = command.trim().toUpperCase();
    
    if (!cleanCommand || cleanCommand.startsWith(';') || cleanCommand.startsWith('(')) {
      return null; // Skip comments
    }

    const parsed = {
      originalIndex: index,
      original: command,
      command: cleanCommand,
      type: 'unknown',
      parameters: {},
      position: { ...this.currentPosition },
      feedRate: this.currentFeedRate,
      spindleSpeed: this.currentSpindleSpeed
    };

    // Parse command type
    if (cleanCommand.includes('G0')) {
      parsed.type = 'rapid';
    } else if (cleanCommand.includes('G1')) {
      parsed.type = 'linear';
    } else if (cleanCommand.includes('G2')) {
      parsed.type = 'arc_cw';
    } else if (cleanCommand.includes('G3')) {
      parsed.type = 'arc_ccw';
    } else if (cleanCommand.includes('G4')) {
      parsed.type = 'dwell';
    } else if (cleanCommand.includes('M3') || cleanCommand.includes('M4')) {
      parsed.type = 'spindle_on';
    } else if (cleanCommand.includes('M5')) {
      parsed.type = 'spindle_off';
    } else if (cleanCommand.includes('F')) {
      parsed.type = 'feed_rate';
    } else if (cleanCommand.includes('S')) {
      parsed.type = 'spindle_speed';
    }

    // Parse parameters
    this.parseParameters(cleanCommand, parsed);
    
    // Update current state for next command
    this.updateCurrentState(parsed);
    
    this.optimizationStats.linesAnalyzed++;
    
    return parsed;
  }

  /**
   * Parse command parameters
   */
  parseParameters(command, parsed) {
    const paramRegex = /([XYZIJKFSR])(-?\d*\.?\d+)/g;
    let match;
    
    while ((match = paramRegex.exec(command)) !== null) {
      const param = match[1];
      const value = parseFloat(match[2]);
      
      parsed.parameters[param] = value;
      
      // Update position if coordinate
      if (['X', 'Y', 'Z'].includes(param)) {
        parsed.position[param.toLowerCase()] = value;
      } else if (param === 'F') {
        parsed.feedRate = value;
      } else if (param === 'S') {
        parsed.spindleSpeed = value;
      }
    }
  }

  /**
   * Update current machine state
   */
  updateCurrentState(parsed) {
    if (parsed.parameters.X !== undefined) this.currentPosition.x = parsed.parameters.X;
    if (parsed.parameters.Y !== undefined) this.currentPosition.y = parsed.parameters.Y;
    if (parsed.parameters.Z !== undefined) this.currentPosition.z = parsed.parameters.Z;
    if (parsed.parameters.F !== undefined) this.currentFeedRate = parsed.parameters.F;
    if (parsed.parameters.S !== undefined) this.currentSpindleSpeed = parsed.parameters.S;
  }

  /**
   * Apply optimizations to command
   */
  applyOptimizations(command, index) {
    let optimized = { ...command };
    let hasOptimizations = false;

    // Apply different optimization strategies
    if (this.config.enableFeedRateOptimization) {
      const feedOptimization = this.optimizeFeedRate(command, index);
      if (feedOptimization) {
        optimized = { ...optimized, ...feedOptimization };
        hasOptimizations = true;
        this.optimizationStats.feedRateOptimizations++;
      }
    }

    if (this.config.enableSpindleOptimization) {
      const spindleOptimization = this.optimizeSpindle(command, index);
      if (spindleOptimization) {
        optimized = { ...optimized, ...spindleOptimization };
        hasOptimizations = true;
        this.optimizationStats.spindleOptimizations++;
      }
    }

    const motionOptimization = this.optimizeMotion(command, index);
    if (motionOptimization) {
      optimized = { ...optimized, ...motionOptimization };
      hasOptimizations = true;
      this.optimizationStats.motionOptimizations++;
    }

    return hasOptimizations ? optimized : null;
  }

  /**
   * Optimize feed rate based on upcoming moves
   */
  optimizeFeedRate(command, index) {
    if (!['linear', 'arc_cw', 'arc_ccw'].includes(command.type)) {
      return null;
    }

    // Look at next few moves
    const upcomingMoves = this.buffer
      .filter(cmd => cmd.originalIndex > index && cmd.originalIndex <= index + 5)
      .filter(cmd => ['linear', 'arc_cw', 'arc_ccw'].includes(cmd.type));

    if (upcomingMoves.length === 0) {
      return null;
    }

    // Calculate optimal feed rate based on geometry
    const segments = [command, ...upcomingMoves];
    const optimalFeedRate = this.calculateOptimalFeedRate(segments);

    if (optimalFeedRate && Math.abs(optimalFeedRate - command.feedRate) > 10) {
      return {
        command: this.updateCommandFeedRate(command.command, optimalFeedRate),
        metadata: {
          optimization: 'feed_rate',
          originalFeedRate: command.feedRate,
          optimizedFeedRate: optimalFeedRate
        }
      };
    }

    return null;
  }

  /**
   * Calculate optimal feed rate for motion segments
   */
  calculateOptimalFeedRate(segments) {
    if (segments.length < 2) return null;

    let totalDistance = 0;
    let minCornerSpeed = Infinity;

    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];

      // Calculate segment distance
      const distance = this.calculateDistance(current.position, next.position);
      totalDistance += distance;

      // Calculate corner speed limitation
      const cornerAngle = this.calculateCornerAngle(
        i > 0 ? segments[i - 1].position : null,
        current.position,
        next.position
      );

      if (cornerAngle !== null && cornerAngle < Math.PI - this.config.cornerThreshold) {
        const cornerSpeed = this.calculateCornerSpeed(cornerAngle, distance);
        minCornerSpeed = Math.min(minCornerSpeed, cornerSpeed);
      }
    }

    // Return feed rate limited by corner speed and acceleration
    const baseFeedRate = segments[0].feedRate || this.currentFeedRate;
    return minCornerSpeed < Infinity ? 
      Math.min(baseFeedRate, minCornerSpeed) : 
      baseFeedRate;
  }

  /**
   * Optimize spindle commands
   */
  optimizeSpindle(command, index) {
    if (!['spindle_on', 'spindle_off', 'spindle_speed'].includes(command.type)) {
      return null;
    }

    // Look ahead for conflicting spindle commands
    const nextSpindleCommand = this.buffer.find(cmd => 
      cmd.originalIndex > index && 
      ['spindle_on', 'spindle_off', 'spindle_speed'].includes(cmd.type)
    );

    // If there's a conflicting command soon, we might optimize
    if (nextSpindleCommand && nextSpindleCommand.originalIndex - index <= 3) {
      // Skip redundant spindle changes
      if (command.type === 'spindle_on' && nextSpindleCommand.type === 'spindle_off') {
        return {
          command: '; Optimized out redundant spindle on/off',
          metadata: {
            optimization: 'spindle_redundant',
            originalCommand: command.command
          }
        };
      }
    }

    return null;
  }

  /**
   * Optimize motion commands
   */
  optimizeMotion(command, index) {
    if (!['rapid', 'linear'].includes(command.type)) {
      return null;
    }

    // Look for micro-movements that can be combined
    const nextMove = this.buffer.find(cmd => 
      cmd.originalIndex === index + 1 && 
      ['rapid', 'linear'].includes(cmd.type)
    );

    if (nextMove) {
      const currentDistance = this.calculateDistance(
        command.position,
        { x: command.parameters.X || command.position.x,
          y: command.parameters.Y || command.position.y,
          z: command.parameters.Z || command.position.z }
      );

      // Combine micro-segments
      if (currentDistance < this.config.minSegmentLength) {
        const combinedMove = this.combineMovements(command, nextMove);
        if (combinedMove) {
          return {
            command: combinedMove,
            metadata: {
              optimization: 'micro_segment_combine',
              originalDistance: currentDistance
            }
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const dx = (point2.x || 0) - (point1.x || 0);
    const dy = (point2.y || 0) - (point1.y || 0);
    const dz = (point2.z || 0) - (point1.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate corner angle between three points
   */
  calculateCornerAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return null;

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return null;

    return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
  }

  /**
   * Calculate optimal corner speed
   */
  calculateCornerSpeed(angle, distance) {
    // Simplified corner speed calculation
    const sharpness = Math.PI - angle;
    const baseSpeed = this.currentFeedRate || 1000;
    return baseSpeed * Math.max(0.1, 1 - (sharpness / Math.PI));
  }

  /**
   * Update command with new feed rate
   */
  updateCommandFeedRate(command, feedRate) {
    // Remove existing F parameter and add new one
    let updated = command.replace(/F\d*\.?\d+/g, '');
    return `${updated.trim()} F${feedRate}`;
  }

  /**
   * Combine two movement commands
   */
  combineMovements(move1, move2) {
    if (move1.type !== move2.type) return null;

    const endX = move2.parameters.X !== undefined ? move2.parameters.X : move2.position.x;
    const endY = move2.parameters.Y !== undefined ? move2.parameters.Y : move2.position.y;
    const endZ = move2.parameters.Z !== undefined ? move2.parameters.Z : move2.position.z;
    
    const feedRate = move2.feedRate || move1.feedRate;
    
    let combined = `${move1.type === 'rapid' ? 'G0' : 'G1'}`;
    
    if (endX !== move1.position.x) combined += ` X${endX}`;
    if (endY !== move1.position.y) combined += ` Y${endY}`;
    if (endZ !== move1.position.z) combined += ` Z${endZ}`;
    if (move1.type === 'linear' && feedRate) combined += ` F${feedRate}`;
    
    return combined;
  }

  /**
   * Get buffer status
   */
  getStatus() {
    return {
      bufferSize: this.buffer.length,
      maxBufferSize: this.config.bufferSize,
      currentIndex: this.currentIndex,
      optimizationStats: { ...this.optimizationStats },
      currentPosition: { ...this.currentPosition },
      currentFeedRate: this.currentFeedRate,
      currentSpindleSpeed: this.currentSpindleSpeed
    };
  }

  /**
   * Clear buffer
   */
  clear() {
    this.buffer = [];
    this.currentIndex = 0;
    this.currentPosition = { x: 0, y: 0, z: 0 };
    this.currentFeedRate = 0;
    this.currentSpindleSpeed = 0;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.clear();
    this.removeAllListeners();
  }
}