import { log, debug } from '../../../../../lib/logger/LoggerService.js';

export class StatusService {
  constructor() {
    this.isPolling = false;
    this.pollInterval = 100; // ms
    this.pollTimer = null;
    this.callbacks = new Set();
    this.lastStatus = null;
    this.statusHistory = [];
    this.maxHistorySize = 100;
  }

  startStatusPolling(callback) {
    if (callback) {
      this.callbacks.add(callback);
    }

    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    log('Starting status polling', { interval: this.pollInterval });
    
    this.pollTimer = setInterval(() => {
      this.pollStatus();
    }, this.pollInterval);
  }

  stopStatusPolling(callback = null) {
    if (callback) {
      this.callbacks.delete(callback);
    }

    if (this.callbacks.size === 0) {
      this.isPolling = false;
      
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      
      log('Status polling stopped');
    }
  }

  async pollStatus() {
    try {
      const status = await this.queryMachineStatus();
      
      if (this.hasStatusChanged(status)) {
        this.lastStatus = status;
        this.addToHistory(status);
        this.notifyCallbacks(status);
      }

    } catch (error) {
      debug('Status polling error', { error: error.message });
    }
  }

  async queryMachineStatus() {
    await this.simulateStatusQuery();

    return {
      timestamp: Date.now(),
      state: this.simulateMachineState(),
      position: this.simulatePosition(),
      workCoordinateSystem: 'G54',
      feedRate: this.simulateFeedRate(),
      spindleSpeed: this.simulateSpindleSpeed(),
      spindleDirection: 'CW',
      coolant: false,
      alarms: [],
      buffer: {
        plannedMoves: 0,
        availableSpace: 128
      }
    };
  }

  simulateMachineState() {
    const states = ['Idle', 'Run', 'Hold', 'Jog', 'Alarm', 'Door'];
    return states[Math.floor(Math.random() * 100) % states.length] || 'Idle';
  }

  simulatePosition() {
    const basePosition = this.lastStatus?.position || { x: 0, y: 0, z: 0 };
    
    return {
      machine: {
        x: basePosition.machine?.x || 0,
        y: basePosition.machine?.y || 0,
        z: basePosition.machine?.z || 0
      },
      work: {
        x: basePosition.work?.x || 0,
        y: basePosition.work?.y || 0,
        z: basePosition.work?.z || 0
      }
    };
  }

  simulateFeedRate() {
    return Math.floor(Math.random() * 1000) + 100;
  }

  simulateSpindleSpeed() {
    return Math.floor(Math.random() * 8000);
  }

  async simulateStatusQuery() {
    return new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  hasStatusChanged(newStatus) {
    if (!this.lastStatus) {
      return true;
    }

    return (
      newStatus.state !== this.lastStatus.state ||
      newStatus.position.work.x !== this.lastStatus.position.work.x ||
      newStatus.position.work.y !== this.lastStatus.position.work.y ||
      newStatus.position.work.z !== this.lastStatus.position.work.z ||
      newStatus.feedRate !== this.lastStatus.feedRate ||
      newStatus.spindleSpeed !== this.lastStatus.spindleSpeed
    );
  }

  addToHistory(status) {
    this.statusHistory.push(status);
    
    if (this.statusHistory.length > this.maxHistorySize) {
      this.statusHistory = this.statusHistory.slice(-this.maxHistorySize);
    }
  }

  notifyCallbacks(status) {
    this.callbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        debug('Status callback error', { error: error.message });
      }
    });
  }

  getCurrentStatus() {
    return this.lastStatus;
  }

  getStatusHistory() {
    return [...this.statusHistory];
  }

  clearHistory() {
    this.statusHistory = [];
    log('Status history cleared');
  }

  setPollingInterval(interval) {
    if (interval >= 50 && interval <= 1000) {
      this.pollInterval = interval;
      
      if (this.isPolling) {
        this.stopStatusPolling();
        this.startStatusPolling();
      }
      
      log('Polling interval updated', { interval });
      return true;
    }
    
    return false;
  }

  getPollingStatus() {
    return {
      isPolling: this.isPolling,
      interval: this.pollInterval,
      activeCallbacks: this.callbacks.size,
      historySize: this.statusHistory.length,
      lastUpdate: this.lastStatus?.timestamp
    };
  }
}