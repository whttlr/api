/**
 * Conflict Resolver
 * 
 * Handles resolution of state conflicts and discrepancies between
 * software and hardware state, with configurable resolution strategies.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class ConflictResolver extends EventEmitter {
  constructor(stateManager, commandManager, config = {}) {
    super();
    
    if (!stateManager) {
      throw new Error('ConflictResolver requires a StateManager');
    }
    
    if (!commandManager) {
      throw new Error('ConflictResolver requires a CommandManager');
    }
    
    this.stateManager = stateManager;
    this.commandManager = commandManager;
    
    this.config = {
      enableAutoResolution: true,       // Enable automatic conflict resolution
      prioritizeHardware: true,         // Hardware state takes precedence
      maxResolutionAttempts: 3,         // Maximum resolution attempts per conflict
      resolutionTimeout: 5000,          // Resolution operation timeout (ms)
      enablePositionCorrection: true,   // Enable position corrections
      enableStatusCorrection: true,     // Enable status corrections
      enableModalCorrection: true,      // Enable modal group corrections
      requireConfirmation: false,       // Require user confirmation for critical corrections
      trackResolutions: true,           // Track resolution history
      maxResolutionHistory: 100,        // Maximum resolution history entries
      ...config
    };
    
    this.resolutionStrategies = this.createResolutionStrategies();
    this.resolutionHistory = [];
    this.resolutionMetrics = {
      totalConflicts: 0,
      resolvedConflicts: 0,
      failedResolutions: 0,
      automaticResolutions: 0,
      manualResolutions: 0,
      lastResolution: null
    };
    
    this.activeResolutions = new Set();
  }
  
  /**
   * Resolve state discrepancies
   */
  async resolveDiscrepancies(discrepancies) {
    if (!discrepancies || discrepancies.length === 0) {
      return { success: true, resolvedCount: 0, failedCount: 0 };
    }
    
    debug('Resolving state discrepancies', { count: discrepancies.length });
    
    const resolutionResults = {
      resolvedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: []
    };
    
    // Group discrepancies by category for efficient resolution
    const groupedDiscrepancies = this.groupDiscrepanciesByCategory(discrepancies);
    
    // Resolve discrepancies by category
    for (const [category, categoryDiscrepancies] of Object.entries(groupedDiscrepancies)) {
      try {
        const categoryResult = await this.resolveCategoryDiscrepancies(category, categoryDiscrepancies);
        resolutionResults.results.push(categoryResult);
        
        resolutionResults.resolvedCount += categoryResult.resolvedCount;
        resolutionResults.failedCount += categoryResult.failedCount;
        resolutionResults.skippedCount += categoryResult.skippedCount;
        
      } catch (err) {
        error(`Failed to resolve ${category} discrepancies`, { error: err.message });
        resolutionResults.failedCount += categoryDiscrepancies.length;
      }
    }
    
    // Update metrics
    this.updateResolutionMetrics(resolutionResults);
    
    info('Discrepancy resolution completed', {
      total: discrepancies.length,
      resolved: resolutionResults.resolvedCount,
      failed: resolutionResults.failedCount,
      skipped: resolutionResults.skippedCount
    });
    
    this.emit('discrepanciesResolved', {
      totalDiscrepancies: discrepancies.length,
      results: resolutionResults
    });
    
    return {
      success: resolutionResults.failedCount === 0,
      ...resolutionResults
    };
  }
  
  /**
   * Resolve discrepancies for a specific category
   */
  async resolveCategoryDiscrepancies(category, discrepancies) {
    const strategy = this.resolutionStrategies[category];
    
    if (!strategy) {
      warn(`No resolution strategy for category: ${category}`);
      return {
        category,
        resolvedCount: 0,
        failedCount: discrepancies.length,
        skippedCount: 0,
        resolutions: []
      };
    }
    
    const result = {
      category,
      resolvedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      resolutions: []
    };
    
    for (const discrepancy of discrepancies) {
      try {
        const resolutionResult = await this.resolveIndividualDiscrepancy(discrepancy, strategy);
        result.resolutions.push(resolutionResult);
        
        if (resolutionResult.success) {
          result.resolvedCount++;
        } else if (resolutionResult.skipped) {
          result.skippedCount++;
        } else {
          result.failedCount++;
        }
        
      } catch (err) {
        error('Failed to resolve discrepancy', { 
          field: discrepancy.field, 
          error: err.message 
        });
        result.failedCount++;
        result.resolutions.push({
          field: discrepancy.field,
          success: false,
          error: err.message
        });
      }
    }
    
    return result;
  }
  
  /**
   * Resolve individual discrepancy
   */
  async resolveIndividualDiscrepancy(discrepancy, strategy) {
    const resolutionId = `${discrepancy.field}_${Date.now()}`;
    
    // Prevent duplicate resolutions
    if (this.activeResolutions.has(discrepancy.field)) {
      return {
        field: discrepancy.field,
        success: false,
        skipped: true,
        reason: 'Resolution already in progress'
      };
    }
    
    // Check if resolution is needed based on severity
    if (!this.shouldResolveDiscrepancy(discrepancy)) {
      return {
        field: discrepancy.field,
        success: false,
        skipped: true,
        reason: 'Discrepancy below resolution threshold'
      };
    }
    
    this.activeResolutions.add(discrepancy.field);
    
    try {
      debug('Resolving discrepancy', { 
        field: discrepancy.field, 
        severity: discrepancy.severity 
      });
      
      const resolution = await strategy.resolve(discrepancy, this.config);
      
      if (resolution.success) {
        // Track successful resolution
        this.trackResolution(discrepancy, resolution);
        
        info('Discrepancy resolved', { 
          field: discrepancy.field,
          method: resolution.method
        });
      }
      
      return {
        field: discrepancy.field,
        success: resolution.success,
        method: resolution.method,
        action: resolution.action,
        value: resolution.value
      };
      
    } finally {
      this.activeResolutions.delete(discrepancy.field);
    }
  }
  
  /**
   * Determine if discrepancy should be resolved
   */
  shouldResolveDiscrepancy(discrepancy) {
    if (!this.config.enableAutoResolution) {
      return false;
    }
    
    // Always resolve critical discrepancies
    if (discrepancy.severity === 'critical') {
      return true;
    }
    
    // Skip minor discrepancies if configured to ignore them
    if (discrepancy.severity === 'minor' && this.config.ignoreMinorDiscrepancies) {
      return false;
    }
    
    // Check category-specific enablement
    const categoryMap = {
      'position': 'enablePositionCorrection',
      'status': 'enableStatusCorrection',
      'motion': 'enableModalCorrection'
    };
    
    const configKey = categoryMap[discrepancy.category];
    if (configKey && !this.config[configKey]) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create resolution strategies
   */
  createResolutionStrategies() {
    return {
      position: {
        resolve: async (discrepancy, config) => {
          if (config.prioritizeHardware) {
            // Update software state to match hardware
            const field = discrepancy.field;
            const hardwareValue = discrepancy.hardware;
            
            if (field.startsWith('machine.')) {
              const axis = field.split('.')[1];
              const currentPos = this.stateManager.getStateSection('position');
              const newMachinePos = { ...currentPos.machine };
              newMachinePos[axis] = hardwareValue;
              
              this.stateManager.updatePosition(newMachinePos);
              
              return {
                success: true,
                method: 'hardware_priority',
                action: 'update_software_position',
                value: hardwareValue
              };
            }
          } else {
            // Send command to move hardware to software position
            const softwareValue = discrepancy.software;
            // Note: This would be dangerous in a real system without safety checks
            warn('Hardware position correction not implemented for safety');
            
            return {
              success: false,
              method: 'software_priority',
              action: 'hardware_position_correction_disabled',
              reason: 'Safety restriction'
            };
          }
        }
      },
      
      status: {
        resolve: async (discrepancy, config) => {
          if (config.prioritizeHardware) {
            // Update software status to match hardware
            const hardwareValue = discrepancy.hardware;
            
            if (discrepancy.field === 'state') {
              this.stateManager.updateStatus(hardwareValue);
            } else if (discrepancy.field === 'subState') {
              const currentStatus = this.stateManager.getStateSection('status');
              this.stateManager.updateStatus(currentStatus.state, hardwareValue);
            }
            
            return {
              success: true,
              method: 'hardware_priority',
              action: 'update_software_status',
              value: hardwareValue
            };
          }
          
          return {
            success: false,
            method: 'software_priority',
            reason: 'Cannot force hardware status change'
          };
        }
      },
      
      motion: {
        resolve: async (discrepancy, config) => {
          if (config.prioritizeHardware) {
            // Update software motion values to match hardware
            const hardwareValue = discrepancy.hardware;
            
            if (discrepancy.field === 'feedRate') {
              this.stateManager.updateFeedRate(hardwareValue);
            } else if (discrepancy.field === 'spindleSpeed') {
              // Update spindle speed in motion state
              const currentMotion = this.stateManager.getStateSection('motion');
              currentMotion.spindleSpeed = hardwareValue;
            }
            
            return {
              success: true,
              method: 'hardware_priority',
              action: 'update_software_motion',
              value: hardwareValue
            };
          }
          
          return {
            success: false,
            method: 'software_priority',
            reason: 'Motion value synchronization from software to hardware not implemented'
          };
        }
      },
      
      buffer: {
        resolve: async (discrepancy, config) => {
          // Buffer discrepancies are typically informational only
          // Hardware buffer state is authoritative
          const hardwareValue = discrepancy.hardware;
          
          this.stateManager.updateBuffer({
            [discrepancy.field.split('.')[1]]: hardwareValue
          });
          
          return {
            success: true,
            method: 'hardware_priority',
            action: 'update_software_buffer',
            value: hardwareValue
          };
        }
      }
    };
  }
  
  /**
   * Group discrepancies by category
   */
  groupDiscrepanciesByCategory(discrepancies) {
    const grouped = {};
    
    discrepancies.forEach(discrepancy => {
      const category = this.determineDiscrepancyCategory(discrepancy);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({ ...discrepancy, category });
    });
    
    return grouped;
  }
  
  /**
   * Determine discrepancy category from field name
   */
  determineDiscrepancyCategory(discrepancy) {
    const field = discrepancy.field;
    
    if (field.includes('position') || field.includes('machine.') || field.includes('work.')) {
      return 'position';
    }
    
    if (field.includes('state') || field.includes('status')) {
      return 'status';
    }
    
    if (field.includes('feedRate') || field.includes('spindleSpeed')) {
      return 'motion';
    }
    
    if (field.includes('buffer')) {
      return 'buffer';
    }
    
    return 'other';
  }
  
  /**
   * Track resolution in history
   */
  trackResolution(discrepancy, resolution) {
    if (!this.config.trackResolutions) {
      return;
    }
    
    const resolutionRecord = {
      timestamp: Date.now(),
      field: discrepancy.field,
      severity: discrepancy.severity,
      softwareValue: discrepancy.software,
      hardwareValue: discrepancy.hardware,
      resolution: {
        method: resolution.method,
        action: resolution.action,
        value: resolution.value
      }
    };
    
    this.resolutionHistory.push(resolutionRecord);
    
    // Limit history size
    if (this.resolutionHistory.length > this.config.maxResolutionHistory) {
      this.resolutionHistory = this.resolutionHistory.slice(-this.config.maxResolutionHistory);
    }
  }
  
  /**
   * Update resolution metrics
   */
  updateResolutionMetrics(results) {
    this.resolutionMetrics.totalConflicts += results.resolvedCount + results.failedCount;
    this.resolutionMetrics.resolvedConflicts += results.resolvedCount;
    this.resolutionMetrics.failedResolutions += results.failedCount;
    this.resolutionMetrics.lastResolution = Date.now();
    
    // All resolutions are currently automatic
    this.resolutionMetrics.automaticResolutions += results.resolvedCount;
  }
  
  /**
   * Get resolution statistics
   */
  getResolutionStatistics() {
    return {
      ...this.resolutionMetrics,
      historyEntries: this.resolutionHistory.length,
      resolutionRate: this.resolutionMetrics.totalConflicts > 0 ? 
        (this.resolutionMetrics.resolvedConflicts / this.resolutionMetrics.totalConflicts) * 100 : 0,
      activeResolutions: this.activeResolutions.size
    };
  }
  
  /**
   * Get resolution history
   */
  getResolutionHistory(limit = 20) {
    return this.resolutionHistory.slice(-limit);
  }
  
  /**
   * Analyze resolution trends
   */
  analyzeResolutionTrends() {
    if (this.resolutionHistory.length < 5) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = this.resolutionHistory.slice(-10);
    const categoryTrends = {};
    
    // Count resolutions by category
    recent.forEach(resolution => {
      const category = this.determineDiscrepancyCategory(resolution);
      categoryTrends[category] = (categoryTrends[category] || 0) + 1;
    });
    
    // Find most problematic category
    const mostProblematic = Object.entries(categoryTrends)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      trend: 'active',
      mostProblematicCategory: mostProblematic ? mostProblematic[0] : null,
      categoryTrends,
      recentResolutions: recent.length,
      timespan: recent.length > 0 ? recent[recent.length - 1].timestamp - recent[0].timestamp : 0
    };
  }
  
  /**
   * Export resolution data
   */
  exportData() {
    return {
      metrics: { ...this.resolutionMetrics },
      history: [...this.resolutionHistory],
      trends: this.analyzeResolutionTrends(),
      activeResolutions: Array.from(this.activeResolutions),
      config: { ...this.config }
    };
  }
  
  /**
   * Reset resolution statistics
   */
  resetStatistics() {
    this.resolutionMetrics = {
      totalConflicts: 0,
      resolvedConflicts: 0,
      failedResolutions: 0,
      automaticResolutions: 0,
      manualResolutions: 0,
      lastResolution: null
    };
    
    this.resolutionHistory = [];
    
    debug('Resolution statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.activeResolutions.clear();
    this.resolutionHistory = [];
    this.removeAllListeners();
  }
}