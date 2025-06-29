/**
 * Mock Machine State Manager
 * 
 * Provides a mock implementation of MachineStateManager for testing
 * state synchronization and management without real hardware dependencies.
 */

import { EventEmitter } from 'events';

export class MockMachineStateManager extends EventEmitter {
  constructor() {
    super();
    
    this.state = 'Idle';
    this.position = { x: 0, y: 0, z: 0 };
    this.workPosition = { x: 0, y: 0, z: 0 };
    this.coordinateSystem = { name: 'G54', offset: { x: 0, y: 0, z: 0 } };
    this.modalState = {
      motion: 'G00',
      plane: 'G17',
      units: 'G21',
      distance: 'G90',
      feedRate: 'G94'
    };
    this.currentTool = { number: 0, properties: {} };
    this.limits = null;
    
    this.positionHistory = [];
    this.stateHistory = [];
    this.toolUsage = new Map();
    
    this.startTime = Date.now();
  }

  /**
   * Set mock state for testing
   */
  setMockState(mockState) {
    if (mockState.state) this.state = mockState.state;
    if (mockState.position) this.position = { ...mockState.position };
    if (mockState.workPosition) this.workPosition = { ...mockState.workPosition };
    if (mockState.coordinateSystem) this.coordinateSystem = { ...mockState.coordinateSystem };
    if (mockState.modalState) this.modalState = { ...this.modalState, ...mockState.modalState };
    if (mockState.currentTool) this.currentTool = { ...mockState.currentTool };
  }

  /**
   * Get current machine state
   */
  getCurrentState() {
    return this.state;
  }

  /**
   * Set machine state
   */
  setState(newState) {
    const previousState = this.state;
    this.state = newState;
    
    this.stateHistory.push({
      timestamp: Date.now(),
      previousState,
      currentState: newState
    });
    
    this.emit('stateChanged', {
      previousState,
      currentState: newState,
      timestamp: Date.now()
    });
  }

  /**
   * Get machine position
   */
  getMachinePosition() {
    return { ...this.position };
  }

  /**
   * Get work position
   */
  getWorkPosition() {
    return { ...this.workPosition };
  }

  /**
   * Update machine position
   */
  updatePosition(newPosition, workPos = null) {
    const previousPosition = { ...this.position };
    this.position = { ...newPosition };
    
    if (workPos) {
      this.workPosition = { ...workPos };
    } else {
      // Calculate work position from coordinate system offset
      this.workPosition = {
        x: this.position.x - this.coordinateSystem.offset.x,
        y: this.position.y - this.coordinateSystem.offset.y,
        z: this.position.z - this.coordinateSystem.offset.z
      };
    }
    
    // Calculate movement distance
    const distance = Math.sqrt(
      Math.pow(this.position.x - previousPosition.x, 2) +
      Math.pow(this.position.y - previousPosition.y, 2) +
      Math.pow(this.position.z - previousPosition.z, 2)
    );
    
    this.positionHistory.push({
      timestamp: Date.now(),
      position: { ...this.position },
      workPosition: { ...this.workPosition },
      distance
    });
    
    this.emit('positionChanged', {
      previous: previousPosition,
      current: this.position,
      distance,
      timestamp: Date.now()
    });
  }

  /**
   * Get last movement distance
   */
  getLastMovementDistance() {
    if (this.positionHistory.length < 2) return 0;
    return this.positionHistory[this.positionHistory.length - 1].distance;
  }

  /**
   * Get position history
   */
  getPositionHistory() {
    return [...this.positionHistory];
  }

  /**
   * Set work coordinate system
   */
  setWorkCoordinateSystem(systemName, offset) {
    const validSystems = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'];
    if (!validSystems.includes(systemName)) {
      throw new Error('Invalid coordinate system');
    }
    
    this.coordinateSystem = { name: systemName, offset: { ...offset } };
    
    this.emit('coordinateSystemChanged', {
      system: systemName,
      offset: { ...offset },
      timestamp: Date.now()
    });
  }

  /**
   * Get current coordinate system
   */
  getCurrentCoordinateSystem() {
    return { ...this.coordinateSystem };
  }

