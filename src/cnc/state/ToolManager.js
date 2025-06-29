/**
 * Tool Manager
 * 
 * Handles tool state, tool changes, tool offsets, and tool management
 * for CNC machines including tool library management.
 */

import { EventEmitter } from 'events';
import { debug, info, warn } from '../../lib/logger/LoggerService.js';

export class ToolManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      trackToolChanges: true,
      validateToolData: true,
      maxToolNumber: 99,
      ...config
    };
    
    // Current tool state
    this.currentTool = {
      number: 0,                             // Current tool number
      offset: { x: 0, y: 0, z: 0 },         // Tool offset
      length: 0,                             // Tool length
      diameter: 0,                           // Tool diameter
      description: '',                       // Tool description
      lastChange: null                       // Last tool change time
    };
    
    // Tool library - stores tool definitions
    this.toolLibrary = new Map();
    
    // Tool change history
    this.toolChangeHistory = [];
    
    // Initialize with default tool
    this.initializeDefaultTool();
  }
  
  /**
   * Initialize default tool (T0)
   */
  initializeDefaultTool() {
    this.toolLibrary.set(0, {
      number: 0,
      description: 'No Tool',
      length: 0,
      diameter: 0,
      offset: { x: 0, y: 0, z: 0 },
      material: '',
      coatingType: '',
      flutes: 0,
      maxSpindleSpeed: 0,
      notes: ''
    });
  }
  
  /**
   * Change to a different tool
   */
  changeTool(toolNumber, toolInfo = null) {
    if (!this.validateToolNumber(toolNumber)) {
      throw new Error(`Invalid tool number: ${toolNumber}`);
    }
    
    const previousTool = { ...this.currentTool };
    
    // Update current tool
    this.currentTool.number = toolNumber;
    this.currentTool.lastChange = Date.now();
    
    // Get tool info from library or use provided info
    let toolData = this.toolLibrary.get(toolNumber);
    if (toolInfo) {
      toolData = { ...toolData, ...toolInfo };
      // Update library with new info
      this.addToolToLibrary(toolNumber, toolData);
    }
    
    if (toolData) {
      this.currentTool.offset = { ...toolData.offset };
      this.currentTool.length = toolData.length || 0;
      this.currentTool.diameter = toolData.diameter || 0;
      this.currentTool.description = toolData.description || '';
    }
    
    // Track tool change history
    if (this.config.trackToolChanges) {
      this.addToolChangeToHistory(previousTool, this.currentTool);
    }
    
    this.emit('toolChanged', {
      from: previousTool,
      to: this.currentTool,
      toolNumber
    });
    
    info('Tool changed', { 
      from: previousTool.number, 
      to: toolNumber,
      description: this.currentTool.description
    });
    
    return true;
  }
  
  /**
   * Update current tool properties
   */
  updateToolProperties(properties) {
    const previousTool = { ...this.currentTool };
    
    // Update current tool properties
    if (properties.offset) {
      this.currentTool.offset = { ...properties.offset };
    }
    if (properties.length !== undefined) {
      this.currentTool.length = properties.length;
    }
    if (properties.diameter !== undefined) {
      this.currentTool.diameter = properties.diameter;
    }
    if (properties.description !== undefined) {
      this.currentTool.description = properties.description;
    }
    
    // Update tool library
    const toolData = this.toolLibrary.get(this.currentTool.number) || {};
    this.addToolToLibrary(this.currentTool.number, {
      ...toolData,
      ...properties
    });
    
    this.emit('toolPropertiesChanged', {
      toolNumber: this.currentTool.number,
      from: previousTool,
      to: this.currentTool
    });
    
    debug('Tool properties updated', { 
      toolNumber: this.currentTool.number, 
      properties 
    });
  }
  
  /**
   * Add tool to library
   */
  addToolToLibrary(toolNumber, toolData) {
    if (!this.validateToolNumber(toolNumber)) {
      throw new Error(`Invalid tool number: ${toolNumber}`);
    }
    
    const tool = {
      number: toolNumber,
      description: toolData.description || '',
      length: toolData.length || 0,
      diameter: toolData.diameter || 0,
      offset: toolData.offset || { x: 0, y: 0, z: 0 },
      material: toolData.material || '',
      coatingType: toolData.coatingType || '',
      flutes: toolData.flutes || 0,
      maxSpindleSpeed: toolData.maxSpindleSpeed || 0,
      notes: toolData.notes || '',
      createdAt: toolData.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    
    this.toolLibrary.set(toolNumber, tool);
    
    this.emit('toolAddedToLibrary', {
      toolNumber,
      toolData: tool
    });
    
    debug('Tool added to library', { toolNumber, description: tool.description });
  }
  
  /**
   * Remove tool from library
   */
  removeToolFromLibrary(toolNumber) {
    if (toolNumber === 0) {
      throw new Error('Cannot remove default tool (T0)');
    }
    
    if (!this.toolLibrary.has(toolNumber)) {
      throw new Error(`Tool ${toolNumber} not found in library`);
    }
    
    const toolData = this.toolLibrary.get(toolNumber);
    this.toolLibrary.delete(toolNumber);
    
    this.emit('toolRemovedFromLibrary', {
      toolNumber,
      toolData
    });
    
    info('Tool removed from library', { toolNumber });
  }
  
  /**
   * Get tool from library
   */
  getToolFromLibrary(toolNumber) {
    return this.toolLibrary.get(toolNumber);
  }
  
  /**
   * Get all tools in library
   */
  getAllTools() {
    const tools = {};
    this.toolLibrary.forEach((tool, number) => {
      tools[number] = { ...tool };
    });
    return tools;
  }
  
  /**
   * Get current tool information
   */
  getCurrentTool() {
    return { ...this.currentTool };
  }
  
  /**
   * Get current tool number
   */
  getCurrentToolNumber() {
    return this.currentTool.number;
  }
  
  /**
   * Get current tool offset
   */
  getCurrentToolOffset() {
    return { ...this.currentTool.offset };
  }
  
  /**
   * Set tool offset
   */
  setToolOffset(offset) {
    if (!this.validateOffset(offset)) {
      throw new Error(`Invalid tool offset: ${JSON.stringify(offset)}`);
    }
    
    this.updateToolProperties({ offset });
  }
  
  /**
   * Reset current tool to T0
   */
  resetTool() {
    this.changeTool(0);
    info('Tool reset to T0');
  }
  
  /**
   * Validate tool number
   */
  validateToolNumber(toolNumber) {
    return Number.isInteger(toolNumber) && 
           toolNumber >= 0 && 
           toolNumber <= this.config.maxToolNumber;
  }
  
  /**
   * Validate tool offset
   */
  validateOffset(offset) {
    if (!this.config.validateToolData) return true;
    
    if (!offset || typeof offset !== 'object') {
      return false;
    }
    
    const requiredProps = ['x', 'y', 'z'];
    return requiredProps.every(prop => 
      typeof offset[prop] === 'number' && !isNaN(offset[prop])
    );
  }
  
  /**
   * Add tool change to history
   */
  addToolChangeToHistory(fromTool, toTool) {
    const change = {
      timestamp: Date.now(),
      from: { ...fromTool },
      to: { ...toTool },
      duration: fromTool.lastChange ? (Date.now() - fromTool.lastChange) : 0
    };
    
    this.toolChangeHistory.push(change);
    
    // Limit history size
    if (this.toolChangeHistory.length > 100) {
      this.toolChangeHistory = this.toolChangeHistory.slice(-50);
    }
  }
  
  /**
   * Get tool change history
   */
  getToolChangeHistory(limit = 20) {
    return this.toolChangeHistory.slice(-limit);
  }
  
  /**
   * Get tool statistics
   */
  getToolStatistics() {
    const stats = {
      totalTools: this.toolLibrary.size,
      currentTool: this.currentTool.number,
      toolChanges: this.toolChangeHistory.length,
      lastToolChange: this.currentTool.lastChange,
      mostUsedTools: this.getMostUsedTools(),
      averageToolChangeTime: this.getAverageToolChangeTime()
    };
    
    return stats;
  }
  
  /**
   * Get most used tools
   */
  getMostUsedTools(limit = 5) {
    const toolUsage = new Map();
    
    this.toolChangeHistory.forEach(change => {
      const toolNumber = change.to.number;
      toolUsage.set(toolNumber, (toolUsage.get(toolNumber) || 0) + 1);
    });
    
    return Array.from(toolUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([toolNumber, count]) => ({
        toolNumber,
        count,
        toolData: this.toolLibrary.get(toolNumber)
      }));
  }
  
  /**
   * Get average tool change time
   */
  getAverageToolChangeTime() {
    if (this.toolChangeHistory.length === 0) return 0;
    
    const totalTime = this.toolChangeHistory.reduce((sum, change) => sum + change.duration, 0);
    return totalTime / this.toolChangeHistory.length;
  }
  
  /**
   * Export tool data
   */
  exportData() {
    return {
      currentTool: this.getCurrentTool(),
      toolLibrary: this.getAllTools(),
      toolChangeHistory: [...this.toolChangeHistory],
      statistics: this.getToolStatistics()
    };
  }
  
  /**
   * Import tool data
   */
  importData(data) {
    // Import tool library
    if (data.toolLibrary) {
      this.toolLibrary.clear();
      this.initializeDefaultTool(); // Ensure T0 exists
      
      Object.keys(data.toolLibrary).forEach(toolNumber => {
        const toolData = data.toolLibrary[toolNumber];
        if (this.validateToolNumber(parseInt(toolNumber))) {
          this.toolLibrary.set(parseInt(toolNumber), toolData);
        }
      });
    }
    
    // Import current tool
    if (data.currentTool) {
      this.currentTool = { ...data.currentTool };
    }
    
    // Import tool change history
    if (data.toolChangeHistory && Array.isArray(data.toolChangeHistory)) {
      this.toolChangeHistory = [...data.toolChangeHistory];
    }
    
    debug('Tool data imported');
  }
  
  /**
   * Search tools by criteria
   */
  searchTools(criteria) {
    const results = [];
    
    this.toolLibrary.forEach((tool, number) => {
      let matches = true;
      
      if (criteria.description && !tool.description.toLowerCase().includes(criteria.description.toLowerCase())) {
        matches = false;
      }
      
      if (criteria.material && !tool.material.toLowerCase().includes(criteria.material.toLowerCase())) {
        matches = false;
      }
      
      if (criteria.minDiameter && tool.diameter < criteria.minDiameter) {
        matches = false;
      }
      
      if (criteria.maxDiameter && tool.diameter > criteria.maxDiameter) {
        matches = false;
      }
      
      if (matches) {
        results.push({ ...tool });
      }
    });
    
    return results;
  }
}