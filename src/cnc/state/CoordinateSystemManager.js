/**
 * Coordinate System Manager
 * 
 * Handles work coordinate systems (G54-G59), coordinate transformations,
 * and work offset management for CNC machines.
 */

import { EventEmitter } from 'events';
import { debug, info, warn } from '../../lib/logger/LoggerService.js';

export class CoordinateSystemManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      coordinateSystems: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
      defaultSystem: 'G54',
      validateOffsets: true,
      trackChanges: true,
      ...config
    };
    
    // Initialize coordinate systems
    this.workCoordinateSystems = {};
    this.config.coordinateSystems.forEach(system => {
      this.workCoordinateSystems[system] = { x: 0, y: 0, z: 0 };
    });
    
    this.activeCoordinateSystem = this.config.defaultSystem;
    this.changeHistory = [];
  }
  
  /**
   * Set work coordinate system offset
   */
  setWorkCoordinateSystem(system, offset) {
    if (!this.validateCoordinateSystem(system)) {
      throw new Error(`Invalid coordinate system: ${system}`);
    }
    
    if (!this.validateOffset(offset)) {
      throw new Error(`Invalid offset values: ${JSON.stringify(offset)}`);
    }
    
    const previousOffset = { ...this.workCoordinateSystems[system] };
    this.workCoordinateSystems[system] = { ...offset };
    
    // Track change history
    if (this.config.trackChanges) {
      this.addChangeToHistory('offset', system, previousOffset, offset);
    }
    
    this.emit('workOffsetChanged', {
      system,
      from: previousOffset,
      to: offset
    });
    
    info('Work coordinate system updated', { system, offset });
    
    return true;
  }
  
  /**
   * Get work coordinate system offset
   */
  getWorkCoordinateSystem(system) {
    if (!this.validateCoordinateSystem(system)) {
      throw new Error(`Invalid coordinate system: ${system}`);
    }
    
    return { ...this.workCoordinateSystems[system] };
  }
  
  /**
   * Switch active coordinate system
   */
  switchCoordinateSystem(system) {
    if (!this.validateCoordinateSystem(system)) {
      throw new Error(`Invalid coordinate system: ${system}`);
    }
    
    const previousSystem = this.activeCoordinateSystem;
    this.activeCoordinateSystem = system;
    
    // Track change history
    if (this.config.trackChanges) {
      this.addChangeToHistory('active', system, previousSystem, system);
    }
    
    this.emit('coordinateSystemChanged', {
      from: previousSystem,
      to: system
    });
    
    info('Active coordinate system changed', { from: previousSystem, to: system });
    
    return true;
  }
  
  /**
   * Get active coordinate system
   */
  getActiveCoordinateSystem() {
    return this.activeCoordinateSystem;
  }
  
  /**
   * Get active work offset
   */
  getActiveWorkOffset() {
    return this.getWorkCoordinateSystem(this.activeCoordinateSystem);
  }
  
  /**
   * Get all coordinate systems
   */
  getAllCoordinateSystems() {
    const systems = {};
    Object.keys(this.workCoordinateSystems).forEach(system => {
      systems[system] = { ...this.workCoordinateSystems[system] };
    });
    return systems;
  }
  
  /**
   * Reset coordinate system to zero
   */
  resetCoordinateSystem(system) {
    if (!this.validateCoordinateSystem(system)) {
      throw new Error(`Invalid coordinate system: ${system}`);
    }
    
    this.setWorkCoordinateSystem(system, { x: 0, y: 0, z: 0 });
    info('Coordinate system reset', { system });
  }
  
  /**
   * Reset all coordinate systems
   */
  resetAllCoordinateSystems() {
    this.config.coordinateSystems.forEach(system => {
      this.workCoordinateSystems[system] = { x: 0, y: 0, z: 0 };
    });
    
    info('All coordinate systems reset');
    this.emit('allCoordinateSystemsReset');
  }
  
  /**
   * Copy coordinate system
   */
  copyCoordinateSystem(fromSystem, toSystem) {
    if (!this.validateCoordinateSystem(fromSystem) || !this.validateCoordinateSystem(toSystem)) {
      throw new Error(`Invalid coordinate system: ${fromSystem} or ${toSystem}`);
    }
    
    const offset = this.getWorkCoordinateSystem(fromSystem);
    this.setWorkCoordinateSystem(toSystem, offset);
    
    info('Coordinate system copied', { from: fromSystem, to: toSystem, offset });
  }
  
  /**
   * Transform position from one coordinate system to another
   */
  transformPosition(position, fromSystem, toSystem) {
    if (!this.validateCoordinateSystem(fromSystem) || !this.validateCoordinateSystem(toSystem)) {
      throw new Error(`Invalid coordinate systems: ${fromSystem} or ${toSystem}`);
    }
    
    if (!this.validateOffset(position)) {
      throw new Error(`Invalid position: ${JSON.stringify(position)}`);
    }
    
    const fromOffset = this.getWorkCoordinateSystem(fromSystem);
    const toOffset = this.getWorkCoordinateSystem(toSystem);
    
    // Convert to machine coordinates, then to target work coordinates
    const machinePos = {
      x: position.x + fromOffset.x,
      y: position.y + fromOffset.y,
      z: position.z + fromOffset.z
    };
    
    const transformedPos = {
      x: machinePos.x - toOffset.x,
      y: machinePos.y - toOffset.y,
      z: machinePos.z - toOffset.z
    };
    
    debug('Position transformed', {
      from: fromSystem,
      to: toSystem,
      original: position,
      transformed: transformedPos
    });
    
    return transformedPos;
  }
  
  /**
   * Convert work position to machine position
   */
  workToMachine(workPos, system = null) {
    const coordSystem = system || this.activeCoordinateSystem;
    const offset = this.getWorkCoordinateSystem(coordSystem);
    
    return {
      x: workPos.x + offset.x,
      y: workPos.y + offset.y,
      z: workPos.z + offset.z
    };
  }
  
  /**
   * Convert machine position to work position
   */
  machineToWork(machinePos, system = null) {
    const coordSystem = system || this.activeCoordinateSystem;
    const offset = this.getWorkCoordinateSystem(coordSystem);
    
    return {
      x: machinePos.x - offset.x,
      y: machinePos.y - offset.y,
      z: machinePos.z - offset.z
    };
  }
  
  /**
   * Validate coordinate system name
   */
  validateCoordinateSystem(system) {
    return this.config.coordinateSystems.includes(system);
  }
  
  /**
   * Validate offset values
   */
  validateOffset(offset) {
    if (!this.config.validateOffsets) return true;
    
    if (!offset || typeof offset !== 'object') {
      return false;
    }
    
    const requiredProps = ['x', 'y', 'z'];
    return requiredProps.every(prop => 
      typeof offset[prop] === 'number' && !isNaN(offset[prop])
    );
  }
  
  /**
   * Add change to history
   */
  addChangeToHistory(type, system, from, to) {
    const change = {
      timestamp: Date.now(),
      type,
      system,
      from,
      to
    };
    
    this.changeHistory.push(change);
    
    // Limit history size
    if (this.changeHistory.length > 100) {
      this.changeHistory = this.changeHistory.slice(-50);
    }
  }
  
  /**
   * Get change history
   */
  getChangeHistory(limit = 20) {
    return this.changeHistory.slice(-limit);
  }
  
  /**
   * Export coordinate system data
   */
  exportData() {
    return {
      workCoordinateSystems: this.getAllCoordinateSystems(),
      activeCoordinateSystem: this.activeCoordinateSystem,
      changeHistory: [...this.changeHistory]
    };
  }
  
  /**
   * Import coordinate system data
   */
  importData(data) {
    if (data.workCoordinateSystems) {
      Object.keys(data.workCoordinateSystems).forEach(system => {
        if (this.validateCoordinateSystem(system)) {
          const offset = data.workCoordinateSystems[system];
          if (this.validateOffset(offset)) {
            this.workCoordinateSystems[system] = { ...offset };
          }
        }
      });
    }
    
    if (data.activeCoordinateSystem && this.validateCoordinateSystem(data.activeCoordinateSystem)) {
      this.activeCoordinateSystem = data.activeCoordinateSystem;
    }
    
    if (data.changeHistory && Array.isArray(data.changeHistory)) {
      this.changeHistory = [...data.changeHistory];
    }
    
    debug('Coordinate system data imported');
  }
  
  /**
   * Get coordinate system summary
   */
  getSummary() {
    return {
      activeSystem: this.activeCoordinateSystem,
      activeOffset: this.getActiveWorkOffset(),
      availableSystems: this.config.coordinateSystems,
      systemCount: this.config.coordinateSystems.length,
      changesCount: this.changeHistory.length
    };
  }
}