  /**
   * Update modal group
   */
  updateModalGroup(group, value) {
    const validGroups = ['motion', 'plane', 'units', 'distance', 'feedRate'];
    if (!validGroups.includes(group)) {
      throw new Error('Invalid modal group');
    }
    
    // Validate values based on group
    const validValues = {
      motion: ['G00', 'G01', 'G02', 'G03'],
      plane: ['G17', 'G18', 'G19'],
      units: ['G20', 'G21'],
      distance: ['G90', 'G91'],
      feedRate: ['G93', 'G94']
    };
    
    if (!validValues[group].includes(value)) {
      throw new Error('Invalid modal group value');
    }
    
    this.modalState[group] = value;
    
    this.emit('modalGroupChanged', {
      group,
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Get modal state
   */
  getModalState() {
    return { ...this.modalState };
  }

  /**
   * Change active tool
   */
  changeTool(toolNumber, properties = {}) {
    if (toolNumber < 0) {
      throw new Error('Invalid tool number');
    }
    
    const previousTool = { ...this.currentTool };
    this.currentTool = { number: toolNumber, properties: { ...properties } };
    
    // Track tool usage
    const usage = this.toolUsage.get(toolNumber) || { usageCount: 0, totalTime: 0 };
    usage.usageCount++;
    usage.lastUsed = Date.now();
    this.toolUsage.set(toolNumber, usage);
    
    this.emit('toolChanged', {
      previousTool,
      currentTool: this.currentTool,
      toolNumber,
      properties: { ...properties },
      timestamp: Date.now()
    });
  }

  /**
   * Get current tool
   */
  getCurrentTool() {
    return { ...this.currentTool };
  }

  /**
   * Get tool usage statistics
   */
  getToolUsageStatistics() {
    const stats = {};
    for (const [toolNumber, usage] of this.toolUsage.entries()) {
      stats[toolNumber] = { ...usage };
    }
    return stats;
  }

  /**
   * Set machine limits
   */
  setMachineLimits(limits) {
    this.limits = { ...limits };
  }

  /**
   * Update state from status report
   */
  updateFromStatusReport(statusReport) {
    // Check for conflicts
    if (statusReport.mpos && this.position) {
      const positionDiff = Math.abs(statusReport.mpos.x - this.position.x) +
                          Math.abs(statusReport.mpos.y - this.position.y) +
                          Math.abs(statusReport.mpos.z - this.position.z);
      
      if (positionDiff > 0.01) { // 0.01mm tolerance
        this.emit('stateConflict', {
          type: 'position',
          expected: this.position,
          received: statusReport.mpos,
          timestamp: Date.now()
        });
      }
    }
    
    // Update state from report
    if (statusReport.state) this.setState(statusReport.state);
    if (statusReport.mpos) this.updatePosition(statusReport.mpos, statusReport.wpos);
    if (statusReport.wco) {
      this.coordinateSystem.offset = { ...statusReport.wco };
    }
    if (statusReport.modal) {
      Object.keys(statusReport.modal).forEach(group => {
        this.modalState[group] = statusReport.modal[group];
      });
    }
  }

  /**
   * Validate position against limits
   */
  validatePosition(position) {
    if (!this.limits) return true;
    
    for (const axis of ['x', 'y', 'z']) {
      if (this.limits[axis]) {
        if (position[axis] < this.limits[axis].min || position[axis] > this.limits[axis].max) {
          throw new Error('Position exceeds machine limits');
        }
      }
    }
    return true;
  }

  /**
   * Save current state
   */
  async saveState() {
    return {
      position: this.position,
      workPosition: this.workPosition,
      coordinateSystem: this.coordinateSystem,
      modalState: this.modalState,
      tool: this.currentTool,
      state: this.state,
      timestamp: Date.now()
    };
  }

  /**
   * Restore state
   */
  async restoreState(stateData) {
    if (stateData.position) this.position = { ...stateData.position };
    if (stateData.workPosition) this.workPosition = { ...stateData.workPosition };
    if (stateData.coordinateSystem) this.coordinateSystem = { ...stateData.coordinateSystem };
    if (stateData.modalState) this.modalState = { ...stateData.modalState };
    if (stateData.tool) this.currentTool = { ...stateData.tool };
    if (stateData.state) this.state = stateData.state;
  }

  /**
   * Get movement statistics
   */
  getMovementStatistics() {
    if (this.positionHistory.length === 0) {
      return { totalDistance: 0, averageSpeed: 0, movementCount: 0 };
    }
    
    const totalDistance = this.positionHistory.reduce((sum, entry) => sum + entry.distance, 0);
    const timeSpan = Date.now() - this.startTime;
    const averageSpeed = totalDistance / (timeSpan / 1000); // mm/s
    
    return {
      totalDistance,
      averageSpeed,
      movementCount: this.positionHistory.length
    };
  }

  /**
   * Get uptime
   */
  getUptime() {
    return Date.now() - this.startTime;
  }

  /**
   * Export all data
   */
  exportData() {
    return {
      position: this.position,
      workPosition: this.workPosition,
      coordinateSystem: this.coordinateSystem,
      modalState: this.modalState,
      tool: this.currentTool,
      state: this.state,
      statistics: this.getMovementStatistics(),
      uptime: this.getUptime(),
      positionHistory: this.positionHistory.slice(-50), // Last 50 entries
      stateHistory: this.stateHistory.slice(-50),
      timestamp: Date.now()
    };
  }

  /**
   * Import data
   */
  importData(data) {
    if (data.position) this.position = { ...data.position };
    if (data.workPosition) this.workPosition = { ...data.workPosition };
    if (data.coordinateSystem) this.coordinateSystem = { ...data.coordinateSystem };
    if (data.modalState) this.modalState = { ...data.modalState };
    if (data.tool) this.currentTool = { ...data.tool };
    if (data.state) this.state = data.state;
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.state = 'Idle';
    this.position = { x: 0, y: 0, z: 0 };
    this.workPosition = { x: 0, y: 0, z: 0 };
    this.coordinateSystem = { name: 'G54', offset: { x: 0, y: 0, z: 0 } };
    this.modalState = {
      motion: 'G00',
      plane: 'G17',
      units: 'G21',
      distance: 'G90',
      feedRate: 'G94'
    };
    this.currentTool = { number: 0, properties: {} };
    this.positionHistory = [];
    this.stateHistory = [];
    this.toolUsage.clear();
    this.startTime = Date.now();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.removeAllListeners();
    this.reset();
  }
}