/**
 * Modal Group Manager
 * 
 * Handles modal G-code groups (motion, plane, units, positioning, etc.)
 * and their state persistence for CNC machines.
 */

import { EventEmitter } from 'events';
import { debug, info, warn } from '../../lib/logger/LoggerService.js';

export class ModalGroupManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      trackChanges: true,
      validateModalGroups: true,
      ...config
    };
    
    // Modal groups state
    this.modalGroups = {
      motion: 'G0',                          // Motion mode (G0, G1, G2, G3)
      plane: 'G17',                          // Plane selection (G17, G18, G19)
      units: 'G21',                          // Units (G20=inches, G21=mm)
      positioning: 'G90',                    // Positioning (G90=absolute, G91=incremental)
      feedRateMode: 'G94',                   // Feed rate mode (G93, G94, G95)
      spindleMode: 'M5',                     // Spindle state (M3, M4, M5)
      coolant: 'M9',                         // Coolant state (M7, M8, M9)
      toolLength: 'G49'                      // Tool length compensation (G43, G49)
    };
    
    this.changeHistory = [];
    this.validModalGroups = this.createValidModalGroups();
  }
  
  /**
   * Update modal group
   */
  updateModalGroup(group, value) {
    if (!this.modalGroups.hasOwnProperty(group)) {
      warn('Unknown modal group', { group, value });
      return false;
    }
    
    if (this.config.validateModalGroups && !this.validateModalGroup(group, value)) {
      warn('Invalid modal group value', { group, value });
      return false;
    }
    
    const previousValue = this.modalGroups[group];
    this.modalGroups[group] = value;
    
    // Track change history
    if (this.config.trackChanges) {
      this.addChangeToHistory(group, previousValue, value);
    }
    
    this.emit('modalGroupChanged', {
      group,
      from: previousValue,
      to: value
    });
    
    // Handle special modal group changes
    this.handleSpecialModalGroup(group, value, previousValue);
    
    debug('Modal group updated', { group, value });
    return true;
  }
  
  /**
   * Handle special modal group changes with specific events
   */
  handleSpecialModalGroup(group, newValue, oldValue) {
    switch (group) {
      case 'units':
        if (oldValue !== newValue) {
          this.emit('unitsChanged', {
            from: oldValue,
            to: newValue,
            isMetric: newValue === 'G21'
          });
          info('Units changed', { from: oldValue, to: newValue });
        }
        break;
        
      case 'positioning':
        this.emit('positioningModeChanged', {
          from: oldValue,
          to: newValue,
          isAbsolute: newValue === 'G90'
        });
        info('Positioning mode changed', { from: oldValue, to: newValue });
        break;
        
      case 'spindleMode':
        this.emit('spindleModeChanged', {
          from: oldValue,
          to: newValue,
          direction: this.getSpindleDirection(newValue)
        });
        break;
        
      case 'coolant':
        this.emit('coolantChanged', {
          from: oldValue,
          to: newValue,
          isOn: newValue !== 'M9'
        });
        break;
        
      case 'plane':
        this.emit('planeChanged', {
          from: oldValue,
          to: newValue,
          plane: this.getPlaneDescription(newValue)
        });
        break;
        
      case 'motion':
        this.emit('motionModeChanged', {
          from: oldValue,
          to: newValue,
          mode: this.getMotionDescription(newValue)
        });
        break;
    }
  }
  
  /**
   * Get current modal group value
   */
  getModalGroup(group) {
    return this.modalGroups[group];
  }
  
  /**
   * Get all modal groups
   */
  getAllModalGroups() {
    return { ...this.modalGroups };
  }
  
  /**
   * Get spindle direction from modal group
   */
  getSpindleDirection(mode) {
    switch (mode) {
      case 'M3':
        return 'cw';
      case 'M4':
        return 'ccw';
      case 'M5':
        return 'off';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Get plane description
   */
  getPlaneDescription(plane) {
    switch (plane) {
      case 'G17':
        return 'XY';
      case 'G18':
        return 'XZ';
      case 'G19':
        return 'YZ';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Get motion mode description
   */
  getMotionDescription(motion) {
    switch (motion) {
      case 'G0':
        return 'rapid';
      case 'G1':
        return 'linear';
      case 'G2':
        return 'clockwise_arc';
      case 'G3':
        return 'counterclockwise_arc';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Reset modal groups to defaults
   */
  resetModalGroups() {
    const previousGroups = { ...this.modalGroups };
    
    this.modalGroups = {
      motion: 'G0',
      plane: 'G17',
      units: 'G21',
      positioning: 'G90',
      feedRateMode: 'G94',
      spindleMode: 'M5',
      coolant: 'M9',
      toolLength: 'G49'
    };
    
    this.emit('modalGroupsReset', {
      from: previousGroups,
      to: this.modalGroups
    });
    
    info('Modal groups reset to defaults');
  }
  
  /**
   * Set multiple modal groups at once
   */
  setModalGroups(groups) {
    const changes = [];
    
    Object.keys(groups).forEach(group => {
      if (this.modalGroups.hasOwnProperty(group)) {
        const previousValue = this.modalGroups[group];
        if (this.updateModalGroup(group, groups[group])) {
          changes.push({
            group,
            from: previousValue,
            to: groups[group]
          });
        }
      }
    });
    
    if (changes.length > 0) {
      this.emit('multipleModalGroupsChanged', { changes });
    }
    
    return changes;
  }
  
  /**
   * Validate modal group value
   */
  validateModalGroup(group, value) {
    const validValues = this.validModalGroups[group];
    return validValues ? validValues.includes(value) : true;
  }
  
  /**
   * Create valid modal groups mapping
   */
  createValidModalGroups() {
    return {
      motion: ['G0', 'G1', 'G2', 'G3', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G80'],
      plane: ['G17', 'G18', 'G19'],
      units: ['G20', 'G21'],
      positioning: ['G90', 'G91'],
      feedRateMode: ['G93', 'G94', 'G95'],
      spindleMode: ['M3', 'M4', 'M5'],
      coolant: ['M7', 'M8', 'M9'],
      toolLength: ['G43', 'G49']
    };
  }
  
  /**
   * Add change to history
   */
  addChangeToHistory(group, from, to) {
    const change = {
      timestamp: Date.now(),
      group,
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
   * Get modal group summary
   */
  getSummary() {
    return {
      currentGroups: this.getAllModalGroups(),
      isMetric: this.modalGroups.units === 'G21',
      isAbsolute: this.modalGroups.positioning === 'G90',
      spindleDirection: this.getSpindleDirection(this.modalGroups.spindleMode),
      coolantOn: this.modalGroups.coolant !== 'M9',
      currentPlane: this.getPlaneDescription(this.modalGroups.plane),
      motionMode: this.getMotionDescription(this.modalGroups.motion),
      changesCount: this.changeHistory.length
    };
  }
  
  /**
   * Export modal group data
   */
  exportData() {
    return {
      modalGroups: this.getAllModalGroups(),
      changeHistory: [...this.changeHistory],
      summary: this.getSummary()
    };
  }
  
  /**
   * Import modal group data
   */
  importData(data) {
    if (data.modalGroups) {
      Object.keys(data.modalGroups).forEach(group => {
        if (this.modalGroups.hasOwnProperty(group)) {
          this.modalGroups[group] = data.modalGroups[group];
        }
      });
    }
    
    if (data.changeHistory && Array.isArray(data.changeHistory)) {
      this.changeHistory = [...data.changeHistory];
    }
    
    debug('Modal group data imported');
  }
}