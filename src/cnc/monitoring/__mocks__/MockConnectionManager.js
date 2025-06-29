/**
 * Mock Connection Manager
 * 
 * Provides a mock implementation of ConnectionManager for testing
 * connection health monitoring without real hardware dependencies.
 */

export class MockConnectionManager {
  constructor() {
    this.isConnected = true;
    this.isHealthy = true;
    this.mockLatency = 50;
    this.mockReliability = 1.0;
    this.latencyCallback = null;
    this.connectionHistory = [];
    this.pingCount = 0;
  }

  /**
   * Set connection health status
   */
  setHealthy(healthy) {
    this.isHealthy = healthy;
  }

  /**
   * Set mock latency
   */
  setLatency(latency) {
    this.mockLatency = latency;
  }

  /**
   * Set latency callback for dynamic latency
   */
  setLatencyCallback(callback) {
    this.latencyCallback = callback;
  }

  /**
   * Set connection reliability (0.0 to 1.0)
   */
  setReliability(reliability) {
    this.mockReliability = reliability;
  }

  /**
   * Get current latency
   */
  getCurrentLatency() {
    if (this.latencyCallback) {
      return this.latencyCallback();
    }
    return this.mockLatency;
  }

  /**
   * Ping connection (mocked)
   */
  async ping() {
    this.pingCount++;
    const startTime = Date.now();
    
    // Simulate latency
    const latency = this.getCurrentLatency();
    await new Promise(resolve => setTimeout(resolve, latency));
    
    // Simulate reliability
    const success = Math.random() < this.mockReliability;
    
    if (!this.isHealthy || !success) {
      throw new Error('Ping failed - connection unhealthy');
    }
    
    const result = {
      success: true,
      latency: Date.now() - startTime,
      timestamp: Date.now()
    };
    
    this.connectionHistory.push(result);
    return result;
  }

  /**
   * Check connection health
   */
  async checkHealth() {
    try {
      const pingResult = await this.ping();
      return {
        healthy: true,
        latency: pingResult.latency,
        timestamp: pingResult.timestamp
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isHealthy: this.isHealthy,
      port: '/dev/mock',
      baudRate: 115200,
      lastPing: this.connectionHistory.length > 0 ? 
        this.connectionHistory[this.connectionHistory.length - 1] : null
    };
  }

  /**
   * Connect (mocked)
   */
  async connect(port, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate connection delay
    this.isConnected = true;
    return { 
      success: true, 
      port,
      connected: true 
    };
  }

  /**
   * Disconnect (mocked)
   */
  async disconnect() {
    this.isConnected = false;
    return { 
      success: true,
      disconnected: true 
    };
  }

  /**
   * Reconnect (mocked)
   */
  async reconnect() {
    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate reconnection delay
    return this.connect('/dev/mock');
  }

  /**
   * Get connection history
   */
  getConnectionHistory() {
    return [...this.connectionHistory];
  }

  /**
   * Get ping statistics
   */
  getPingStatistics() {
    if (this.connectionHistory.length === 0) {
      return {
        totalPings: this.pingCount,
        successfulPings: 0,
        failedPings: this.pingCount,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        successRate: 0
      };
    }

    const latencies = this.connectionHistory.map(p => p.latency);
    return {
      totalPings: this.pingCount,
      successfulPings: this.connectionHistory.length,
      failedPings: this.pingCount - this.connectionHistory.length,
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      successRate: (this.connectionHistory.length / this.pingCount) * 100
    };
  }

  /**
   * Simulate connection drop
   */
  simulateConnectionDrop(duration = 1000) {
    this.setHealthy(false);
    this.isConnected = false;
    
    setTimeout(() => {
      this.setHealthy(true);
      this.isConnected = true;
    }, duration);
  }

  /**
   * Simulate intermittent connection
   */
  simulateIntermittentConnection(interval = 500) {
    setInterval(() => {
      this.setHealthy(!this.isHealthy);
    }, interval);
  }

  /**
   * Reset mock state
   */
  reset() {
    this.isConnected = true;
    this.isHealthy = true;
    this.mockLatency = 50;
    this.mockReliability = 1.0;
    this.latencyCallback = null;
    this.connectionHistory = [];
    this.pingCount = 0;
  }
}