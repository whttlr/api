/**
 * State Comparator
 * 
 * Compares software state with hardware state to identify discrepancies,
 * conflicts, and synchronization needs.
 */

import { EventEmitter } from 'events';
import { debug, warn } from '../../lib/logger/LoggerService.js';

export class StateComparator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      positionTolerance: 0.01,          // Position comparison tolerance (mm)
      speedTolerance: 1.0,              // Speed comparison tolerance (mm/min or RPM)
      enableDeepComparison: true,       // Enable detailed field-by-field comparison
      ignoreMinorDiscrepancies: true,   // Ignore minor, non-critical differences
      trackComparisonHistory: true,     // Track comparison results over time
      maxHistoryEntries: 100,           // Maximum history entries to keep
      ...config
    };
    
    this.comparisonHistory = [];
    this.comparisonMetrics = {
      totalComparisons: 0,
      discrepanciesFound: 0,
      criticalDiscrepancies: 0,
      minorDiscrepancies: 0,
      lastComparison: null
    };
  }
  
  /**
   * Compare software and hardware states
   */
  compareStates(softwareState, hardwareState) {
    const comparisonStartTime = Date.now();
    
    debug('Comparing software and hardware states');
    
    const comparison = {
      timestamp: comparisonStartTime,
      discrepancies: [],
      summary: {
        totalFields: 0,
        matchingFields: 0,
        discrepantFields: 0,
        criticalIssues: 0,
        minorIssues: 0
      },
      categories: {
        position: null,
        status: null,
        motion: null,
        buffer: null,
        settings: null
      }
    };
    
    // Compare different state categories
    comparison.categories.position = this.comparePosition(
      softwareState.position, 
      hardwareState.position
    );
    
    comparison.categories.status = this.compareStatus(
      softwareState.status, 
      hardwareState.status
    );
    
    comparison.categories.motion = this.compareMotion(
      softwareState.motion, 
      hardwareState.motion
    );
    
    comparison.categories.buffer = this.compareBuffer(
      softwareState.buffer, 
      hardwareState.buffer
    );
    
    if (this.config.enableDeepComparison) {
      comparison.categories.settings = this.compareSettings(
        softwareState.modalGroups,
        hardwareState.settings
      );
    }
    
    // Collect all discrepancies
    Object.values(comparison.categories).forEach(category => {
      if (category && category.discrepancies) {
        comparison.discrepancies.push(...category.discrepancies);
        comparison.summary.totalFields += category.totalFields || 0;
        comparison.summary.matchingFields += category.matchingFields || 0;
      }
    });
    
    // Calculate summary statistics
    comparison.summary.discrepantFields = comparison.discrepancies.length;
    comparison.summary.criticalIssues = comparison.discrepancies.filter(d => d.severity === 'critical').length;
    comparison.summary.minorIssues = comparison.discrepancies.filter(d => d.severity === 'minor').length;
    
    // Update metrics
    this.updateComparisonMetrics(comparison);
    
    // Track history
    if (this.config.trackComparisonHistory) {
      this.addToHistory(comparison);
    }
    
    const comparisonTime = Date.now() - comparisonStartTime;
    debug('State comparison completed', { 
      discrepancies: comparison.discrepancies.length,
      comparisonTime: `${comparisonTime}ms`
    });
    
    this.emit('statesCompared', {
      comparison,
      comparisonTime
    });
    
    return comparison;
  }
  
  /**
   * Compare position data
   */
  comparePosition(softwarePos, hardwarePos) {
    const result = {
      category: 'position',
      totalFields: 6, // x, y, z for both machine and work coordinates
      matchingFields: 0,
      discrepancies: []
    };
    
    if (!softwarePos || !hardwarePos) {
      if (softwarePos !== hardwarePos) {
        result.discrepancies.push({
          field: 'position',
          severity: 'critical',
          software: softwarePos,
          hardware: hardwarePos,
          message: 'Position data missing from one source'
        });
      }
      return result;
    }
    
    // Compare machine coordinates
    if (softwarePos.machine && hardwarePos.machine) {
      ['x', 'y', 'z'].forEach(axis => {
        const softVal = softwarePos.machine[axis];
        const hardVal = hardwarePos.machine[axis];
        
        if (this.compareNumericValues(softVal, hardVal, this.config.positionTolerance)) {
          result.matchingFields++;
        } else {
          result.discrepancies.push({
            field: `machine.${axis}`,
            severity: 'critical',
            software: softVal,
            hardware: hardVal,
            difference: Math.abs(softVal - hardVal),
            tolerance: this.config.positionTolerance,
            message: `Machine ${axis.toUpperCase()}-axis position mismatch`
          });
        }
      });
    }
    
    // Compare work coordinates
    if (softwarePos.work && hardwarePos.work) {
      ['x', 'y', 'z'].forEach(axis => {
        const softVal = softwarePos.work[axis];
        const hardVal = hardwarePos.work[axis];
        
        if (this.compareNumericValues(softVal, hardVal, this.config.positionTolerance)) {
          result.matchingFields++;
        } else {
          result.discrepancies.push({
            field: `work.${axis}`,
            severity: 'minor',
            software: softVal,
            hardware: hardVal,
            difference: Math.abs(softVal - hardVal),
            tolerance: this.config.positionTolerance,
            message: `Work ${axis.toUpperCase()}-axis position mismatch`
          });
        }
      });
    }
    
    return result;
  }
  
  /**
   * Compare status data
   */
  compareStatus(softwareStatus, hardwareStatus) {
    const result = {
      category: 'status',
      totalFields: 2, // state and subState
      matchingFields: 0,
      discrepancies: []
    };
    
    if (!softwareStatus || !hardwareStatus) {
      result.discrepancies.push({
        field: 'status',
        severity: 'critical',
        software: softwareStatus,
        hardware: hardwareStatus,
        message: 'Status data missing from one source'
      });
      return result;
    }
    
    // Compare machine state
    if (softwareStatus.state === hardwareStatus.state) {
      result.matchingFields++;
    } else {
      result.discrepancies.push({
        field: 'state',
        severity: 'critical',
        software: softwareStatus.state,
        hardware: hardwareStatus.state,
        message: 'Machine state mismatch'
      });
    }
    
    // Compare sub-state
    if (softwareStatus.subState === hardwareStatus.subState) {
      result.matchingFields++;
    } else {
      const severity = (softwareStatus.subState === null || hardwareStatus.subState === null) ? 'minor' : 'critical';
      result.discrepancies.push({
        field: 'subState',
        severity,
        software: softwareStatus.subState,
        hardware: hardwareStatus.subState,
        message: 'Machine sub-state mismatch'
      });
    }
    
    return result;
  }
  
  /**
   * Compare motion data
   */
  compareMotion(softwareMotion, hardwareMotion) {
    const result = {
      category: 'motion',
      totalFields: 2, // feedRate and spindleSpeed
      matchingFields: 0,
      discrepancies: []
    };
    
    if (!softwareMotion && !hardwareMotion) {
      return result;
    }
    
    if (!softwareMotion || !hardwareMotion) {
      result.discrepancies.push({
        field: 'motion',
        severity: 'minor',
        software: softwareMotion,
        hardware: hardwareMotion,
        message: 'Motion data missing from one source'
      });
      return result;
    }
    
    // Compare feed rate
    if (this.compareNumericValues(softwareMotion.feedRate, hardwareMotion.feedRate, this.config.speedTolerance)) {
      result.matchingFields++;
    } else {
      result.discrepancies.push({
        field: 'feedRate',
        severity: 'minor',
        software: softwareMotion.feedRate,
        hardware: hardwareMotion.feedRate,
        difference: Math.abs(softwareMotion.feedRate - hardwareMotion.feedRate),
        tolerance: this.config.speedTolerance,
        message: 'Feed rate mismatch'
      });
    }
    
    // Compare spindle speed
    if (this.compareNumericValues(softwareMotion.spindleSpeed, hardwareMotion.spindleSpeed, this.config.speedTolerance)) {
      result.matchingFields++;
    } else {
      result.discrepancies.push({
        field: 'spindleSpeed',
        severity: 'minor',
        software: softwareMotion.spindleSpeed,
        hardware: hardwareMotion.spindleSpeed,
        difference: Math.abs(softwareMotion.spindleSpeed - hardwareMotion.spindleSpeed),
        tolerance: this.config.speedTolerance,
        message: 'Spindle speed mismatch'
      });
    }
    
    return result;
  }
  
  /**
   * Compare buffer data
   */
  compareBuffer(softwareBuffer, hardwareBuffer) {
    const result = {
      category: 'buffer',
      totalFields: 2, // available and used
      matchingFields: 0,
      discrepancies: []
    };
    
    if (!softwareBuffer && !hardwareBuffer) {
      return result;
    }
    
    if (!softwareBuffer || !hardwareBuffer) {
      result.discrepancies.push({
        field: 'buffer',
        severity: 'minor',
        software: softwareBuffer,
        hardware: hardwareBuffer,
        message: 'Buffer data missing from one source'
      });
      return result;
    }
    
    // Compare available buffer
    if (softwareBuffer.available === hardwareBuffer.available) {
      result.matchingFields++;
    } else {
      result.discrepancies.push({
        field: 'buffer.available',
        severity: 'minor',
        software: softwareBuffer.available,
        hardware: hardwareBuffer.available,
        message: 'Available buffer size mismatch'
      });
    }
    
    // Compare used buffer
    if (softwareBuffer.used === hardwareBuffer.used) {
      result.matchingFields++;
    } else {
      result.discrepancies.push({
        field: 'buffer.used',
        severity: 'minor',
        software: softwareBuffer.used,
        hardware: hardwareBuffer.used,
        message: 'Used buffer size mismatch'
      });
    }
    
    return result;
  }
  
  /**
   * Compare settings (modal groups vs GRBL settings)
   */
  compareSettings(softwareModalGroups, hardwareSettings) {
    const result = {
      category: 'settings',
      totalFields: 0,
      matchingFields: 0,
      discrepancies: []
    };
    
    if (!softwareModalGroups || !hardwareSettings) {
      return result;
    }
    
    // This is a simplified comparison - in reality, you'd need mapping
    // between modal groups and GRBL settings
    
    // Example: Compare units setting
    const softwareUnits = softwareModalGroups.units; // G20 or G21
    const hardwareUnits = hardwareSettings.get(13); // Report in inches setting
    
    if (softwareUnits && hardwareUnits !== undefined) {
      result.totalFields++;
      const softwareIsInches = softwareUnits === 'G20';
      const hardwareIsInches = hardwareUnits === 1;
      
      if (softwareIsInches === hardwareIsInches) {
        result.matchingFields++;
      } else {
        result.discrepancies.push({
          field: 'units',
          severity: 'minor',
          software: softwareUnits,
          hardware: hardwareIsInches ? 'inches' : 'mm',
          message: 'Units setting mismatch between modal groups and GRBL settings'
        });
      }
    }
    
    return result;
  }
  
  /**
   * Compare numeric values with tolerance
   */
  compareNumericValues(val1, val2, tolerance) {
    if (val1 === val2) return true;
    if (val1 == null || val2 == null) return val1 === val2;
    
    return Math.abs(val1 - val2) <= tolerance;
  }
  
  /**
   * Update comparison metrics
   */
  updateComparisonMetrics(comparison) {
    this.comparisonMetrics.totalComparisons++;
    this.comparisonMetrics.lastComparison = comparison.timestamp;
    
    if (comparison.discrepancies.length > 0) {
      this.comparisonMetrics.discrepanciesFound++;
      this.comparisonMetrics.criticalDiscrepancies += comparison.summary.criticalIssues;
      this.comparisonMetrics.minorDiscrepancies += comparison.summary.minorIssues;
    }
  }
  
  /**
   * Add comparison to history
   */
  addToHistory(comparison) {
    this.comparisonHistory.push({
      timestamp: comparison.timestamp,
      discrepancies: comparison.discrepancies.length,
      criticalIssues: comparison.summary.criticalIssues,
      minorIssues: comparison.summary.minorIssues,
      summary: comparison.summary
    });
    
    // Limit history size
    if (this.comparisonHistory.length > this.config.maxHistoryEntries) {
      this.comparisonHistory = this.comparisonHistory.slice(-this.config.maxHistoryEntries);
    }
  }
  
  /**
   * Get comparison statistics
   */
  getComparisonStatistics() {
    return {
      ...this.comparisonMetrics,
      historyEntries: this.comparisonHistory.length,
      discrepancyRate: this.comparisonMetrics.totalComparisons > 0 ? 
        (this.comparisonMetrics.discrepanciesFound / this.comparisonMetrics.totalComparisons) * 100 : 0
    };
  }
  
  /**
   * Get comparison history
   */
  getComparisonHistory(limit = 20) {
    return this.comparisonHistory.slice(-limit);
  }
  
  /**
   * Analyze comparison trends
   */
  analyzeComparisonTrends() {
    if (this.comparisonHistory.length < 2) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = this.comparisonHistory.slice(-10);
    const older = this.comparisonHistory.slice(-20, -10);
    
    const recentAvgDiscrepancies = recent.reduce((sum, c) => sum + c.discrepancies, 0) / recent.length;
    const olderAvgDiscrepancies = older.length > 0 ? 
      older.reduce((sum, c) => sum + c.discrepancies, 0) / older.length : recentAvgDiscrepancies;
    
    let trend = 'stable';
    if (recentAvgDiscrepancies > olderAvgDiscrepancies * 1.2) {
      trend = 'worsening';
    } else if (recentAvgDiscrepancies < olderAvgDiscrepancies * 0.8) {
      trend = 'improving';
    }
    
    return {
      trend,
      recentAverage: recentAvgDiscrepancies,
      previousAverage: olderAvgDiscrepancies,
      improvement: olderAvgDiscrepancies - recentAvgDiscrepancies
    };
  }
  
  /**
   * Export comparison data
   */
  exportData() {
    return {
      metrics: { ...this.comparisonMetrics },
      history: [...this.comparisonHistory],
      trends: this.analyzeComparisonTrends(),
      config: { ...this.config }
    };
  }
  
  /**
   * Reset comparison statistics
   */
  resetStatistics() {
    this.comparisonMetrics = {
      totalComparisons: 0,
      discrepanciesFound: 0,
      criticalDiscrepancies: 0,
      minorDiscrepancies: 0,
      lastComparison: null
    };
    
    this.comparisonHistory = [];
    
    debug('Comparison statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.comparisonHistory = [];
    this.removeAllListeners();
  }
}