/**
 * Memory Manager
 * 
 * Monitors and controls memory usage during streaming operations
 * to prevent out-of-memory conditions with large files.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class MemoryManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxMemoryUsage: 50 * 1024 * 1024,    // 50MB memory limit
      warningThreshold: 0.8,               // Warning at 80% of limit
      criticalThreshold: 0.9,              // Critical at 90% of limit
      monitoringInterval: 1000,            // Memory check interval (ms)
      enableGarbageCollection: true,       // Enable forced GC
      chunkSizeReduction: 0.5,             // Reduce chunk size by 50% when memory is low
      enableMemoryOptimization: true,      // Enable automatic memory optimization
      trackObjectCounts: true,             // Track object allocation counts
      enableMemoryLeakDetection: true,     // Enable memory leak detection
      ...config
    };
    
    this.memoryState = {
      isMonitoring: false,
      currentUsage: 0,
      peakUsage: 0,
      baselineUsage: 0,
      lastGCTime: 0,
      gcCount: 0
    };
    
    this.memoryHistory = [];
    this.monitoringInterval = null;
    this.objectCounts = new Map();
    
    this.metrics = {
      totalAllocations: 0,
      totalDeallocations: 0,
      garbageCollections: 0,
      memoryWarnings: 0,
      memoryCriticals: 0,
      optimizationsTriggered: 0,
      averageUsage: 0,
      peakUsage: 0
    };
    
    // Track chunk memory usage
    this.chunkMemoryMap = new Map();
  }
  
  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.memoryState.isMonitoring) {
      return;
    }
    
    debug('Starting memory monitoring');
    
    this.memoryState.isMonitoring = true;
    this.memoryState.baselineUsage = this.getCurrentMemoryUsage();
    
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringInterval);
    
    this.emit('monitoringStarted', {
      baselineUsage: this.memoryState.baselineUsage,
      limit: this.config.maxMemoryUsage
    });
    
    info('Memory monitoring started', {
      baseline: `${Math.round(this.memoryState.baselineUsage / 1024 / 1024)}MB`,
      limit: `${Math.round(this.config.maxMemoryUsage / 1024 / 1024)}MB`
    });
  }
  
  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.memoryState.isMonitoring) {
      return;
    }
    
    debug('Stopping memory monitoring');
    
    this.memoryState.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.emit('monitoringStopped', {
      peakUsage: this.memoryState.peakUsage,
      averageUsage: this.metrics.averageUsage
    });
    
    info('Memory monitoring stopped');
  }
  
  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    const currentUsage = this.getCurrentMemoryUsage();
    this.memoryState.currentUsage = currentUsage;
    
    // Update peak usage
    if (currentUsage > this.memoryState.peakUsage) {
      this.memoryState.peakUsage = currentUsage;
      this.metrics.peakUsage = currentUsage;
    }
    
    // Update metrics
    this.updateMemoryMetrics(currentUsage);
    
    // Add to history
    this.addToMemoryHistory(currentUsage);
    
    // Calculate usage percentage
    const usagePercentage = currentUsage / this.config.maxMemoryUsage;
    
    // Check thresholds
    if (usagePercentage >= this.config.criticalThreshold) {
      this.handleCriticalMemory(currentUsage, usagePercentage);
    } else if (usagePercentage >= this.config.warningThreshold) {
      this.handleMemoryWarning(currentUsage, usagePercentage);
    }
    
    // Emit memory status
    this.emit('memoryStatus', {
      current: currentUsage,
      percentage: usagePercentage * 100,
      peak: this.memoryState.peakUsage,
      limit: this.config.maxMemoryUsage
    });
  }
  
  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return memUsage.heapUsed;
    }
    
    // Fallback for environments without process.memoryUsage
    return 0;
  }
  
  /**
   * Handle memory warning threshold
   */
  handleMemoryWarning(usage, percentage) {
    this.metrics.memoryWarnings++;
    
    warn('Memory usage warning', {
      current: `${Math.round(usage / 1024 / 1024)}MB`,
      percentage: `${(percentage * 100).toFixed(1)}%`,
      limit: `${Math.round(this.config.maxMemoryUsage / 1024 / 1024)}MB`
    });
    
    this.emit('memoryWarning', {
      usage,
      percentage,
      limit: this.config.maxMemoryUsage
    });
    
    // Trigger optimization if enabled
    if (this.config.enableMemoryOptimization) {
      this.optimizeMemoryUsage('warning');
    }
  }
  
  /**
   * Handle critical memory threshold
   */
  handleCriticalMemory(usage, percentage) {
    this.metrics.memoryCriticals++;
    
    error('Critical memory usage', {
      current: `${Math.round(usage / 1024 / 1024)}MB`,
      percentage: `${(percentage * 100).toFixed(1)}%`,
      limit: `${Math.round(this.config.maxMemoryUsage / 1024 / 1024)}MB`
    });
    
    this.emit('memoryCritical', {
      usage,
      percentage,
      limit: this.config.maxMemoryUsage
    });
    
    // Force optimization
    this.optimizeMemoryUsage('critical');
    
    // Force garbage collection if enabled
    if (this.config.enableGarbageCollection) {
      this.forceGarbageCollection();
    }
  }
  
  /**
   * Optimize memory usage
   */
  optimizeMemoryUsage(level = 'normal') {
    debug('Optimizing memory usage', { level });
    
    this.metrics.optimizationsTriggered++;
    
    // Clean up old memory history
    this.cleanupMemoryHistory();
    
    // Clean up chunk memory tracking
    this.cleanupChunkMemory();
    
    // Clear object counts if tracking is enabled
    if (this.config.trackObjectCounts) {
      this.objectCounts.clear();
    }
    
    this.emit('memoryOptimized', {
      level,
      usageAfter: this.getCurrentMemoryUsage()
    });
    
    info('Memory optimization completed', { level });
  }
  
  /**
   * Force garbage collection
   */
  forceGarbageCollection() {
    if (typeof global !== 'undefined' && global.gc) {
      try {
        const beforeGC = this.getCurrentMemoryUsage();
        global.gc();
        const afterGC = this.getCurrentMemoryUsage();
        
        this.memoryState.lastGCTime = Date.now();
        this.memoryState.gcCount++;
        this.metrics.garbageCollections++;
        
        const freed = beforeGC - afterGC;
        
        debug('Forced garbage collection', {
          freed: `${Math.round(freed / 1024 / 1024)}MB`,
          before: `${Math.round(beforeGC / 1024 / 1024)}MB`,
          after: `${Math.round(afterGC / 1024 / 1024)}MB`
        });
        
        this.emit('garbageCollected', {
          freed,
          beforeGC,
          afterGC
        });
        
      } catch (err) {
        warn('Failed to force garbage collection', { error: err.message });
      }
    } else {
      debug('Garbage collection not available (use --expose-gc flag)');
    }
  }
  
  /**
   * Track chunk memory allocation
   */
  trackChunkMemory(chunkId, memorySize) {
    if (!this.config.trackObjectCounts) {
      return;
    }
    
    this.chunkMemoryMap.set(chunkId, {
      size: memorySize,
      allocatedAt: Date.now()
    });
    
    this.metrics.totalAllocations++;
    
    debug('Chunk memory tracked', {
      chunkId,
      size: `${Math.round(memorySize / 1024)}KB`
    });
  }
  
  /**
   * Release chunk memory tracking
   */
  releaseChunkMemory(chunkId) {
    if (!this.config.trackObjectCounts) {
      return;
    }
    
    const chunkMemory = this.chunkMemoryMap.get(chunkId);
    if (chunkMemory) {
      this.chunkMemoryMap.delete(chunkId);
      this.metrics.totalDeallocations++;
      
      debug('Chunk memory released', {
        chunkId,
        size: `${Math.round(chunkMemory.size / 1024)}KB`,
        duration: Date.now() - chunkMemory.allocatedAt
      });
    }
  }
  
  /**
   * Get memory recommendations for chunk size
   */
  getChunkSizeRecommendation(currentChunkSize) {
    const usagePercentage = this.memoryState.currentUsage / this.config.maxMemoryUsage;
    
    if (usagePercentage >= this.config.criticalThreshold) {
      // Reduce chunk size significantly
      return Math.floor(currentChunkSize * this.config.chunkSizeReduction);
    } else if (usagePercentage >= this.config.warningThreshold) {
      // Reduce chunk size moderately
      return Math.floor(currentChunkSize * 0.75);
    } else if (usagePercentage < 0.5) {
      // Can increase chunk size if memory usage is low
      return Math.floor(currentChunkSize * 1.25);
    }
    
    return currentChunkSize;
  }
  
  /**
   * Check if memory is available for operation
   */
  isMemoryAvailable(requiredMemory) {
    const currentUsage = this.getCurrentMemoryUsage();
    const projectedUsage = currentUsage + requiredMemory;
    
    return projectedUsage <= this.config.maxMemoryUsage * this.config.warningThreshold;
  }
  
  /**
   * Add to memory history
   */
  addToMemoryHistory(usage) {
    this.memoryHistory.push({
      timestamp: Date.now(),
      usage
    });
    
    // Keep only recent history (last 100 entries)
    if (this.memoryHistory.length > 100) {
      this.memoryHistory = this.memoryHistory.slice(-50);
    }
  }
  
  /**
   * Cleanup memory history
   */
  cleanupMemoryHistory() {
    // Keep only recent entries
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes
    this.memoryHistory = this.memoryHistory.filter(entry => 
      entry.timestamp > cutoffTime
    );
  }
  
  /**
   * Cleanup chunk memory tracking
   */
  cleanupChunkMemory() {
    const cutoffTime = Date.now() - (10 * 60 * 1000); // 10 minutes
    
    for (const [chunkId, chunkMemory] of this.chunkMemoryMap.entries()) {
      if (chunkMemory.allocatedAt < cutoffTime) {
        this.chunkMemoryMap.delete(chunkId);
        debug('Cleaned up stale chunk memory tracking', { chunkId });
      }
    }
  }
  
  /**
   * Update memory metrics
   */
  updateMemoryMetrics(usage) {
    const historyLength = this.memoryHistory.length;
    if (historyLength > 0) {
      const totalUsage = this.memoryHistory.reduce((sum, entry) => sum + entry.usage, 0);
      this.metrics.averageUsage = totalUsage / historyLength;
    }
  }
  
  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    if (!this.config.enableMemoryLeakDetection) {
      return null;
    }
    
    if (this.memoryHistory.length < 10) {
      return null; // Not enough data
    }
    
    // Check for consistent memory growth
    const recentEntries = this.memoryHistory.slice(-10);
    let growthCount = 0;
    
    for (let i = 1; i < recentEntries.length; i++) {
      if (recentEntries[i].usage > recentEntries[i - 1].usage) {
        growthCount++;
      }
    }
    
    // If memory grew in 80% of recent samples, might be a leak
    const growthPercentage = growthCount / (recentEntries.length - 1);
    if (growthPercentage > 0.8) {
      const leak = {
        detected: true,
        growthPercentage: growthPercentage * 100,
        recentGrowth: recentEntries[recentEntries.length - 1].usage - recentEntries[0].usage,
        suspiciousObjects: this.findSuspiciousObjects()
      };
      
      warn('Potential memory leak detected', {
        growthPercentage: `${leak.growthPercentage.toFixed(1)}%`,
        recentGrowth: `${Math.round(leak.recentGrowth / 1024 / 1024)}MB`
      });
      
      this.emit('memoryLeakDetected', leak);
      return leak;
    }
    
    return null;
  }
  
  /**
   * Find suspicious objects (placeholder implementation)
   */
  findSuspiciousObjects() {
    // In a real implementation, this would analyze heap snapshots
    // or use memory profiling tools to identify object types
    return Array.from(this.objectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }
  
  /**
   * Get memory status
   */
  getMemoryStatus() {
    const currentUsage = this.getCurrentMemoryUsage();
    const usagePercentage = currentUsage / this.config.maxMemoryUsage;
    
    return {
      current: currentUsage,
      peak: this.memoryState.peakUsage,
      baseline: this.memoryState.baselineUsage,
      percentage: usagePercentage * 100,
      limit: this.config.maxMemoryUsage,
      available: this.config.maxMemoryUsage - currentUsage,
      status: this.getMemoryStatusLevel(usagePercentage),
      chunkMemoryTracked: this.chunkMemoryMap.size,
      isMonitoring: this.memoryState.isMonitoring
    };
  }
  
  /**
   * Get memory status level
   */
  getMemoryStatusLevel(percentage) {
    if (percentage >= this.config.criticalThreshold) {
      return 'critical';
    } else if (percentage >= this.config.warningThreshold) {
      return 'warning';
    } else {
      return 'normal';
    }
  }
  
  /**
   * Get memory statistics
   */
  getStatistics() {
    return {
      ...this.metrics,
      currentUsage: this.memoryState.currentUsage,
      peakUsage: this.memoryState.peakUsage,
      baselineUsage: this.memoryState.baselineUsage,
      trackedChunks: this.chunkMemoryMap.size,
      historyEntries: this.memoryHistory.length,
      gcCount: this.memoryState.gcCount,
      lastGCTime: this.memoryState.lastGCTime
    };
  }
  
  /**
   * Export memory data
   */
  exportData() {
    return {
      status: this.getMemoryStatus(),
      statistics: this.getStatistics(),
      history: [...this.memoryHistory],
      chunkMemory: Object.fromEntries(this.chunkMemoryMap),
      config: { ...this.config }
    };
  }
  
  /**
   * Reset statistics
   */
  resetStatistics() {
    this.metrics = {
      totalAllocations: 0,
      totalDeallocations: 0,
      garbageCollections: 0,
      memoryWarnings: 0,
      memoryCriticals: 0,
      optimizationsTriggered: 0,
      averageUsage: 0,
      peakUsage: 0
    };
    
    this.memoryHistory = [];
    this.chunkMemoryMap.clear();
    this.objectCounts.clear();
    
    debug('Memory statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.stopMonitoring();
    this.chunkMemoryMap.clear();
    this.memoryHistory = [];
    this.objectCounts.clear();
    this.removeAllListeners();
    
    debug('Memory manager cleaned up');
  }
}