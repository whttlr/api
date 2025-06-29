/**
 * Smart Error Classification System
 * 
 * Analyzes and classifies errors from GRBL and serial communication
 * to determine appropriate recovery strategies and retry policies.
 */

import { EventEmitter } from 'events';
import { debug, warn } from '../../lib/logger/LoggerService.js';

export class ErrorClassifier extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableLearning: true,             // Enable pattern learning
      confidenceThreshold: 0.8,        // Minimum confidence for classification
      maxPatternHistory: 1000,          // Maximum patterns to remember
      patternMatchingDepth: 5,          // Commands to look back for patterns
      enableContextualAnalysis: true,   // Consider context when classifying
      ...config
    };
    
    // GRBL error code mappings
    this.grblErrors = new Map([
      [1, { type: 'syntax_error', severity: 'high', retryable: false, description: 'G-code words consist of a letter and a value' }],
      [2, { type: 'syntax_error', severity: 'high', retryable: false, description: 'Bad number format' }],
      [3, { type: 'syntax_error', severity: 'high', retryable: false, description: 'Invalid statement' }],
      [4, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Value < 0' }],
      [5, { type: 'configuration_error', severity: 'medium', retryable: false, description: 'Setting disabled' }],
      [6, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Value < 3 usec' }],
      [7, { type: 'system_error', severity: 'high', retryable: false, description: 'EEPROM read fail' }],
      [8, { type: 'state_error', severity: 'medium', retryable: true, description: 'Not idle' }],
      [9, { type: 'state_error', severity: 'medium', retryable: true, description: 'Locked' }],
      [10, { type: 'limit_error', severity: 'high', retryable: false, description: 'Soft limits' }],
      [11, { type: 'buffer_error', severity: 'medium', retryable: true, description: 'Line overflow' }],
      [12, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Step rate > 30kHz' }],
      [13, { type: 'safety_error', severity: 'high', retryable: false, description: 'Check Door' }],
      [14, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Line length exceeded' }],
      [15, { type: 'safety_error', severity: 'high', retryable: false, description: 'Travel exceeded' }],
      [16, { type: 'syntax_error', severity: 'medium', retryable: false, description: 'Invalid jog command' }],
      [17, { type: 'configuration_error', severity: 'low', retryable: false, description: 'Laser mode disabled' }],
      [20, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Unsupported command' }],
      [21, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Modal group violation' }],
      [22, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Undefined feed rate' }],
      [23, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:23' }],
      [24, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:24' }],
      [25, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:25' }],
      [26, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:26' }],
      [27, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:27' }],
      [28, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:28' }],
      [29, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:29' }],
      [30, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:30' }],
      [31, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:31' }],
      [32, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:32' }],
      [33, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:33' }],
      [34, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:34' }],
      [35, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:35' }],
      [36, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:36' }],
      [37, { type: 'parameter_error', severity: 'medium', retryable: false, description: 'Invalid gcode ID:37' }]
    ]);
    
    // GRBL alarm code mappings
    this.grblAlarms = new Map([
      [1, { type: 'hard_limit', severity: 'critical', retryable: false, description: 'Hard limit triggered' }],
      [2, { type: 'soft_limit', severity: 'high', retryable: false, description: 'G-code motion target exceeds machine travel' }],
      [3, { type: 'abort_error', severity: 'medium', retryable: true, description: 'Reset while in motion' }],
      [4, { type: 'probe_error', severity: 'medium', retryable: false, description: 'Probe fail initial' }],
      [5, { type: 'probe_error', severity: 'medium', retryable: false, description: 'Probe fail contact' }],
      [6, { type: 'homing_error', severity: 'high', retryable: true, description: 'Homing fail reset' }],
      [7, { type: 'homing_error', severity: 'high', retryable: true, description: 'Homing fail door' }],
      [8, { type: 'homing_error', severity: 'high', retryable: true, description: 'Homing fail pull off' }],
      [9, { type: 'homing_error', severity: 'high', retryable: true, description: 'Homing fail approach' }]
    ]);
    
    // Pattern history for learning
    this.errorPatterns = [];
    this.commandHistory = [];
    this.contextPatterns = new Map();
    
    // Classification statistics
    this.stats = {
      totalClassifications: 0,
      correctClassifications: 0,
      unknownErrors: 0,
      patternMatches: 0,
      learningEvents: 0
    };
  }

  /**
   * Classify an error with context
   */
  classifyError(error, context = {}) {
    this.stats.totalClassifications++;
    
    const classification = {
      timestamp: Date.now(),
      original: error,
      context,
      type: 'unknown',
      severity: 'medium',
      retryable: false,
      confidence: 0,
      description: '',
      suggestedActions: [],
      grblCode: null,
      patterns: []
    };
    
    try {
      // First try GRBL-specific classification
      const grblClassification = this.classifyGrblError(error);
      if (grblClassification) {
        Object.assign(classification, grblClassification);
        classification.confidence = 0.95;
      } else {
        // Try pattern-based classification
        const patternClassification = this.classifyByPattern(error, context);
        if (patternClassification) {
          Object.assign(classification, patternClassification);
        } else {
          // Fallback to heuristic classification
          const heuristicClassification = this.classifyByHeuristics(error, context);
          Object.assign(classification, heuristicClassification);
        }
      }
      
      // Add contextual analysis
      if (this.config.enableContextualAnalysis) {
        this.addContextualInsights(classification, context);
      }
      
      // Learn from this classification
      if (this.config.enableLearning) {
        this.learnFromClassification(classification, context);
      }
      
      // Add suggested actions
      this.addSuggestedActions(classification);
      
      debug('Error classified', {
        type: classification.type,
        severity: classification.severity,
        confidence: classification.confidence,
        retryable: classification.retryable
      });
      
      this.emit('errorClassified', classification);
      
      return classification;
      
    } catch (err) {
      warn('Error classification failed', { error: err.message });
      return classification; // Return basic classification
    }
  }

  /**
   * Classify GRBL-specific errors
   */
  classifyGrblError(error) {
    const errorStr = error.toString();
    
    // Check for GRBL error codes
    const errorMatch = errorStr.match(/error:(\d+)/i);
    if (errorMatch) {
      const errorCode = parseInt(errorMatch[1]);
      const grblError = this.grblErrors.get(errorCode);
      
      if (grblError) {
        return {
          type: grblError.type,
          severity: grblError.severity,
          retryable: grblError.retryable,
          description: grblError.description,
          grblCode: errorCode,
          source: 'grbl_error'
        };
      }
    }
    
    // Check for GRBL alarm codes
    const alarmMatch = errorStr.match(/alarm:(\d+)/i);
    if (alarmMatch) {
      const alarmCode = parseInt(alarmMatch[1]);
      const grblAlarm = this.grblAlarms.get(alarmCode);
      
      if (grblAlarm) {
        return {
          type: grblAlarm.type,
          severity: grblAlarm.severity,
          retryable: grblAlarm.retryable,
          description: grblAlarm.description,
          grblCode: alarmCode,
          source: 'grbl_alarm'
        };
      }
    }
    
    return null;
  }

  /**
   * Classify error using learned patterns
   */
  classifyByPattern(error, context) {
    if (this.errorPatterns.length === 0) {
      return null;
    }
    
    const errorStr = error.toString().toLowerCase();
    let bestMatch = null;
    let highestConfidence = 0;
    
    for (const pattern of this.errorPatterns) {
      const confidence = this.calculatePatternConfidence(errorStr, pattern, context);
      
      if (confidence > highestConfidence && confidence >= this.config.confidenceThreshold) {
        highestConfidence = confidence;
        bestMatch = pattern;
      }
    }
    
    if (bestMatch) {
      this.stats.patternMatches++;
      
      return {
        type: bestMatch.type,
        severity: bestMatch.severity,
        retryable: bestMatch.retryable,
        confidence: highestConfidence,
        description: bestMatch.description,
        source: 'pattern_match',
        patterns: [bestMatch.pattern]
      };
    }
    
    return null;
  }

  /**
   * Classify error using heuristics
   */
  classifyByHeuristics(error, context) {
    const errorStr = error.toString().toLowerCase();
    const message = error.message?.toLowerCase() || errorStr;
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'timeout_error',
        severity: 'medium',
        retryable: true,
        confidence: 0.8,
        description: 'Command timed out waiting for response',
        source: 'heuristic'
      };
    }
    
    // Connection errors
    if (message.includes('connection') || message.includes('serial') || 
        message.includes('disconnected') || message.includes('port')) {
      return {
        type: 'connection_error',
        severity: 'high',
        retryable: true,
        confidence: 0.85,
        description: 'Serial communication error',
        source: 'heuristic'
      };
    }
    
    // Buffer errors
    if (message.includes('buffer') || message.includes('overflow') || message.includes('full')) {
      return {
        type: 'buffer_error',
        severity: 'medium',
        retryable: true,
        confidence: 0.8,
        description: 'Buffer overflow or full',
        source: 'heuristic'
      };
    }
    
    // Limit switch errors
    if (message.includes('limit') || message.includes('switch')) {
      const isHard = message.includes('hard') || message.includes('emergency');
      return {
        type: isHard ? 'hard_limit' : 'soft_limit',
        severity: isHard ? 'critical' : 'high',
        retryable: false,
        confidence: 0.75,
        description: `${isHard ? 'Hard' : 'Soft'} limit triggered`,
        source: 'heuristic'
      };
    }
    
    // State errors
    if (message.includes('not idle') || message.includes('busy') || message.includes('locked')) {
      return {
        type: 'state_error',
        severity: 'medium',
        retryable: true,
        confidence: 0.7,
        description: 'Machine not in correct state',
        source: 'heuristic'
      };
    }
    
    // Syntax errors
    if (message.includes('syntax') || message.includes('invalid') || message.includes('unknown')) {
      return {
        type: 'syntax_error',
        severity: 'medium',
        retryable: false,
        confidence: 0.7,
        description: 'Invalid command syntax',
        source: 'heuristic'
      };
    }
    
    // Default unknown classification
    this.stats.unknownErrors++;
    
    return {
      type: 'unknown_error',
      severity: 'medium',
      retryable: false,
      confidence: 0.1,
      description: 'Unknown error type',
      source: 'heuristic'
    };
  }

  /**
   * Calculate confidence score for pattern matching
   */
  calculatePatternConfidence(errorStr, pattern, context) {
    let confidence = 0;
    
    // String similarity
    const similarity = this.calculateStringSimilarity(errorStr, pattern.errorText);
    confidence += similarity * 0.6;
    
    // Context similarity
    if (pattern.context && context) {
      const contextSimilarity = this.calculateContextSimilarity(context, pattern.context);
      confidence += contextSimilarity * 0.3;
    }
    
    // Pattern frequency weight
    const frequencyWeight = Math.min(pattern.frequency / 10, 0.1);
    confidence += frequencyWeight;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  calculateLevenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate context similarity
   */
  calculateContextSimilarity(context1, context2) {
    let similarity = 0;
    let comparisons = 0;
    
    const keys = new Set([...Object.keys(context1), ...Object.keys(context2)]);
    
    for (const key of keys) {
      if (context1[key] !== undefined && context2[key] !== undefined) {
        comparisons++;
        if (context1[key] === context2[key]) {
          similarity++;
        }
      }
    }
    
    return comparisons > 0 ? similarity / comparisons : 0;
  }

  /**
   * Add contextual insights to classification
   */
  addContextualInsights(classification, context) {
    // Add command context
    if (context.command) {
      classification.commandContext = this.analyzeCommandContext(context.command);
    }
    
    // Add timing context
    if (context.responseTime) {
      classification.timingContext = this.analyzeTimingContext(context.responseTime);
    }
    
    // Add machine state context
    if (context.machineState) {
      classification.stateContext = this.analyzeMachineStateContext(context.machineState);
    }
    
    // Add recent error context
    const recentErrors = this.getRecentErrors();
    if (recentErrors.length > 0) {
      classification.errorPattern = this.analyzeErrorPattern(recentErrors);
    }
  }

  /**
   * Learn from classification result
   */
  learnFromClassification(classification, context) {
    this.stats.learningEvents++;
    
    // Add to error patterns
    const pattern = {
      errorText: classification.original.toString().toLowerCase(),
      type: classification.type,
      severity: classification.severity,
      retryable: classification.retryable,
      description: classification.description,
      context: context,
      frequency: 1,
      lastSeen: Date.now(),
      pattern: classification.original.toString()
    };
    
    // Check if similar pattern exists
    const existingPattern = this.errorPatterns.find(p => 
      this.calculateStringSimilarity(p.errorText, pattern.errorText) > 0.8
    );
    
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = Date.now();
    } else {
      this.errorPatterns.push(pattern);
      
      // Limit pattern history size
      if (this.errorPatterns.length > this.config.maxPatternHistory) {
        this.errorPatterns = this.errorPatterns
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, this.config.maxPatternHistory);
      }
    }
  }

  /**
   * Add suggested recovery actions
   */
  addSuggestedActions(classification) {
    const actions = [];
    
    switch (classification.type) {
      case 'timeout_error':
        actions.push('Increase command timeout', 'Check serial connection', 'Reduce command rate');
        break;
        
      case 'connection_error':
        actions.push('Reconnect serial port', 'Check cable connection', 'Restart application');
        break;
        
      case 'buffer_error':
        actions.push('Wait for buffer to drain', 'Reduce command rate', 'Clear command queue');
        break;
        
      case 'state_error':
        actions.push('Send unlock command ($X)', 'Check machine state', 'Home machine if needed');
        break;
        
      case 'hard_limit':
        actions.push('STOP IMMEDIATELY', 'Check limit switches', 'Manually move machine away from limits');
        break;
        
      case 'soft_limit':
        actions.push('Check work coordinates', 'Verify machine limits', 'Adjust G-code');
        break;
        
      case 'homing_error':
        actions.push('Check homing switches', 'Clear obstacles', 'Verify homing sequence');
        break;
        
      case 'syntax_error':
        actions.push('Check G-code syntax', 'Validate command format', 'Review G-code file');
        break;
        
      default:
        actions.push('Check machine status', 'Review error message', 'Consult documentation');
    }
    
    classification.suggestedActions = actions;
  }

  /**
   * Analyze command context
   */
  analyzeCommandContext(command) {
    return {
      type: this.classifyCommandType(command),
      hasMovement: /G[0-3]/.test(command.toUpperCase()),
      hasParameters: /[XYZIJKFRS]\d/.test(command.toUpperCase()),
      isModal: /G[12][0-9]|M[3-9]/.test(command.toUpperCase())
    };
  }

  /**
   * Classify command type
   */
  classifyCommandType(command) {
    const upper = command.toUpperCase();
    if (upper.includes('G0')) return 'rapid';
    if (upper.includes('G1')) return 'linear';
    if (upper.includes('G2') || upper.includes('G3')) return 'arc';
    if (upper.includes('$H')) return 'homing';
    if (upper.includes('M3') || upper.includes('M4') || upper.includes('M5')) return 'spindle';
    return 'other';
  }

  /**
   * Analyze timing context
   */
  analyzeTimingContext(responseTime) {
    return {
      isSlow: responseTime > 5000,
      isTimeout: responseTime > 10000,
      category: responseTime < 1000 ? 'fast' : responseTime < 5000 ? 'normal' : 'slow'
    };
  }

  /**
   * Analyze machine state context
   */
  analyzeMachineStateContext(state) {
    return {
      isIdle: state === 'Idle',
      isRunning: state === 'Run',
      isAlarm: state === 'Alarm',
      needsAttention: ['Alarm', 'Hold', 'Door'].includes(state)
    };
  }

  /**
   * Get recent errors for pattern analysis
   */
  getRecentErrors() {
    const cutoff = Date.now() - 60000; // Last minute
    return this.errorPatterns.filter(p => p.lastSeen > cutoff);
  }

  /**
   * Analyze error pattern
   */
  analyzeErrorPattern(errors) {
    return {
      count: errors.length,
      types: [...new Set(errors.map(e => e.type))],
      isRepeating: errors.length > 3,
      dominantType: this.getMostFrequentType(errors)
    };
  }

  /**
   * Get most frequent error type
   */
  getMostFrequentType(errors) {
    const counts = {};
    errors.forEach(e => counts[e.type] = (counts[e.type] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Get classification statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      accuracy: this.stats.totalClassifications > 0 ? 
        this.stats.correctClassifications / this.stats.totalClassifications : 0,
      unknownRate: this.stats.totalClassifications > 0 ? 
        this.stats.unknownErrors / this.stats.totalClassifications : 0,
      patternMatchRate: this.stats.totalClassifications > 0 ? 
        this.stats.patternMatches / this.stats.totalClassifications : 0,
      totalPatterns: this.errorPatterns.length
    };
  }

  /**
   * Export learned patterns
   */
  exportPatterns() {
    return {
      patterns: this.errorPatterns.map(p => ({
        errorText: p.errorText,
        type: p.type,
        severity: p.severity,
        retryable: p.retryable,
        frequency: p.frequency,
        lastSeen: p.lastSeen
      })),
      stats: this.getStatistics(),
      exportedAt: Date.now()
    };
  }

  /**
   * Import learned patterns
   */
  importPatterns(data) {
    if (data.patterns && Array.isArray(data.patterns)) {
      this.errorPatterns = data.patterns.map(p => ({
        ...p,
        pattern: p.errorText,
        context: {}
      }));
      
      debug('Imported error patterns', { count: this.errorPatterns.length });
    }
  }

  /**
   * Clear all learned patterns
   */
  clearPatterns() {
    this.errorPatterns = [];
    this.contextPatterns.clear();
    debug('Cleared all learned patterns');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.errorPatterns = [];
    this.commandHistory = [];
    this.contextPatterns.clear();
    this.removeAllListeners();
  }
}