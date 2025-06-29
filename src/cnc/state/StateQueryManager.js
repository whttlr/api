/**
 * State Query Manager
 * 
 * Handles hardware state queries, data collection, and state polling
 * for synchronization with machine hardware.
 */

import { EventEmitter } from 'events';
import { debug, warn, error } from '../../lib/logger/LoggerService.js';

export class StateQueryManager extends EventEmitter {
  constructor(commandManager, config = {}) {
    super();
    
    if (!commandManager) {
      throw new Error('StateQueryManager requires a CommandManager');
    }
    
    this.commandManager = commandManager;
    this.config = {
      queryTimeout: 5000,               // Query timeout (ms)
      maxRetries: 3,                    // Maximum query retries
      retryDelay: 1000,                 // Delay between retries (ms)
      enableCaching: true,              // Enable query result caching
      cacheTimeout: 2000,               // Cache timeout (ms)
      ...config
    };
    
    this.queryCache = new Map();
    this.activeQueries = new Set();
    this.queryMetrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      cacheHits: 0,
      averageQueryTime: 0,
      totalQueryTime: 0
    };
  }
  
  /**
   * Query complete hardware state
   */
  async queryHardwareState() {
    const startTime = Date.now();
    
    try {
      debug('Querying complete hardware state');
      
      const stateQueries = await Promise.allSettled([
        this.queryStatus(),
        this.queryPosition(),
        this.querySettings(),
        this.queryParameters(),
        this.queryBuffer()
      ]);
      
      const hardwareState = this.processQueryResults(stateQueries);
      
      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(true, queryTime);
      
      debug('Hardware state query completed', { queryTime: `${queryTime}ms` });
      
      this.emit('hardwareStateQueried', { 
        state: hardwareState, 
        queryTime 
      });
      
      return hardwareState;
      
    } catch (err) {
      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(false, queryTime);
      
      error('Failed to query hardware state', { error: err.message, queryTime });
      throw err;
    }
  }
  
  /**
   * Query machine status
   */
  async queryStatus() {
    return await this.executeQuery('status', '?', (response) => {
      return this.parseStatusResponse(response);
    });
  }
  
  /**
   * Query machine position
   */
  async queryPosition() {
    return await this.executeQuery('position', '?', (response) => {
      return this.parsePositionFromStatus(response);
    });
  }
  
  /**
   * Query GRBL settings
   */
  async querySettings() {
    return await this.executeQuery('settings', '$$', (response) => {
      return this.parseSettingsResponse(response);
    });
  }
  
  /**
   * Query GRBL parameters
   */
  async queryParameters() {
    return await this.executeQuery('parameters', '$#', (response) => {
      return this.parseParametersResponse(response);
    });
  }
  
  /**
   * Query buffer status
   */
  async queryBuffer() {
    return await this.executeQuery('buffer', '?', (response) => {
      return this.parseBufferFromStatus(response);
    });
  }
  
  /**
   * Execute a query with caching and retry logic
   */
  async executeQuery(queryType, command, parser) {
    const cacheKey = `${queryType}_${command}`;
    
    // Check cache first
    if (this.config.enableCaching && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
        this.queryMetrics.cacheHits++;
        debug('Query cache hit', { queryType, command });
        return cached.data;
      } else {
        // Remove expired cache entry
        this.queryCache.delete(cacheKey);
      }
    }
    
    // Prevent duplicate queries
    if (this.activeQueries.has(cacheKey)) {
      debug('Query already in progress, waiting', { queryType, command });
      // In a real implementation, you'd wait for the active query
      throw new Error(`Query ${queryType} already in progress`);
    }
    
    this.activeQueries.add(cacheKey);
    
    try {
      const response = await this.executeQueryWithRetry(command);
      const parsedData = parser(response);
      
      // Cache the result
      if (this.config.enableCaching) {
        this.queryCache.set(cacheKey, {
          data: parsedData,
          timestamp: Date.now()
        });
      }
      
      debug('Query executed successfully', { queryType, command });
      return parsedData;
      
    } finally {
      this.activeQueries.delete(cacheKey);
    }
  }
  
  /**
   * Execute query with retry logic
   */
  async executeQueryWithRetry(command, attempt = 1) {
    try {
      this.queryMetrics.totalQueries++;
      
      const response = await this.commandManager.sendCommand(command, {
        timeout: this.config.queryTimeout
      });
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Query returned no response');
      }
      
      return response;
      
    } catch (err) {
      if (attempt < this.config.maxRetries) {
        warn(`Query attempt ${attempt} failed, retrying`, { 
          command, 
          error: err.message,
          nextAttempt: attempt + 1
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        return await this.executeQueryWithRetry(command, attempt + 1);
      }
      
      error('Query failed after all retries', { 
        command, 
        attempts: attempt, 
        error: err.message 
      });
      throw err;
    }
  }
  
  /**
   * Parse status response
   */
  parseStatusResponse(response) {
    if (!response || !response.raw) {
      return null;
    }
    
    const statusText = response.raw;
    const statusMatch = statusText.match(/<([^|]+)\\|([^>]+)>/);
    
    if (!statusMatch) {
      return null;
    }
    
    const state = statusMatch[1];
    const statusData = statusMatch[2];
    
    // Parse main status
    const stateMatch = state.match(/([^:]+):?(\\d+)?/);
    const machineState = stateMatch ? stateMatch[1] : 'Unknown';
    const subState = stateMatch && stateMatch[2] ? parseInt(stateMatch[2]) : null;
    
    return {
      state: machineState,
      subState,
      timestamp: Date.now(),
      raw: statusText
    };
  }
  
  /**
   * Parse position from status response
   */
  parsePositionFromStatus(response) {
    if (!response || !response.raw) {
      return null;
    }
    
    const statusData = response.raw;
    
    // Parse machine position
    const mposMatch = statusData.match(/MPos:(-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*)/);
    let machinePos = null;
    if (mposMatch) {
      machinePos = {
        x: parseFloat(mposMatch[1]),
        y: parseFloat(mposMatch[2]),
        z: parseFloat(mposMatch[3])
      };
    }
    
    // Parse work position
    const wposMatch = statusData.match(/WPos:(-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*)/);
    let workPos = null;
    if (wposMatch) {
      workPos = {
        x: parseFloat(wposMatch[1]),
        y: parseFloat(wposMatch[2]),
        z: parseFloat(wposMatch[3])
      };
    }
    
    return {
      machine: machinePos,
      work: workPos,
      timestamp: Date.now()
    };
  }
  
  /**
   * Parse settings response
   */
  parseSettingsResponse(response) {
    const settings = new Map();
    
    if (!response || !response.data) {
      return settings;
    }
    
    const lines = Array.isArray(response.data) ? response.data : [response.data];
    
    for (const line of lines) {
      const match = line.match(/\\$(\\d+)=([\\d.-]+)/);
      if (match) {
        const settingNumber = parseInt(match[1]);
        const value = parseFloat(match[2]);
        settings.set(settingNumber, value);
      }
    }
    
    return settings;
  }
  
  /**
   * Parse parameters response
   */
  parseParametersResponse(response) {
    const parameters = new Map();
    
    if (!response || !response.data) {
      return parameters;
    }
    
    const lines = Array.isArray(response.data) ? response.data : [response.data];
    
    for (const line of lines) {
      // Parse coordinate system offsets
      const coordMatch = line.match(/\\[([^:]+):([\\d.-]+),([\\d.-]+),([\\d.-]+)\\]/);
      if (coordMatch) {
        const system = coordMatch[1];
        const coords = {
          x: parseFloat(coordMatch[2]),
          y: parseFloat(coordMatch[3]),
          z: parseFloat(coordMatch[4])
        };
        parameters.set(system, coords);
      }
      
      // Parse tool length offset
      const tloMatch = line.match(/\\[TLO:([\\d.-]+)\\]/);
      if (tloMatch) {
        parameters.set('TLO', parseFloat(tloMatch[1]));
      }
    }
    
    return parameters;
  }
  
  /**
   * Parse buffer information from status
   */
  parseBufferFromStatus(response) {
    if (!response || !response.raw) {
      return null;
    }
    
    const statusData = response.raw;
    const bufferMatch = statusData.match(/Bf:(\\d+),(\\d+)/);
    
    if (bufferMatch) {
      const available = parseInt(bufferMatch[1]);
      const used = parseInt(bufferMatch[2]);
      
      return {
        available,
        used,
        utilization: available > 0 ? (used / (available + used)) * 100 : 0,
        timestamp: Date.now()
      };
    }
    
    return null;
  }
  
  /**
   * Process query results from Promise.allSettled
   */
  processQueryResults(results) {
    const hardwareState = {
      status: null,
      position: null,
      settings: new Map(),
      parameters: new Map(),
      buffer: null,
      queryTimestamp: Date.now(),
      partial: false
    };
    
    let failedQueries = 0;
    
    results.forEach((result, index) => {
      const queryTypes = ['status', 'position', 'settings', 'parameters', 'buffer'];
      const queryType = queryTypes[index];
      
      if (result.status === 'fulfilled' && result.value) {
        hardwareState[queryType] = result.value;
      } else {
        failedQueries++;
        warn(`Failed to query ${queryType}`, { 
          reason: result.reason?.message 
        });
      }
    });
    
    // Mark as partial if some queries failed
    hardwareState.partial = failedQueries > 0;
    
    return hardwareState;
  }
  
  /**
   * Update query metrics
   */
  updateQueryMetrics(success, queryTime) {
    if (success) {
      this.queryMetrics.successfulQueries++;
    } else {
      this.queryMetrics.failedQueries++;
    }
    
    this.queryMetrics.totalQueryTime += queryTime;
    this.queryMetrics.averageQueryTime = 
      this.queryMetrics.totalQueryTime / this.queryMetrics.totalQueries;
  }
  
  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    debug('Query cache cleared');
    this.emit('cacheCleared');
  }
  
  /**
   * Get query statistics
   */
  getQueryStatistics() {
    return {
      ...this.queryMetrics,
      cacheSize: this.queryCache.size,
      activeQueries: this.activeQueries.size,
      successRate: this.queryMetrics.totalQueries > 0 ? 
        (this.queryMetrics.successfulQueries / this.queryMetrics.totalQueries) * 100 : 0
    };
  }
  
  /**
   * Export query data
   */
  exportData() {
    return {
      metrics: { ...this.queryMetrics },
      cacheSize: this.queryCache.size,
      activeQueries: Array.from(this.activeQueries),
      config: { ...this.config }
    };
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.clearCache();
    this.activeQueries.clear();
    this.removeAllListeners();
  }
}