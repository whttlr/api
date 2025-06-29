/**
 * Machine State Management System
 * 
 * Comprehensive state management for CNC machines using component-based architecture.
 * Orchestrates position tracking, work coordinate systems, tool management, and modal state.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';
import { PositionManager } from './PositionManager.js';
import { CoordinateSystemManager } from './CoordinateSystemManager.js';
import { ModalGroupManager } from './ModalGroupManager.js';
import { ToolManager } from './ToolManager.js';

export class MachineStateManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      persistState: true,                // Save state to disk
      stateFile: 'machine-state.json',   // State file path
      autoSave: true,                    // Auto-save on changes
      saveInterval: 5000,                // Auto-save interval (ms)
      validateState: true,               // Validate state changes
      trackHistory: true,                // Keep state change history
      historyLimit: 1000,               // Max history entries
      ...config
    };
    
    // Initialize component managers
    this.positionManager = new PositionManager(config.position || {});
    this.coordinateManager = new CoordinateSystemManager(config.coordinates || {});
    this.modalManager = new ModalGroupManager(config.modal || {});
    this.toolManager = new ToolManager(config.tool || {});
    
    // Set up component event forwarding
    this.setupComponentEvents();
    
    // Core machine state (simplified with components)
    this.state = {
      // Machine status
      status: {
        state: 'Unknown',                      // Machine state (Idle, Run, Hold, etc.)
        subState: null,                        // Sub-state (Hold:0, Door:1, etc.)
        isHomed: false,                        // Homing status
        isLocked: false,                       // Lock status
        hasAlarm: false,                       // Alarm status
        lastStatusUpdate: null
      },
      
      // Feed and spindle information
      motion: {
        feedRate: 0,                           // Current feed rate
        spindleSpeed: 0,                       // Current spindle speed
        spindleDirection: 'off'                // Spindle direction (cw, ccw, off)
      },
      
      // Program state
      program: {
        lineNumber: 0,                         // Current line number
        fileName: null,                        // Current file name
        isRunning: false,                      // Program running status
        isPaused: false,                       // Program paused status
        startTime: null,                       // Program start time
        estimatedCompletion: null              // Estimated completion time
      },
      
      // Limits and bounds
      limits: {
        soft: {
          min: { x: -200, y: -200, z: -100 },
          max: { x: 200, y: 200, z: 100 },
          enabled: false
        },
        hard: {
          triggered: { x: false, y: false, z: false }
        }
      },
      
      // Buffer and queue information
      buffer: {
        available: 127,                        // Available buffer space
        used: 0,                              // Used buffer space
        utilization: 0                        // Buffer utilization percentage
      }
    };
    
    // State change history
    this.stateHistory = [];
    
    // Auto-save timer
    this.autoSaveTimer = null;
    this.isDirty = false;
    
    this.initialize();
  }
  
  /**
   * Set up component event forwarding
   */
  setupComponentEvents() {
    // Forward position events
    this.positionManager.on('positionChanged', (data) => {
      this.markDirty();
      this.emit('positionChanged', data);
    });
    
    // Forward coordinate system events
    this.coordinateManager.on('workOffsetChanged', (data) => {
      this.markDirty();
      this.emit('workOffsetChanged', data);
    });
    
    this.coordinateManager.on('coordinateSystemChanged', (data) => {
      this.markDirty();
      this.emit('coordinateSystemChanged', data);
    });
    
    // Forward modal group events
    this.modalManager.on('modalGroupChanged', (data) => {
      this.markDirty();
      this.emit('modalGroupChanged', data);
    });
    
    // Forward tool events
    this.toolManager.on('toolChanged', (data) => {
      this.markDirty();
      this.emit('toolChanged', data);
    });
  }

  /**
   * Initialize state manager
   */
  async initialize() {
    try {
      // Load saved state if persistence is enabled
      if (this.config.persistState) {
        await this.loadState();
      }
      
      // Start auto-save timer
      if (this.config.autoSave) {
        this.startAutoSave();
      }
      
      debug('Machine state manager initialized');
      this.emit('initialized', { state: this.getState() });
      
    } catch (err) {
      error('Failed to initialize machine state manager', { error: err.message });
      throw err;
    }
  }

  /**
   * Update machine position
   */
  updatePosition(machinePos, workPos = null) {
    // Calculate work position using coordinate manager if not provided
    if (!workPos && machinePos) {
      const activeOffset = this.coordinateManager.getActiveWorkOffset();
      workPos = this.positionManager.calculateWorkPosition(machinePos, activeOffset);
    }
    
    // Update position via position manager
    const distance = this.positionManager.updatePosition(machinePos, workPos);
    
    this.addToHistory('position', {
      machinePos,
      workPos,
      distance
    });
  }

  /**
   * Update machine status
   */
  updateStatus(status, subState = null) {
    const previousStatus = { ...this.state.status };
    
    this.state.status.state = status;
    this.state.status.subState = subState;
    this.state.status.lastStatusUpdate = Date.now();
    
    // Update derived status flags
    this.state.status.isLocked = status === 'Alarm' && subState === 9;
    this.state.status.hasAlarm = status === 'Alarm';
    
    // Update program running status
    this.state.program.isRunning = status === 'Run';
    this.state.program.isPaused = status === 'Hold';
    
    this.markDirty();
    this.addToHistory('status', {
      from: previousStatus,
      to: this.state.status
    });
    
    // Emit specific events for important status changes
    if (previousStatus.state !== status) {
      this.emit('statusChanged', {
        from: previousStatus.state,
        to: status,
        subState
      });
      
      // Emit specific status events
      this.emit(`status:${status.toLowerCase()}`, {
        status,
        subState,
        timestamp: Date.now()
      });
    }
    
    debug('Status updated', { status, subState });
  }

  /**
   * Update modal group
   */
  updateModalGroup(group, value) {
    return this.modalManager.updateModalGroup(group, value);
  }

  /**
   * Update spindle state
   */
  updateSpindleState(mode, speed = null) {
    const previousMotion = { ...this.state.motion };
    
    // Update modal group
    this.modalManager.updateModalGroup('spindleMode', mode);
    
    if (speed !== null) {
      this.state.motion.spindleSpeed = speed;
    }
    
    // Determine spindle direction
    const direction = this.modalManager.getSpindleDirection(mode);
    this.state.motion.spindleDirection = direction;
    
    if (mode === 'M5') {
      this.state.motion.spindleSpeed = 0;
    }
    
    this.markDirty();
    this.addToHistory('spindle', {
      from: previousMotion,
      to: this.state.motion
    });
    
    this.emit('spindleChanged', {
      mode,
      speed: this.state.motion.spindleSpeed,
      direction: this.state.motion.spindleDirection
    });
  }

  /**
   * Update feed rate
   */
  updateFeedRate(feedRate) {
    const previousFeedRate = this.state.motion.feedRate;
    this.state.motion.feedRate = feedRate;
    
    this.markDirty();
    this.addToHistory('feedRate', { from: previousFeedRate, to: feedRate });
    this.emit('feedRateChanged', { from: previousFeedRate, to: feedRate });
    
    debug('Feed rate updated', { feedRate });
  }

  /**
   * Set work coordinate system
   */
  setWorkCoordinateSystem(system, offset) {
    this.coordinateManager.setWorkCoordinateSystem(system, offset);
    
    // Recalculate work position if this is the active system
    if (system === this.coordinateManager.getActiveCoordinateSystem()) {
      const currentPos = this.positionManager.getPosition();
      this.updatePosition(currentPos.machine);
    }
  }

  /**
   * Switch active coordinate system
   */
  switchCoordinateSystem(system) {
    this.coordinateManager.switchCoordinateSystem(system);
    
    // Recalculate work position
    const currentPos = this.positionManager.getPosition();
    this.updatePosition(currentPos.machine);
  }

  /**
   * Update tool information
   */
  updateTool(toolNumber, toolInfo = {}) {
    this.toolManager.changeTool(toolNumber, toolInfo);
  }

  /**
   * Update program information
   */
  updateProgram(programInfo) {
    const previousProgram = { ...this.state.program };
    
    Object.keys(programInfo).forEach(key => {
      if (this.state.program.hasOwnProperty(key)) {
        this.state.program[key] = programInfo[key];
      }
    });
    
    // Set start time when program starts running
    if (programInfo.isRunning && !previousProgram.isRunning) {
      this.state.program.startTime = Date.now();
    }
    
    this.markDirty();
    this.addToHistory('program', { from: previousProgram, to: this.state.program });
    this.emit('programChanged', { from: previousProgram, to: this.state.program });
  }

  /**
   * Update buffer information
   */
  updateBuffer(bufferInfo) {
    const previousBuffer = { ...this.state.buffer };
    
    Object.assign(this.state.buffer, bufferInfo);
    
    // Calculate utilization
    const total = this.state.buffer.available + this.state.buffer.used;
    this.state.buffer.utilization = total > 0 ? (this.state.buffer.used / total) * 100 : 0;
    
    this.markDirty();
    this.emit('bufferChanged', { from: previousBuffer, to: this.state.buffer });
  }

  /**
   * Set homing status
   */
  setHomingStatus(isHomed, homePosition = null) {
    const wasHomed = this.state.status.isHomed;
    this.state.status.isHomed = isHomed;
    
    if (isHomed && homePosition) {
      this.updatePosition(homePosition);
    }
    
    this.markDirty();
    this.addToHistory('homing', { from: wasHomed, to: isHomed, position: homePosition });
    this.emit('homingStatusChanged', { isHomed, wasHomed, homePosition });
    
    if (isHomed) {
      info('Machine homed successfully');
    }
  }

  /**
   * Parse and update state from GRBL status
   */
  parseGrblStatus(statusResponse) {
    if (!statusResponse || !statusResponse.raw) {
      return;
    }
    
    const statusText = statusResponse.raw;
    
    // Parse main status
    const statusMatch = statusText.match(/<([^|]+)\|([^>]+)>/);
    if (!statusMatch) {
      return;
    }
    
    const state = statusMatch[1];
    const statusData = statusMatch[2];
    
    // Update status
    const stateMatch = state.match(/([^:]+):?(\d+)?/);
    if (stateMatch) {
      this.updateStatus(stateMatch[1], stateMatch[2] ? parseInt(stateMatch[2]) : null);
    }
    
    // Parse position data
    const posMatch = statusData.match(/MPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (posMatch) {
      const machinePos = {
        x: parseFloat(posMatch[1]),
        y: parseFloat(posMatch[2]),
        z: parseFloat(posMatch[3])
      };
      
      // Parse work position if present
      const wposMatch = statusData.match(/WPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      let workPos = null;
      if (wposMatch) {
        workPos = {
          x: parseFloat(wposMatch[1]),
          y: parseFloat(wposMatch[2]),
          z: parseFloat(wposMatch[3])
        };
      }
      
      this.updatePosition(machinePos, workPos);
    }
    
    // Parse feed and spindle
    const feedSpindleMatch = statusData.match(/FS:(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (feedSpindleMatch) {
      this.updateFeedRate(parseFloat(feedSpindleMatch[1]));
      this.state.motion.spindleSpeed = parseFloat(feedSpindleMatch[2]);
    }
    
    // Parse buffer info
    const bufferMatch = statusData.match(/Bf:(\d+),(\d+)/);
    if (bufferMatch) {
      this.updateBuffer({
        available: parseInt(bufferMatch[1]),
        used: parseInt(bufferMatch[2])
      });
    }
    
    // Parse line number
    const lineMatch = statusData.match(/Ln:(\d+)/);
    if (lineMatch) {
      this.updateProgram({ lineNumber: parseInt(lineMatch[1]) });
    }
    
    // Parse work coordinate offset
    const wcoMatch = statusData.match(/WCO:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (wcoMatch) {
      const offset = {
        x: parseFloat(wcoMatch[1]),
        y: parseFloat(wcoMatch[2]),
        z: parseFloat(wcoMatch[3])
      };
      
      this.setWorkCoordinateSystem(this.coordinateManager.getActiveCoordinateSystem(), offset);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      ...JSON.parse(JSON.stringify(this.state)),
      position: this.positionManager.getPosition(),
      workCoordinateSystems: this.coordinateManager.getAllCoordinateSystems(),
      activeCoordinateSystem: this.coordinateManager.getActiveCoordinateSystem(),
      modalGroups: this.modalManager.getAllModalGroups(),
      tool: this.toolManager.getCurrentTool()
    };
  }

  /**
   * Get specific state section
   */
  getStateSection(section) {
    const fullState = this.getState();
    if (!fullState.hasOwnProperty(section)) {
      throw new Error(`Invalid state section: ${section}`);
    }
    
    return JSON.parse(JSON.stringify(fullState[section]));
  }

  /**
   * Calculate distance between two positions
   */
  calculateDistance(pos1, pos2) {
    return this.positionManager.calculateDistance(pos1, pos2);
  }

  /**
   * Add entry to state history
   */
  addToHistory(type, change) {
    if (!this.config.trackHistory) {
      return;
    }
    
    const historyEntry = {
      timestamp: Date.now(),
      type,
      change
    };
    
    this.stateHistory.push(historyEntry);
    
    // Limit history size
    if (this.stateHistory.length > this.config.historyLimit) {
      this.stateHistory = this.stateHistory.slice(-Math.floor(this.config.historyLimit / 2));
    }
    
    this.emit('stateHistoryAdded', historyEntry);
  }

  /**
   * Mark state as dirty for auto-save
   */
  markDirty() {
    this.isDirty = true;
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.isDirty) {
        this.saveState().catch(err => {
          warn('Auto-save failed', { error: err.message });
        });
      }
    }, this.config.saveInterval);
  }

  /**
   * Save state to disk
   */
  async saveState() {
    if (!this.config.persistState) {
      return;
    }
    
    try {
      const stateData = {
        state: this.getState(),
        componentData: {
          position: this.positionManager.exportData(),
          coordinates: this.coordinateManager.exportData(),
          modal: this.modalManager.exportData(),
          tool: this.toolManager.exportData()
        },
        history: this.config.trackHistory ? this.stateHistory.slice(-100) : [],
        savedAt: Date.now(),
        version: '2.0'
      };
      
      await fs.writeFile(this.config.stateFile, JSON.stringify(stateData, null, 2));
      this.isDirty = false;
      
      debug('State saved successfully');
      this.emit('stateSaved', { file: this.config.stateFile });
      
    } catch (err) {
      error('Failed to save state', { error: err.message, file: this.config.stateFile });
      throw err;
    }
  }

  /**
   * Load state from disk
   */
  async loadState() {
    try {
      const data = await fs.readFile(this.config.stateFile, 'utf-8');
      const stateData = JSON.parse(data);
      
      if (stateData.state) {
        // Load core state
        Object.keys(this.state).forEach(key => {
          if (stateData.state[key]) {
            this.state[key] = { ...this.state[key], ...stateData.state[key] };
          }
        });
      }
      
      // Load component data if available (v2.0 format)
      if (stateData.componentData) {
        this.positionManager.importData(stateData.componentData.position);
        this.coordinateManager.importData(stateData.componentData.coordinates);
        this.modalManager.importData(stateData.componentData.modal);
        this.toolManager.importData(stateData.componentData.tool);
      }
      
      if (stateData.history && this.config.trackHistory) {
        this.stateHistory = stateData.history || [];
      }
      
      debug('State loaded successfully');
      this.emit('stateLoaded', { file: this.config.stateFile });
      
    } catch (err) {
      if (err.code === 'ENOENT') {
        debug('No existing state file found, using defaults');
      } else {
        warn('Failed to load state', { error: err.message, file: this.config.stateFile });
      }
    }
  }

  /**
   * Reset state to defaults
   */
  resetState() {
    // Reset core state
    this.state = {
      status: {
        state: 'Unknown',
        subState: null,
        isHomed: false,
        isLocked: false,
        hasAlarm: false,
        lastStatusUpdate: null
      },
      motion: {
        feedRate: 0,
        spindleSpeed: 0,
        spindleDirection: 'off'
      },
      program: {
        lineNumber: 0,
        fileName: null,
        isRunning: false,
        isPaused: false,
        startTime: null,
        estimatedCompletion: null
      },
      limits: {
        soft: {
          min: { x: -200, y: -200, z: -100 },
          max: { x: 200, y: 200, z: 100 },
          enabled: false
        },
        hard: {
          triggered: { x: false, y: false, z: false }
        }
      },
      buffer: {
        available: 127,
        used: 0,
        utilization: 0
      }
    };
    
    // Reset components
    this.positionManager.resetPosition();
    this.coordinateManager.resetAllCoordinateSystems();
    this.modalManager.resetModalGroups();
    this.toolManager.resetTool();
    
    this.stateHistory = [];
    this.isDirty = true;
    
    info('Machine state reset to defaults');
    this.emit('stateReset');
  }

  /**
   * Get state history
   */
  getHistory(limit = 100) {
    return this.stateHistory.slice(-limit);
  }


  /**
   * Export state for backup
   */
  exportState() {
    return {
      state: this.getState(),
      componentData: {
        position: this.positionManager.exportData(),
        coordinates: this.coordinateManager.exportData(),
        modal: this.modalManager.exportData(),
        tool: this.toolManager.exportData()
      },
      history: this.stateHistory,
      exportedAt: Date.now(),
      version: '2.0'
    };
  }

  /**
   * Import state from backup
   */
  importState(stateData) {
    if (!stateData || !stateData.state) {
      throw new Error('Invalid state data');
    }
    
    // Import core state
    Object.keys(this.state).forEach(key => {
      if (stateData.state[key]) {
        this.state[key] = { ...this.state[key], ...stateData.state[key] };
      }
    });
    
    // Import component data if available
    if (stateData.componentData) {
      this.positionManager.importData(stateData.componentData.position);
      this.coordinateManager.importData(stateData.componentData.coordinates);
      this.modalManager.importData(stateData.componentData.modal);
      this.toolManager.importData(stateData.componentData.tool);
    }
    
    if (stateData.history && this.config.trackHistory) {
      this.stateHistory = stateData.history || [];
    }
    
    this.isDirty = true;
    
    info('State imported successfully');
    this.emit('stateImported', { version: stateData.version });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    // Save final state
    if (this.isDirty && this.config.persistState) {
      this.saveState().catch(err => {
        warn('Final state save failed', { error: err.message });
      });
    }
    
    // Clean up components
    this.positionManager.removeAllListeners();
    this.coordinateManager.removeAllListeners();
    this.modalManager.removeAllListeners();
    this.toolManager.removeAllListeners();
    
    this.removeAllListeners();
  }
}