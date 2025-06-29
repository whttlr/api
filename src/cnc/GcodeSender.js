/**
 * Refactored G-code Sender Class
 * 
 * Orchestrates modular components following single responsibility principle.
 * Maintains backward compatibility while providing cleaner, more maintainable architecture.
 */

import { log } from '../lib/logger/index.js';
import { handleResponse, parseResponse, categorizeResponse } from '../lib/helpers/index.js';
import { ConnectionManager } from './connection/index.js';
import { CommandExecutor } from './commands/index.js';
import { QueryManager } from './queries/index.js';
import { FileProcessor } from './files/index.js';
import { DiagnosticsManager } from './diagnostics/index.js';
import { AlarmManager } from './alarms/index.js';
import { Config } from './config.js';

// Load configuration
const CONFIG = Config.get();

class GcodeSender {
  constructor() {
    // Initialize all module managers
    this.connectionManager = new ConnectionManager(CONFIG);
    this.commandExecutor = new CommandExecutor(this.connectionManager, CONFIG);
    this.queryManager = new QueryManager(CONFIG);
    this.fileProcessor = new FileProcessor(CONFIG);
    this.diagnosticsManager = new DiagnosticsManager(CONFIG);
    this.alarmManager = new AlarmManager(CONFIG);
    
    // Maintain backward compatibility properties
    this.isConnected = false;
    this.currentPort = null;
  }

  /**
   * Log messages with timestamp (backward compatibility)
   */
  log(message, data = null, level = 'log') {
    return log(message, data, level);
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  async getAvailablePorts() {
    return this.connectionManager.getAvailablePorts();
  }

  async connect(portPath, options = {}) {
    const result = await this.connectionManager.connect(portPath, options);
    
    // Update backward compatibility properties
    this.isConnected = this.connectionManager.isPortConnected();
    this.currentPort = this.connectionManager.getConnectionStatus().port;
    
    // Set up data handling
    this.connectionManager.setupDataHandler((cleanedData) => {
      handleResponse(
        this.commandExecutor.getResponseCallbacks(),
        log,
        (response) => parseResponse(categorizeResponse, () => null, response),
        cleanedData
      );
    });
    
    return result;
  }

  async disconnect() {
    const result = await this.connectionManager.disconnect();
    
    // Update backward compatibility properties
    this.isConnected = false;
    this.currentPort = null;
    
    return result;
  }

  // =============================================================================
  // COMMAND EXECUTION
  // =============================================================================

  async sendGcode(gcode, timeoutMs = CONFIG.timeouts.command) {
    return this.commandExecutor.sendGcode(
      this.connectionManager.getSerialInterface(),
      this.isConnected,
      gcode,
      timeoutMs
    );
  }

  async emergencyStop() {
    return this.commandExecutor.emergencyStop(
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  // =============================================================================
  // QUERY OPERATIONS
  // =============================================================================

  getStatus() {
    const executionStatus = this.commandExecutor.getExecutionQueueStatus();
    return {
      isConnected: this.isConnected,
      currentPort: this.currentPort,
      responseCallbacks: this.commandExecutor.getResponseCallbacks().size,
      commandsInQueue: executionStatus.commandsInQueue,
      isExecuting: executionStatus.isExecuting,
      currentCommand: null, // This could be enhanced to track current command
      queueStatus: executionStatus.queueStatus,
      lastCommandId: executionStatus.lastCommandId
    };
  }

  async queryMachineStatus() {
    return this.queryManager.queryMachineStatus(
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  async queryGrblSettings() {
    return this.queryManager.queryGrblSettings(
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  async queryCoordinateSystems() {
    return this.queryManager.queryCoordinateSystems(
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  async queryParserState() {
    return this.queryManager.queryParserState(
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  async getLimitsInfo() {
    return this.queryManager.getLimitsInfo(
      this.isConnected,
      () => this.queryMachineStatus(),
      () => this.queryGrblSettings()
    );
  }

  displayLimitsInfo(limitsInfo) {
    return this.queryManager.displayLimitsInfo(limitsInfo);
  }

  // =============================================================================
  // FILE OPERATIONS
  // =============================================================================

  async executeGcodeFile(filePath) {
    return this.fileProcessor.executeGcodeFile(
      filePath,
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  // =============================================================================
  // DIAGNOSTICS
  // =============================================================================

  async testSmallMovements() {
    return this.diagnosticsManager.testSmallMovements(
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  generateDiagnosticReport(diagnostics) {
    return this.diagnosticsManager.generateDiagnosticReport(diagnostics);
  }

  async analyzeHomingRequirements(grblSettings) {
    return this.diagnosticsManager.analyzeHomingRequirements(grblSettings);
  }

  // =============================================================================
  // ALARM MANAGEMENT
  // =============================================================================

  async performAlarmAnalysis(diagnostics) {
    return this.alarmManager.performAlarmAnalysis(diagnostics);
  }

  async testAlarmTriggers() {
    return this.alarmManager.testAlarmTriggers(
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  analyzeAlarmDiagnostics(diagnostics) {
    return this.alarmManager.analyzeAlarmDiagnostics(diagnostics);
  }

  generateAlarmDiagnosticReport(diagnostics) {
    return this.alarmManager.generateAlarmDiagnosticReport(diagnostics);
  }

  // =============================================================================
  // ADVANCED OPERATIONS
  // =============================================================================

  /**
   * Run comprehensive diagnostics using all modules
   */
  async runComprehensiveDiagnostics() {
    return this.diagnosticsManager.runComprehensiveDiagnostics(
      this.queryManager,
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  /**
   * Execute alarm recovery sequence
   */
  async executeAlarmRecovery(alarmType) {
    return this.alarmManager.executeAlarmRecovery(
      alarmType,
      this.commandExecutor,
      this.connectionManager.getSerialInterface(),
      this.isConnected
    );
  }

  /**
   * Get machine health score
   */
  async getMachineHealthScore() {
    const diagnostics = await this.runComprehensiveDiagnostics();
    return this.diagnosticsManager.calculateHealthScore(diagnostics);
  }

  /**
   * Validate G-code file before execution
   */
  validateGcodeFile(filePath) {
    return this.fileProcessor.validateGcodeFile(filePath);
  }

  /**
   * Get file statistics without execution
   */
  getFileStats(filePath) {
    return this.fileProcessor.getFileStats(filePath);
  }
}

export { GcodeSender, CONFIG };