/**
 * Position Manager
 * 
 * Handles machine position tracking, coordinate transformations,
 * and movement calculations for the CNC machine state system.
 */

import { EventEmitter } from 'events';
import { debug } from '../../lib/logger/LoggerService.js';

export class PositionManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      positionTolerance: 0.001,  // Position comparison tolerance
      trackMovementHistory: true,
      maxMovementHistory: 100,
      ...config
    };
    
    this.position = {
      machine: { x: 0, y: 0, z: 0 },
      work: { x: 0, y: 0, z: 0 },
      lastUpdate: null
    };
    
    this.movementHistory = [];
  }
  
  /**
   * Update machine position
   */
  updatePosition(machinePos, workPos = null) {
    const previousPosition = { ...this.position };
    
    // Update machine position
    if (machinePos) {
      this.position.machine = { ...machinePos };
    }
    
    // Update or calculate work position
    if (workPos) {
      this.position.work = { ...workPos };
    }
    
    this.position.lastUpdate = Date.now();
    
    // Calculate movement distance
    const distance = this.calculateDistance(previousPosition.machine, this.position.machine);
    
    // Track movement history
    if (this.config.trackMovementHistory && distance > this.config.positionTolerance) {
      this.addMovementToHistory(previousPosition, this.position, distance);
    }
    
    this.emit('positionChanged', {
      previous: previousPosition,
      current: this.position,
      distance
    });
    
    debug('Position updated', {
      machine: this.position.machine,
      work: this.position.work,
      distance: distance.toFixed(3)
    });
    
    return distance;
  }
  
  /**
   * Calculate work position from machine position and work offset
   */
  calculateWorkPosition(machinePos, workOffset) {
    return {
      x: machinePos.x - workOffset.x,
      y: machinePos.y - workOffset.y,
      z: machinePos.z - workOffset.z
    };
  }
  
  /**
   * Calculate machine position from work position and work offset
   */
  calculateMachinePosition(workPos, workOffset) {
    return {
      x: workPos.x + workOffset.x,
      y: workPos.y + workOffset.y,
      z: workPos.z + workOffset.z
    };
  }
  
  /**
   * Calculate distance between two positions
   */
  calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return 0;
    
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Check if two positions are equal within tolerance
   */
  positionsEqual(pos1, pos2, tolerance = null) {
    const tol = tolerance || this.config.positionTolerance;
    return this.calculateDistance(pos1, pos2) <= tol;
  }
  
  /**
   * Add movement to history
   */
  addMovementToHistory(fromPos, toPos, distance) {
    const movement = {
      timestamp: Date.now(),
      from: fromPos.machine,
      to: toPos.machine,
      distance,
      duration: toPos.lastUpdate - (fromPos.lastUpdate || toPos.lastUpdate)
    };
    
    this.movementHistory.push(movement);
    
    // Limit history size
    if (this.movementHistory.length > this.config.maxMovementHistory) {
      this.movementHistory = this.movementHistory.slice(-this.config.maxMovementHistory);
    }
  }
  
  /**
   * Get current position
   */
  getPosition() {
    return {
      machine: { ...this.position.machine },
      work: { ...this.position.work },
      lastUpdate: this.position.lastUpdate
    };
  }
  
  /**
   * Get movement statistics
   */
  getMovementStats() {
    if (this.movementHistory.length === 0) {
      return {
        totalDistance: 0,
        averageDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        movementCount: 0
      };
    }
    
    const totalDistance = this.movementHistory.reduce((sum, move) => sum + move.distance, 0);
    const totalTime = this.movementHistory.reduce((sum, move) => sum + move.duration, 0);
    
    return {
      totalDistance,
      averageDistance: totalDistance / this.movementHistory.length,
      totalTime,
      averageSpeed: totalTime > 0 ? totalDistance / (totalTime / 1000) : 0, // mm/s
      movementCount: this.movementHistory.length
    };
  }
  
  /**
   * Reset position to zero
   */
  resetPosition() {
    this.updatePosition({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  }
  
  /**
   * Clear movement history
   */
  clearHistory() {
    this.movementHistory = [];
    debug('Movement history cleared');
  }
  
  /**
   * Validate position data
   */
  validatePosition(position) {
    if (!position || typeof position !== 'object') {
      return false;
    }
    
    const requiredProps = ['x', 'y', 'z'];
    return requiredProps.every(prop => 
      typeof position[prop] === 'number' && !isNaN(position[prop])
    );
  }
  
  /**
   * Export position data
   */
  exportData() {
    return {
      position: this.getPosition(),
      movementHistory: [...this.movementHistory],
      stats: this.getMovementStats()
    };
  }
  
  /**
   * Import position data
   */
  importData(data) {
    if (data.position && this.validatePosition(data.position.machine)) {
      this.position = {
        machine: { ...data.position.machine },
        work: { ...data.position.work },
        lastUpdate: data.position.lastUpdate || Date.now()
      };
    }
    
    if (data.movementHistory && Array.isArray(data.movementHistory)) {
      this.movementHistory = [...data.movementHistory];
    }
    
    debug('Position data imported');
  }
}